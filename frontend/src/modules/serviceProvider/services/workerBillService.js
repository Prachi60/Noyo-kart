import api from './api';

const workerBillService = {
  createOrUpdateBill: async (jobId, billData) => {
    const response = await api.post(`/workers/jobs/${jobId}/bill`, billData);
    return response.data;
  },

  getBill: async (jobId) => {
    const response = await api.get(`/workers/jobs/${jobId}/bill`);
    return response.data;
  },

  getServiceCatalog: async () => {
    const response = await api.get('/workers/catalog/services');
    return response.data;
  },

  getPartsCatalog: async () => {
    const response = await api.get('/workers/catalog/parts');
    return response.data;
  }
};

export default workerBillService;
