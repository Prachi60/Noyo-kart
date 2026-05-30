/**
 * Booking Scheduler Service — Optimized
 * Handles Wave-Based Vendor Alerting
 */

import SpBooking from '../models/SpBooking.js';
import SpBookingRequest from '../models/SpBookingRequest.js';
import SpVendor from '../models/SpVendor.js';
import SpSettings from '../models/SpSettings.js';
import { SP_BOOKING_STATUS } from '../constants.js';
import { createNotification } from '../controllers/notificationController.js';

// Wave configuration
let WAVE_CONFIG = {
  1: { count: 3, duration: 60000 },
  2: { count: 3, duration: 60000 },
  3: { count: 4, duration: 60000 },
  4: { count: Infinity, duration: 0 }
};

let MAX_SEARCH_TIME_MS = 5 * 60 * 1000;

const ACTIVE_INTERVAL_MS = 5000;
const IDLE_INTERVAL_MS = 30000;

const getVendorRange = (wave) => {
  let start = 0;
  for (let i = 1; i < wave; i++) {
    start += WAVE_CONFIG[i]?.count || 0;
  }
  const config = WAVE_CONFIG[wave] || WAVE_CONFIG[4];
  const end = config.count === Infinity ? Infinity : start + config.count;
  return { start, end };
};

class BookingScheduler {
  constructor(io) {
    this.io = io;
    this.intervalId = null;
    this.isRunning = false;
    this.isIdle = false;
  }

  start() {
    if (this.isRunning) {
      console.log('[BookingScheduler] Already running.');
      return;
    }
    this.isRunning = true;
    console.log('[BookingScheduler] Started — active interval: 5s, idle interval: 30s');
    this.scheduleNext(ACTIVE_INTERVAL_MS);
  }

