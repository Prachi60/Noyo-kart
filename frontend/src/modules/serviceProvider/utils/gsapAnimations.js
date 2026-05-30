import { gsap } from 'gsap';

/**
 * GSAP Animation Utilities for Service Provider Module
 */

/**
 * Animates a logo element (scale, rotate, fade in)
 * @param {HTMLElement} element - The logo element to animate
 */
export const animateLogo = (element) => {
  if (!element) return;
  gsap.killTweensOf(element);
  gsap.fromTo(
    element,
    { scale: 0.8, rotate: -10, opacity: 0 },
    { scale: 1, rotate: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }
  );
};

/**
 * Animates page entrance (slide up from 100% and fade in)
 * @param {HTMLElement} element - The page element to animate
 */
export const animatePageIn = (element) => {
  if (!element) return;
  gsap.killTweensOf(element);
  gsap.fromTo(
    element,
    { y: '100%', opacity: 0 },
    { y: '0%', opacity: 1, duration: 0.5, ease: 'power3.out' }
  );
};

/**
 * Animates page exit (slide down to 100% and fade out)
 * @param {HTMLElement} element - The page element to animate
 * @param {Function} onComplete - Callback function when animation completes
 */
export const animatePageOut = (element, onComplete) => {
  if (!element) {
    if (onComplete) onComplete();
    return;
  }
  gsap.killTweensOf(element);
  gsap.to(element, {
    y: '100%',
    opacity: 0,
    duration: 0.4,
    ease: 'power3.in',
    onComplete: onComplete,
  });
};

/**
 * Animates modal entrance (slide up from bottom)
 * @param {HTMLElement} element - The modal element to animate
 */
export const animateModalIn = (element) => {
  if (!element) return;
  gsap.killTweensOf(element);
  gsap.fromTo(
    element,
    { y: '100%' },
    { y: '0%', duration: 0.4, ease: 'power3.out' }
  );
};

/**
 * Animates modal exit (slide down to bottom)
 * @param {HTMLElement} element - The modal element to animate
 * @param {Function} onComplete - Callback function when animation completes
 */
export const animateModalOut = (element, onComplete) => {
  if (!element) {
    if (onComplete) onComplete();
    return;
  }
  gsap.killTweensOf(element);
  gsap.to(element, {
    y: '100%',
    duration: 0.3,
    ease: 'power3.in',
    onComplete: onComplete,
  });
};

/**
 * Creates a ripple effect on click
 * @param {Event} event - The click event
 * @param {HTMLElement} element - The parent element
 */
export const createRipple = (event, element) => {
  if (!element) return;

  const circle = document.createElement('span');
  const diameter = Math.max(element.clientWidth, element.clientHeight);
  const radius = diameter / 2;

  const rect = element.getBoundingClientRect();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.style.position = 'absolute';
  circle.style.borderRadius = '50%';
  circle.style.transform = 'scale(0)';
  circle.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
  circle.style.pointerEvents = 'none';
  circle.className = 'ripple-effect';

  element.appendChild(circle);

  gsap.to(circle, {
    scale: 4,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    onComplete: () => {
      circle.remove();
    }
  });
};

export default {
  animateLogo,
  animatePageIn,
  animatePageOut,
  animateModalIn,
  animateModalOut,
  createRipple,
};
