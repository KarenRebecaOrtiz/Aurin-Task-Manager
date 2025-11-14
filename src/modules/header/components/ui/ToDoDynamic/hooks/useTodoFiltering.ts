/**
 * useTodoFiltering Hook
 * Manages todo filtering and statistics
 * Single Responsibility: Todo filtering and calculation logic
 */

import { useMemo, useCallback } from 'react';
import { Todo } from '../types';

/**
 * Hook for filtering and calculating todo statistics
 */
export const useTodoFiltering = (todos: Todo[], completedTodos: Todo[]) => {
  /**
   * Get today's date in ISO format
   */
  const getTodayDate = useCallback(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  /**
   * Calculate remaining todos count
   */
  const remainingTodos = useMemo(() => {
    return todos.filter((todo) => !todo.completed).length;
  }, [todos]);

  /**
   * Calculate completed todos today count
   */
  const completedToday = useMemo(() => {
    const today = getTodayDate();
    return completedTodos.filter((todo) => todo.completedDate === today).length;
  }, [completedTodos, getTodayDate]);

  /**
   * Check if there are any completed todos
   */
  const hasCompletedTodos = useMemo(() => {
    return completedToday > 0;
  }, [completedToday]);

  /**
   * Check if todo list is empty
   */
  const isEmpty = useMemo(() => {
    return todos.length === 0;
  }, [todos]);

  return {
    remainingTodos,
    completedToday,
    hasCompletedTodos,
    isEmpty,
  };
};
