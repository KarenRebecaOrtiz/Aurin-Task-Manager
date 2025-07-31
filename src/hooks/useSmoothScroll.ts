import { useCallback } from 'react';

interface SmoothScrollOptions {
  duration?: number;
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  offset?: number;
}

/**
 * Custom hook for enhanced smooth scrolling functionality
 */
export const useSmoothScroll = () => {
  /**
   * Smooth scroll to a specific element
   */
  const scrollToElement = useCallback((
    element: HTMLElement | string,
    options: SmoothScrollOptions = {}
  ) => {
    const {
      duration = 800,
      easing = 'ease-in-out',
      offset = 0
    } = options;

    const targetElement = typeof element === 'string' 
      ? document.querySelector(element) as HTMLElement
      : element;

    if (!targetElement) {
      console.warn('SmoothScroll: Target element not found');
      return;
    }

    const targetPosition = targetElement.offsetTop - offset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const startTime = performance.now();

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const easeInCubic = (t: number): number => {
      return t * t * t;
    };

    const getEasingFunction = (easingType: string) => {
      switch (easingType) {
        case 'ease-in':
          return easeInCubic;
        case 'ease-out':
          return easeOutCubic;
        case 'ease-in-out':
          return easeInOutCubic;
        case 'linear':
          return (t: number) => t;
        default:
          return easeInOutCubic;
      }
    };

    const easingFunction = getEasingFunction(easing);

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunction(progress);

      window.scrollTo(0, startPosition + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }, []);

  /**
   * Smooth scroll to top of the page
   */
  const scrollToTop = useCallback((options: SmoothScrollOptions = {}) => {
    const {
      duration = 600,
      easing = 'ease-out'
    } = options;

    scrollToElement(document.body, { duration, easing, offset: 0 });
  }, [scrollToElement]);

  /**
   * Smooth scroll to bottom of the page
   */
  const scrollToBottom = useCallback((options: SmoothScrollOptions = {}) => {
    const {
      duration = 800,
      easing = 'ease-in-out'
    } = options;

    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const targetPosition = scrollHeight - viewportHeight;

    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const startTime = performance.now();

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }, []);

  /**
   * Smooth scroll by a specific amount
   */
  const scrollBy = useCallback((
    amount: number,
    options: SmoothScrollOptions = {}
  ) => {
    const {
      duration = 400,
      easing = 'ease-out'
    } = options;

    const startPosition = window.pageYOffset;
    const startTime = performance.now();

    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      window.scrollTo(0, startPosition + amount * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }, []);

  /**
   * Check if element is in viewport
   */
  const isElementInViewport = useCallback((element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, []);

  /**
   * Scroll element into view with smooth behavior
   */
  const scrollIntoView = useCallback((
    element: HTMLElement,
    options: SmoothScrollOptions = {}
  ) => {
    const {
      duration = 600,
      easing = 'ease-in-out',
      offset = 80
    } = options;

    if (!isElementInViewport(element)) {
      scrollToElement(element, { duration, easing, offset });
    }
  }, [scrollToElement, isElementInViewport]);

  return {
    scrollToElement,
    scrollToTop,
    scrollToBottom,
    scrollBy,
    scrollIntoView,
    isElementInViewport
  };
}; 