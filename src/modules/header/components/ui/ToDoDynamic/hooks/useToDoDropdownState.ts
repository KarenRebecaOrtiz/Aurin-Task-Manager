/**
 * useToDoDropdownState Hook
 * Manages dropdown visibility and positioning state with handlers
 * Single Responsibility: Dropdown state management with UI logic
 */

import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useToDoDropdownStore } from '../stores';
import { TODO_UI } from '../constants';

/**
 * Hook for managing todo dropdown state with handlers
 */
export const useToDoDropdownState = () => {
  const {
    isVisible,
    isOpen,
    dropdownPosition,
    setIsVisible,
    setIsOpen,
    setDropdownPosition,
    resetState,
  } = useToDoDropdownStore(
    useShallow((state) => ({
      isVisible: state.isVisible,
      isOpen: state.isOpen,
      dropdownPosition: state.dropdownPosition,
      setIsVisible: state.setIsVisible,
      setIsOpen: state.setIsOpen,
      setDropdownPosition: state.setDropdownPosition,
      resetState: state.resetState,
    }))
  );

  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position when opening
  const handleToggleDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const top = buttonRect.bottom + 8;
    const right = window.innerWidth - buttonRect.right;

    setDropdownPosition({ top, right });
    setIsVisible(true);
    setIsOpen(!isOpen);
  }, [isOpen, setDropdownPosition, setIsVisible, setIsOpen]);

  // Close dropdown
  const handleCloseDropdown = useCallback(() => {
    setIsOpen(false);
    setIsVisible(false);
    resetState();
  }, [setIsOpen, setIsVisible, resetState]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      
      const dropdown = document.querySelector('[data-todo-dropdown]');
      if (dropdown && dropdown.contains(target)) {
        return;
      }
      
      handleCloseDropdown();
    };

    if (isOpen) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, TODO_UI.CLICK_OUTSIDE_DELAY);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [isOpen, handleCloseDropdown]);

  return {
    isVisible,
    isOpen,
    dropdownPosition,
    setIsVisible,
    setIsOpen,
    setDropdownPosition,
    resetState,
    handleToggleDropdown,
    handleCloseDropdown,
    buttonRef,
  };
};
