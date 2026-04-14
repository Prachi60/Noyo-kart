import Seller from "../models/seller.js";
import Category from "../models/category.js";
import FileMeta from "../models/fileMeta.js";
import { distanceMeters } from "../utils/geoUtils.js";
import { HANDLING_FEE_STRATEGY } from "../constants/finance.js";
import {
  calculateHandlingFee,
  calculateCustomerDeliveryFee,
  generateOrderPaymentBreakdown,
  hydrateOrderItems,
} from "./finance/pricingService.js";
import { calculatePrintPrice, hasConfiguredPrintService } from "./printService.js";
import { getOrCreateFinanceSettings } from "./finance/financeSettingsService.js";

const DEFAULT_PRINT_IMAGE =
  "https://cdn-icons-png.flaticon.com/128/2321/2321831.png";

function isPrintItem(item = {}) {
  return String(item?.type || "").toLowerCase() === "print" || Boolean(item?.printDetails);
}

function getCheckoutMode(orderItems = []) {
  const items = Array.isArray(orderItems) ? orderItems.filter(Boolean) : [];
  const printCount = items.filter(isPrintItem).length;
  if (printCount === 0) return "product";
  if (printCount === items.length) return "print";
  const err = new Error("Mixed product and print checkout is not supported yet");
  err.statusCode = 400;
  throw err;
}

function getPrimaryPrintDetails(item = {}) {
  if (Array.isArray(item?.printDetails)) {
    return item.printDetails[0] || {};
  }
  return item?.printDetails || {};
}

function normalizePrintOptions(item = {}, details = {}) {
  return {
    color: Boolean(details?.options?.color ?? details?.isColor ?? item?.isColor ?? false),
    doubleSided: Boolean(
      details?.options?.doubleSided ?? details?.isDoubleSided ?? item?.isDoubleSided ?? false,
    ),
  };
}

async function hydratePrintOrderItems(
  orderItems = [],
  { address = {}, sellerId = null, customerId = null, session = null } = {},
) {
  const normalizedSellerId = String(sellerId || "").trim();
  if (!normalizedSellerId) {
    const err = new Error("sellerId is required for print checkout");
    err.statusCode = 400;
    throw err;
  }

  const sellerQuery = Seller.findById(normalizedSellerId)
    .select("shopName serviceRadius location isOnline isAcceptingOrders services")
    .lean();
  if (session && typeof sellerQuery.session === "function") sellerQuery.session(session);
  const seller = await sellerQuery;
  if (!seller) {
    const err = new Error("Print seller not found");
    err.statusCode = 404;
    throw err;
  }
  if (
    !seller?.services?.print?.enabled ||
    !hasConfiguredPrintService(seller?.services?.print) ||
    !seller?.isOnline ||
    !seller?.isAcceptingOrders
  ) {
    const err = new Error("Selected seller is not available for print orders");
    err.statusCode = 400;
    throw err;
  }

  const distanceKm = await computeDistanceKmForSeller({
    sellerId: normalizedSellerId,
    addressLocation: address?.location,
    session,
  });

  const normalizedItems = [];
  for (let index = 0; index < orderItems.length; index += 1) {
    const item = orderItems[index];
    const details = getPrimaryPrintDetails(item);
    const fileMetaId = String(details?.fileMetaId || item?.fileMetaId || "").trim();
    const publicId = String(details?.publicId || details?.fileId || item?.publicId || "").trim();

    if (!fileMetaId && !publicId) {
      const err = new Error("Each print item must include a file reference");
      err.statusCode = 400;
      throw err;
    }

    let fileMeta = null;
    if (fileMetaId) {
      const query = FileMeta.findById(fileMetaId).select("_id ownerId publicId fileUrl status").lean();
      if (session && typeof query.session === "function") query.session(session);
      fileMeta = await query;
    }
    if (!fileMeta && publicId) {
      const query = FileMeta.findOne({ publicId })
        .select("_id ownerId publicId fileUrl status")
        .lean();
      if (session && typeof query.session === "function") query.session(session);
      fileMeta = await query;
    }

    if (!fileMeta) {
      const err = new Error("Uploaded print file could not be found");
      err.statusCode = 404;
      throw err;
    }
    if (customerId && String(fileMeta.ownerId) !== String(customerId)) {
      const err = new Error("You are not allowed to use this print file");
      err.statusCode = 403;
      throw err;
    }
    if (String(fileMeta.status || "").toUpperCase() === "EXPIRED") {
      const err = new Error("This print file has expired. Please upload it again.");
      err.statusCode = 400;
      throw err;
    }

    const quantity = Math.max(
      1,
      Math.floor(Number(item?.quantity || details?.copies || item?.copies || 1)),
    );
    const pageCount = Math.max(1, Math.floor(Number(details?.pageCount || item?.pageCount || 1)));
    const options = normalizePrintOptions(item, details);
    const priceBreakdown = calculatePrintPrice(
      pageCount,
      quantity,
      options,
      seller.services.print.rates || {},
    );

    normalizedItems.push({
      type: "print",
      sellerId: normalizedSellerId,
      productId: null,
      productName:
        String(item?.name || details?.fileName || item?.fileName || "").trim() ||
        `Print Document ${index + 1}`,
      quantity,
      price: round2(Number(priceBreakdown.total || 0) / quantity),
      image: item?.image || DEFAULT_PRINT_IMAGE,
      headerCategoryId: "",
      variantSku: "",
      variantName: "",
      printDetails: {
        fileMetaId: String(fileMeta._id),
        fileId: String(fileMeta.publicId || publicId),
        publicId: String(fileMeta.publicId || publicId),
        fileUrl: String(details?.fileUrl || item?.fileUrl || fileMeta.fileUrl || ""),
        fileName:
          String(details?.fileName || item?.name || item?.fileName || "").trim() ||
          `Print Document ${index + 1}`,
        pageCount,
        copies: quantity,
        priceBreakdown,
        options,
      },
    });
  }

  return {
    sellerId: normalizedSellerId,
    distanceKm,
    normalizedItems,
  };
}

