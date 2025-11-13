/**
 * Animation Helpers using Framer Motion
 * Replaces GSAP-based animations with declarative Framer Motion approach
 */

import { animate, AnimationPlaybackControls } from 'framer-motion';

/**
 * Animates a click interaction using Framer Motion's imperative API
 * Replaces GSAP animateClick function
 *
 * @param element - The HTML element to animate
 * @param duration - Animation duration in seconds (default: 0.15)
 * @returns Animation controls to cancel if needed
 */
export const animateClick = (
  element: HTMLElement,
  duration: number = 0.15
): AnimationPlaybackControls => {
  // First animation: press down
  const pressAnimation = animate(
    element,
    {
      scale: 0.95,
      opacity: 0.8,
    },
    {
      duration,
      ease: [0.4, 0, 0.2, 1],
    }
  );

  // Chain release animation
  pressAnimation.then(() => {
    animate(
      element,
      {
        scale: 1,
        opacity: 1,
      },
      {
        duration,
        ease: [0.4, 0, 0.2, 1],
      }
    );
  });

  return pressAnimation;
};

/**
 * Animates a hover scale effect
 *
 * @param element - The element to animate
 * @param scale - Target scale (default: 1.05)
 * @param duration - Animation duration in seconds (default: 0.2)
 */
export const animateHoverScale = (
  element: HTMLElement,
  scale: number = 1.05,
  duration: number = 0.2
): AnimationPlaybackControls => {
  return animate(
    element,
    { scale },
    {
      duration,
      ease: [0.4, 0, 0.2, 1],
    }
  );
};

/**
 * Resets hover animation to original state
 *
 * @param element - The element to reset
 * @param duration - Animation duration in seconds (default: 0.2)
 */
export const resetHoverScale = (
  element: HTMLElement,
  duration: number = 0.2
): AnimationPlaybackControls => {
  return animate(
    element,
    { scale: 1 },
    {
      duration,
      ease: [0.4, 0, 0.2, 1],
    }
  );
};

/**
 * Animates a filter icon pulse when active
 *
 * @param element - The icon element to animate
 * @param isActive - Whether the filter is active
 */
export const animateFilterIcon = (
  element: HTMLElement,
  isActive: boolean
): AnimationPlaybackControls => {
  return animate(
    element,
    { scale: isActive ? 1.15 : 1 },
    {
      duration: 0.2,
      ease: isActive ? [0.68, -0.55, 0.27, 1.55] : [0.4, 0, 0.2, 1], // back.out when active
    }
  );
};

/**
 * Animates a fade-in effect
 *
 * @param element - The element to animate
 * @param duration - Animation duration in seconds (default: 0.3)
 */
export const animateFadeIn = (
  element: HTMLElement,
  duration: number = 0.3
): AnimationPlaybackControls => {
  return animate(
    element,
    { opacity: 1 },
    {
      duration,
      ease: [0.4, 0, 0.2, 1],
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
export const animateFadeOut = async (
  element: HTMLElement,
  duration: number = 0.3
): Promise<void> => {
  const animation = animate(
    element,
    { opacity: 0 },
    {
      duration,
      ease: [0.4, 0, 0.2, 1],
    }
  );

  await animation;
};

/**
 * Animates a row deletion with fade and height collapse
 * Replaces GSAP animateRowDelete
 *
 * @param element - The row element to animate
 * @param duration - Animation duration in seconds (default: 0.3)
 * @returns Promise that resolves when animation is complete
 */
export const animateRowDelete = async (
  element: HTMLElement,
  duration: number = 0.3
): Promise<void> => {
  const animation = animate(
    element,
    {
      opacity: 0,
      height: 0,
      marginTop: 0,
      marginBottom: 0,
    },
    {
      duration,
      ease: [0.4, 0, 0.2, 1],
    }
  );

  await animation;
};

/**
 * Animates a dropdown opening
 *
 * @param element - The dropdown element to animate
 * @param duration - Animation duration in seconds (default: 0.2)
 */
export const animateDropdownOpen = (
  element: HTMLElement,
  duration: number = 0.2
): AnimationPlaybackControls => {
  return animate(
    element,
    {
      opacity: 1,
      y: 0,
      scale: 1,
    },
    {
      duration,
      ease: [0.4, 0, 0.2, 1],
    }
  );
};

/**
 * Animates a dropdown closing
 *
 * @param element - The dropdown element to animate
 * @param duration - Animation duration in seconds (default: 0.15)
 */
export const animateDropdownClose = async (
  element: HTMLElement,
  duration: number = 0.15
): Promise<void> => {
  const animation = animate(
    element,
    {
      opacity: 0,
      y: -10,
      scale: 0.95,
    },
    {
      duration,
      ease: [0.4, 0, 0.2, 1],
    }
  );

  await animation;
};

/**
 * Export all animation helpers for backward compatibility
 */
export const animationHelpers = {
  animateClick,
  animateHoverScale,
  resetHoverScale,
  animateFilterIcon,
  animateFadeIn,
  animateFadeOut,
  animateRowDelete,
  animateDropdownOpen,
  animateDropdownClose,
};
