import handleResponse from "../utils/helper.js";
import {
  confirmPickupAtomic,
  markArrivedAtStoreAtomic,
  advanceDeliveryRiderUiAtomic,
  requestHandoffOtpAtomic,
  verifyHandoffOtpAndDeliver,
} from "../services/orderWorkflowService.js";
import { getCachedRoute } from "../services/mapsRouteService.js";
import Order from "../models/order.js";
import { orderMatchQueryFromRouteParam } from "../utils/orderLookup.js";
import { generateReturnPickupOtp, validateReturnPickupOtp } from "../services/deliveryOtpService.js";
import { completeReturnAndRefund } from "./orderController.js";

export const confirmPickup = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { lat, lng } = req.body || {};
    const result = await confirmPickupAtomic(req.user.id, orderId, lat, lng);
    return handleResponse(res, 200, "Pickup confirmed", result);
  } catch (e) {
    return handleResponse(res, e.statusCode || 500, e.message);
  }
};

export const markArrivedAtStore = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { lat, lng } = req.body || {};
    const result = await markArrivedAtStoreAtomic(
      req.user.id,
      orderId,
      lat,
      lng,
    );
    return handleResponse(res, 200, "Arrived at store", result);
  } catch (e) {
    return handleResponse(res, e.statusCode || 500, e.message);
  }
};

export const advanceDeliveryRiderUi = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await advanceDeliveryRiderUiAtomic(req.user.id, orderId);
    return handleResponse(res, 200, "Delivery progress updated", result);
  } catch (e) {
    return handleResponse(res, e.statusCode || 500, e.message);
  }
};

export const requestDeliveryOtp = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { lat, lng } = req.body || {};
    const result = await requestHandoffOtpAtomic(req.user.id, orderId, lat, lng);
    return handleResponse(res, 200, result.message || "OTP sent", result);
  } catch (e) {
    return handleResponse(res, e.statusCode || 500, e.message);
  }
};

export const verifyDeliveryOtp = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { code } = req.body || {};
    const result = await verifyHandoffOtpAndDeliver(req.user.id, orderId, code);
    return handleResponse(res, 200, "Order delivered", result);
  } catch (e) {
    return handleResponse(res, e.statusCode || 500, e.message);
  }
};

/**
 * Query: phase=pickup|drop, originLat, originLng (rider position).
 */
export const getOrderRoute = async (req, res) => {
  try {
    const { orderId } = req.params;
    const phase = (req.query.phase || "pickup").toLowerCase();
    const originLat = parseFloat(req.query.originLat);
    const originLng = parseFloat(req.query.originLng);

    if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
      return handleResponse(res, 400, "originLat and originLng required");
    }

    const orderKey = orderMatchQueryFromRouteParam(orderId);
    if (!orderKey) {
      return handleResponse(res, 404, "Order not found");
    }

    const order = await Order.findOne(orderKey).populate("seller").lean();

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    const seller = order.seller;
    const coords = seller?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return handleResponse(res, 400, "Seller location missing");
    }
    const [slng, slat] = coords;

    const origin = { lat: originLat, lng: originLng };
    let dest;

    if (phase === "pickup") {
      dest = { lat: slat, lng: slng };
    } else {
      const c = order.address?.location;
      if (
        typeof c?.lat !== "number" ||
        typeof c?.lng !== "number" ||
        !Number.isFinite(c.lat) ||
        !Number.isFinite(c.lng)
      ) {
        return handleResponse(res, 400, "Customer location missing");
      }
      dest = { lat: c.lat, lng: c.lng };
    }

    const route = await getCachedRoute(origin, dest, "driving", orderId, phase);
    return handleResponse(res, 200, "Route", route);
  } catch (e) {
    return handleResponse(res, 500, e.message);
  }
};

export const requestReturnPickupOtp = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await generateReturnPickupOtp(orderId);
    if (!result.success) {
      return handleResponse(res, 400, result.error);
    }
    return handleResponse(res, 200, "Return OTP generated", result);
  } catch (e) {
    return handleResponse(res, 500, e.message);
  }
};

export const verifyReturnPickupOtp = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { code } = req.body || {};
    const validation = await validateReturnPickupOtp(orderId, code);

    if (!validation.valid) {
      return handleResponse(res, 400, validation.message);
    }

    // Mark as picked up and complete the loop.
    const orderKey = orderMatchQueryFromRouteParam(orderId);
    const order = await Order.findOne(orderKey);

    if (!order) return handleResponse(res, 404, "Order not found");

    order.returnStatus = "returned"; // Final flow step
    order.returnPickedAt = new Date();
    await order.save();

    // Auto-complete refund/commission logic
    const completed = await completeReturnAndRefund(order);

    return handleResponse(res, 200, "Return pickup verified and completed", completed);
  } catch (e) {
    return handleResponse(res, 500, e.message);
  }
};
