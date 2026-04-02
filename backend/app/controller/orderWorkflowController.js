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
    const hasSellerLoc = Array.isArray(coords) && coords.length >= 2;

    const origin = { lat: originLat, lng: originLng };
    let dest;

    if (phase === "pickup") {
      if (!hasSellerLoc) {
        return handleResponse(res, 400, "Seller location missing or invalid in database");
      }
      dest = { lat: coords[1], lng: coords[0] };
    } else {
      const c = order.address?.location;
      let hasCustLoc = 
        c && 
        typeof c.lat === "number" && 
        typeof c.lng === "number" && 
        Number.isFinite(c.lat) && 
        Number.isFinite(c.lng);

      if (hasCustLoc) {
        dest = { lat: c.lat, lng: c.lng };
      } else {
        // Fallback: Check if the customer has a matching saved address with location
        const User = mongoose.model("User");
        const customer = await User.findById(order.customer).lean();
        const fallbackAddress = customer?.addresses?.find(
          (a) => a.label?.toLowerCase() === order.address?.type?.toLowerCase() || 
                 a.fullAddress === order.address?.address
        );

        if (fallbackAddress?.location?.lat && fallbackAddress?.location?.lng) {
          dest = { 
            lat: fallbackAddress.location.lat, 
            lng: fallbackAddress.location.lng 
          };
          hasCustLoc = true;
        }
      }

      if (!hasCustLoc) {
        return handleResponse(res, 400, `Customer delivery location missing for order ${order.orderId}. Please ensure your primary address has precise mapping coordinates.`);
      }
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
    const result = await generateReturnPickupOtp(orderId, req.user);
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
    const { code, otp } = req.body || {};
    const enteredCode = String(code || otp || "").trim();
    const validation = await validateReturnPickupOtp(orderId, enteredCode);

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
