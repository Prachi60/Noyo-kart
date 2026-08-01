import SpBooking from '../models/SpBooking.js';
import SpUser from '../models/SpUser.js';
import SpVendor from '../models/SpVendor.js';
import SpVendorBill from '../models/SpVendorBill.js';
import SpTransaction from '../models/SpTransaction.js';
import SpPlan from '../models/SpPlan.js';
import SpSettings from '../models/SpSettings.js';
import { validationResult } from 'express-validator';
import { SP_PAYMENT_STATUS, SP_BOOKING_STATUS } from '../constants.js';
import { createNotification } from './notificationController.js';

import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay
const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Razorpay keys missing from environment');
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const createOrder = async (amount, currency, receipt, notes) => {
  try {
    const razorpay = getRazorpayInstance();
    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit
      currency,
      receipt,
      notes
    };
    const order = await razorpay.orders.create(options);
    return { success: true, orderId: order.id, amount: order.amount, currency: order.currency };
  } catch (error) {
    console.error('[Payment] Razorpay createOrder error:', error);
    const errorMsg = error.error ? error.error.description : (error.message || JSON.stringify(error));
    return { success: false, error: errorMsg };
  }
};

const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    return expectedSignature === signature;
  } catch (error) {
    console.error('[Payment] Signature verification error:', error);
    return false;
  }
};

const refundPayment = async (paymentId, amount, notes) => {
  try {
    const razorpay = getRazorpayInstance();
    const options = { amount: Math.round(amount * 100), notes };
    const refund = await razorpay.payments.refund(paymentId, options);
    return { success: true, data: refund };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create Pre-booking Razorpay order (Advance Payment)
 */
export const createPrebookingOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    // Hot reload .env to ensure keys are picked up without server restart
    const fs = await import('fs');
    const path = await import('path');
    const dotenv = await import('dotenv');
    
    // Find the right .env file
    let envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath) || !fs.readFileSync(envPath).toString().includes('RAZORPAY_KEY_ID')) {
      envPath = path.resolve(process.cwd(), 'backend', '.env');
    }
    if (!fs.existsSync(envPath) || !fs.readFileSync(envPath).toString().includes('RAZORPAY_KEY_ID')) {
      envPath = path.resolve('d:/Noyo-kart/backend/.env'); // hard fallback
    }

    if (fs.existsSync(envPath)) {
      const dotenvParse = dotenv.parse || dotenv.default.parse;
      if (dotenvParse) {
        const envConfig = dotenvParse(fs.readFileSync(envPath));
        for (const k in envConfig) {
          process.env[k] = envConfig[k];
        }
      }
    }

    const orderResult = await createOrder(
      amount,
      'INR',
      `PREBOOK_${Date.now()}`,
      { userId: req.user && req.user.id ? req.user.id.toString() : 'unknown', type: 'advance_payment' }
    );

    if (!orderResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to create pre-booking order', error: orderResult.error });
    }

    res.status(200).json({
      success: true,
      message: 'Pre-booking order created successfully',
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amount / 100,
        currency: orderResult.currency,
        key: process.env.RAZORPAY_KEY_ID,
        isMock: false
      }
    });
  } catch (error) {
    console.error('Create pre-booking order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create pre-booking order.', error: error.message || error });
  }
};

/**
 * Create Razorpay order for booking payment
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const userId = req.user.id;
    const { bookingId } = req.body;

    const booking = await SpBooking.findOne({ _id: bookingId, userId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.paymentStatus === SP_PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({ success: false, message: 'Payment already completed for this booking' });
    }

    // Hot reload .env to ensure keys are picked up without server restart
    const fs = await import('fs');
    const path = await import('path');
    const dotenv = await import('dotenv');
    
    // Find the right .env file
    let envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath) || !fs.readFileSync(envPath).toString().includes('RAZORPAY_KEY_ID')) {
      envPath = path.resolve(process.cwd(), 'backend', '.env');
    }
    if (!fs.existsSync(envPath) || !fs.readFileSync(envPath).toString().includes('RAZORPAY_KEY_ID')) {
      envPath = path.resolve('d:/Noyo-kart/backend/.env'); // hard fallback
    }

    if (fs.existsSync(envPath)) {
      const dotenvParse = dotenv.parse || dotenv.default.parse;
      if (dotenvParse) {
        const envConfig = dotenvParse(fs.readFileSync(envPath));
        for (const k in envConfig) {
          process.env[k] = envConfig[k];
        }
      }
    }

    const orderResult = await createOrder(
      booking.finalAmount,
      'INR',
      booking.bookingNumber,
      { bookingId: booking._id.toString(), userId: userId.toString(), bookingNumber: booking.bookingNumber }
    );

    if (!orderResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to create payment order', error: orderResult.error });
    }

    booking.razorpayOrderId = orderResult.orderId;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: orderResult.orderId,
        amount: orderResult.amount / 100,
        currency: orderResult.currency,
        key: process.env.RAZORPAY_KEY_ID,
        bookingId: booking._id
      }
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order.' });
  }
};

/**
 * Verify payment (webhook handler)
 */
