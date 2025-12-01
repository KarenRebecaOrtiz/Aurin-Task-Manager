'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect media query matches
 *
 * @param query - Media query string (e.g., "(max-width: 768px)")
 * @returns boolean indicating if the media query matches
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if we're on the client
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
