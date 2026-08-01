import mongoose from 'mongoose';
import SpBooking from '../../models/SpBooking.js';
import SpUserService from '../../models/SpUserService.js';
import SpCategory from '../../models/SpCategory.js';
import SpCart from '../../models/SpCart.js';
import SpUser from '../../models/SpUser.js';
import SpVendor from '../../models/SpVendor.js';
import SpWorker from '../../models/SpWorker.js';
import SpReview from '../../models/SpReview.js';
import { validationResult } from 'express-validator';
import { SP_BOOKING_STATUS, SP_PAYMENT_STATUS } from '../../constants.js';
import { createNotification } from '../notificationController.js';
import { sendNotificationToUser, sendNotificationToVendor, sendNotificationToWorker } from '../../services/firebaseAdmin.js';

/**
 * Create a new booking
 */
const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    let {
      serviceId,
      vendorId,
      address,
      scheduledDate,
      scheduledTime,
      timeSlot,
      userNotes,
      paymentMethod,
      amount,
      isPlusAdded,
      bookedItems,
      visitingCharges: reqVisitingCharges,
      visitationFee: reqVisitationFee,
      basePrice: reqBasePrice,
      discount: reqDiscount,
      tax: reqTax,
      serviceCategory: reqServiceCategory,
      categoryIcon: reqCategoryIcon,
      brandName: reqBrandName,
      brandIcon: reqBrandIcon,
      bookingType,
      paymentDetails
    } = req.body;

    let visitingCharges = reqVisitingCharges !== undefined ? reqVisitingCharges : (reqVisitationFee || 0);

    // Calculate total value from booked items or fallback to base
    let totalServiceValue = 0;
    if (bookedItems && bookedItems.length > 0) {
      totalServiceValue = bookedItems.reduce((sum, item) => {
        const itemPrice = item.card?.price || item.price || 0;
        return sum + (itemPrice * (item.quantity || 1));
      }, 0);
    }

    // Handle serviceId if it's an object
    if (typeof serviceId === 'object' && serviceId._id) {
      serviceId = serviceId._id;
    }

    // 1. Parallel Fetching: Service and User
    const [service, user] = await Promise.all([
      SpUserService.findById(serviceId).select('title basePrice discountPrice description images iconUrl categoryId category categoryIds').lean(),
      SpUser.findById(userId).select('name phone wallet plans')
    ]);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2. Fetch Category if exists
    const categoryId = service.categoryId || service.categoryIds?.[0];
    const category = categoryId ? await SpCategory.findById(categoryId).select('title icon image slug').lean() : null;

    // Calculate total value from booked items or fallback to service base price
    if (totalServiceValue === 0) {
      totalServiceValue = service.basePrice || 500;
    }

    // Check for Pending Penalty
    const pendingPenalty = user.wallet?.penalty || 0;
      

    // Find nearby vendors using location service
    const { findNearbyVendors, geocodeAddress } = await import('../../services/locationService.js');

    let bookingLocation;
    if (address.lat && address.lng) {
      bookingLocation = { lat: address.lat, lng: address.lng };
    } else {
      bookingLocation = await geocodeAddress(
        `${address.addressLine1}, ${address.city}, ${address.state} ${address.pincode}`
      );
    }

    const vendorFilters = {
      ...(category ? { service: category.title } : {}),
      checkCashLimit: paymentMethod === 'cash',
      city: address.city
    };

    let nearbyVendors = await findNearbyVendors(bookingLocation, 10, vendorFilters);

    // Deduplicate nearbyVendors by _id
    const uniqueVendorIds = new Set();
    nearbyVendors = nearbyVendors.filter(vendor => {
      const idStr = vendor._id.toString();
      if (uniqueVendorIds.has(idStr)) return false;
      uniqueVendorIds.add(idStr);
      return true;
    });

    // Calculate pricing
    let basePrice, discount, tax, finalAmount;
    let bookingStatus = SP_BOOKING_STATUS.SEARCHING;
    let bookingPaymentStatus = SP_PAYMENT_STATUS.PENDING;

    // Determine if we can use Plan Benefits
    let usePlanBenefits = false;
    if (paymentMethod === 'plan_benefit') {
      if (user.plans && user.plans.isActive) {
        if (user.plans.expiry && new Date() > new Date(user.plans.expiry)) {
          user.plans.isActive = false;
          await user.save();
          paymentMethod = 'pay_at_home';
        } else {
          usePlanBenefits = true;
        }
      } else {
        paymentMethod = 'pay_at_home';
      }
    }

    if (usePlanBenefits) {
      const { default: SpPlan } = await import('../../models/SpPlan.js');
      const userPlan = await SpPlan.findOne({ name: user.plans.name });

      if (!userPlan) {
        usePlanBenefits = false;
        paymentMethod = 'pay_at_home';
      } else {
        const isCategoryCovered = categoryId && userPlan.freeCategories &&
          userPlan.freeCategories.some(cat => String(cat) === String(categoryId));
        const isServiceCovered = serviceId && userPlan.freeServices &&
          userPlan.freeServices.some(svc => String(svc) === String(serviceId));

        if (isCategoryCovered || isServiceCovered) {
          basePrice = totalServiceValue > 0 ? totalServiceValue : (service.basePrice || 500);
          discount = basePrice;
          tax = 0;
          visitingCharges = 0;
          finalAmount = pendingPenalty;
          bookingStatus = SP_BOOKING_STATUS.SEARCHING;
          bookingPaymentStatus = finalAmount > 0 ? SP_PAYMENT_STATUS.PENDING : SP_PAYMENT_STATUS.PLAN_COVERED;
        } else {
          usePlanBenefits = false;
          paymentMethod = 'pay_at_home';
        }
      }
    }

    // Standard Pricing (Fallback)
    if (!usePlanBenefits) {
      if (amount && amount > 0) {
        if (reqBasePrice !== undefined && reqTax !== undefined) {
          basePrice = reqBasePrice;
          discount = reqDiscount || 0;
          tax = reqTax;
          visitingCharges = (reqVisitingCharges !== undefined) ? reqVisitingCharges : (visitingCharges || 49);
          finalAmount = (basePrice - discount + tax + visitingCharges) + pendingPenalty;
        } else {
          if (!visitingCharges) visitingCharges = 49;
          basePrice = Math.round((amount - visitingCharges) / 1.18);
          tax = amount - basePrice - visitingCharges;
          discount = 0;
          finalAmount = amount + pendingPenalty;
        }
      } else {
        if (!visitingCharges) visitingCharges = 49;
        basePrice = service.basePrice || 500;
        discount = service.discountPrice ? (basePrice - service.discountPrice) : 0;
        tax = Math.round(basePrice * 0.18);
        finalAmount = (basePrice - discount + tax + visitingCharges) + pendingPenalty;
      }
    }

    // Clear penalty from user wallet if we charged it
    if (pendingPenalty > 0) {
      user.wallet.penalty = 0;
      await user.save();
    }

    // Ensure minimum amount for Razorpay
    if (finalAmount < 1 && paymentMethod !== 'plan_benefit') {
      finalAmount = 1;
    }

    // Verify Advance Payment if provided
    let razorpayOrderId = null;
    let razorpayPaymentId = null;

    if (paymentDetails && paymentDetails.razorpay_payment_id) {
      const crypto = await import('crypto');
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentDetails;
      
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      bookingPaymentStatus = SP_PAYMENT_STATUS.SUCCESS;
      paymentMethod = 'online';
      razorpayOrderId = razorpay_order_id;
      razorpayPaymentId = razorpay_payment_id;
    }

    // Create booking
    const bookingNumber = `BK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    let finalCategory = category;
    if (!finalCategory && service.category) {
      finalCategory = await SpCategory.findOne({ title: service.category });
    }

    // Map booked items
    const formattedBookedItems = (Array.isArray(bookedItems) && bookedItems.length > 0) ? bookedItems.map(item => ({
      brandName: item.brandName || item.sectionTitle || item.brand || '',
      brandIcon: item.brandIcon || item.sectionIcon || item.icon || null,
      card: item.card || item,
      quantity: item.quantity || 1
    })) : [];

    // Extract Visual Identity Details
    const categoryIcon = finalCategory?.icon || finalCategory?.image || service.iconUrl || 'https://cdn-icons-png.flaticon.com/512/3500/3500833.png';
    let brandName = null;
    let brandIcon = null;

    if (formattedBookedItems.length > 0) {
      const distinctBrands = [...new Set(formattedBookedItems.map(item => item.brandName).filter(Boolean))];
      if (distinctBrands.length > 0) {
        brandName = distinctBrands.join(', ');
      }
      brandIcon = formattedBookedItems[0].brandIcon || null;
    }

    const booking = await SpBooking.create({
      bookingNumber,
      userId,
      vendorId: null,
      serviceId,
      categoryId: finalCategory?._id || categoryId,
      serviceName: service.title,
      serviceCategory: reqServiceCategory || finalCategory?.title || service.category || 'General',
      categoryIcon: reqCategoryIcon || categoryIcon,
      brandName: reqBrandName || brandName,
      brandIcon: reqBrandIcon || brandIcon,
      bookingType: bookingType || 'scheduled',
      description: service.description,
      serviceImages: service.images || [],
      bookedItems: formattedBookedItems,
      basePrice,
      discount,
      tax,
      visitingCharges,
      finalAmount,
      userPayableAmount: finalAmount,
      address: {
        type: address.type || 'home',
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark || '',
        lat: address.lat || null,
        lng: address.lng || null
      },
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      timeSlot: { start: timeSlot.start, end: timeSlot.end },
      paymentMethod: paymentMethod || null,
      status: bookingStatus,
      paymentStatus: bookingPaymentStatus,
      razorpayOrderId: razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId
    });

    // --- IMMEDIATE RESPONSE ---
    res.status(201).json({
      success: true,
      message: 'Booking created successfully. We are finding vendors for you.',
      data: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        finalAmount: booking.finalAmount,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        address: booking.address,
        serviceName: booking.serviceName,
        categoryIcon: booking.categoryIcon,
        brandName: booking.brandName,
        brandIcon: booking.brandIcon,
      }
    });

    // --- DEFERRED POST-BOOKING OPERATIONS ---
    setImmediate(async () => {
      try {
        const userForBackground = await SpUser.findById(userId);
        const bookingForBackground = await SpBooking.findById(booking._id)
          .populate('userId', 'name phone email')
          .populate('serviceId', 'title iconUrl')
          .populate('categoryId', 'title slug');
        const serviceForBackground = await SpUserService.findById(serviceId);

        if (!userForBackground || !bookingForBackground || !serviceForBackground) {
          console.error('[CreateBooking] Background task failed: User, Booking or Service not found.');
          return;
        }

        // If Plus membership was added
        if (isPlusAdded) {
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          userForBackground.plans = {
            isActive: true,
            name: 'Plus Membership',
            expiry: expiryDate,
            price: 999
          };
          await userForBackground.save();
        }

        // WAVE-BASED ALERTING
        const sortedVendors = nearbyVendors.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        const WAVE_1_COUNT = 3;
        const wave1Vendors = sortedVendors.slice(0, WAVE_1_COUNT);

        bookingForBackground.potentialVendors = sortedVendors.map(v => ({
          vendorId: v._id,
          distance: v.distance || 0
        }));
        bookingForBackground.currentWave = 1;
        bookingForBackground.waveStartedAt = new Date();
        bookingForBackground.notifiedVendors = wave1Vendors.map(v => v._id);
        await bookingForBackground.save();

        if (wave1Vendors.length > 0) {
          const { default: SpBookingRequest } = await import('../../models/SpBookingRequest.js');
          const bookingRequests = wave1Vendors.map(vendor => ({
            bookingId: bookingForBackground._id,
            vendorId: vendor._id,
            status: 'PENDING',
            wave: 1,
            distance: vendor.distance || null,
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000)
          }));

          try {
            await SpBookingRequest.insertMany(bookingRequests, { ordered: false });
          } catch (err) {
            if (err.code !== 11000) console.error('[CreateBooking] BookingRequest insert error:', err);
          }
        } else {
          bookingForBackground.status = SP_BOOKING_STATUS.NO_VENDORS;
          await bookingForBackground.save();
        }

        // Send notifications to Wave 1 vendors
        const io = req.app.get('io');
        if (io) {
          wave1Vendors.forEach(vendor => {
            const vendorRoom = `vendor_${vendor._id.toString()}`;
            io.to(vendorRoom).emit('new_booking_request', {
              bookingId: bookingForBackground._id,
              serviceName: serviceForBackground.title,
              customerName: userForBackground.name,
              customerPhone: userForBackground.phone,
              scheduledDate,
              scheduledTime,
              price: finalAmount,
              address,
              distance: vendor.distance,
              serviceCategory: bookingForBackground.serviceCategory,
              brandName: bookingForBackground.brandName,
              brandIcon: bookingForBackground.brandIcon,
              categoryIcon: bookingForBackground.categoryIcon,
              createdAt: bookingForBackground.createdAt || new Date(),
              expiresAt: new Date(new Date(bookingForBackground.createdAt || Date.now()).getTime() + (60 * 1000)).toISOString(),
              playSound: true,
              message: `New booking request within ${vendor.distance?.toFixed(1) || '?'}km!`
            });
          });
        }

        // Send Firebase/FCM notifications
        try {
          const vendorNotifications = wave1Vendors.map(vendor =>
            createNotification({
              vendorId: vendor._id,
              type: 'booking_request',
              title: 'New Booking Request',
              message: `New service request for ${serviceForBackground.title} from ${userForBackground.name}`,
              relatedId: bookingForBackground._id,
              relatedType: 'booking',
              data: {
                bookingId: bookingForBackground._id,
                serviceName: serviceForBackground.title,
                customerName: userForBackground.name,
                customerPhone: userForBackground.phone,
                scheduledDate,
                scheduledTime,
                location: address,
                price: finalAmount,
                distance: vendor.distance
              },
              pushData: {
                type: 'new_booking',
                dataOnly: false,
                link: `/vendor/bookings/${bookingForBackground._id}`
              }
            })
          );
          await Promise.all(vendorNotifications);
        } catch (notifError) {
          console.error('[CreateBooking] Firebase/Notification Error:', notifError.message);
        }

        // NOTIFY USER
        await createNotification({
          userId,
          type: 'booking_requested',
          title: 'Booking Created',
          message: `Your booking ${bookingForBackground.bookingNumber} has been created successfully.`,
          relatedId: bookingForBackground._id,
          relatedType: 'booking',
          pushData: {
            type: 'booking_requested',
            bookingId: bookingForBackground._id.toString(),
            link: `/user/booking/${bookingForBackground._id}`
          }
        });

        // Clear cart
        await SpCart.findOneAndUpdate({ userId }, { $set: { items: [] } });

        // Send vendor notification if direct booking
        if (vendorId) {
          await createNotification({
            vendorId,
            type: 'booking_created',
            title: 'New Booking Received',
            message: `You have received a new booking ${bookingForBackground.bookingNumber} for ${serviceForBackground.title}.`,
            relatedId: bookingForBackground._id,
            relatedType: 'booking'
          });
        }

        // Send confirmation emails (fire-and-forget)
        const vendorObj = vendorId ? await SpVendor.findById(vendorId).lean() : null;
        const { sendBookingEmails } = await import('../../services/emailService.js');
        sendBookingEmails(bookingForBackground, userForBackground, vendorObj, serviceForBackground)
          .catch(err => console.error('[CreateBooking][bg] Email error:', err));

      } catch (bgErr) {
        console.error('[CreateBooking][bg] Background task failed:', bgErr);
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking. Please try again.'
    });
  }
};

/**
 * Get user bookings with filters
 */
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    const query = { userId };
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    if (startDate || endDate) {
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = new Date(startDate);
      if (endDate) query.scheduledDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await SpBooking.find(query)
      .populate('vendorId', 'name businessName phone profilePhoto')
      .populate('serviceId', 'title iconUrl')
      .populate('categoryId', 'title slug')
      .populate('workerId', 'name phone profilePhoto')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await SpBooking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings. Please try again.' });
  }
};

/**
 * Get booking details by ID
 */
const getBookingById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const booking = await SpBooking.findOne({ _id: id, userId })
      .select('+visitOtp +paymentOtp')
      .populate('userId', 'name phone email')
      .populate('vendorId', 'name businessName phone email address profilePhoto')
      .populate('serviceId', 'title description iconUrl images')
      .populate('categoryId', 'title slug')
      .populate('workerId', 'name phone rating totalJobs location profilePhoto')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Fetch Vendor Bill if exists
    const { default: SpVendorBill } = await import('../../models/SpVendorBill.js');
    const bill = await SpVendorBill.findOne({ bookingId: booking._id });

    const bookingData = booking;
    if (bill) {
      bookingData.bill = bill;
    }

    res.status(200).json({ success: true, data: bookingData });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking. Please try again.' });
  }
};

/**
 * Cancel booking
 */
const cancelBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const rawReason = req.body?.cancellationReason ?? req.body?.reason;
    const cancellationReason = typeof rawReason === 'string'
      ? rawReason
      : (typeof rawReason?.reason === 'string' ? rawReason.reason : 'Cancelled by user');

    const booking = await SpBooking.findOne({ _id: id, userId });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === SP_BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
    }

    if (booking.status === SP_BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, message: 'Cannot cancel completed booking' });
    }

    // --- REFUND & CANCELLATION FEE LOGIC ---
    let refundAmount = 0;
    let cancellationFee = 0;
    let refundMessage = '';

    // Fetch dynamic cancellation penalty from Settings
    const { default: SpSettings } = await import('../../models/SpSettings.js');
    let settingsPenalty = 49;
    try {
      const globalSettings = await SpSettings.findOne({ type: 'global' });
      if (globalSettings && globalSettings.cancellationPenalty !== undefined) {
        settingsPenalty = globalSettings.cancellationPenalty;
      }
    } catch (err) {
      console.error('Error fetching settings for cancellation penalty:', err);
    }

    const hasStartedJourney = !!booking.journeyStartedAt;
    const isPaid = booking.paymentStatus === SP_PAYMENT_STATUS.SUCCESS;
    const isWalletOrOnline = ['wallet', 'razorpay', 'upi', 'card'].includes(booking.paymentMethod);

    if (hasStartedJourney) {
      const hasReached = !!booking.visitedAt || booking.status === 'visited';

      if (hasReached) {
        cancellationFee = booking.visitingCharges || 49;
      } else {
        cancellationFee = settingsPenalty;
      }

      if (isPaid && isWalletOrOnline) {
        refundAmount = Math.max(0, booking.finalAmount - cancellationFee);
        refundMessage = `Booking cancelled after ${hasReached ? 'professional arrival' : 'journey start'}. Refund of ₹${refundAmount} initiated (Cancellation Fee: ₹${cancellationFee} deducted).`;
      } else {
        refundAmount = 0;
        refundMessage = `Booking cancelled after ${hasReached ? 'professional arrival' : 'journey start'}. A cancellation fee of ₹${cancellationFee} has been added to your account and will be charged on your next booking.`;
      }
    } else {
      cancellationFee = 0;
      if (isPaid && isWalletOrOnline) {
        refundAmount = booking.finalAmount;
        refundMessage = `Booking cancelled successfully. Full refund of ₹${refundAmount} initiated to your wallet.`;
      } else {
        refundAmount = 0;
        refundMessage = 'Booking cancelled successfully.';
      }
    }

    // Update User Wallet
    if (refundAmount > 0 || (cancellationFee > 0 && !isPaid)) {
      const { default: SpTransaction } = await import('../../models/SpTransaction.js');
      const userDoc = await SpUser.findById(userId);

      if (userDoc) {
        if (!userDoc.wallet) userDoc.wallet = { balance: 0, penalty: 0 };

        if (refundAmount > 0) {
          userDoc.wallet.balance = (userDoc.wallet.balance || 0) + refundAmount;
          await SpTransaction.create({
            userId: userDoc._id,
            type: 'refund',
            amount: refundAmount,
            status: 'completed',
            paymentMethod: 'wallet',
            description: `Refund for booking #${booking.bookingNumber}`,
            bookingId: booking._id,
            balanceAfter: userDoc.wallet.balance
          });
          booking.paymentStatus = SP_PAYMENT_STATUS.REFUNDED;
        }

        if (cancellationFee > 0 && !isPaid) {
          userDoc.wallet.penalty = (userDoc.wallet.penalty || 0) + cancellationFee;
        }

        await userDoc.save();
      }
    }

    // Update booking status
    booking.status = SP_BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancelledBy = 'user';
    booking.cancellationReason = cancellationReason;
    await booking.save();

    // Send notification to user
    await createNotification({
      userId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: refundMessage || `Your booking ${booking.bookingNumber} has been cancelled.`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: { type: 'booking_cancelled', bookingId: booking._id.toString(), link: `/user/booking/${booking._id}` }
    });

    // Send notification to vendor
    if (booking.vendorId) {
      await createNotification({
        vendorId: booking.vendorId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Booking ${booking.bookingNumber} has been cancelled by the customer.`,
        relatedId: booking._id,
        relatedType: 'booking',
        pushData: { type: 'booking_cancelled', bookingId: booking._id.toString(), link: `/vendor/bookings/${booking._id}` }
      });
    }

    // Notify worker if assigned
    if (booking.workerId) {
      await createNotification({
        workerId: booking.workerId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `Job ${booking.bookingNumber} has been cancelled by the customer.`,
        relatedId: booking._id,
        relatedType: 'booking',
        pushData: { type: 'job_cancelled', bookingId: booking._id.toString(), link: `/worker/job/${booking._id}` }
      });
    }

    res.status(200).json({ success: true, message: refundMessage || 'Booking cancelled successfully', data: booking });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking. Please try again.' });
  }
};

/**
 * Reschedule booking
 */
const rescheduleBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { scheduledDate, scheduledTime, timeSlot } = req.body;

    const booking = await SpBooking.findOne({ _id: id, userId });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === SP_BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({ success: false, message: 'Cannot reschedule completed booking' });
    }

    if (booking.status === SP_BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({ success: false, message: 'Cannot reschedule cancelled booking' });
    }

    booking.scheduledDate = new Date(scheduledDate);
    booking.scheduledTime = scheduledTime;
    booking.timeSlot = { start: timeSlot.start, end: timeSlot.end };

    if (booking.status === SP_BOOKING_STATUS.CONFIRMED) {
      booking.status = SP_BOOKING_STATUS.PENDING;
    }

    await booking.save();

    await createNotification({
      vendorId: booking.vendorId,
      type: 'booking_created',
      title: 'Booking Rescheduled',
      message: `Booking ${booking.bookingNumber} has been rescheduled.`,
      relatedId: booking._id,
      relatedType: 'booking',
      pushData: { type: 'booking_rescheduled', bookingId: booking._id.toString(), link: `/vendor/bookings/${booking._id}` }
    });

    res.status(200).json({ success: true, message: 'Booking rescheduled successfully', data: booking });
  } catch (error) {
    console.error('Reschedule booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to reschedule booking. Please try again.' });
  }
};

/**
 * Add review and rating after completion
 */
const addReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const userId = req.user.id;
    const { id } = req.params;
    const { rating, review, reviewImages } = req.body;

    const booking = await SpBooking.findOne({ _id: id, userId });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== SP_BOOKING_STATUS.COMPLETED && booking.status !== SP_BOOKING_STATUS.WORK_DONE) {
      return res.status(400).json({ success: false, message: 'Can only review bookings after work is done' });
    }

    if (booking.rating) {
      return res.status(400).json({ success: false, message: 'Booking already reviewed' });
    }

    booking.rating = rating;
    booking.review = review || null;
    booking.reviewImages = reviewImages || [];
    booking.reviewedAt = new Date();
    await booking.save();

    // Create a new Review document
    try {
      await SpReview.create({
        bookingId: booking._id,
        userId: booking.userId,
        serviceId: booking.serviceId,
        vendorId: booking.vendorId,
        workerId: booking.workerId,
        rating,
        review: review || '',
        images: reviewImages || [],
        status: 'active'
      });
    } catch (reviewErr) {
      console.error('Error creating separate review document:', reviewErr);
    }

    // Helper to update cumulative rating
    const updateCumulativeRating = async (Model, docId, newRating) => {
      try {
        const doc = await Model.findById(docId);
        if (!doc) return;
        const oldTotal = doc.totalReviews || 0;
        const oldRating = doc.rating || 0;
        const newTotal = oldTotal + 1;
        const updatedRating = ((oldRating * oldTotal) + newRating) / newTotal;
        doc.rating = Number(updatedRating.toFixed(2));
        doc.totalReviews = newTotal;
        await doc.save();
      } catch (err) {
        console.error(`Error updating rating for ${Model.modelName}:`, err);
      }
    };

    if (booking.vendorId) {
      await updateCumulativeRating(SpVendor, booking.vendorId, rating);
    }
    if (booking.workerId) {
      await updateCumulativeRating(SpWorker, booking.workerId, rating);
    }

    await createNotification({
      vendorId: booking.vendorId,
      type: 'review_submitted',
      title: 'New Review Received',
      message: `You have received a ${rating}-star review for booking ${booking.bookingNumber}.`,
      relatedId: booking._id,
      relatedType: 'booking'
    });

    res.status(200).json({ success: true, message: 'Review added successfully', data: booking });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ success: false, message: 'Failed to add review. Please try again.' });
  }
};

/**
 * Get user ratings and reviews (given by the user)
 */
const getUserRatings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await SpBooking.find({ userId, rating: { $ne: null } })
      .populate('vendorId', 'name businessName profilePhoto')
      .populate('serviceId', 'title iconUrl')
      .populate('workerId', 'name profilePhoto')
      .sort({ reviewedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpBooking.countDocuments({ userId, rating: { $ne: null } });

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user ratings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your ratings' });
  }
};

export {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  addReview,
  getUserRatings
};