export async function resolvePrintFeeBreakdown({ distanceKm = 0, session = null } = {}) {
  const financeSettings = await getOrCreateFinanceSettings({ session });
  const delivery = calculateCustomerDeliveryFee(distanceKm, financeSettings);

  return {
    deliveryFeeCharged: round2(Number(delivery.deliveryFeeCharged || 0)),
    handlingFeeCharged: 0,
    deliverySettings: financeSettings,
    deliverySnapshot: delivery,
  };
}

async function buildPrintBreakdown({
  sellerId,
  normalizedItems = [],
  distanceKm = 0,
  tipAmount = 0,
  discountTotal = 0,
  session = null,
}) {
  const productSubtotal = round2(
    normalizedItems.reduce(
      (sum, item) =>
        sum + Number(item?.printDetails?.priceBreakdown?.total || item?.price || 0),
      0,
    ),
  );
  const feeBreakdown = await resolvePrintFeeBreakdown({ distanceKm, session });
  const deliveryFeeCharged = feeBreakdown.deliveryFeeCharged;
  const handlingFeeCharged = feeBreakdown.handlingFeeCharged;
  const riderPayoutBase = deliveryFeeCharged;
  const riderPayoutDistance = 0;
  const riderPayoutBonus = 0;
  const riderTipAmount = round2(tipAmount);
  const riderPayoutTotal = round2(riderPayoutBase + riderTipAmount);
  const normalizedDiscount = round2(discountTotal);
  const grandTotal = round2(
    productSubtotal + deliveryFeeCharged + handlingFeeCharged - normalizedDiscount + riderTipAmount,
  );

  return {
    sellerId,
    currency: "INR",
    productSubtotal,
    deliveryFeeCharged,
    handlingFeeCharged,
    tipTotal: riderTipAmount,
    discountTotal: normalizedDiscount,
    taxTotal: 0,
    grandTotal,
    sellerPayoutTotal: productSubtotal,
    adminProductCommissionTotal: 0,
    riderPayoutBase,
    riderPayoutDistance,
    riderPayoutBonus,
    riderTipAmount,
    riderPayoutTotal,
    platformLogisticsMargin: round2(deliveryFeeCharged + handlingFeeCharged - riderPayoutTotal),
    platformTotalEarning: handlingFeeCharged,
    codCollectedAmount: grandTotal,
    codRemittedAmount: 0,
    codPendingAmount: grandTotal,
    distanceKmActual: round2(distanceKm),
    distanceKmRounded: round2(distanceKm),
    snapshots: {
      deliverySettings: {
        deliveryPricingMode: feeBreakdown.deliverySettings.deliveryPricingMode,
        customerBaseDeliveryFee: feeBreakdown.deliverySettings.customerBaseDeliveryFee,
        fixedDeliveryFee: feeBreakdown.deliverySettings.fixedDeliveryFee,
        baseDistanceCapacityKm: feeBreakdown.deliverySettings.baseDistanceCapacityKm,
        incrementalKmSurcharge: feeBreakdown.deliverySettings.incrementalKmSurcharge,
      },
      handlingFeeStrategy: feeBreakdown.deliverySettings.handlingFeeStrategy,
      handlingCategoryUsed: null,
      deliveryChargeComputation: feeBreakdown.deliverySnapshot,
      categoryCommissionSettings: [],
      printPricing: true,
    },
    lineItems: normalizedItems.map((item) => ({
      type: "print",
      productId: null,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.price,
      itemSubtotal: item?.printDetails?.priceBreakdown?.total || item.price,
      sellerPayout: item?.printDetails?.priceBreakdown?.total || item.price,
      adminProductCommission: 0,
      headerCategoryId: null,
      headerCategoryName: "Print Service",
      printDetails: item.printDetails,
    })),
  };
}

