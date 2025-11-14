/**
 * Helper Utilities for Task CRUD
 * Helper functions for form management and data transformation
 */

import { FormValues } from '../../types/form';

/**
 * Deep comparison to check if form values have changed from defaults
 */
export const hasFormChanges = (current: FormValues, defaults: FormValues): boolean => {
  // Compare client info
  if (current.clientInfo.clientId !== defaults.clientInfo.clientId) return true;
  if (current.clientInfo.project !== defaults.clientInfo.project) return true;

  // Compare basic info
  if (current.basicInfo.name !== defaults.basicInfo.name) return true;
  if (current.basicInfo.description !== defaults.basicInfo.description) return true;
  if (current.basicInfo.objectives !== defaults.basicInfo.objectives) return true;
  if (current.basicInfo.status !== defaults.basicInfo.status) return true;
  if (current.basicInfo.priority !== defaults.basicInfo.priority) return true;

  // Compare dates (handle null values)
  const currentStartDate = current.basicInfo.startDate?.getTime();
  const defaultStartDate = defaults.basicInfo.startDate?.getTime();
  if (currentStartDate !== defaultStartDate) return true;

  const currentEndDate = current.basicInfo.endDate?.getTime();
  const defaultEndDate = defaults.basicInfo.endDate?.getTime();
  if (currentEndDate !== defaultEndDate) return true;

  // Compare team info arrays
  if (!arraysEqual(current.teamInfo.LeadedBy, defaults.teamInfo.LeadedBy)) return true;
  if (!arraysEqual(current.teamInfo.AssignedTo || [], defaults.teamInfo.AssignedTo || [])) return true;

  return false;
};

/**
 * Helper function to compare arrays
 */
const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

/**
 * Format a Date object to a localized string (Spanish format)
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Calculate dropdown position relative to a trigger element
 * @param element - The trigger element (button, input, etc.)
 * @returns Position object with top and left coordinates
 */
export const calculateDropdownPosition = (
  element: HTMLElement | null
): { top: number; left: number } => {
  if (!element) {
    return { top: 0, left: 0 };
  }

  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  return {
    top: rect.bottom + scrollTop + 4, // 4px gap below the trigger
    left: rect.left + scrollLeft,
  };
};

/**
 * Debounce utility function
 * Delays execution of a function until after a specified wait time has elapsed
 * since the last time it was invoked
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
};
