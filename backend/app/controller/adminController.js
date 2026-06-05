import handleResponse from "../utils/helper.js";
export * from "./admin/dashboardController.js";
export * from "./admin/settingsController.js";
export * from "./admin/profileController.js";
export * from "./admin/deliveryController.js";
export * from "./admin/sellerApplicationsController.js";
export * from "./admin/walletController.js";
export * from "./admin/cashController.js";
export * from "./admin/sellerDirectoryController.js";
export * from "./admin/userController.js";

import { getSellerDetailData } from "../services/admin/sellerDetailService.js";
import { getAdvancedAnalyticsData } from "../services/admin/analyticsService.js";

// Advanced Analytics
export const getAdvancedAnalytics = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '7d';
    const data = await getAdvancedAnalyticsData(timeRange);
    return handleResponse(res, 200, "Advanced analytics fetched successfully", data);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

export const getSellerById = async (req, res) => {
  try {
    const sellerId = req.params.id;
    const data = await getSellerDetailData(sellerId);
    return handleResponse(res, 200, "Seller details fetched successfully", data);
  } catch (error) {
    if (error.message === "Seller not found") {
      return handleResponse(res, 404, "Seller not found");
    }
    return handleResponse(res, 500, error.message);
  }
};
