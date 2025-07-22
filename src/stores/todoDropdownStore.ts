import { create } from 'zustand';

interface ToDoDropdownState {
  isVisible: boolean;
  isOpen: boolean;
  dropdownPosition: { top: number; right: number };
  setIsVisible: (isVisible: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
  setDropdownPosition: (position: { top: number; right: number }) => void;
  resetState: () => void;
}

export const useToDoDropdownStore = create<ToDoDropdownState>((set) => ({
  isVisible: false,
  isOpen: false,
  dropdownPosition: { top: 0, right: 0 },
  setIsVisible: (isVisible: boolean) => set({ isVisible }),
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
  setDropdownPosition: (dropdownPosition: { top: number; right: number }) => set({ dropdownPosition }),
  resetState: () => set({ isVisible: false, isOpen: false, dropdownPosition: { top: 0, right: 0 } }),
})); 