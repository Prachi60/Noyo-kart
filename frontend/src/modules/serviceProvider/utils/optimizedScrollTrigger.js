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
 * @param {Object} scrollOptions - Additional scrollTrigger options
 */
export const createOptimizedScrollAnimation = (element, options = {}, scrollOptions = {}) => {
  if (!element) return null;

  let fromVars = { y: 30, x: 0, opacity: 0 };
  let toVars = { y: 0, x: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0 };
  
  if (options.from && options.to) {
    fromVars = options.from;
    toVars = { ...options.to, duration: options.duration || 0.6, ease: options.ease || 'power2.out', delay: options.delay || 0 };
  } else {
    fromVars = { y: options.y ?? 30, x: options.x ?? 0, opacity: options.opacity ?? 0 };
    toVars = {
      y: 0, x: 0, opacity: 1,
      duration: options.duration || 0.6,
      ease: options.ease || 'power2.out',
      delay: options.delay || 0
    };
  }

  return gsap.fromTo(
    element,
    fromVars,
    {
      ...toVars,
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        toggleActions: 'play none none none',
        ...scrollOptions
      }
    }
  );
};

/**
 * Creates a staggered scroll entrance animation for elements
 * @param {HTMLElement[]|HTMLElement} target - Array of elements or container element
 * @param {Object|string} optionsOrSelector - Animation options or childSelector string
 * @param {Object} scrollOptionsOrOptions - Scroll options or Animation options
 * @param {Object} scrollOpts - Additional scrollTrigger options
 */
export const createOptimizedStaggerAnimation = (target, optionsOrSelector, scrollOptionsOrOptions = {}, scrollOpts = {}) => {
  if (!target) return null;

  let elements;
  let options = {};
  let scrollOptions = {};

  if (typeof optionsOrSelector === 'string') {
    elements = target.querySelectorAll(optionsOrSelector);
    options = scrollOptionsOrOptions;
    scrollOptions = scrollOpts;
  } else {
    elements = target;
    options = optionsOrSelector || {};
    scrollOptions = scrollOptionsOrOptions || {};
  }

  if (!elements || elements.length === 0) return null;

  let fromVars = { y: 30, x: 0, opacity: 0 };
  let toVars = { y: 0, x: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0 };

  if (options.from && options.to) {
    fromVars = options.from;
    toVars = { 
      ...options.to, 
      duration: options.duration || 0.5, 
      stagger: options.stagger || 0.1, 
      ease: options.ease || 'power2.out', 
      delay: options.delay || 0 
    };
  } else {
    fromVars = { y: options.y ?? 30, x: options.x ?? 0, opacity: options.opacity ?? 0 };
    toVars = {
      y: 0, x: 0, opacity: 1,
      duration: options.duration || 0.5,
      stagger: options.stagger || 0.1,
      ease: options.ease || 'power2.out',
      delay: options.delay || 0
    };
  }

  // Determine trigger element
  let triggerElement = target;
  if (Array.isArray(target) || target instanceof NodeList || target instanceof HTMLCollection) {
     triggerElement = target[0]?.parentElement || target[0];
  }

  return gsap.fromTo(
    elements,
    fromVars,
    {
      ...toVars,
      scrollTrigger: {
        trigger: triggerElement,
        start: 'top 85%',
        toggleActions: 'play none none none',
        ...scrollOptions
      }
    }
  );
};

export default {
  createOptimizedScrollAnimation,
  createOptimizedStaggerAnimation,
};
