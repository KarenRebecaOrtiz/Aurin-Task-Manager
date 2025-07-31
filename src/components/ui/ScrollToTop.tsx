'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import styles from './ScrollToTop.module.scss';

interface ScrollToTopProps {
  threshold?: number; // Scroll threshold to show button (default: 300px)
  className?: string;
}

const ScrollToTop = ({ threshold = 300, className = '' }: ScrollToTopProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollToTop } = useSmoothScroll();

  // Check if scroll position exceeds threshold
  const toggleVisibility = useCallback(() => {
    if (window.pageYOffset > threshold) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [threshold]);

  // Handle scroll event
  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [toggleVisibility]);

  // Handle scroll to top
  const handleScrollToTop = useCallback(() => {
    scrollToTop({
      duration: 600,
      easing: 'ease-out'
    });
  }, [scrollToTop]);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      className={`${styles.scrollToTop} ${className}`}
      onClick={handleScrollToTop}
      aria-label="Volver arriba"
      title="Volver arriba"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.icon}
      >
        <path
          d="M12 4L4 12H9V20H15V12H20L12 4Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
};

export default ScrollToTop; 