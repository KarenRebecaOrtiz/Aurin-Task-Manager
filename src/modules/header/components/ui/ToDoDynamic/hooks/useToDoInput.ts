/**
 * useToDoInput Hook
 * Manages todo input state and validation
 * Single Responsibility: Input state and validation logic
 */

import { useState, useCallback } from 'react';
import { TODO_VALIDATION } from '../constants';

/**
 * Hook for managing todo input state
 */
export const useToDoInput = () => {
  const [newTodoText, setNewTodoText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isInputError, setIsInputError] = useState(false);

  /**
   * Validate todo text
   */
  const validateTodoText = useCallback((text: string): string | null => {
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
  }, []);

  /**
   * Set error message
   */
  const setError = useCallback((message: string) => {
    setErrorMessage(message);
    setIsInputError(true);
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setErrorMessage('');
    setIsInputError(false);
  }, []);

  /**
   * Clear input
   */
  const clearInput = useCallback(() => {
    setNewTodoText('');
    clearError();
  }, [clearError]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewTodoText(e.target.value);
      if (errorMessage) {
        clearError();
      }
    },
    [errorMessage, clearError]
  );

  return {
    newTodoText,
    setNewTodoText,
    errorMessage,
    setError,
    clearError,
    isInputError,
    clearInput,
    validateTodoText,
    handleInputChange,
  };
};
