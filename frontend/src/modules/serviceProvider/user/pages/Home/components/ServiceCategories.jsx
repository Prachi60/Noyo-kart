import React, { useState } from 'react';
import CategoryCard from '../../../components/common/CategoryCard';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const ServiceCategories = React.memo(({ categories, onCategoryClick, onSeeAllClick }) => {
  const [showAll, setShowAll] = useState(false);

  if (!Array.isArray(categories) || categories.length === 0) {
    return null;
  }

  const serviceCategories = categories.map((cat) => ({
    ...cat,
    icon: toAssetUrl(cat.icon || cat.image),
  }));

  return (
    <div className="px-5">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h2 className="text-[18px] font-black text-gray-900 tracking-tight flex items-center gap-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Service Categories
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(40,116,240,0.5)]"></div>
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] -mt-0.5" style={{ fontFamily: "'Poppins', sans-serif" }}>Premium Home Services</p>
        </div>

      </div>

      {/* White Card Container for Grid as per new design */}
      <div className="bg-white rounded-[24px] p-3 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] border border-gray-50/50">
        <div 
          className="grid grid-rows-2 grid-flow-col gap-y-4 gap-x-2 pb-1 overflow-x-auto overscroll-x-contain scrollbar-hide"
          style={{ 
            gridAutoColumns: '32%',
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}
        >
          {serviceCategories.slice(0, showAll ? undefined : 5).map((category, index) => {
            const iconSrc = toAssetUrl(category.icon || category.image);
            return (
              <div key={category.id || index} className="flex justify-center h-full">
                <CategoryCard
                  title={category.title}
                  icon={
                    <img
                      src={iconSrc}
                      alt={category.title}
                      className="w-12 h-12 rounded-xl object-cover group-hover:scale-110 transition-transform duration-500 will-change-transform shadow-sm"
                      loading="lazy"
                      decoding="async"
                    />
                  }
                  onClick={() => onCategoryClick?.(category)}
                  hasSaleBadge={category.hasSaleBadge}
                  index={index}
                />
              </div>
            );
          })}
          
          {/* Explore More / Show Less Card */}
          {categories.length > 5 && (
            <div className="flex justify-center h-full">
              <CategoryCard
                title={showAll ? "Show Less" : "All Services"}
                icon={
                  <div className="w-full h-full flex items-center justify-center text-gray-700 bg-gray-50/50">
                    {showAll ? (
                      <svg className="w-8 h-8 group-hover:scale-110 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 group-hover:scale-110 transition-transform duration-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                      </svg>
                    )}
                  </div>
                }
                onClick={() => {
                  setShowAll(!showAll);
                  if (onSeeAllClick && !showAll) onSeeAllClick();
                }}
                index={showAll ? categories.length : 5}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ServiceCategories.displayName = 'ServiceCategories';

export default ServiceCategories;

