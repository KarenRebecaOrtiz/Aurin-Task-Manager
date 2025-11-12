/**
 * Animation Utilities
 * Shared GSAP animation utilities for UI interactions
 */

import { gsap } from 'gsap';

/**
 * Animates a click interaction with scale and opacity effects
 * Creates a subtle press-down and release animation
 *
 * @param element - The HTML element to animate
 * @param duration - Animation duration in seconds (default: 0.15)
 */
export const animateClick = (element: HTMLElement, duration: number = 0.15): void => {
  gsap.to(element, {
    scale: 0.95,
    opacity: 0.8,
    duration: duration,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(element, {
        scale: 1,
        opacity: 1,
        duration: duration,
        ease: 'power2.out',
      });
    },
  });
};

/**
 * Animates a dropdown opening with fade and slide
 *
 * @param element - The dropdown element to animate
 * @param duration - Animation duration in seconds (default: 0.2)
 */
export const animateDropdownOpen = (element: HTMLElement, duration: number = 0.2): void => {
  gsap.fromTo(
    element,
    {
      opacity: 0,
      y: -10,
    },
    {
      opacity: 1,
      y: 0,
      duration: duration,
      ease: 'power2.out',
    }
  );
};

/**
 * Animates a dropdown closing with fade and slide
 *
 * @param element - The dropdown element to animate
 * @param duration - Animation duration in seconds (default: 0.15)
 */
export const animateDropdownClose = (element: HTMLElement, duration: number = 0.15): void => {
  gsap.to(element, {
    opacity: 0,
    y: -10,
    duration: duration,
    ease: 'power2.in',
  });
};

/**
 * Animates a row deletion with fade and slide up
 *
 * @param element - The row element to animate
 * @param duration - Animation duration in seconds (default: 0.3)
 * @returns Promise that resolves when animation is complete
 */
export const animateRowDelete = (element: HTMLElement, duration: number = 0.3): Promise<void> => {
  return new Promise((resolve) => {
    gsap.to(element, {
      opacity: 0,
      height: 0,
      marginTop: 0,
      marginBottom: 0,
      duration: duration,
      ease: 'power2.in',
      onComplete: () => resolve(),
    });
  });
};

/**
 * Animates a card move in Kanban board
 *
 * @param element - The card element to animate
 * @param fromX - Starting X position
 * @param fromY - Starting Y position
 * @param toX - Ending X position
 * @param toY - Ending Y position
 * @param duration - Animation duration in seconds (default: 0.3)
 */
export const animateCardMove = (
  element: HTMLElement,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  duration: number = 0.3
): Promise<void> => {
  return new Promise((resolve) => {
    gsap.fromTo(
      element,
      { x: fromX, y: fromY },
      {
        x: toX,
        y: toY,
        duration: duration,
        ease: 'power2.inOut',
        onComplete: () => resolve(),
      }
    );
  });
};

/**
 * Animates filter icon with pulse effect
 *
 * @param element - The icon element to animate
 * @param isActive - Whether the filter is active
 */
export const animateFilterIcon = (element: HTMLElement, isActive: boolean): void => {
  if (isActive) {
    gsap.to(element, {
      scale: 1.15,
      duration: 0.2,
      ease: 'back.out(1.7)',
    });
  } else {
    gsap.to(element, {
      scale: 1,
      duration: 0.2,
      ease: 'power2.out',
    });
  }
};

/**
 * Animates a hover effect with scale
 *
 * @param element - The element to animate
 * @param scale - Target scale (default: 1.05)
 * @param duration - Animation duration in seconds (default: 0.2)
 */
export const animateHoverScale = (
  element: HTMLElement,
  scale: number = 1.05,
  duration: number = 0.2
): void => {
  gsap.to(element, {
    scale: scale,
    duration: duration,
    ease: 'power2.out',
  });
};

/**
 * Resets hover animation to original state
 *
 * @param element - The element to reset
 * @param duration - Animation duration in seconds (default: 0.2)
 */
export const resetHoverScale = (element: HTMLElement, duration: number = 0.2): void => {
  gsap.to(element, {
    scale: 1,
    duration: duration,
    ease: 'power2.out',
  });
};

/**
 * Animates a fade-in effect
 *
 * @param element - The element to animate
 * @param duration - Animation duration in seconds (default: 0.3)
 */
export const animateFadeIn = (element: HTMLElement, duration: number = 0.3): void => {
  gsap.fromTo(
    element,
    { opacity: 0 },
    {
      opacity: 1,
      duration: duration,
      ease: 'power2.out',
    }
  );
};

/**
 * Animates a fade-out effect
 *
 * @param element - The element to animate
 * @param duration - Animation duration in seconds (default: 0.3)
 * @returns Promise that resolves when animation is complete
 */
export const animateFadeOut = (element: HTMLElement, duration: number = 0.3): Promise<void> => {
  return new Promise((resolve) => {
    gsap.to(element, {
      opacity: 0,
      duration: duration,
      ease: 'power2.in',
      onComplete: () => resolve(),
    });
  });
};
