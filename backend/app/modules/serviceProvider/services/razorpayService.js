import Razorpay from 'razorpay';
import crypto from 'crypto';
import axios from 'axios';

let razorpay;
let isTestMode = true;

try {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('⚠️  Razorpay credentials missing in .env file');
  } else {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    isTestMode = process.env.RAZORPAY_KEY_ID.startsWith('rzp_test');
    console.log(`✅ Razorpay initialized in ${isTestMode ? 'TEST' : 'LIVE'} mode`);
  }
} catch (error) {
  console.error('❌ Failed to initialize Razorpay:', error.message);
}

const createOrder = async (amount, currency = 'INR', receipt = null, notes = {}) => {
  try {
    if (!razorpay) {
      return { success: false, error: 'Razorpay not initialized.' };
    }
    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes
    };
    const order = await razorpay.orders.create(options);
    return { success: true, orderId: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt };
  } catch (error) {
    console.error('❌ Razorpay create order error:', error.message);
    return { success: false, error: error.description || error.message };
  }
};

const verifyPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  return generated_signature === razorpay_signature;
};

const getPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return { success: true, payment };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const refundPayment = async (paymentId, amount = null, notes = {}) => {
  try {
    const refundOptions = { payment_id: paymentId, notes };
    if (amount) refundOptions.amount = Math.round(amount * 100);
    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    return { success: true, refund };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const createQRCode = async (amount, bookingNumber, notes = {}) => {
  try {
    if (!razorpay) return { success: false, error: 'Razorpay not initialized' };
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const payload = {
      type: 'upi_qr',
      name: 'Service Payment',
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: Math.round(amount * 100),
      description: `Order Payment for ${bookingNumber}`,
      notes
    };

    try {
      const qrCode = await razorpay.qrCode.create(payload);
      return { success: true, qrCodeId: qrCode.id, imageUrl: qrCode.image_url, qrStatus: qrCode.status };
    } catch (e1) {
      // Fallback to payment link
      const linkPayload = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        description: `Payment for Booking #${bookingNumber}`,
        notes,
        notify: { sms: false, email: false }
      };
      const linkResponse = await axios.post('https://api.razorpay.com/v1/payment_links', linkPayload, {
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' }
      });
      const link = linkResponse.data;
      return {
        success: true,
        qrCodeId: link.id,
        imageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link.short_url)}`,
        paymentUrl: link.short_url,
      };
    }
  } catch (error) {
    return { success: false, error: error.response?.data?.error?.description || error.message };
  }
};

const getQRCodePayments = async (id) => {
  try {
    if (!razorpay) return { success: false, error: 'Razorpay not initialized' };
    if (id && id.startsWith('plink_')) {
      const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
      const response = await axios.get(`https://api.razorpay.com/v1/payment_links/${id}`, {
        headers: { 'Authorization': `Basic ${auth}` }
      });
      const link = response.data;
      if (link.status === 'paid' || link.status === 'partially_paid') {
        return { success: true, payments: [{ id: link.razorpay_payment_id || `pay_${Date.now()}`, status: 'captured', amount: link.amount_paid }] };
      }
      return { success: true, payments: [] };
    }
    const payments = await razorpay.qrCode.fetchAllPayments(id);
    return { success: true, payments: payments.items || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export { createOrder, verifyPayment, getPaymentDetails, refundPayment, createQRCode, getQRCodePayments };
export const getIsTestMode = () => isTestMode;
