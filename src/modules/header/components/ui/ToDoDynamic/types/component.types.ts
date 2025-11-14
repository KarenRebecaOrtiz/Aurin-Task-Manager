/**
 * Component Props Types
 * Defines prop interfaces for all components in the module
 */

import { DropdownPosition } from './dropdown.types';

/**
 * ToDoDropdown component props
 */
export interface ToDoDropdownProps {
  isVisible: boolean;
  isOpen: boolean;
  dropdownPosition: DropdownPosition;
  onClose: () => void;
}
