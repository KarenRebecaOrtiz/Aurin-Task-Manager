/**
 * Dropdown Utilities
 * Shared utility functions for managing dropdown states and interactions
 */

/**
 * Dropdown state manager for handling multiple dropdowns
 * Ensures only one dropdown is open at a time
 */
export interface DropdownStates {
  [key: string]: boolean;
}

/**
 * Creates a handler to toggle a specific dropdown and close all others
 *
 * @param dropdownKey - The key of the dropdown to toggle
 * @param currentState - Current state of the dropdown
 * @param setters - Object containing setter functions for all dropdowns
 * @returns Handler function for dropdown toggle
 */
export const createDropdownToggleHandler = (
  dropdownKey: string,
  currentState: boolean,
  setters: { [key: string]: (value: boolean) => void }
): ((e?: React.MouseEvent<HTMLDivElement>) => void) => {
  return (e?: React.MouseEvent<HTMLDivElement>) => {
    if (e) {
      e.stopPropagation();
    }

    // Close all other dropdowns
    Object.keys(setters).forEach((key) => {
      if (key !== dropdownKey) {
        setters[key](false);
      }
    });

    // Toggle the target dropdown
    setters[dropdownKey](!currentState);
  };
};

/**
 * Closes all dropdowns
 *
 * @param setters - Object containing setter functions for all dropdowns
 */
export const closeAllDropdowns = (setters: { [key: string]: (value: boolean) => void }): void => {
  Object.values(setters).forEach((setter) => setter(false));
};

/**
 * Creates a click outside handler to close dropdowns
 *
 * @param setters - Object containing setter functions for all dropdowns
 * @param excludeElements - Array of element IDs to exclude from click outside detection
 * @returns Handler function for document click
 */
export const createClickOutsideHandler = (
  setters: { [key: string]: (value: boolean) => void },
  excludeElements: string[] = []
): ((e: MouseEvent) => void) => {
  return (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Check if click is outside all excluded elements
    const isOutside = !excludeElements.some((id) => {
      const element = document.getElementById(id);
      return element?.contains(target);
    });

    if (isOutside) {
      closeAllDropdowns(setters);
    }
  };
};

/**
 * Hook-like utility to manage multiple dropdown states
 * Returns object with state and handlers
 */
export class DropdownManager {
  private states: DropdownStates = {};
  private setters: { [key: string]: (value: boolean) => void } = {};

  constructor(dropdownKeys: string[]) {
    dropdownKeys.forEach((key) => {
      this.states[key] = false;
    });
  }

  /**
   * Registers a setter function for a dropdown
   */
  registerSetter(key: string, setter: (value: boolean) => void): void {
    this.setters[key] = setter;
  }

  /**
   * Gets the current state of a dropdown
   */
  getState(key: string): boolean {
    return this.states[key] || false;
  }

  /**
   * Sets the state of a dropdown
   */
  setState(key: string, value: boolean): void {
    this.states[key] = value;
    if (this.setters[key]) {
      this.setters[key](value);
    }
  }

  /**
   * Toggles a dropdown and closes all others
   */
  toggle(key: string): void {
    const newState = !this.states[key];

    // Close all dropdowns
    Object.keys(this.states).forEach((k) => {
      if (k !== key) {
        this.setState(k, false);
      }
    });

    // Toggle target dropdown
    this.setState(key, newState);
  }

  /**
   * Closes all dropdowns
   */
  closeAll(): void {
    Object.keys(this.states).forEach((key) => {
      this.setState(key, false);
    });
  }

  /**
   * Creates a toggle handler for a specific dropdown
   */
  createToggleHandler(key: string): (e?: React.MouseEvent<HTMLDivElement>) => void {
    return (e?: React.MouseEvent<HTMLDivElement>) => {
      if (e) {
        e.stopPropagation();
      }
      this.toggle(key);
    };
  }
}

/**
 * Simple toggle handler that only closes other specific dropdowns
 * Useful for simple cases with 2-3 dropdowns
 */
export const toggleDropdown = (
  currentState: boolean,
  setter: (value: boolean) => void,
  othersToClose: Array<(value: boolean) => void> = []
): void => {
  // Close other dropdowns
  othersToClose.forEach((otherSetter) => otherSetter(false));

  // Toggle current dropdown
  setter(!currentState);
};