function normalizeLocation(location = null) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

export function groupHydratedItemsBySeller(hydratedItems = []) {
  const grouped = new Map();
  for (const item of hydratedItems) {
    const sellerId = String(item?.sellerId || "");
    if (!sellerId) {
      const err = new Error("Unable to resolve seller for one or more checkout items");
      err.statusCode = 400;
      throw err;
    }
    if (!grouped.has(sellerId)) {
      grouped.set(sellerId, []);
    }
    grouped.get(sellerId).push(item);
  }
  return grouped;
}

async function computeDistanceKmForSeller({ sellerId, addressLocation, session = null }) {
  const normalizedLocation = normalizeLocation(addressLocation);
  if (!normalizedLocation) return 0;

  const query = Seller.findById(sellerId).select("location serviceRadius shopName").lean();
  if (session) query.session(session);
  const seller = await query;
  if (!seller) {
    const err = new Error("Seller not found");
    err.statusCode = 404;
    throw err;
  }
  const coords = seller?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return 0;

  const [sellerLng, sellerLat] = coords;
  const distanceInMeters = distanceMeters(
    normalizedLocation.lat,
    normalizedLocation.lng,
    Number(sellerLat),
    Number(sellerLng),
  );
  const distanceKm = Number((distanceInMeters / 1000).toFixed(3));
  
  const radius = Number(seller.serviceRadius || 5);
  if (distanceKm > radius) {
    const err = new Error(`${seller.shopName || "Store"} does not deliver to your current location (Distance: ${distanceKm}km, Service Radius: ${radius}km)`);
    err.statusCode = 400;
    throw err;
  }

  return distanceKm;
}

function sumField(rows, field) {
  return Number(
    rows.reduce((sum, row) => sum + Number(row?.[field] || 0), 0).toFixed(2),
  );
}

function round2(value) {
  return Number((Number(value || 0)).toFixed(2));
}

function buildAggregateBreakdown(sellerBreakdowns = []) {
  const aggregate = {
    currency: sellerBreakdowns[0]?.currency || "INR",
    productSubtotal: sumField(sellerBreakdowns, "productSubtotal"),
    deliveryFeeCharged: sumField(sellerBreakdowns, "deliveryFeeCharged"),
    handlingFeeCharged: sumField(sellerBreakdowns, "handlingFeeCharged"),
    tipTotal: sumField(sellerBreakdowns, "tipTotal"),
    discountTotal: sumField(sellerBreakdowns, "discountTotal"),
    taxTotal: sumField(sellerBreakdowns, "taxTotal"),
    grandTotal: sumField(sellerBreakdowns, "grandTotal"),
    sellerPayoutTotal: sumField(sellerBreakdowns, "sellerPayoutTotal"),
    adminProductCommissionTotal: sumField(sellerBreakdowns, "adminProductCommissionTotal"),
    riderPayoutBase: sumField(sellerBreakdowns, "riderPayoutBase"),
    riderPayoutDistance: sumField(sellerBreakdowns, "riderPayoutDistance"),
    riderPayoutBonus: sumField(sellerBreakdowns, "riderPayoutBonus"),
    riderTipAmount: sumField(sellerBreakdowns, "riderTipAmount"),
    riderPayoutTotal: sumField(sellerBreakdowns, "riderPayoutTotal"),
    platformLogisticsMargin: sumField(sellerBreakdowns, "platformLogisticsMargin"),
    platformTotalEarning: sumField(sellerBreakdowns, "platformTotalEarning"),
    codCollectedAmount: sumField(sellerBreakdowns, "codCollectedAmount"),
    codRemittedAmount: sumField(sellerBreakdowns, "codRemittedAmount"),
    codPendingAmount: sumField(sellerBreakdowns, "codPendingAmount"),
    distanceKmActual: sumField(sellerBreakdowns, "distanceKmActual"),
    distanceKmRounded: sumField(sellerBreakdowns, "distanceKmRounded"),
    snapshots: {
      perSeller: sellerBreakdowns.map((row, index) => ({
        index,
        sellerId: row.sellerId,
        snapshots: row.snapshots || {},
      })),
    },
    lineItems: sellerBreakdowns.flatMap((row) =>
      (Array.isArray(row.lineItems) ? row.lineItems : []).map((lineItem) => ({
        ...lineItem,
        sellerId: row.sellerId,
      })),
    ),
  };
  return aggregate;
}

