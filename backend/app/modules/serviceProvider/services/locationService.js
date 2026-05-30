import axios from 'axios';
import SpVendor from '../models/SpVendor.js';
import SpSettings from '../models/SpSettings.js';
import { getNearbyVendorsFromCache, isRedisConnected } from './redisService.js';
import { SP_VENDOR_STATUS } from '../constants.js';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - {lat, lng}
 * @param {Object} coord2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (coord1, coord2) => {
  const R = 6371;
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Geocode address to coordinates using Google Maps API
 * @param {string} address - Full address string
 * @returns {Promise<Object>} {lat, lng} coordinates
 */
export const geocodeAddress = async (address) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured, geocoding skipped');
      return null;
    }

    const response = await axios.get(`${GOOGLE_MAPS_API_URL}/geocode/json`, {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }

    throw new Error(`Geocoding failed: ${response.data.status}`);
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

const _buildVendorQuery = (filters = {}) => {
  const checkCashLimit = filters.checkCashLimit;
  const serviceCategory = filters.service;

  const queryFilters = { ...filters };
  delete queryFilters.checkCashLimit;
  delete queryFilters.service;
  delete queryFilters.city;

  const baseQuery = {
    approvalStatus: SP_VENDOR_STATUS.APPROVED,
    isActive: true,
    ...queryFilters
  };

  if (filters.city) {
    baseQuery['address.city'] = { $regex: new RegExp(filters.city, 'i') };
  }

  if (serviceCategory) {
    baseQuery.$or = [
      { categories: { $in: [serviceCategory] } },
      { service: { $in: [serviceCategory] } }
    ];
  }

  if (checkCashLimit) {
    baseQuery.$expr = { $lte: ["$wallet.dues", "$wallet.cashLimit"] };
  }

  return baseQuery;
};

/**
 * Find vendors within specified radius of a location
 */
export const findNearbyVendors = async (centerLocation, radiusKm = 10, filters = {}) => {
  if (!centerLocation || typeof centerLocation.lat !== 'number' || typeof centerLocation.lng !== 'number') {
    console.warn('[LocationService] Invalid coordinates. City fallback for:', filters.city);
    if (filters.city) {
      return findVendorsByCity(filters.city, filters);
    }
    return [];
  }

  try {
    // Fetch default radius from settings
    if (radiusKm === 10) {
      const globalSettings = await SpSettings.findOne({ type: 'global' }).select('searchRadius').lean();
      if (globalSettings?.searchRadius) radiusKm = globalSettings.searchRadius;
    }

    const baseQuery = _buildVendorQuery(filters);

    // Try Redis geo cache first
    if (isRedisConnected()) {
      const cachedVendors = await getNearbyVendorsFromCache(centerLocation.lat, centerLocation.lng, radiusKm);

      if (cachedVendors && cachedVendors.length > 0) {
        console.log(`[LocationService] Found ${cachedVendors.length} vendors from Redis cache`);

        const vendorIds = cachedVendors.map(v => v.vendorId);
        const vendors = await SpVendor.find({
          _id: { $in: vendorIds },
          ...baseQuery
        }).select('name businessName phone address profilePhoto service rating isOnline availability geoLocation');

        const vendorMap = new Map(vendors.map(v => [v._id.toString(), v.toObject()]));
        const result = cachedVendors
          .filter(cv => vendorMap.has(cv.vendorId))
          .map(cv => ({
            ...vendorMap.get(cv.vendorId),
            distance: cv.distance
          }));

        return result;
      }
    }

    // Try MongoDB 2dsphere geo query
    let nearbyVendors = [];

    try {
      const hasGeoVendors = await SpVendor.countDocuments({
        ...baseQuery,
        'geoLocation.coordinates': { $ne: [0, 0] }
      });

      if (hasGeoVendors > 0) {
        nearbyVendors = await SpVendor.find({
          ...baseQuery,
          geoLocation: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [centerLocation.lng, centerLocation.lat]
              },
              $maxDistance: radiusKm * 1000
            }
          }
        })
          .select('name businessName phone address profilePhoto service rating isOnline availability geoLocation settings')
          .limit(50);

        nearbyVendors = nearbyVendors.map(vendor => {
          const vendorObj = vendor.toObject();
          if (vendor.geoLocation && vendor.geoLocation.coordinates) {
            vendorObj.distance = calculateDistance(centerLocation, {
              lat: vendor.geoLocation.coordinates[1],
              lng: vendor.geoLocation.coordinates[0]
            });
          } else {
            vendorObj.distance = null;
          }
          return vendorObj;
        });

        nearbyVendors = nearbyVendors.filter(v => {
          const vRange = v.settings?.serviceRange || radiusKm;
          return v.distance <= vRange;
        });

        return nearbyVendors;
      }
    } catch (geoError) {
      console.warn('[LocationService] 2dsphere query failed, falling back to Haversine:', geoError.message);
    }

    // Fallback: Haversine formula
    const vendors = await SpVendor.find(baseQuery)
      .select('name businessName phone address location profilePhoto service rating isOnline availability settings');

    nearbyVendors = vendors.map(vendor => {
      let distance = null;
      const vLat = vendor.location?.lat || vendor.address?.lat;
      const vLng = vendor.location?.lng || vendor.address?.lng;

      if (vLat && vLng) {
        distance = calculateDistance(centerLocation, { lat: vLat, lng: vLng });
      }

      const vRange = vendor.settings?.serviceRange || radiusKm;
      return {
        ...vendor.toObject(),
        distance: distance,
        withinRange: distance !== null && distance <= vRange
      };
    }).filter(vendor => vendor.withinRange);

    console.log(`[LocationService] Found ${nearbyVendors.length} vendors using Haversine`);
    return nearbyVendors;
  } catch (error) {
    console.error('Find nearby vendors error:', error);
    return [];
  }
};

/**
 * Find vendors in a specific city (fallback when coordinates are missing)
 */
export const findVendorsByCity = async (city, filters = {}) => {
  try {
    const baseQuery = _buildVendorQuery({ ...filters, city });

    const vendors = await SpVendor.find(baseQuery)
      .select('name businessName phone address location profilePhoto service rating isOnline availability settings')
      .limit(50);

    console.log(`[LocationService] Found ${vendors.length} vendors in city: ${city}`);
    return vendors.map(v => ({ ...v.toObject(), distance: null }));
  } catch (error) {
    console.error('Find vendors by city error:', error);
    return [];
  }
};

/**
 * Get distance matrix from Google Maps API
 */
export const getDistanceMatrix = async (origins, destinations) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return origins.map(() => destinations.map(() => ({ distance: { value: 5000 } })));
    }

    const originsStr = origins.map(coord => `${coord.lat},${coord.lng}`).join('|');
    const destinationsStr = destinations.map(coord => `${coord.lat},${coord.lng}`).join('|');

    const response = await axios.get(`${GOOGLE_MAPS_API_URL}/distancematrix/json`, {
      params: {
        origins: originsStr,
        destinations: destinationsStr,
        key: GOOGLE_MAPS_API_KEY,
        units: 'metric'
      }
    });

    return response.data.rows;
  } catch (error) {
    console.error('Distance matrix error:', error);
    return [];
  }
};
