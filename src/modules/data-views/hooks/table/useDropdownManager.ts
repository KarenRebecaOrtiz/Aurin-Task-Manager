import { useState, useCallback, useEffect, useRef, RefObject } from 'react';

/**
 * Configuration for dropdown manager
 */
export interface DropdownManagerConfig {
  /** Close on outside click (default: true) */
  closeOnOutsideClick?: boolean;
  /** Close on escape key (default: true) */
  closeOnEscape?: boolean;
  /** Initial open state (default: false) */
  initialIsOpen?: boolean;
}

/**
 * Return type of useDropdownManager hook
 */
export interface UseDropdownManagerReturn {
  /** Whether dropdown is open */
  isOpen: boolean;
  /** Open the dropdown */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Toggle dropdown state */
  toggle: () => void;
  /** Ref to attach to dropdown element */
  dropdownRef: RefObject<HTMLDivElement>;
}

/**
 * Custom hook for managing dropdown state and behavior
 *
 * Handles opening, closing, and outside click detection for dropdowns.
 * Automatically closes on outside clicks and escape key.
 *
 * @example
 * ```tsx
 * const { isOpen, toggle, close, dropdownRef } = useDropdownManager({
 *   closeOnOutsideClick: true,
 *   closeOnEscape: true
 * });
 *
 * return (
 *   <div ref={dropdownRef}>
 *     <button onClick={toggle}>Toggle</button>
 *     {isOpen && <div>Dropdown content</div>}
 *   </div>
 * );
 * ```
 */
export function useDropdownManager({
  closeOnOutsideClick = true,
  closeOnEscape = true,
  initialIsOpen = false,
}: DropdownManagerConfig = {}): UseDropdownManagerReturn {

  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Handle outside click
  useEffect(() => {
    if (!closeOnOutsideClick || !isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        close();
      }
    };

    // Add small delay to prevent immediate closing on the click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, close, closeOnOutsideClick]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close, closeOnEscape]);

  return {
    isOpen,
    open,
    close,
    toggle,
    dropdownRef,
  };
}

/**
 * Configuration for multi-dropdown manager
 */
export interface MultiDropdownManagerConfig {
  /** Close on outside click (default: true) */
  closeOnOutsideClick?: boolean;
  /** Close on escape key (default: true) */
  closeOnEscape?: boolean;
  /** Allow multiple dropdowns open at once (default: false) */
  allowMultiple?: boolean;
}

/**
 * Return type of useMultiDropdownManager hook
 */
export interface UseMultiDropdownManagerReturn {
  /** Get whether specific dropdown is open */
  isOpen: (key: string) => boolean;
  /** Open specific dropdown */
  open: (key: string) => void;
  /** Close specific dropdown */
  close: (key: string) => void;
  /** Toggle specific dropdown */
  toggle: (key: string) => void;
  /** Close all dropdowns */
  closeAll: () => void;
  /** Get ref for specific dropdown */
  getRef: (key: string) => RefObject<HTMLDivElement>;
}

/**
 * Custom hook for managing multiple dropdowns
 *
 * Useful when you have multiple dropdowns in a table and need to manage them independently.
 *
 * @example
 * ```tsx
 * const dropdown = useMultiDropdownManager({ allowMultiple: false });
 *
 * return (
 *   <>
 *     <div ref={dropdown.getRef('status')}>
 *       <button onClick={() => dropdown.toggle('status')}>Status</button>
 *       {dropdown.isOpen('status') && <div>Status dropdown</div>}
 *     </div>
 *     <div ref={dropdown.getRef('priority')}>
 *       <button onClick={() => dropdown.toggle('priority')}>Priority</button>
 *       {dropdown.isOpen('priority') && <div>Priority dropdown</div>}
 *     </div>
 *   </>
 * );
 * ```
 */
export function useMultiDropdownManager({
  closeOnOutsideClick = true,
  closeOnEscape = true,
  allowMultiple = false,
}: MultiDropdownManagerConfig = {}): UseMultiDropdownManagerReturn {

  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const refsMap = useRef<Map<string, RefObject<HTMLDivElement>>>(new Map());

  const isOpen = useCallback((key: string): boolean => {
    return openDropdowns.has(key);
  }, [openDropdowns]);

  const open = useCallback((key: string) => {
    setOpenDropdowns(prev => {
      const newSet = allowMultiple ? new Set(prev) : new Set<string>();
      newSet.add(key);
      return newSet;
    });
  }, [allowMultiple]);

  const close = useCallback((key: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, []);

  const toggle = useCallback((key: string) => {
    setOpenDropdowns(prev => {
      const newSet = allowMultiple ? new Set(prev) : new Set<string>();
      if (prev.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, [allowMultiple]);

  const closeAll = useCallback(() => {
    setOpenDropdowns(new Set());
  }, []);

  const getRef = useCallback((key: string): RefObject<HTMLDivElement> => {
    if (!refsMap.current.has(key)) {
      refsMap.current.set(key, { current: null });
    }
    return refsMap.current.get(key)!;
  }, []);

  // Handle outside click for all dropdowns
  useEffect(() => {
    if (!closeOnOutsideClick || openDropdowns.size === 0) return;

    const handleClickOutside = (event: MouseEvent) => {
      const clickedInsideAnyDropdown = Array.from(refsMap.current.values()).some(ref => {
        return ref.current?.contains(event.target as Node);
      });

      if (!clickedInsideAnyDropdown) {
        closeAll();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdowns, closeAll, closeOnOutsideClick]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || openDropdowns.size === 0) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAll();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openDropdowns, closeAll, closeOnEscape]);

  return {
    isOpen,
    open,
    close,
    toggle,
    closeAll,
    getRef,
  };
}
