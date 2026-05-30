import api from './api';

const adminSettlementService = {
  getDashboard: async () => {
    const response = await api.get('/admin/settlements/dashboard');
    return response.data;
  },

  getVendorBalances: async (params = {}) => {
    const response = await api.get('/admin/settlements/vendors', { params });
    return response.data;
  },

  getVendorLedger: async (vendorId, params = {}) => {
    const response = await api.get(`/admin/settlements/vendors/${vendorId}/ledger`, { params });
    return response.data;
  },

  getPendingSettlements: async (params = {}) => {
    const response = await api.get('/admin/settlements/pending', { params });
    return response.data;
  },

  getSettlementHistory: async (params = {}) => {
    const response = await api.get('/admin/settlements/history', { params });
    return response.data;
  },

  approveSettlement: async (settlementId, adminNotes = '') => {
    const response = await api.post(`/admin/settlements/${settlementId}/approve`, { adminNotes });
    return response.data;
  },

  rejectSettlement: async (settlementId, rejectionReason) => {
    const response = await api.post(`/admin/settlements/${settlementId}/reject`, { rejectionReason });
    return response.data;
  },

  blockVendor: async (vendorId, reason = '') => {
    const response = await api.post(`/admin/settlements/vendors/${vendorId}/block`, { reason });
    return response.data;
  },

  unblockVendor: async (vendorId) => {
    const response = await api.post(`/admin/settlements/vendors/${vendorId}/unblock`);
    return response.data;
  },

  updateCashLimit: async (vendorId, limit) => {
    const response = await api.post(`/admin/settlements/vendors/${vendorId}/cash-limit`, { limit });
    return response.data;
  },

  getWithdrawalRequests: async (params = {}) => {
    const response = await api.get('/admin/settlements/withdrawals', { params });
    return response.data;
  },

  approveWithdrawal: async (withdrawalId, data) => {
    const response = await api.post(`/admin/settlements/withdrawals/${withdrawalId}/approve`, data);
    return response.data;
  },

  rejectWithdrawal: async (withdrawalId, rejectionReason) => {
    const response = await api.post(`/admin/settlements/withdrawals/${withdrawalId}/reject`, { rejectionReason });
    return response.data;
  }
};

export default adminSettlementService;
