import api from './api';

const vendorService = {
  getProfile: async () => {
    const response = await api.get('/vendors/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/vendors/profile', profileData);
    return response.data;
  },

  updateAddress: async (addressData) => {
    const response = await api.put('/vendors/address', addressData);
    return response.data;
  },

  updateLocation: async (lat, lng) => {
    return api.put('/vendors/profile/location', { lat, lng });
  },

  getDashboardStats: async () => {
    const response = await api.get('/vendors/dashboard/stats');
    return response.data;
  },

  getRevenueAnalytics: async (period) => {
    const response = await api.get(`/vendors/dashboard/revenue?period=${period}`);
    return response.data;
  }
};

export default vendorService;