export const verifyPaymentWebhook = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const booking = await SpBooking.findOne({ razorpayOrderId: razorpay_order_id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.paymentStatus = SP_PAYMENT_STATUS.SUCCESS;
    booking.paymentMethod = 'online';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.paymentId = razorpay_payment_id;

    if ([SP_BOOKING_STATUS.PENDING, SP_BOOKING_STATUS.SEARCHING, SP_BOOKING_STATUS.AWAITING_PAYMENT].includes(booking.status)) {
      booking.status = SP_BOOKING_STATUS.CONFIRMED;
    } else if (booking.status === SP_BOOKING_STATUS.WORK_DONE) {
      booking.status = SP_BOOKING_STATUS.COMPLETED;
      booking.completedAt = new Date();
    }

    await booking.save();

    // User payment transaction
    await SpTransaction.create({
      userId: booking.userId,
      bookingId: booking._id,
      amount: booking.finalAmount,
      type: 'payment',
      paymentMethod: 'razorpay',
      status: 'completed',
      description: `Online payment for booking ${booking.bookingNumber}`,
      referenceId: razorpay_payment_id
    });

    // Fetch VendorBill for earnings
    const bill = await SpVendorBill.findOne({ bookingId: booking._id });

    if (bill && booking.vendorId) {
      const vendorEarning = bill.vendorTotalEarning;

      bill.status = 'paid';
      bill.paidAt = new Date();
      await bill.save();

      await SpVendor.findByIdAndUpdate(booking.vendorId, {
        $inc: { 'wallet.earnings': vendorEarning }
      });

      if (vendorEarning > 0) {
        await SpTransaction.create({
          vendorId: booking.vendorId,
          bookingId: booking._id,
          amount: vendorEarning,
          type: 'earnings_credit',
          paymentMethod: 'system',
          status: 'completed',
          description: `Earnings ₹${vendorEarning} credited for booking ${booking.bookingNumber} (online payment)`
        });
      }
    }

    // Notify user
    await createNotification({
      userId: booking.userId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Payment of ₹${booking.finalAmount} for booking ${booking.bookingNumber} was successful.`,
      relatedId: booking._id,
      relatedType: 'payment',
      priority: 'high'
    });

    if (booking.vendorId) {
      await createNotification({
        vendorId: booking.vendorId,
        type: 'payment_success',
        title: 'Payment Received',
        message: `Payment received for booking ${booking.bookingNumber}.`,
        relatedId: booking._id,
        relatedType: 'booking',
        priority: 'high'
      });
    }

    res.status(200).json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
};

/**
 * Process wallet payment
 */
export const processWalletPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const userId = req.user.id;
    const { bookingId } = req.body;

    const user = await SpUser.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const booking = await SpBooking.findOne({ _id: bookingId, userId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.paymentStatus === SP_PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({ success: false, message: 'Payment already completed' });
    }

    if (user.wallet.balance < booking.finalAmount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    user.wallet.balance -= booking.finalAmount;
    await user.save();

    await SpTransaction.create({
      userId,
      bookingId: booking._id,
      amount: booking.finalAmount,
      type: 'debit',
      paymentMethod: 'wallet',
      status: 'completed',
      description: `Wallet payment for booking ${booking.bookingNumber}`,
      balanceAfter: user.wallet.balance
    });

    booking.paymentStatus = SP_PAYMENT_STATUS.SUCCESS;
    booking.paymentMethod = 'wallet';
    booking.paymentId = `WALLET_${Date.now()}`;

    if ([SP_BOOKING_STATUS.PENDING, SP_BOOKING_STATUS.SEARCHING, SP_BOOKING_STATUS.AWAITING_PAYMENT].includes(booking.status)) {
      booking.status = SP_BOOKING_STATUS.CONFIRMED;
    } else if (booking.status === SP_BOOKING_STATUS.WORK_DONE) {
      booking.status = SP_BOOKING_STATUS.COMPLETED;
      booking.completedAt = new Date();
    }

    await booking.save();

    // Credit vendor
    const bill = await SpVendorBill.findOne({ bookingId: booking._id });
    if (bill && booking.vendorId) {
      const vendorEarning = bill.vendorTotalEarning;
      bill.status = 'paid';
      bill.paidAt = new Date();
      await bill.save();

      await SpVendor.findByIdAndUpdate(booking.vendorId, {
        $inc: { 'wallet.earnings': vendorEarning }
      });
    }

    await createNotification({
      userId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Payment of ₹${booking.finalAmount} for booking ${booking.bookingNumber} was successful.`,
      relatedId: booking._id,
      relatedType: 'payment',
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: { bookingId: booking._id, amount: booking.finalAmount, remainingBalance: user.wallet.balance }
    });
  } catch (error) {
    console.error('Process wallet payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to process payment.' });
  }
};

/**
 * Process refund
 */
