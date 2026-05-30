/**
 * Utility function to compress images client-side using HTML5 Canvas.
 * Supports customizing max width, max height, and output quality.
 * 
 * @param {File} file The original image file
 * @param {Object} options Compression configuration options
 * @param {number} [options.maxWidth=1200] Maximum width of output image
 * @param {number} [options.maxHeight=1200] Maximum height of output image
 * @param {number} [options.quality=0.85] Output JPEG quality (0.0 to 1.0)
 * @returns {Promise<File>} Compressed File object
 */
export const compressImage = (file, options = {}) => {
  return new Promise((resolve) => {
    // If the file is not an image, resolve immediately with original file
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_WIDTH = options.maxWidth || 1200;
      const MAX_HEIGHT = options.maxHeight || 1200;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          return resolve(file); // Fallback if blob generation fails
        }
        resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
          type: 'image/jpeg',
          lastModified: Date.now()
        }));
      }, 'image/jpeg', options.quality || 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback to original if load fails
    };
  });
};
