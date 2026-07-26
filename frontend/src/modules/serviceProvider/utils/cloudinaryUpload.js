import axios from 'axios';
import api from '../services/api';

/**
 * Cloudinary Direct Upload Utility
 * Uploads files directly to Cloudinary using a secure signature from our backend.
 */

export const uploadToCloudinary = async (file, folder = 'appzeto', onProgress) => {
  try {
    const signResponse = await api.get(`/admin/upload/sign-signature?folder=${folder}`);

    if (!signResponse.data.success) {
      throw new Error('Failed to get upload signature');
    }

    const { signature, timestamp, apiKey, cloudName } = signResponse.data;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    const response = await axios.post(cloudinaryUrl, formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });

    return response.data.secure_url;
  } catch (error) {
    console.error('Cloudinary Direct Upload Error:', error);
    throw error;
  }
};

export default uploadToCloudinary;
