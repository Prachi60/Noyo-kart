/**
 * Cloudinary URL Optimization Utility
 * Automatically transforms Cloudinary delivery URLs to add quality, format, width, and height optimizations.
 */
export const optimizeCloudinaryUrl = (url, options = {}) => {
  if (!url || typeof url !== 'string') return '';

  // If it's not a Cloudinary URL, return as-is
  if (!url.includes('res.cloudinary.com')) return url;

  const { width, height, quality = 'auto', format = 'auto', crop = 'fill' } = options;

  try {
    // Cloudinary URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567/public_id.jpg
    // We insert transformations right after '/upload/'
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;

    const transforms = [];

    if (format) transforms.push(`f_${format}`);
    if (quality) transforms.push(`q_${quality}`);
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    if (width || height) transforms.push(`c_${crop}`);

    if (transforms.length === 0) return url;

    return `${parts[0]}/upload/${transforms.join(',')}/${parts[1]}`;
  } catch (error) {
    console.error('Error optimizing Cloudinary URL:', error);
    return url;
  }
};

export default optimizeCloudinaryUrl;
