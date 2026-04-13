const CLOUDINARY_REGEX = /res\.cloudinary\.com/i;

/**
 * Appends Cloudinary optimisation transforms to a URL.
 * Safe to call on any URL — non-Cloudinary URLs are returned unchanged.
 */
export function applyCloudinaryTransform(url, params = "w_300,f_webp,q_auto") {
  if (!url || !CLOUDINARY_REGEX.test(url)) return url;
  // Insert transform before /upload/ path segment
  return url.replace(/\/upload\//, `/upload/${params}/`);
}
