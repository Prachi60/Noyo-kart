import Seller from "../models/seller.js";
import { calculateDistance } from "../utils/helper.js";
import { getRedisClient } from "../config/redis.js";

const MAX_SELLER_SEARCH_DISTANCE_M = 100000;
const NEARBY_CACHE_TTL_S = 60; // 60 seconds — seller locations rarely change

export function parseCustomerCoordinates(query = {}) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { valid: false, lat: null, lng: null };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, lat: null, lng: null };
  }

  return { valid: true, lat, lng };
}

/**
 * Round lat/lng to 3 decimal places (~111m precision) for cache key.
 * This groups nearby requests into the same cache bucket.
 */
function buildNearbyCacheKey(lat, lng) {
  const rLat = lat.toFixed(3);
  const rLng = lng.toFixed(3);
  return `nearby:sellers:${rLat}:${rLng}`;
}

export async function getNearbySellerIdsForCustomer(lat, lng) {
  // Try Redis cache first
  const redis = getRedisClient();
  const cacheKey = buildNearbyCacheKey(lat, lng);

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Redis error — fall through to DB query
    }
  }

  const sellers = await Seller.find({
    isActive: true,
    isVerified: true,
    applicationStatus: "approved",
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: MAX_SELLER_SEARCH_DISTANCE_M,
      },
    },
  })
    .select("_id location serviceRadius")
    .lean();

  const result = sellers
    .filter((seller) => {
      const coords = seller?.location?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return false;
      const [sellerLng, sellerLat] = coords;
      if (!Number.isFinite(sellerLat) || !Number.isFinite(sellerLng)) {
        return false;
      }
      const distanceKm = calculateDistance(lat, lng, sellerLat, sellerLng);
      return distanceKm <= (seller.serviceRadius || 5);
    })
    .map((seller) => String(seller._id));

  // Store in Redis for subsequent requests
  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(result), "EX", NEARBY_CACHE_TTL_S);
    } catch {
      // Non-critical — just skip caching
    }
  }

  return result;
}

