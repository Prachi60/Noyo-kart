import React, { useState } from 'react';
import CategoryCard from '../../../components/common/CategoryCard';

// Import local SP icons
import spIcon1 from '../../../../../../assets/sp/WhatsApp Image 2026-07-22 at 12.55.23 PM.jpeg';
import spIcon2 from '../../../../../../assets/sp/WhatsApp Image 2026-07-22 at 12.55.30 PM.jpeg';
import spIcon3 from '../../../../../../assets/sp/WhatsApp Image 2026-07-22 at 12.55.42 PM.jpeg';
import spIcon4 from '../../../../../../assets/sp/WhatsApp Image 2026-07-22 at 12.58.19 PM.jpeg';
import spIcon5 from '../../../../../../assets/sp/WhatsApp Image 2026-07-22 at 12.58.33 PM.jpeg';

const SP_ICONS = [spIcon1, spIcon2, spIcon3, spIcon4, spIcon5];

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

      <div className="pt-2">
        <div 
          className="grid grid-rows-2 grid-flow-col gap-y-6 gap-x-4 pb-2 overflow-x-auto overscroll-x-contain scrollbar-hide"
          style={{ 
            gridAutoColumns: 'minmax(80px, 1fr)',
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}
        >
          {serviceCategories.slice(0, showAll ? undefined : 7).map((category, index) => {
            let iconSrc = index < SP_ICONS.length ? SP_ICONS[index] : toAssetUrl(category.icon || category.image);

            return (
              <div key={category.id || index} className="flex justify-center h-full">
                <CategoryCard
                  title={category.title}
                  icon={
                  <div className="w-[60px] h-[60px] rounded-full bg-[#F4F4F5] flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                      <img
                        src={iconSrc}
                        alt={category.title}
                        className="w-full h-full object-cover mix-blend-multiply"
                        style={{ filter: 'contrast(1.15) brightness(1.05)' }}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  }
                  onClick={() => onCategoryClick?.(category)}
                  hasSaleBadge={category.hasSaleBadge}
                  index={index}
                />
              </div>
            );
          })}
          
          {/* Explore More / Show Less Card */}
          {categories.length > 7 && (
            <div className="flex justify-center h-full">
              <CategoryCard
                title={showAll ? "Less" : "See All"}
                icon={
                  <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-gray-600 bg-[#F4F4F5] shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:scale-105 transition-transform duration-300">
                    {showAll ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                }
                onClick={() => {
                  setShowAll(!showAll);
                  if (onSeeAllClick && !showAll) onSeeAllClick();
                }}
                index={showAll ? categories.length : 7}
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

