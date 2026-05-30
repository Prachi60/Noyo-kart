import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger safely
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Creates an optimized scroll entrance animation for a single element
 * @param {HTMLElement} element - The target element
 * @param {Object} options - Animation options
 */
export const createOptimizedScrollAnimation = (element, options = {}) => {
  if (!element) return null;

  const {
    y = 30,
    x = 0,
    opacity = 0,
    duration = 0.6,
    delay = 0,
    ease = 'power2.out',
    start = 'top 85%',
    toggleActions = 'play none none none',
    ...rest
  } = options;

  return gsap.fromTo(
    element,
    { y, x, opacity },
    {
      y: 0,
      x: 0,
      opacity: 1,
      duration,
      delay,
      ease,
      scrollTrigger: {
        trigger: element,
        start,
        toggleActions,
        ...rest
      }
    }
  );
};

/**
 * Creates a staggered scroll entrance animation for child elements
 * @param {HTMLElement} container - The container element
 * @param {string} childSelector - Selector for child elements to animate
 * @param {Object} options - Animation options
 */
export const createOptimizedStaggerAnimation = (container, childSelector, options = {}) => {
  if (!container) return null;

  const elements = container.querySelectorAll(childSelector);
  if (!elements || elements.length === 0) return null;

  const {
    y = 30,
    x = 0,
    opacity = 0,
    duration = 0.5,
    stagger = 0.1,
    ease = 'power2.out',
    start = 'top 85%',
    toggleActions = 'play none none none',
    ...rest
  } = options;

  return gsap.fromTo(
    elements,
    { y, x, opacity },
    {
      y: 0,
      x: 0,
      opacity: 1,
      duration,
      stagger,
      ease,
      scrollTrigger: {
        trigger: container,
        start,
        toggleActions,
        ...rest
      }
    }
  );
};

export default {
  createOptimizedScrollAnimation,
  createOptimizedStaggerAnimation,
};
