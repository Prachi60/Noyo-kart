import api from './api';

const adminVendorService = {
  getAllVendors: async (params = {}) => {
    const response = await api.get('/admin/vendors', { params });
    return response.data;
  },

  getVendorDetails: async (id) => {
    const response = await api.get(`/admin/vendors/${id}`);
    return response.data;
  },

  approveVendor: async (id) => {
    const response = await api.post(`/admin/vendors/${id}/approve`);
    return response.data;
  },

  rejectVendor: async (id, reason) => {
    const response = await api.post(`/admin/vendors/${id}/reject`, { reason });
    return response.data;
  },

  suspendVendor: async (id) => {
    const response = await api.post(`/admin/vendors/${id}/suspend`);
    return response.data;
  },

  toggleStatus: async (id, isActive) => {
    const response = await api.patch(`/admin/vendors/${id}/status`, { isActive });
    return response.data;
  },

  deleteVendor: async (id) => {
    const response = await api.delete(`/admin/vendors/${id}`);
    return response.data;
  },

  getVendorBookings: async (id, params = {}) => {
    const response = await api.get(`/admin/vendors/${id}/bookings`, { params });
    return response.data;
  },

  getAllBookings: async (params = {}) => {
    const response = await api.get('/admin/vendors/bookings', { params });
    return response.data;
  },

  getVendorEarnings: async (id, params = {}) => {
    const response = await api.get(`/admin/vendors/${id}/earnings`, { params });
    return response.data;
  },

  getVendorPayments: async (params = {}) => {
    const response = await api.get('/admin/vendors/payments', { params });
    return response.data;
  },

  getVendorAnalytics: async (params = {}) => {
    const response = await api.get('/admin/reports/vendors', { params });
    return response.data;
  }
};

export default adminVendorService;
