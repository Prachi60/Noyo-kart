import React, { useRef, useEffect } from 'react';
import { createOptimizedScrollAnimation, createOptimizedStaggerAnimation } from '@sp/utils/optimizedScrollTrigger';
import ServiceWithRatingCard from '@sp/user/components/common/ServiceWithRatingCard';
import { themeColors } from '@sp/theme';

const ServiceSectionWithRating = React.memo(({ title, subtitle, services, onSeeAllClick, onServiceClick, onAddClick, showTopBorder = true }) => {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRef = useRef(null);

  // Removed GSAP animations to prevent items from being hidden if ScrollTrigger fails
  useEffect(() => {
    if (titleRef.current) titleRef.current.style.opacity = '1';
    if (cardsRef.current) {
      Array.from(cardsRef.current.children).forEach(card => {
        card.style.opacity = '1';
        card.style.transform = 'none';
      });
    }
  }, []);

  return (
    <div ref={sectionRef} className="mb-6">
      <div ref={titleRef} className="px-4 mb-5 flex items-center justify-between" style={{ opacity: 1 }}>
        <div>
          <h2
            className="text-xl font-bold mb-1 text-gray-900 tracking-tight"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm font-medium text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div ref={cardsRef} className="flex gap-4 overflow-x-auto px-4 lg:px-4 pb-4 scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible -mx-0">
        {services.map((service) => (
          <ServiceWithRatingCard
            key={service.id}
            title={service.title}
            rating={service.rating}
            reviews={service.reviews}
            price={service.price}
            originalPrice={service.originalPrice}
            discount={service.discount}
            image={service.image}
            onClick={() => onServiceClick?.(service)}
            onAddClick={() => onAddClick?.(service)}
          />
        ))}
      </div>
    </div>
  );
});

ServiceSectionWithRating.displayName = 'ServiceSectionWithRating';

export default ServiceSectionWithRating;

