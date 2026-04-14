import FileMeta from "../models/fileMeta.js";
import Order from "../models/order.js";
import handleResponse from "../utils/helper.js";
import * as printService from "../services/printService.js";
import { orderMatchQueryFlexible } from "../utils/orderLookup.js";
import { getPrivateDownloadUrl } from "../services/mediaService.js";
import { distanceMeters } from "../utils/geoUtils.js";
import { resolvePrintFeeBreakdown } from "../services/checkoutPricingService.js";

function normalizePrintDetails(details) {
  if (Array.isArray(details)) {
    return details[0] || null;
  }
  return details || null;
}

/**
 * Upload - This would normally be handled by the media service, 
 * but for print details we need specific page count detection.
 */
export const uploadAndDetect = async (req, res) => {
  try {
    if (!req.file) {
      return handleResponse(res, 400, "No file uploaded");
    }

    const { buffer, originalname, mimetype } = req.file;
    const userId = req.user.id;

    // 1. Upload to Cloudinary
    const cloudinaryResult = await printService.uploadToCloudinary(buffer, "print-docs");
    const secureUrl = cloudinaryResult.secure_url;
    const publicId = cloudinaryResult.public_id;

    // 2. Detect Page Count
    let pageCount = 1;
    if (mimetype === "application/pdf") {
      try {
        pageCount = await printService.getPdfPageCount(buffer);
      } catch (err) {
        console.warn("PDF page count failed, defaulting to 1", err);
        pageCount = 1; // Graceful fallback
      }
    }

    // 3. Create FileMeta (for lifecycle management)
    const fileMeta = await FileMeta.create({
      fileUrl: secureUrl,
      publicId,
      ownerId: userId,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour for orphans
      status: "ORPHAN",
    });

    return handleResponse(res, 200, "File detected successfully", {
      fileMetaId: fileMeta._id,
      pageCount,
      fileName: originalname,
      secureUrl,
      publicId
    });
  } catch (error) {
    console.error("Upload detection error:", error);
    return handleResponse(res, 500, "Failed to process document: " + error.message);
  }
};

/**
 * Calculate pricing & Find nearest seller
 */
export const calculateQuote = async (req, res) => {
  try {
    const { lat, lng, items } = req.body; // items: Array of { pageCount, copies, options }

    if (!lat || !lng) {
      return handleResponse(res, 400, "Location (lat, lng) is required");
    }
    if (!Array.isArray(items) || items.length === 0) {
      return handleResponse(res, 400, "At least one print item is required");
    }

    const seller = await printService.findNearestPrintSeller(lat, lng);
    if (!seller) {
      return handleResponse(res, 404, "No print-enabled sellers found nearby");
    }

    let itemQuotes = items.map(item => {
      // Basic validation
      const copies = Math.min(Math.max(item.copies || 1, 1), 100);
      const pageCount = Math.max(item.pageCount || 1, 1);
      
      // Handle both nested and flat options from frontend
      const options = {
        color: item.options?.color ?? item.isColor ?? false,
        doubleSided: item.options?.doubleSided ?? item.isDoubleSided ?? false
      };
      
      const breakdown = printService.calculatePrintPrice(
        pageCount,
        copies,
        options,
        seller.services.print.rates
      );
      
      return {
        ...item,
        copies,
        pageCount,
        options, // Normalize for response
        breakdown
      };
    });

    const sellerCoords = seller?.location?.coordinates;
    const distanceKm =
      Array.isArray(sellerCoords) && sellerCoords.length >= 2
        ? Number(
            (
              distanceMeters(Number(lat), Number(lng), Number(sellerCoords[1]), Number(sellerCoords[0])) /
              1000
            ).toFixed(3),
          )
        : 0;

    const subtotal = itemQuotes.reduce((sum, item) => sum + item.breakdown.total, 0);
    const feeBreakdown = await resolvePrintFeeBreakdown({ distanceKm });
    const platformFee = feeBreakdown.handlingFeeCharged;
    const deliveryFee = feeBreakdown.deliveryFeeCharged;
    const total = subtotal + platformFee + deliveryFee;

    return handleResponse(res, 200, "Quote calculated", {
      seller: {
        _id: seller._id,
        shopName: seller.shopName
      },
      items: itemQuotes,
      pricing: {
        subtotal,
        platformFee,
        deliveryFee,
        total,
        distanceKm,
        estimatedPreparationTime: "Ready in 15-20 mins"
      }
    });
  } catch (error) {
    return handleResponse(res, 500, "Calculation failed: " + error.message);
  }
};

/**
 * Secure file access for sellers
 */
export const verifyAndGetFile = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { fileId } = req.query;
    const userId = req.user.id;
    const role = req.user.role;

    const orderKey = orderMatchQueryFlexible(orderId);
    if (!orderKey) {
      return handleResponse(res, 404, "Order not found");
    }

    const order = await Order.findOne(orderKey);
    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    // Access control
    const isSeller = role === "seller" && order.seller.toString() === userId;
    const isCustomer = (role === "customer" || role === "user") && order.customer.toString() === userId;
    const isAdmin = role === "admin";

    if (!isSeller && !isCustomer && !isAdmin) {
      return handleResponse(res, 403, "Access Denied: You are not authorized for this file");
    }

    const files = order.items
      .filter(item => item.type === "print")
      .map(item => normalizePrintDetails(item.printDetails))
      .filter(Boolean);

    const normalizedFileId = String(fileId || "").trim();
    const targetFile = normalizedFileId
      ? files.find((file) =>
          [file.fileId, file.publicId, file.fileMetaId]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
            .includes(normalizedFileId),
        )
      : files[0];

    if (!targetFile) {
      return handleResponse(res, 404, "Requested print file not found");
    }

    const normalizedPublicId = String(targetFile.publicId || targetFile.fileId || "").trim();
    const fileMetaId = String(targetFile.fileMetaId || "").trim();

    let fileMeta = null;
    if (fileMetaId) {
      fileMeta = await FileMeta.findById(fileMetaId).select("publicId fileUrl").lean();
    }
    if (!fileMeta && normalizedPublicId) {
      fileMeta = await FileMeta.findOne({ publicId: normalizedPublicId })
        .select("publicId fileUrl")
        .lean();
    }

    const publicId = String(fileMeta?.publicId || normalizedPublicId).trim();
    const downloadUrl = publicId
      ? getPrivateDownloadUrl(publicId, {
          format: "pdf",
          resourceType: "image",
          type: "upload",
          attachment: String(targetFile.fileName || "document.pdf").trim() || "document.pdf",
        })
      : String(targetFile.fileUrl || "").trim();

    if (!downloadUrl) {
      return handleResponse(res, 404, "Print file download URL could not be generated");
    }

    return handleResponse(res, 200, "File access granted", {
      url: downloadUrl,
      fileName: targetFile.fileName,
      fileId: targetFile.fileId || targetFile.publicId || targetFile.fileMetaId,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
