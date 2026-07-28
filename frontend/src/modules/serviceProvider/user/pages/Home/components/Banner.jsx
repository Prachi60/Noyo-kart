import React from 'react';
import { optimizeCloudinaryUrl } from '@sp/utils/cloudinaryOptimize';

const Banner = React.memo(({ imageUrl, onClick }) => {
  // Optimize Cloudinary URLs for faster loading
  const optimizedUrl = imageUrl ? optimizeCloudinaryUrl(imageUrl, { quality: 'auto' }) : null;

  return (
    <div className="px-4 cursor-pointer group" onClick={onClick}>
      <div
        className="relative overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:scale-[1.01] aspect-[2/1] w-full"
        style={{
          borderRadius: '20px',
          boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.1), 0 5px 15px -3px rgba(0, 0, 0, 0.05)'
        }}
      >
        {optimizedUrl ? (
          <img
            src={optimizedUrl}
            alt="Banner"
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-teal-600 to-emerald-600 flex items-center justify-between p-8 text-white relative">
            <div className="relative z-10 max-w-[60%]">
              <span className="bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">Special Offer</span>
              <h3 className="text-xl font-black mt-3 leading-tight">Super Clean & Smart Home Services</h3>
              <p className="text-xs text-white/80 mt-1">Get top professional service at your doorstep with up to 50% off.</p>
            </div>
            <span className="text-5xl select-none opacity-80">✨</span>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-6 translate-x-6"></div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
      </div>
    </div>
  );
});

Banner.displayName = 'Banner';

export default Banner;
