import Seller from "../models/seller.js";
import Category from "../models/category.js";
import { distanceMeters } from "../utils/geoUtils.js";
import { HANDLING_FEE_STRATEGY } from "../constants/finance.js";
import {
  calculateHandlingFee,
  generateOrderPaymentBreakdown,
  hydrateOrderItems,
} from "./finance/pricingService.js";

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

  const query = Seller.findById(sellerId).select("location").lean();
  if (session) query.session(session);
  const seller = await query;
  const coords = seller?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return 0;

  const [sellerLng, sellerLat] = coords;
  const distanceInMeters = distanceMeters(
    normalizedLocation.lat,
    normalizedLocation.lng,
    Number(sellerLat),
    Number(sellerLng),
  );
  return Number((distanceInMeters / 1000).toFixed(3));
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
    discountTotal: sumField(sellerBreakdowns, "discountTotal"),
    taxTotal: sumField(sellerBreakdowns, "taxTotal"),
    grandTotal: sumField(sellerBreakdowns, "grandTotal"),
    sellerPayoutTotal: sumField(sellerBreakdowns, "sellerPayoutTotal"),
    adminProductCommissionTotal: sumField(sellerBreakdowns, "adminProductCommissionTotal"),
    riderPayoutBase: sumField(sellerBreakdowns, "riderPayoutBase"),
    riderPayoutDistance: sumField(sellerBreakdowns, "riderPayoutDistance"),
    riderPayoutBonus: sumField(sellerBreakdowns, "riderPayoutBonus"),
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
  session = null,
}) {
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

  for (const sellerId of sellerIds) {
    const sellerItems = itemsBySeller.get(sellerId) || [];
    const distanceKm = await computeDistanceKmForSeller({
      sellerId,
      addressLocation: address?.location,
      session,
    });
    const breakdown = await generateOrderPaymentBreakdown({
      preHydratedItems: sellerItems,
      distanceKm,
      discountTotal: 0,
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
