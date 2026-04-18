import mongoose from "mongoose";
import CheckoutGroup from "../models/checkoutGroup.js";
import FileMeta from "../models/fileMeta.js";
import Order from "../models/order.js";
import {
  DEFAULT_SELLER_TIMEOUT_MS,
  WORKFLOW_STATUS,
  legacyStatusFromWorkflow,
} from "../constants/orderWorkflow.js";
import { ORDER_PAYMENT_STATUS } from "../constants/finance.js";
import { afterPlaceOrderV2 } from "./orderWorkflowService.js";

const DEFAULT_PRINT_IMAGE =
  "https://cdn-icons-png.flaticon.com/128/2321/2321831.png";

function toObjectId(value) {
  const normalized = String(value || "").trim();
  if (!normalized || !mongoose.Types.ObjectId.isValid(normalized)) return null;
  return new mongoose.Types.ObjectId(normalized);
}

function toIdString(value) {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

function isPrintLineItem(lineItem = {}) {
  return String(lineItem?.type || "").toLowerCase() === "print";
}

function mapCheckoutGroupPaymentStatus(paymentMode, paymentStatus) {
  const normalizedMode = String(paymentMode || "COD").trim().toUpperCase();
  const normalizedStatus = String(paymentStatus || "").trim().toUpperCase();

  if (normalizedMode === "ONLINE") {
    if (normalizedStatus === "PAID" || normalizedStatus === "CAPTURED") {
      return ORDER_PAYMENT_STATUS.PAID;
    }
    if (normalizedStatus === "FAILED" || normalizedStatus === "CANCELLED") {
      return ORDER_PAYMENT_STATUS.FAILED;
    }
    if (normalizedStatus === "REFUNDED") {
      return ORDER_PAYMENT_STATUS.REFUNDED;
    }
    return ORDER_PAYMENT_STATUS.CREATED;
  }

  if (normalizedStatus === "FAILED" || normalizedStatus === "CANCELLED") {
    return ORDER_PAYMENT_STATUS.FAILED;
  }
  return ORDER_PAYMENT_STATUS.PENDING_CASH_COLLECTION;
}

function mapLegacyPaymentStatus(orderPaymentStatus) {
  if (orderPaymentStatus === ORDER_PAYMENT_STATUS.PAID) return "completed";
  if (orderPaymentStatus === ORDER_PAYMENT_STATUS.REFUNDED) return "refunded";
  if (orderPaymentStatus === ORDER_PAYMENT_STATUS.FAILED) return "failed";
  return "pending";
}

function resolveRecoveredWorkflow(paymentMode, orderPaymentStatus) {
  const normalizedMode = String(paymentMode || "COD").trim().toUpperCase();
  if (normalizedMode === "ONLINE") {
    return orderPaymentStatus === ORDER_PAYMENT_STATUS.PAID
      ? WORKFLOW_STATUS.SELLER_PENDING
      : WORKFLOW_STATUS.CREATED;
  }
  return WORKFLOW_STATUS.SELLER_PENDING;
}

function normalizePrintDetails(printDetails = {}) {
  return {
    fileMetaId: String(printDetails?.fileMetaId || "").trim() || undefined,
    fileId:
      String(printDetails?.fileId || printDetails?.publicId || "").trim() || undefined,
    publicId:
      String(printDetails?.publicId || printDetails?.fileId || "").trim() || undefined,
    fileUrl: String(printDetails?.fileUrl || "").trim(),
    fileName: String(printDetails?.fileName || "").trim(),
    pageCount: Math.max(1, Number(printDetails?.pageCount || 1)),
    copies: Math.max(1, Number(printDetails?.copies || 1)),
    priceBreakdown: {
      bwPages: Number(printDetails?.priceBreakdown?.bwPages || 0),
      colorPages: Number(printDetails?.priceBreakdown?.colorPages || 0),
      extraCharges: Number(printDetails?.priceBreakdown?.extraCharges || 0),
      total: Number(printDetails?.priceBreakdown?.total || 0),
    },
    options: {
      color: Boolean(printDetails?.options?.color),
      doubleSided: Boolean(printDetails?.options?.doubleSided),
      orientation: printDetails?.options?.orientation || undefined,
      pages: printDetails?.options?.pages || undefined,
    },
  };
}

function buildRecoveredPrintItems(lineItems = []) {
  return lineItems
    .filter(isPrintLineItem)
    .map((lineItem) => {
      const details = normalizePrintDetails(lineItem?.printDetails || {});
      return {
        type: "print",
        name:
          String(lineItem?.productName || details.fileName || "").trim() ||
          "Print Document",
        quantity: Math.max(1, Number(lineItem?.quantity || details.copies || 1)),
        price: Number(lineItem?.unitPrice || 0),
        image: DEFAULT_PRINT_IMAGE,
        printDetails: [details],
      };
    })
    .filter((item) => item.quantity > 0);
}

function buildRecoveredPricing({
  checkoutGroup,
  sellerBreakdown,
  itemSubtotal,
  singleSeller,
}) {
  const summary = checkoutGroup?.pricingSummary || {};
  const subtotal = Number(sellerBreakdown?.subtotal || itemSubtotal || 0);
  const deliveryFee = singleSeller ? Number(summary.deliveryFeeCharged || 0) : 0;
  const platformFee = singleSeller ? Number(summary.handlingFeeCharged || 0) : 0;
  const gst = singleSeller ? Number(summary.taxTotal || 0) : 0;
  const tip = Number(
    sellerBreakdown?.riderTipAmount ||
      (singleSeller ? summary.tipTotal : 0) ||
      0,
  );
  const discount = singleSeller ? Number(summary.discountTotal || 0) : 0;
  const total = Number(
    sellerBreakdown?.grandTotal ||
      subtotal + deliveryFee + platformFee + gst + tip - discount,
  );
  const walletAmount = singleSeller ? Number(summary.walletAmount || 0) : 0;

  return {
    pricing: {
      subtotal,
      deliveryFee,
      platformFee,
      gst,
      tip,
      discount,
      total,
      walletAmount,
    },
    paymentBreakdown: {
      currency: String(summary.currency || "INR").trim() || "INR",
      productSubtotal: subtotal,
      deliveryFeeCharged: deliveryFee,
      handlingFeeCharged: platformFee,
      tipTotal: tip,
      discountTotal: discount,
      taxTotal: gst,
      grandTotal: total,
      sellerPayoutTotal: Number(sellerBreakdown?.sellerPayout || subtotal),
      adminProductCommissionTotal: Number(sellerBreakdown?.adminCommission || 0),
      riderPayoutBase: singleSeller ? Number(summary.riderPayoutTotal || 0) - tip : 0,
      riderPayoutDistance: 0,
      riderPayoutBonus: 0,
      riderTipAmount: tip,
      riderPayoutTotal: singleSeller ? Number(summary.riderPayoutTotal || 0) : tip,
      platformLogisticsMargin: 0,
      platformTotalEarning: singleSeller ? Number(summary.platformTotalEarning || platformFee) : platformFee,
      codCollectedAmount:
        String(checkoutGroup?.paymentMode || "COD").toUpperCase() === "ONLINE"
          ? 0
          : total,
      codRemittedAmount: 0,
      codPendingAmount:
        String(checkoutGroup?.paymentMode || "COD").toUpperCase() === "ONLINE"
          ? 0
          : total,
      walletAmount,
      distanceKmActual: 0,
      distanceKmRounded: 0,
      snapshots: summary.snapshots || {},
      lineItems: [],
    },
  };
}

function buildRecoveredOrderDocument({
  checkoutGroup,
  sellerBreakdown,
  orderMongoId,
  publicOrderId,
  index,
  lineItems,
}) {
  const items = buildRecoveredPrintItems(lineItems);
  if (!items.length) return null;

  const paymentMode = String(checkoutGroup?.paymentMode || "COD").trim().toUpperCase();
  const paymentStatus = mapCheckoutGroupPaymentStatus(
    paymentMode,
    checkoutGroup?.paymentStatus,
  );
  const workflowStatus = resolveRecoveredWorkflow(paymentMode, paymentStatus);
  const now = new Date();
  const sellerPendingUntil =
    workflowStatus === WORKFLOW_STATUS.SELLER_PENDING
      ? new Date(now.getTime() + DEFAULT_SELLER_TIMEOUT_MS())
      : null;
  const legacyStatus = legacyStatusFromWorkflow(workflowStatus);
  const singleSeller = Number(checkoutGroup?.sellerCount || 1) <= 1;
  const itemSubtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(
        item?.printDetails?.[0]?.priceBreakdown?.total ||
          item.price * item.quantity ||
          0,
      ),
    0,
  );
  const { pricing, paymentBreakdown } = buildRecoveredPricing({
    checkoutGroup,
    sellerBreakdown,
    itemSubtotal,
    singleSeller,
  });

  return {
    _id: orderMongoId,
    orderId: publicOrderId,
    customer: checkoutGroup.customer,
    seller: sellerBreakdown.seller,
    items,
    address: checkoutGroup.addressSnapshot || {},
    paymentMode,
    paymentStatus,
    payment: {
      method: paymentMode === "ONLINE" ? "online" : "cash",
      status: mapLegacyPaymentStatus(paymentStatus),
    },
    pricing,
    paymentBreakdown,
    status: legacyStatus,
    orderStatus: legacyStatus,
    timeSlot: checkoutGroup?.metadata?.timeSlot || "now",
    workflowVersion: 2,
    workflowStatus,
    sellerPendingExpiresAt: sellerPendingUntil,
    expiresAt: sellerPendingUntil,
    stockReservation: checkoutGroup?.stockReservation || {
      status: "COMMITTED",
      reservedAt: checkoutGroup?.createdAt || new Date(),
      expiresAt: null,
      releasedAt: null,
    },
    checkoutGroupId: checkoutGroup.checkoutGroupId,
    checkoutGroupSize: Number(checkoutGroup?.sellerCount || 1),
    checkoutGroupIndex: index,
    placement: {
      idempotencyKey: checkoutGroup?.placement?.idempotencyKey || undefined,
      idempotencyKeyExpiry: checkoutGroup?.placement?.idempotencyKeyExpiry || null,
      createdFrom: checkoutGroup?.placement?.createdFrom || "DIRECT_ITEMS",
    },
    settlementStatus: {
      overall: "PENDING",
      sellerPayout: "PENDING",
      riderPayout: "PENDING",
      adminEarningCredited: false,
      reconciledAt: null,
    },
    createdAt: checkoutGroup?.createdAt || now,
    updatedAt: now,
  };
}

