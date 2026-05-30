import { createOrder, verifyPayment, createQRCode, getQRCodePayments } from '../../services/razorpayService.js';
import SpBooking from '../../models/SpBooking.js';
import SpTransaction from '../../models/SpTransaction.js';

const createPaymentOrder = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    if (!bookingId || !amount) return res.status(400).json({ success: false, message: 'Booking ID and amount required' });
    const booking = await SpBooking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const orderResult = await createOrder(amount, 'INR', `BOOKING_${bookingId}_${Date.now()}`, { bookingId, userId: req.user.id });
    if (!orderResult.success) return res.status(500).json({ success: false, message: 'Failed to create payment order' });
    res.status(200).json({ success: true, data: { orderId: orderResult.orderId, amount: orderResult.amount / 100, currency: orderResult.currency, key: process.env.RAZORPAY_KEY_ID } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment order creation failed' });
  }
};

const verifyPaymentHandler = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    const booking = await SpBooking.findById(bookingId);
    if (booking) { booking.paymentStatus = 'success'; booking.paymentId = razorpay_payment_id; await booking.save(); }
    await SpTransaction.create({ userId: req.user.id, bookingId, type: 'payment', amount: booking?.finalAmount || 0, status: 'completed', paymentMethod: 'razorpay', referenceId: razorpay_payment_id });
    res.status(200).json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

const generateQRCode = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    const booking = await SpBooking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    const result = await createQRCode(amount, booking.bookingNumber, { bookingId });
    if (!result.success) return res.status(500).json({ success: false, message: result.error });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'QR code generation failed' });
  }
};

const checkQRPayment = async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    const result = await getQRCodePayments(qrCodeId);
    if (!result.success) return res.status(500).json({ success: false, message: result.error });
    res.status(200).json({ success: true, data: result.payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check payment status' });
  }
};

export { createPaymentOrder, verifyPaymentHandler as verifyPayment, generateQRCode, checkQRPayment };
