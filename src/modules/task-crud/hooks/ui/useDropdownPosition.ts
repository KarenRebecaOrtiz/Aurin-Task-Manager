/**
 * useDropdownPosition Hook
 * Manages dropdown positioning and animations
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { calculateDropdownPosition, debounce } from '../../utils/helpers';

interface Position {
  top: number;
  left: number;
}

interface UseDropdownPositionOptions {
  isOpen: boolean;
  onAnimationComplete?: () => void;
}

export const useDropdownPosition = (options: UseDropdownPositionOptions) => {
  const { isOpen } = options;
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update position when dropdown opens or window resizes
  const updatePosition = useCallback(() => {
    if (isOpen && triggerRef.current) {
      const newPosition = calculateDropdownPosition(triggerRef.current);
      setPosition(newPosition);
    }
  }, [isOpen]);

  // Update position on mount and when isOpen changes
  useEffect(() => {
    updatePosition();
  }, [isOpen, updatePosition]);

  // Handle window resize
  useEffect(() => {
    const handleResize = debounce(updatePosition, 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePosition]);

  // Handle scroll (close dropdown on scroll)
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = debounce(() => {
      // Position could be updated or dropdown could be closed
      // For now, we'll just update position
      updatePosition();
    }, 200);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen, updatePosition]);

  return {
    position,
    triggerRef,
    dropdownRef,
    updatePosition,
  };
};

// Multiple dropdowns management hook
interface DropdownState {
  isOpen: boolean;
  position: Position | null;
}

export const useMultipleDropdowns = (dropdownKeys: string[]) => {
  const [dropdowns, setDropdowns] = useState<Record<string, DropdownState>>(
    dropdownKeys.reduce((acc, key) => {
      acc[key] = { isOpen: false, position: null };
      return acc;
    }, {} as Record<string, DropdownState>)
  );

  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleDropdown = useCallback((key: string) => {
    setDropdowns((prev) => {
      // Close all other dropdowns
      const newState = Object.keys(prev).reduce((acc, k) => {
        acc[k] = { ...prev[k], isOpen: k === key ? !prev[k].isOpen : false };
        return acc;
      }, {} as Record<string, DropdownState>);

      // Update position if opening
      if (newState[key].isOpen && refs.current[key]) {
        const position = calculateDropdownPosition(refs.current[key]);
        newState[key].position = position;
      }

      return newState;
    });
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setDropdowns((prev) =>
      Object.keys(prev).reduce((acc, k) => {
        acc[k] = { ...prev[k], isOpen: false };
        return acc;
      }, {} as Record<string, DropdownState>)
    );
  }, []);

  const setRef = useCallback((key: string, element: HTMLDivElement | null) => {
    refs.current[key] = element;
  }, []);

  return {
    dropdowns,
    toggleDropdown,
    closeAllDropdowns,
    setRef,
  };
};
