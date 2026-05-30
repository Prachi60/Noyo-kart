import api from './api';

const vendorWalletService = {
  getWallet: async () => {
    const response = await api.get('/vendors/wallet');
    return response.data;
  },

  getWalletSummary: async () => {
    const response = await api.get('/vendors/wallet/summary');
    return response.data;
  },

  getTransactions: async (params = {}) => {
    const response = await api.get('/vendors/wallet/transactions', { params });
    return response.data;
  },

  initiateCashCollection: async (bookingId, totalAmount, extraItems = []) => {
    const response = await api.post(`/bookings/cash/${bookingId}/initiate`, {
      totalAmount,
      extraItems
    });
    return response.data;
  },

  initiateOnlineCollection: async (bookingId, totalAmount, extraItems = []) => {
    const response = await api.post(`/bookings/cash/${bookingId}/initiate-online`, {
      totalAmount,
      extraItems
    });
    return response.data;
  },

  verifyOnlineCollection: async (bookingId) => {
    const response = await api.post(`/bookings/cash/${bookingId}/verify-online`);
    return response.data;
  },

  confirmManualOnlineCollection: async (bookingId, otp) => {
    const response = await api.post(`/bookings/cash/${bookingId}/confirm-manual-online`, { otp });
    return response.data;
  },

  confirmCashCollection: async (bookingId, amount, otp = '', extraItems = []) => {
    const response = await api.post(`/bookings/cash/${bookingId}/confirm`, {
      amount,
      otp,
      extraItems
    });
    return response.data;
  },

  recordCashCollection: async (bookingId, amount, notes = '') => {
    return vendorWalletService.confirmCashCollection(bookingId, amount);
  },

  requestSettlement: async (data) => {
    const response = await api.post('/vendors/wallet/settlement', data);
    return response.data;
  },

  getSettlements: async (params = {}) => {
    const response = await api.get('/vendors/wallet/settlements', { params });
    return response.data;
  },

  payWorker: async (bookingId, amount, notes = '', transactionId = '', screenshot = '', paymentMethod = 'cash') => {
    const response = await api.post('/vendors/wallet/pay-worker', {
      bookingId, amount, notes, transactionId, screenshot, paymentMethod
    });
    return response.data;
  },

  requestWithdrawal: async (data) => {
    const response = await api.post('/vendors/wallet/withdrawal', data);
    return response.data;
  }
};

export default vendorWalletService;
