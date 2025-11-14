/**
 * ToDo Dropdown Store
 * Manages dropdown visibility and positioning state with Zustand
 * Single Responsibility: Dropdown UI state persistence
 */

import { create } from 'zustand';
import { ToDoDropdownState, DropdownPosition } from '../types';

/**
 * Zustand store for todo dropdown state
 */
export const useToDoDropdownStore = create<ToDoDropdownState>((set) => ({
  isVisible: false,
  isOpen: false,
  dropdownPosition: { top: 0, right: 0 },

  setIsVisible: (isVisible: boolean) => set({ isVisible }),

  setIsOpen: (isOpen: boolean) => set({ isOpen }),

  setDropdownPosition: (dropdownPosition: DropdownPosition) =>
    set({ dropdownPosition }),

  resetState: () =>
    set({
      isVisible: false,
      isOpen: false,
      dropdownPosition: { top: 0, right: 0 },
    }),
}));
