/**
 * Todo Entity Types
 * Defines the structure of a Todo item and its state
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Todo entity as stored in Firestore
 */
export interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  completedDate?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Todo state for UI management
 */
export interface TodoState {
  todos: Todo[];
  completedTodos: Todo[];
  isLoading: boolean;
  error: string | null;
}
