import handleResponse from "../utils/helper.js";
import {
  createPaymentOrderSchema,
  validateSchema,
  verifyPaymentClientSchema,
} from "../validation/paymentValidation.js";


function getCorrelationId(req) {
  return String(
    req.correlationId ||
      req.headers["x-correlation-id"] ||
      req.headers["x-request-id"] ||
      "",
  ).trim() || null;
}

export const createRazorpayOrder = async (req, res) => {
  return handleResponse(res, 501, "Online payments are currently disabled");
};

export const verifyPayment = async (req, res) => {
  return handleResponse(res, 501, "Online payments are currently disabled");
};