function allocateCheckoutTipToSellerBreakdowns(
  sellerBreakdownEntries = [],
  totalTipAmount = 0,
) {
  const normalizedTip = round2(totalTipAmount);
  if (!Number.isFinite(normalizedTip) || normalizedTip <= 0 || sellerBreakdownEntries.length === 0) {
    return;
  }

  const totalBase = sellerBreakdownEntries.reduce(
    (sum, entry) => sum + Number(entry?.breakdown?.grandTotal || 0),
    0,
  );

  let allocatedSoFar = 0;
  sellerBreakdownEntries.forEach((entry, index) => {
    const breakdown = entry?.breakdown;
    if (!breakdown) return;

    let allocatedTip = 0;
    if (index === sellerBreakdownEntries.length - 1) {
      allocatedTip = round2(normalizedTip - allocatedSoFar);
    } else if (totalBase > 0) {
      allocatedTip = round2(
        (Number(breakdown.grandTotal || 0) / totalBase) * normalizedTip,
      );
      allocatedSoFar = round2(allocatedSoFar + allocatedTip);
    }

    breakdown.tipTotal = round2(Number(breakdown.tipTotal || 0) + allocatedTip);
    breakdown.riderTipAmount = round2(
      Number(breakdown.riderTipAmount || 0) + allocatedTip,
    );
    breakdown.riderPayoutTotal = round2(
      Number(breakdown.riderPayoutTotal || 0) + allocatedTip,
    );
    breakdown.grandTotal = round2(Number(breakdown.grandTotal || 0) + allocatedTip);
  });
}

async function computeGlobalHandlingFeeForCheckout(hydratedItems = [], { session = null } = {}) {
  const headerIds = Array.from(
    new Set(hydratedItems.map((item) => String(item?.headerCategoryId || "")).filter(Boolean)),
  );
  if (headerIds.length === 0) {
    return {
      handlingFeeCharged: 0,
      handlingCategoryUsed: null,
    };
  }

  const categoryQuery = Category.find({ _id: { $in: headerIds } })
    .select("_id name handlingFees handlingFeeType handlingFeeValue")
    .lean();
  if (session) categoryQuery.session(session);
  const categories = await categoryQuery;
  const categoryById = new Map(categories.map((category) => [String(category._id), category]));

  const handling = calculateHandlingFee(hydratedItems, {
    handlingFeeStrategy: HANDLING_FEE_STRATEGY.HIGHEST_CATEGORY_FEE,
    categoryById,
  });

  return {
    handlingFeeCharged: Number(handling.handlingFeeCharged || 0),
    handlingCategoryUsed: handling.handlingCategoryUsed || null,
  };
}

function applyGlobalHandlingFeeToSellerBreakdowns(
  sellerBreakdownEntries = [],
  globalHandling = { handlingFeeCharged: 0, handlingCategoryUsed: null },
) {
  const fee = Number(globalHandling?.handlingFeeCharged || 0);
  if (!Number.isFinite(fee) || fee <= 0 || sellerBreakdownEntries.length === 0) return;

  const usedHeaderId = String(globalHandling?.handlingCategoryUsed?.headerCategoryId || "");
  let chosenSellerId = null;
  if (usedHeaderId) {
    for (const entry of sellerBreakdownEntries) {
      const entryItems = Array.isArray(entry?.items) ? entry.items : [];
      if (entryItems.some((item) => String(item?.headerCategoryId || "") === usedHeaderId)) {
        chosenSellerId = entry.sellerId;
        break;
      }
    }
  }
  if (!chosenSellerId) {
    chosenSellerId = sellerBreakdownEntries[0]?.sellerId || null;
  }

  for (const entry of sellerBreakdownEntries) {
    const breakdown = entry?.breakdown;
    if (!breakdown) continue;

    const shouldCharge = chosenSellerId && entry.sellerId === chosenSellerId;
    const handlingFeeCharged = shouldCharge ? fee : 0;

    breakdown.handlingFeeCharged = handlingFeeCharged;
    breakdown.snapshots = breakdown.snapshots && typeof breakdown.snapshots === "object"
      ? breakdown.snapshots
      : {};
    breakdown.snapshots.handlingFeeStrategy = HANDLING_FEE_STRATEGY.HIGHEST_CATEGORY_FEE;
    breakdown.snapshots.handlingCategoryUsed = shouldCharge
      ? globalHandling.handlingCategoryUsed || {}
      : {};

    const productSubtotal = Number(breakdown.productSubtotal || 0);
    const deliveryFeeCharged = Number(breakdown.deliveryFeeCharged || 0);
    const discountTotal = Number(breakdown.discountTotal || 0);
    const taxTotal = Number(breakdown.taxTotal || 0);
    const riderPayoutTotal = Number(breakdown.riderPayoutTotal || 0);
    const adminProductCommissionTotal = Number(breakdown.adminProductCommissionTotal || 0);

    breakdown.grandTotal = round2(
      productSubtotal + deliveryFeeCharged + handlingFeeCharged - discountTotal + taxTotal,
    );
    breakdown.platformLogisticsMargin = round2(
      deliveryFeeCharged + handlingFeeCharged - riderPayoutTotal,
    );
    breakdown.platformTotalEarning = round2(
      adminProductCommissionTotal + breakdown.platformLogisticsMargin,
    );
  }
}

