import api from './api';

const reviewService = {
  getAllReviews: async (params) => {
    try {
      const response = await api.get('/admin/reviews', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch reviews' };
    }
  },

  getReviewStats: async () => {
    try {
      const response = await api.get('/admin/reviews/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch review statistics' };
    }
  },

  updateReviewStatus: async (id, status) => {
    try {
      const response = await api.patch(`/admin/reviews/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update review status' };
    }
  }
};

export default reviewService;
