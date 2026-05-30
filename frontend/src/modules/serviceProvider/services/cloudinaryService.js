/**
 * Cloudinary Service
 */

export const uploadFile = async (file, options = {}) => {
  if (typeof file === 'string') {
    return file;
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
