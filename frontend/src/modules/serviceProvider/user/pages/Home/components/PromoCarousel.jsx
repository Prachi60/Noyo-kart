import React, { useState, useEffect, useRef, memo } from 'react';
import { gsap } from 'gsap';
import PromoCard from '../../../components/common/PromoCard';
import { themeColors } from '@sp/theme';

const PromoCarousel = memo(({ promos, onPromoClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const intervalRef = useRef(null);
  const carouselRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);



  const promotionalCards = promos || [];

  // Simple auto-scroll functionality
  useEffect(() => {
    if (isHovered || promotionalCards.length <= 1) return;

    const interval = setInterval(() => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const cardWidth = container.offsetWidth; // Scroll by one screen/card width

      // Calculate next scroll position
      let nextScrollLeft = container.scrollLeft + cardWidth;

      // If we reached the end, loop back (smoothly if possible, or instant)
      if (nextScrollLeft >= container.scrollWidth - 10) { // Tolerance
        nextScrollLeft = 0;
      }

      container.scrollTo({
        left: nextScrollLeft,
        behavior: 'smooth'
      });

    }, 5000); // 5 seconds interval

    return () => clearInterval(interval);
  }, [isHovered, promotionalCards.length]);

  // Trigger index update on scroll
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      // Use card width if available, otherwise container width (assuming full width cards or snap points)
      // For accurate dot highlighting, we prefer container width as the snap logic usually aligns near that.
      const width = container.offsetWidth;

      const index = Math.round(scrollLeft / width);

      if (index !== currentIndex && index >= 0 && index < promotionalCards.length) {
        setCurrentIndex(index);
      }
    }
  };

  // Entrance animation
  useEffect(() => {
    if (carouselRef.current) {
      gsap.fromTo(carouselRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
      );
    }
  }, []);

  if (!promos || promos.length === 0) {
    return null;
  }

  return (
    <div
      ref={carouselRef}
      className="px-4 md:px-6"
      style={{ opacity: 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {promotionalCards.map((promo, index) => (
          <div key={promo.id || promo._id || index} data-promo-card className="flex-shrink-0 snap-center w-full">
            <PromoCard
              title={promo.title}
              subtitle={promo.subtitle}
              buttonText={promo.buttonText}
              image={promo.image}
              className={promo.className}
              onClick={() => onPromoClick?.(promo)}
            />
          </div>
        ))}
      </div>
      {/* Carousel indicator dots hidden per user request */}
    </div>
  );
});

PromoCarousel.displayName = 'PromoCarousel';

export default PromoCarousel;

