/**
 * Dropdown State Types
 * Defines the structure for dropdown visibility and positioning
 */

/**
 * Position coordinates for the dropdown
 */
export interface DropdownPosition {
  top: number;
  right: number;
}

/**
 * Dropdown state management
 */
export interface ToDoDropdownState {
  isVisible: boolean;
  isOpen: boolean;
  dropdownPosition: DropdownPosition;
  setIsVisible: (isVisible: boolean) => void;
  setIsOpen: (isOpen: boolean) => void;
  setDropdownPosition: (position: DropdownPosition) => void;
  resetState: () => void;
}
