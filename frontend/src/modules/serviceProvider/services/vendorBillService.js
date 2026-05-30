import api from './api';

const vendorBillService = {
  createOrUpdateBill: async (bookingId, billData) => {
    const response = await api.post(`/vendors/bookings/${bookingId}/bill`, billData);
    return response.data;
  },

  getBill: async (bookingId) => {
    const response = await api.get(`/vendors/bookings/${bookingId}/bill`);
    return response.data;
  },

  getServiceCatalog: async () => {
    const response = await api.get('/vendors/catalog/services');
    return response.data;
  },

  getPartsCatalog: async () => {
    const response = await api.get('/vendors/catalog/parts');
    return response.data;
  }
};

export default vendorBillService;