  scheduleNext(intervalMs) {
    if (this.intervalId) clearTimeout(this.intervalId);
    this.intervalId = setTimeout(async () => {
      const hadWork = await this.processWaves();
      this.scheduleNext(hadWork ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS);
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('[BookingScheduler] Stopped.');
    }
  }

  async processWaves() {
    try {
      // Refresh settings
      try {
        const globalSettings = await SpSettings.findOne({ type: 'global' }).lean();
        if (globalSettings) {
          const waveDur = (globalSettings.waveDuration || 60) * 1000;
          WAVE_CONFIG = {
            1: { count: 3, duration: waveDur },
            2: { count: 3, duration: waveDur },
            3: { count: 4, duration: waveDur },
            4: { count: Infinity, duration: 0 }
          };
          MAX_SEARCH_TIME_MS = (globalSettings.maxSearchTime || 5) * 60 * 1000;
        }
      } catch (sErr) {
        console.error('[BookingScheduler] Settings fetch error:', sErr);
      }

      const activeBookings = await SpBooking.find(
        {
          status: SP_BOOKING_STATUS.SEARCHING,
          waveStartedAt: { $ne: null },
          potentialVendors: { $exists: true, $not: { $size: 0 } }
        },
        '_id currentWave waveStartedAt potentialVendors notifiedVendors bookingNumber createdAt userId expiresAt'
      ).lean();

      if (activeBookings.length === 0) {
        return false;
      }

      const now = Date.now();

      await Promise.all(
        activeBookings.map(async (booking) => {
          try {
            const currentWave = booking.currentWave || 1;
            const waveConfig = WAVE_CONFIG[currentWave] || WAVE_CONFIG[4];
            const startTime = new Date(booking.createdAt || booking.waveStartedAt).getTime();
            const totalElapsed = now - startTime;

            if (!booking.expiresAt) {
              const expiresAtDate = new Date(startTime + MAX_SEARCH_TIME_MS);
              await SpBooking.findByIdAndUpdate(booking._id, { $set: { expiresAt: expiresAtDate } });
            }

            if (totalElapsed > MAX_SEARCH_TIME_MS) {
              console.log(`[BookingScheduler] ${booking.bookingNumber}: Search timed out. Cancelling.`);

              await SpBooking.findByIdAndUpdate(booking._id, {
                $set: {
                  status: 'no_vendors',
                  cancellationReason: 'No vendor accepted within time limit'
                }
              });

              if (this.io) {
                this.io.to(`user_${booking.userId}`).emit('booking_search_failed', {
                  bookingId: booking._id,
                  message: 'No vendors available at the moment. Please try again later.'
                });
              }

              if (booking.notifiedVendors && booking.notifiedVendors.length > 0) {
                booking.notifiedVendors.forEach(vId => {
                  this.io.to(`vendor_${vId}`).emit('removeVendorBooking', { id: booking._id });
                });
              }

              return;
            }

            const waveElapsed = now - new Date(booking.waveStartedAt).getTime();
            if (waveConfig.duration === 0 || waveElapsed < waveConfig.duration) return;

            const nextWave = currentWave + 1;
            const { start, end } = getVendorRange(nextWave);

            let vendorsToNotify = booking.potentialVendors.slice(
              start,
              end === Infinity ? undefined : end
            );

            if (vendorsToNotify.length === 0) {
              console.log(`[BookingScheduler] Booking ${booking.bookingNumber}: No vendors left in Wave ${nextWave}`);
              return;
            }

            const vendorIds = vendorsToNotify.map(v => v.vendorId);
            const onlineVendors = await SpVendor.find(
              { _id: { $in: vendorIds }, isOnline: true, availability: { $in: ['AVAILABLE', 'BUSY'] } },
              '_id'
            ).lean();

            const onlineSet = new Set(onlineVendors.map(v => v._id.toString()));
            vendorsToNotify = vendorsToNotify.filter(v => onlineSet.has(v.vendorId.toString()));

            const notifyIds = vendorsToNotify.map(v => v.vendorId);
            await SpBooking.findByIdAndUpdate(booking._id, {
              $set: { currentWave: nextWave, waveStartedAt: new Date() },
              $addToSet: { notifiedVendors: { $each: notifyIds } }
            });

            if (vendorsToNotify.length === 0) {
              console.log(`[BookingScheduler] Booking ${booking.bookingNumber}: Wave ${nextWave} all offline, advancing quietly`);
              return;
            }

            console.log(`[BookingScheduler] ${booking.bookingNumber}: Wave ${nextWave} → notifying ${vendorsToNotify.length} vendors`);

            const bookingRequests = vendorsToNotify.map(v => ({
              bookingId: booking._id,
              vendorId: v.vendorId,
              status: 'PENDING',
              createdAt: booking.createdAt || new Date(),
              distance: v.distance || null,
              sentAt: new Date(),
              expiresAt: new Date(Date.now() + 60 * 60 * 1000)
            }));

            await Promise.all([
              SpBookingRequest.insertMany(bookingRequests, { ordered: false }).catch(err => {
                if (err.code !== 11000) console.error('[BookingScheduler] BookingRequest insert error:', err);
              }),
              this.notifyVendors(booking, vendorsToNotify)
            ]);

          } catch (bookingErr) {
            console.error(`[BookingScheduler] Error processing booking ${booking._id}:`, bookingErr);
          }
        })
      );

      return true;
    } catch (error) {
      console.error('[BookingScheduler] Error processing waves:', error);
      return false;
    }
  }

  async notifyVendors(booking, vendors) {
    try {
      const populatedBooking = await SpBooking.findById(booking._id)
        .populate('serviceId', 'title')
        .populate('userId', 'name phone')
        .lean();

      if (!populatedBooking) return;

      const serviceName = populatedBooking.serviceId?.title || populatedBooking.serviceName;
      const customerName = populatedBooking.userId?.name || 'Customer';

      await Promise.all(
        vendors.map(async (v) => {
          if (this.io) {
            this.io.to(`vendor_${v.vendorId}`).emit('new_booking_request', {
              bookingId: booking._id,
              serviceName,
              customerName,
              scheduledDate: populatedBooking.scheduledDate,
              scheduledTime: populatedBooking.scheduledTime,
              price: populatedBooking.finalAmount,
              address: populatedBooking.address,
              distance: v.distance,
              serviceCategory: populatedBooking.serviceCategory,
              brandName: populatedBooking.brandName,
              brandIcon: populatedBooking.brandIcon,
              categoryIcon: populatedBooking.categoryIcon,
              createdAt: populatedBooking.createdAt,
              expiresAt: new Date(new Date(populatedBooking.createdAt).getTime() + MAX_SEARCH_TIME_MS).toISOString(),
              playSound: true,
              message: `New booking request within ${v.distance?.toFixed(1) || '?'}km!`
            });
          }

          await createNotification({
            vendorId: v.vendorId,
            type: 'booking_request',
            title: 'New Booking Request',
            message: `New service request for ${serviceName} from ${customerName}`,
            relatedId: booking._id,
            relatedType: 'booking',
            data: {
              bookingId: booking._id,
              serviceName,
              customerName,
              scheduledDate: populatedBooking.scheduledDate,
              scheduledTime: populatedBooking.scheduledTime,
              location: populatedBooking.address,
              price: populatedBooking.finalAmount,
              distance: v.distance
            },
            pushData: {
              type: 'new_booking',
              dataOnly: false,
              link: `/vendor/bookings/${booking._id}`
            }
          });
        })
      );

      console.log(`[BookingScheduler] Notified ${vendors.length} vendors for booking ${booking.bookingNumber}`);
    } catch (error) {
      console.error('[BookingScheduler] Error notifying vendors:', error);
    }
  }
}

// Singleton instance
let schedulerInstance = null;

export const initializeScheduler = (io) => {
  if (!schedulerInstance) {
    schedulerInstance = new BookingScheduler(io);
    schedulerInstance.start();
  }
  return schedulerInstance;
};

export const getScheduler = () => schedulerInstance;

export { BookingScheduler };