export const processRefund = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    const booking = await SpBooking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.paymentStatus !== SP_PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({ success: false, message: 'Payment not completed for this booking' });
    }

    if (booking.paymentMethod === 'wallet') {
      const user = await SpUser.findById(booking.userId);
      if (user) {
        user.wallet.balance += (amount || booking.finalAmount);
        await user.save();
      }
      booking.paymentStatus = SP_PAYMENT_STATUS.REFUNDED;
    } else {
      // For online payments, integrate with payment gateway refund
      booking.paymentStatus = SP_PAYMENT_STATUS.REFUNDED;
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: { bookingId: booking._id, refundAmount: amount || booking.finalAmount }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund.' });
  }
};

/**
 * Get payment history
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await SpBooking.find({
      userId,
      paymentStatus: SP_PAYMENT_STATUS.SUCCESS
    })
      .populate('serviceId', 'title iconUrl')
      .populate('vendorId', 'name businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SpBooking.countDocuments({ userId, paymentStatus: SP_PAYMENT_STATUS.SUCCESS });

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history.' });
  }
};

/**
 * Confirm Pay at Home option
 */
export const confirmPayAtHome = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.body;

    const booking = await SpBooking.findOne({ _id: bookingId, userId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.paymentStatus === SP_PAYMENT_STATUS.SUCCESS) {
      return res.status(400).json({ success: false, message: 'Payment already completed' });
    }

    booking.paymentMethod = 'pay_at_home';
    booking.paymentStatus = SP_PAYMENT_STATUS.PENDING;
    booking.status = SP_BOOKING_STATUS.CONFIRMED;
    await booking.save();

    await createNotification({
      vendorId: booking.vendorId,
      type: 'booking_confirmed',
      title: 'Booking Confirmed (Pay at Home)',
      message: `Booking ${booking.bookingNumber} confirmed. Payment: Pay at Home.`,
      relatedId: booking._id,
      relatedType: 'booking'
    });

    res.status(200).json({ success: true, message: 'Booking confirmed with Pay at Home option', data: booking });
  } catch (error) {
    console.error('Confirm Pay at Home error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm booking.' });
  }
};

/**
 * Create plan order
 */
export const createPlanOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await SpPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const user = await SpUser.findById(req.user.id);
    const amountWithTax = Math.ceil(plan.price * 1.18);

    // Hot reload .env to ensure keys are picked up without server restart
    const fs = await import('fs');
    const path = await import('path');
    const dotenv = await import('dotenv');
    
    // Find the right .env file
    let envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath) || !fs.readFileSync(envPath).toString().includes('RAZORPAY_KEY_ID')) {
      envPath = path.resolve(process.cwd(), 'backend', '.env');
    }
    if (!fs.existsSync(envPath) || !fs.readFileSync(envPath).toString().includes('RAZORPAY_KEY_ID')) {
      envPath = path.resolve('d:/Noyo-kart/backend/.env'); // hard fallback
    }

    if (fs.existsSync(envPath)) {
      const dotenvParse = dotenv.parse || dotenv.default.parse;
      if (dotenvParse) {
        const envConfig = dotenvParse(fs.readFileSync(envPath));
        for (const k in envConfig) {
          process.env[k] = envConfig[k];
        }
      }
    }

    const orderResult = await createOrder(amountWithTax, 'INR', `PLAN_${Date.now()}`, { type: 'plan', planId, userId: req.user.id });
    if (!orderResult.success) {
      return res.status(500).json({ success: false, message: 'Order creation failed' });
    }

    res.status(200).json({
      success: true,
      data: { orderId: orderResult.orderId, amount: orderResult.amount / 100, key: process.env.RAZORPAY_KEY_ID }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Verify plan payment
 */
export const verifyPlanPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid signature' });

    const plan = await SpPlan.findById(planId);
    const user = await SpUser.findById(req.user.id);

    const validityDays = plan.validityDays || 30;
    user.plans = {
      isActive: true,
      name: plan.name,
      expiry: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
      price: plan.price
    };

    await user.save();

    res.status(200).json({ success: true, message: 'Plan activated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get upgrade details
 */
export const getUpgradeDetails = async (req, res) => {
  try {
    const { planId } = req.query;
    if (!planId) return res.status(400).json({ success: false, message: 'Plan ID required' });

    const newPlan = await SpPlan.findById(planId);
    if (!newPlan) return res.status(404).json({ success: false, message: 'Plan not found' });

    const user = await SpUser.findById(req.user.id);

    // Calculate upgrade amount
    let credit = 0;
    let amount = newPlan.price;
    if (user.plans && user.plans.isActive && user.plans.expiry > new Date()) {
      const totalDuration = 30 * 24 * 60 * 60 * 1000;
      const remainingTime = new Date(user.plans.expiry).getTime() - Date.now();
      let remainingRatio = Math.min(Math.max(remainingTime / totalDuration, 0), 1);
      credit = Math.floor((user.plans.price || 0) * remainingRatio);
      amount = Math.max(Math.ceil(newPlan.price - credit), 0);
    }

    res.status(200).json({
      success: true,
      data: { originalPrice: newPlan.price, credit, finalAmount: amount }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
