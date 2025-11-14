/**
 * useClickOutside Hook
 * Detects clicks outside of specified elements
 */

import { useEffect, RefObject } from 'react';

interface UseClickOutsideOptions {
  enabled?: boolean;
  onClickOutside: () => void;
}

export const useClickOutside = (
  refs: RefObject<HTMLElement>[],
  options: UseClickOutsideOptions
) => {
  const { enabled = true, onClickOutside } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is outside all refs
      const isOutside = refs.every((ref) => {
        return ref.current && !ref.current.contains(target);
      });

      if (isOutside) {
        onClickOutside();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, enabled, onClickOutside]);
};

// For managing multiple dropdowns with click outside
export const useMultipleClickOutside = (
  dropdownConfig: Record<string, {
    refs: RefObject<HTMLElement>[];
    isOpen: boolean;
    onClose: () => void;
  }>
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      Object.entries(dropdownConfig).forEach(([key, config]) => {
        if (!config.isOpen) return;

        const isOutside = config.refs.every((ref) => {
          return ref.current && !ref.current.contains(target);
        });

        if (isOutside) {
          config.onClose();
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownConfig]);
};
