import api from './api';

const adminWorkerService = {
  getAllWorkers: async (params = {}) => {
    const response = await api.get('/admin/workers', { params });
    return response.data;
  },

  getWorkerDetails: async (id) => {
    const response = await api.get(`/admin/workers/${id}`);
    return response.data;
  },

  approveWorker: async (id) => {
    const response = await api.post(`/admin/workers/${id}/approve`);
    return response.data;
  },

  rejectWorker: async (id, reason) => {
    const response = await api.post(`/admin/workers/${id}/reject`, { reason });
    return response.data;
  },

  suspendWorker: async (id) => {
    const response = await api.post(`/admin/workers/${id}/suspend`);
    return response.data;
  },

  toggleStatus: async (id, isActive) => {
    const response = await api.patch(`/admin/workers/${id}/status`, { isActive });
    return response.data;
  },

  deleteWorker: async (id) => {
    const response = await api.delete(`/admin/workers/${id}`);
    return response.data;
  },

  getWorkerJobs: async (id, params = {}) => {
    const response = await api.get(`/admin/workers/${id}/jobs`, { params });
    return response.data;
  },

  getAllJobs: async (params = {}) => {
    const response = await api.get('/admin/workers/jobs', { params });
    return response.data;
  },

  getWorkerEarnings: async (id) => {
    const response = await api.get(`/admin/workers/${id}/earnings`);
    return response.data;
  },

  payWorker: async (id, paymentData) => {
    const response = await api.post(`/admin/workers/${id}/pay`, paymentData);
    return response.data;
  },

  getWorkerAnalytics: async (params = {}) => {
    const response = await api.get('/admin/reports/workers', { params });
    return response.data;
  },

  getWorkerPayments: async (params = {}) => {
    const response = await api.get('/admin/workers/payments', { params });
    return response.data;
  }
};

export default adminWorkerService;