export async function buildCheckoutPricingSnapshot({
  orderItems = [],
  address = {},
  tipAmount = 0,
  discountTotal = 0,
  sellerId = null,
  customerId = null,
  session = null,
}) {
  const checkoutMode = getCheckoutMode(orderItems);
  if (checkoutMode === "print") {
    const { sellerId: normalizedSellerId, distanceKm, normalizedItems } =
      await hydratePrintOrderItems(orderItems, {
        address,
        sellerId,
        customerId,
        session,
      });
    const breakdown = await buildPrintBreakdown({
      sellerId: normalizedSellerId,
      normalizedItems,
      distanceKm,
      tipAmount,
      discountTotal,
      session,
    });
    return {
      hydratedItems: normalizedItems,
      sellerBreakdownEntries: [
        {
          sellerId: normalizedSellerId,
          distanceKm,
          items: normalizedItems,
          breakdown,
        },
      ],
      aggregateBreakdown: buildAggregateBreakdown([breakdown]),
      sellerCount: 1,
      itemCount: normalizedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    };
  }

  const hydratedItems = await hydrateOrderItems(orderItems, {
    session,
    enforceServerPricing: true,
  });
  if (!hydratedItems.length) {
    const err = new Error("Cannot checkout with empty cart");
    err.statusCode = 400;
    throw err;
  }

  const itemsBySeller = groupHydratedItemsBySeller(hydratedItems);
  const sellerIds = Array.from(itemsBySeller.keys()).sort((a, b) => a.localeCompare(b));
  const sellerBreakdownEntries = [];

  const globalHandling = await computeGlobalHandlingFeeForCheckout(hydratedItems, { session });

  // Pre-compute each seller's subtotal for proportional discount distribution
  const sellerSubtotals = new Map();
  let totalSubtotal = 0;
  for (const sellerId of sellerIds) {
    const items = itemsBySeller.get(sellerId) || [];
    const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    sellerSubtotals.set(sellerId, subtotal);
    totalSubtotal += subtotal;
  }

  for (const sellerId of sellerIds) {
    const sellerItems = itemsBySeller.get(sellerId) || [];
    const distanceKm = await computeDistanceKmForSeller({
      sellerId,
      addressLocation: address?.location,
      session,
    });
    // Distribute discount proportionally by seller subtotal
    const sellerRatio = totalSubtotal > 0 ? (sellerSubtotals.get(sellerId) || 0) / totalSubtotal : 1 / sellerIds.length;
    const sellerDiscount = round2(discountTotal * sellerRatio);
    const breakdown = await generateOrderPaymentBreakdown({
      preHydratedItems: sellerItems,
      distanceKm,
      discountTotal: sellerDiscount,
      taxTotal: 0,
      session,
    });
    sellerBreakdownEntries.push({
      sellerId,
      distanceKm,
      items: sellerItems,
      breakdown: {
        ...breakdown,
        sellerId,
      },
    });
  }

  applyGlobalHandlingFeeToSellerBreakdowns(sellerBreakdownEntries, globalHandling);
  allocateCheckoutTipToSellerBreakdowns(sellerBreakdownEntries, tipAmount);

  const aggregateBreakdown = buildAggregateBreakdown(
    sellerBreakdownEntries.map((entry) => entry.breakdown),
  );

  return {
    hydratedItems,
    sellerBreakdownEntries,
    aggregateBreakdown,
    sellerCount: sellerBreakdownEntries.length,
    itemCount: hydratedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  };
}

export default {
  buildCheckoutPricingSnapshot,
  groupHydratedItemsBySeller,
};
