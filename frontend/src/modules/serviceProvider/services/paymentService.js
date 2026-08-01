import api from './api';

/**
 * Payment Service
 */

export const paymentService = {
  createPrebookingOrder: async (amount) => {
    const response = await api.post('/payments/create-prebooking-order', { amount });
    return response.data;
  },

  createOrder: async (bookingId) => {
    const response = await api.post('/payments/create-order', { bookingId });
    return response.data;
  },

  verifyPayment: async (paymentData) => {
    const response = await api.post('/payments/verify', paymentData);
    return response.data;
  },

  processWalletPayment: async (bookingId) => {
    const response = await api.post('/payments/wallet', { bookingId });
    return response.data;
  },

  processRefund: async (bookingId, amount = null) => {
    const response = await api.post('/payments/refund', { bookingId, amount });
    return response.data;
  },

  getPaymentHistory: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/payments/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  confirmPayAtHome: async (bookingId) => {
    const response = await api.post('/payments/pay-at-home', { bookingId });
    return response.data;
  },

  createPlanOrder: async (planId) => {
    const response = await api.post('/payments/plan/create-order', { planId });
    return response.data;
  },

  verifyPlanPayment: async (paymentData) => {
    const response = await api.post('/payments/plan/verify', paymentData);
    return response.data;
  },

  getUpgradeDetails: async (planId) => {
    const response = await api.get(`/payments/plan/upgrade-details?planId=${planId}`);
    return response.data;
  }
};

export default paymentService;