async function activateRecoveredFiles(items = [], orderMongoId, session = null) {
  const fileMetaIds = Array.from(
    new Set(
      items
        .flatMap((item) => item?.printDetails || [])
        .map((details) => String(details?.fileMetaId || "").trim())
        .filter(Boolean),
    ),
  );
  if (!fileMetaIds.length) return;

  await FileMeta.updateMany(
    { _id: { $in: fileMetaIds } },
    {
      $set: {
        status: "ACTIVE",
        orderId: orderMongoId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
    session ? { session } : {},
  );
}

async function findExistingOrdersForCheckoutGroup(checkoutGroup, session = null) {
  const clauses = [{ checkoutGroupId: checkoutGroup.checkoutGroupId }];

  const objectIds = (checkoutGroup?.orderIds || [])
    .map((value) => toObjectId(value))
    .filter(Boolean);
  if (objectIds.length) {
    clauses.push({ _id: { $in: objectIds } });
  }

  const publicOrderIds = (checkoutGroup?.publicOrderIds || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (publicOrderIds.length) {
    clauses.push({ orderId: { $in: publicOrderIds } });
  }

  const query = Order.find({ $or: clauses }).select("_id orderId seller checkoutGroupId").lean();
  if (session && typeof query.session === "function") query.session(session);
  return query;
}

export async function materializeMissingPrintOrdersForCheckoutGroup(
  checkoutGroupOrId,
  { session = null } = {},
) {
  let checkoutGroup = checkoutGroupOrId;
  if (!checkoutGroup || typeof checkoutGroup !== "object") {
    const lookupId = String(checkoutGroupOrId || "").trim();
    if (!lookupId) return [];
    const query = CheckoutGroup.findOne({ checkoutGroupId: lookupId }).lean();
    if (session && typeof query.session === "function") query.session(session);
    checkoutGroup = await query;
  }
  if (!checkoutGroup) return [];

  const sellerBreakdown = Array.isArray(checkoutGroup?.sellerBreakdown)
    ? checkoutGroup.sellerBreakdown
    : [];
  const pricingLineItems = Array.isArray(checkoutGroup?.pricingSummary?.lineItems)
    ? checkoutGroup.pricingSummary.lineItems
    : [];
  if (!sellerBreakdown.length || !pricingLineItems.some(isPrintLineItem)) {
    return [];
  }

  const existingOrders = await findExistingOrdersForCheckoutGroup(checkoutGroup, session);
  const existingIds = new Set(existingOrders.map((order) => String(order._id)));
  const existingPublicIds = new Set(existingOrders.map((order) => String(order.orderId || "")));

  const createdOrders = [];
  for (let index = 0; index < sellerBreakdown.length; index += 1) {
    const breakdown = sellerBreakdown[index] || {};
    const sellerId = String(breakdown?.seller || "").trim();
    const publicOrderId =
      String(
        breakdown?.publicOrderId || checkoutGroup?.publicOrderIds?.[index] || "",
      ).trim();
    const orderMongoId =
      toObjectId(breakdown?.order) ||
      toObjectId(checkoutGroup?.orderIds?.[index]) ||
      new mongoose.Types.ObjectId();

    if (!sellerId || !publicOrderId) continue;
    if (existingIds.has(String(orderMongoId)) || existingPublicIds.has(publicOrderId)) {
      continue;
    }

    const sellerLineItems = pricingLineItems.filter((lineItem) => {
      if (!isPrintLineItem(lineItem)) return false;
      const lineSellerId = String(lineItem?.sellerId || sellerId).trim();
      return lineSellerId === sellerId;
    });
    if (!sellerLineItems.length) continue;

    const recoveredDoc = buildRecoveredOrderDocument({
      checkoutGroup,
      sellerBreakdown: breakdown,
      orderMongoId,
      publicOrderId,
      index,
      lineItems: sellerLineItems,
    });
    if (!recoveredDoc) continue;

    const order = new Order(recoveredDoc);
    await order.save(session ? { session } : {});
    await activateRecoveredFiles(order.items, order._id, session);
    if (order.workflowVersion >= 2 && order.workflowStatus === WORKFLOW_STATUS.SELLER_PENDING) {
      void afterPlaceOrderV2(order).catch(() => {});
    }

    createdOrders.push(order);
    existingIds.add(String(order._id));
    existingPublicIds.add(order.orderId);
  }

  return createdOrders;
}

export async function reconcilePrintOrdersForLookup({
  publicOrderId = null,
  checkoutGroupId = null,
  sellerId = null,
  customerId = null,
  limit = 25,
} = {}) {
  const clauses = [];

  const normalizedPublicOrderId = String(publicOrderId || "").trim();
  if (normalizedPublicOrderId) {
    clauses.push({ publicOrderIds: normalizedPublicOrderId });
  }

  const normalizedCheckoutGroupId = String(checkoutGroupId || "").trim();
  if (normalizedCheckoutGroupId) {
    clauses.push({ checkoutGroupId: normalizedCheckoutGroupId });
  }

  const normalizedSellerId = String(sellerId || "").trim();
  if (normalizedSellerId) {
    clauses.push({ "sellerBreakdown.seller": normalizedSellerId });
  }

  const normalizedCustomerId = String(customerId || "").trim();
  if (normalizedCustomerId) {
    clauses.push({ customer: normalizedCustomerId });
  }

  if (!clauses.length) return [];

  const groups = await CheckoutGroup.find({ $or: clauses })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();

  const repaired = [];
  for (const checkoutGroup of groups) {
    const created = await materializeMissingPrintOrdersForCheckoutGroup(checkoutGroup);
    repaired.push(...created);
  }
  return repaired;
}
