import React, { useState } from 'react';

/**
 * OptimizedImage Component
 * Handles lazy loading, custom fade-in transition, skeleton fallback, and broken links
 */
const OptimizedImage = ({ src, alt = '', className = '', width, height, ...rest }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Clean placeholder image data-uri
  const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect width="100%25" height="100%25" fill="%23f3f4f6"/%3E%3C/svg%3E';

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse z-10" />
      )}
      <img
        src={error ? placeholder : src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-all duration-500 ease-out ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        {...rest}
      />
    </div>
  );
};

export default OptimizedImage;
