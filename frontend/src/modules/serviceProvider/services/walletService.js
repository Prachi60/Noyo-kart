import api from './api';

/**
 * Wallet Service - User Wallet
 */

export const walletService = {
  getBalance: async () => {
    const response = await api.get('/users/wallet/balance');
    return response.data;
  },

  addMoney: async (amount) => {
    const response = await api.post('/users/wallet/add-money', { amount });
    return response.data;
  },

  verifyTopup: async (paymentData) => {
    const response = await api.post('/users/wallet/verify-topup', paymentData);
    return response.data;
  },

  getTransactions: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/users/wallet/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  }
};

export default walletService;
