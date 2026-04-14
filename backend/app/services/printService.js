import Seller from "../models/seller.js";
import { distanceMeters } from "../utils/geoUtils.js";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { uploadToCloudinary } from "./mediaService.js";

export { uploadToCloudinary };

export function hasConfiguredPrintService(printService) {
  if (!printService?.enabled) return false;

  const bw = Number(printService?.rates?.bw || 0);
  const color = Number(printService?.rates?.color || 0);

  return Boolean(printService?.isConfigured || bw > 0 || color > 0);
}

/**
 * Detect page count for a PDF file from a URL.
 * Note: pdfjs-dist needs the legacy build for Node.js if not using standard workers.
 */
export async function getPdfPageCount(buffer) {
  try {
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    console.error("Error counting PDF pages:", error);
    throw new Error("Failed to read PDF page count");
  }
}

/**
 * Find the nearest seller who has print service enabled and configured.
 */
export async function findNearestPrintSeller(lat, lng) {
  const normalizedLat = Number(lat);
  const normalizedLng = Number(lng);
  if (!Number.isFinite(normalizedLat) || !Number.isFinite(normalizedLng)) {
    return null;
  }

  const sellers = await Seller.find({
    "services.print.enabled": true,
    isActive: true,
    isVerified: true,
    applicationStatus: "approved",
    isOnline: true,
    isAcceptingOrders: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [normalizedLng, normalizedLat],
        },
      },
    },
  })
    .select("shopName serviceRadius location services")
    .limit(20)
    .lean();

  for (const seller of sellers) {
    if (!hasConfiguredPrintService(seller?.services?.print)) continue;

    const coords = seller?.location?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const [sellerLng, sellerLat] = coords;
    const distanceKm = distanceMeters(
      normalizedLat,
      normalizedLng,
      Number(sellerLat),
      Number(sellerLng),
    ) / 1000;
    const radiusKm = Number(seller.serviceRadius || 5);
    if (distanceKm <= radiusKm) {
      return seller;
    }
  }

  return null;
}

/**
 * Calculate pricing for a print item
 */
export function calculatePrintPrice(pageCount, copies, options = {}, rates) {
  const { color = false, doubleSided = false } = options || {};
  const ratePerPage = color ? rates.color : rates.bw;
  let total = pageCount * copies * ratePerPage;

  if (doubleSided && rates.doubleSidedExtra) {
    total += copies * rates.doubleSidedExtra;
  }

  return {
    bwPages: !color ? pageCount : 0,
    colorPages: color ? pageCount : 0,
    extraCharges: doubleSided ? rates.doubleSidedExtra * copies : 0,
    total: Math.round(total * 100) / 100,
  };
}
