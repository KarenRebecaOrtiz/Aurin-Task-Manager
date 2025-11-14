/**
 * Todo Validation Utilities
 * Helper functions for todo validation
 */

import { TODO_VALIDATION } from '../constants';

/**
 * Validate todo text
 * @param text - The todo text to validate
 * @returns Error message if invalid, null if valid
 */
export const validateTodoText = (text: string): string | null => {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return TODO_VALIDATION.EMPTY_ERROR;
  }

  if (trimmedText.length < TODO_VALIDATION.MIN_LENGTH) {
    return TODO_VALIDATION.MIN_LENGTH_ERROR;
  }

  if (trimmedText.length > TODO_VALIDATION.MAX_LENGTH) {
    return TODO_VALIDATION.MAX_LENGTH_ERROR;
  }

  return null;
};

/**
 * Check if todo text is valid
 * @param text - The todo text to check
 * @returns true if valid, false otherwise
 */
export const isValidTodoText = (text: string): boolean => {
  return validateTodoText(text) === null;
};
