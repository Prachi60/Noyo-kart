import api, { apiCache } from './api';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

/**
 * Category API calls
 */
export const categoryService = {
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.showOnHome !== undefined) queryParams.append('showOnHome', params.showOnHome);
    if (params.isPopular !== undefined) queryParams.append('isPopular', params.isPopular);
    if (params.cityId) queryParams.append('cityId', params.cityId);

    const response = await api.get(`/admin/categories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/categories/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admin/categories', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/categories/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/categories/${id}`);
    return response.data;
  },

  updateOrder: async (id, homeOrder) => {
    const response = await api.patch(`/admin/categories/${id}/order`, { homeOrder });
    return response.data;
  }
};

/**
 * Brand API calls
 */
export const brandService = {
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.cityId) queryParams.append('cityId', params.cityId);

    const response = await api.get(`/admin/brands${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/brands/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admin/brands', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/brands/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/brands/${id}`);
    return response.data;
  },

  updatePage: async (id, page) => {
    const response = await api.patch(`/admin/brands/${id}/page`, { page });
    return response.data;
  },

  uploadImage: async (file, folder = 'brands', onProgress) => {
    try {
      const url = await uploadToCloudinary(file, folder, onProgress);
      return { success: true, imageUrl: url, message: 'File uploaded successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to upload file', error: error.message };
    }
  }
};

/**
 * Service API calls
 */
export const serviceService = {
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.brandId) queryParams.append('brandId', params.brandId);

    const response = await api.get(`/admin/services${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/services/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admin/services', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/services/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/services/${id}`);
    return response.data;
  },

  uploadImage: async (file, folder = 'services', onProgress) => {
    try {
      const url = await uploadToCloudinary(file, folder, onProgress);
      return { success: true, imageUrl: url, message: 'File uploaded successfully' };
    } catch (error) {
      return { success: false, message: 'Failed to upload file', error: error.message };
    }
  }
};

/**
 * Vendor Catalog API calls
 */
export const vendorCatalogService = {
  getAllServices: async () => {
    const response = await api.get('/admin/vendor-services');
    return response.data;
  },
  createService: async (data) => {
    const response = await api.post('/admin/vendor-services', data);
    return response.data;
  },
  updateService: async (id, data) => {
    const response = await api.put(`/admin/vendor-services/${id}`, data);
    return response.data;
  },
  deleteService: async (id) => {
    const response = await api.delete(`/admin/vendor-services/${id}`);
    return response.data;
  },
  getAllParts: async () => {
    const response = await api.get('/admin/vendor-parts');
    return response.data;
  },
  createPart: async (data) => {
    const response = await api.post('/admin/vendor-parts', data);
    return response.data;
  },
  updatePart: async (id, data) => {
    const response = await api.put(`/admin/vendor-parts/${id}`, data);
    return response.data;
  },
  deletePart: async (id) => {
    const response = await api.delete(`/admin/vendor-parts/${id}`);
    return response.data;
  }
};

/**
 * Home Content API calls
 */
export const homeContentService = {
  get: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.cityId) queryParams.append('cityId', params.cityId);
    const response = await api.get(`/admin/home-content${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  update: async (data, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.cityId) queryParams.append('cityId', params.cityId);
    const response = await api.put(`/admin/home-content${queryParams.toString() ? `?${queryParams.toString()}` : ''}`, data);
    return response.data;
  }
};

/**
 * Public Catalog Service (for user app)
 */
export const publicCatalogService = {
  getCategories: async (cityId) => {
    const cacheKey = `public:categories:${cityId || 'default'}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const query = cityId ? `?cityId=${cityId}` : '';
    const response = await api.get(`/public/catalog/categories${query}`);
    if (response.data.success) {
      apiCache.set(cacheKey, response.data, 300);
    }
    return response.data;
  },

  getBrands: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.categorySlug) queryParams.append('categorySlug', params.categorySlug);
    if (params.search) queryParams.append('search', params.search);
    if (params.cityId) queryParams.append('cityId', params.cityId);

    const cacheKey = `public:brands:${queryParams.toString()}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const response = await api.get(`/public/catalog/brands${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    if (response.data.success) {
      apiCache.set(cacheKey, response.data, 120);
    }
    return response.data;
  },

  getServices: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.brandId) queryParams.append('brandId', params.brandId);
    if (params.brandSlug) queryParams.append('brandSlug', params.brandSlug);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);

    const cacheKey = `public:services:${queryParams.toString()}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const response = await api.get(`/public/catalog/services${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    if (response.data.success) {
      apiCache.set(cacheKey, response.data, 120);
    }
    return response.data;
  },

  getBrandBySlug: async (slug, cityId) => {
    const cacheKey = `public:brand:${slug}:${cityId || 'default'}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const query = cityId ? `?cityId=${cityId}` : '';
    const response = await api.get(`/public/catalog/brands/slug/${slug}${query}`);
    if (response.data.success) {
      apiCache.set(cacheKey, response.data, 60);
    }
    return response.data;
  },

  getHomeContent: async (cityId) => {
    const cacheKey = `public:homeContent:${cityId || 'default'}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const query = cityId ? `?cityId=${cityId}` : '';
    const response = await api.get(`/public/catalog/home-data${query}`);
    if (response.data.success) {
      apiCache.set(cacheKey, response.data, 120);
    }
    return response.data;
  },

  getHomeData: async (cityId) => {
    const cacheKey = `public:homeData:${cityId || 'default'}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const query = cityId ? `?cityId=${cityId}` : '';
    const response = await api.get(`/public/catalog/home-data${query}`);
    if (response.data.success) {
      apiCache.set(cacheKey, response.data, 120);
    }
    return response.data;
  },

  invalidateCache: () => {
    apiCache.invalidatePrefix('public:');
  }
};
