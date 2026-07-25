import React from 'react';
import CategoryCard from '../../../components/common/CategoryCard';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const ServiceCategories = React.memo(({ categories, onCategoryClick, onSeeAllClick }) => {


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
          className="grid grid-rows-2 grid-flow-col gap-y-3 overflow-x-auto overscroll-x-contain pb-1 scrollbar-hide"
          style={{ 
            gridAutoColumns: '25%',
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}
        >
          {serviceCategories.map((category, index) => {
            const iconSrc = toAssetUrl(category.icon || category.image);
            return (
              <div key={category.id || index} className="flex justify-center h-full">
                <CategoryCard
                  title={category.title}
                  icon={
                    <img
                      src={iconSrc}
                      alt={category.title}
                      className="w-10 h-10 object-contain group-hover:scale-110 transition-transform duration-300 will-change-transform"
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
        </div>
      </div>
    </div>
  );
});

ServiceCategories.displayName = 'ServiceCategories';

export default ServiceCategories;

