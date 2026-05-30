import api from './api';

const adminReportService = {
  getBookingReport: async (params) => {
    try {
      const response = await api.get('/admin/reports/bookings', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch booking report' };
    }
  },

  getVendorReport: async (params) => {
    try {
      const response = await api.get('/admin/reports/vendors', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch vendor report' };
    }
  },

  getWorkerReport: async (params) => {
    try {
      const response = await api.get('/admin/reports/workers', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch worker report' };
    }
  },

  getCustomerReport: async (params) => {
    try {
      const response = await api.get('/admin/reports/customers', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch customer report' };
    }
  },

  getRevenueReport: async (params) => {
    try {
      const response = await api.get('/admin/reports/revenue', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch revenue report' };
    }
  }
};

export default adminReportService;
