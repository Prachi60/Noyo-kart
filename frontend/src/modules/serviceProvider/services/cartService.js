import api from './api';

/**
 * Cart Service - Backend API Based
 */

export const cartService = {
  getCart: async () => {
    const response = await api.get('/users/cart');
    return response.data;
  },

  addToCart: async (itemData) => {
    const response = await api.post('/users/cart', itemData);
    return response.data;
  },

  updateItem: async (itemId, serviceCount) => {
    const response = await api.put(`/users/cart/${itemId}`, { serviceCount });
    return response.data;
  },

  removeItem: async (itemId) => {
    const response = await api.delete(`/users/cart/${itemId}`);
    return response.data;
  },

  removeCategoryItems: async (category) => {
    const response = await api.delete(`/users/cart/category/${encodeURIComponent(category)}`);
    return response.data;
  },

  clearCart: async () => {
    const response = await api.delete('/users/cart');
    return response.data;
  }
};

export default cartService;
