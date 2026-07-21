import api from './api';

/**
 * Booking Service
 * Handles all API calls for Bookings
 */

export const bookingService = {
  create: async (bookingData) => {
    const response = await api.post('/users/bookings', bookingData);
    return response.data;
  },

  getUserBookings: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/users/bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/users/bookings/${id}`);
    return response.data;
  },

  cancel: async (id, cancellationReason) => {
    const reason =
      typeof cancellationReason === 'string'
        ? cancellationReason
        : (cancellationReason?.reason || cancellationReason?.cancellationReason || 'Cancelled by user');
    const response = await api.post(`/users/bookings/${id}/cancel`, { cancellationReason: reason });
    return response.data;
  },

  reschedule: async (id, rescheduleData) => {
    const response = await api.put(`/users/bookings/${id}/reschedule`, rescheduleData);
    return response.data;
  },

  addReview: async (id, reviewData) => {
    const response = await api.post(`/users/bookings/${id}/review`, reviewData);
    return response.data;
  },

  getRatings: async (params = {}) => {
    const response = await api.get('/users/bookings/ratings', { params });
    return response.data;
  }
};

export default bookingService;
