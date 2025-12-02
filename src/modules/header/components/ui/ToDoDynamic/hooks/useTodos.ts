/**
 * useTodos Hook
 * Manages all todo operations: CRUD, filtering, and state management
 * Single Responsibility: Todo data management
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Todo, TodoState } from '../types';
import { TODO_VALIDATION } from '../constants';

/**
 * Hook for managing todos with Firestore
 */
export const useTodos = () => {
  const { user } = useUser();
  const { isSynced } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get today's date in ISO format
   */
  const getTodayDate = useCallback(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  /**
   * Load todos from Firestore
   * Waits for Firebase Auth to be synced before making queries
   */
  useEffect(() => {
    // Wait for both user and Firebase Auth sync
    if (!user?.id || !isSynced) {
      setTodos([]);
      setCompletedTodos([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const activeTodosQuery = query(
        collection(db, 'todos'),
        where('userId', '==', user.id),
        where('completed', '==', false),
        orderBy('createdAt', 'desc')
      );

      const completedTodosQuery = query(
        collection(db, 'todos'),
        where('userId', '==', user.id),
        where('completed', '==', true),
        orderBy('completedDate', 'desc')
      );

      const unsubscribeActive = onSnapshot(
        activeTodosQuery,
        (snapshot) => {
          const activeTodosData: Todo[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as Todo));
          setTodos(activeTodosData);
          setIsLoading(false);
        },
        (error) => {
          console.error('[useTodos] Error loading active todos:', error);
          setError(`${TODO_VALIDATION.LOAD_ERROR}: ${error.message}`);
          setIsLoading(false);

          // Fallback query without orderBy
          const fallbackQuery = query(
            collection(db, 'todos'),
            where('userId', '==', user.id),
            where('completed', '==', false)
          );

          onSnapshot(
            fallbackQuery,
            (snapshot) => {
              const fallbackTodos: Todo[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              } as Todo));
              setTodos(fallbackTodos);
              setIsLoading(false);
            },
            (fallbackError) => {
              console.error('[useTodos] Fallback query failed:', fallbackError);
              setError(TODO_VALIDATION.FIRESTORE_ERROR);
              setIsLoading(false);
            }
          );
        }
      );

      const unsubscribeCompleted = onSnapshot(
        completedTodosQuery,
        (snapshot) => {
          const completedTodosData: Todo[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as Todo));
          setCompletedTodos(completedTodosData);
        },
        (error) => {
          console.error('[useTodos] Error loading completed todos:', error);
          setError(`${TODO_VALIDATION.LOAD_COMPLETED_ERROR}: ${error.message}`);

          const fallbackQuery = query(
            collection(db, 'todos'),
            where('userId', '==', user.id),
            where('completed', '==', true)
          );

          onSnapshot(
            fallbackQuery,
            (snapshot) => {
              const fallbackTodos: Todo[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              } as Todo));
              setCompletedTodos(fallbackTodos);
            },
            (fallbackError) => {
              console.error('[useTodos] Fallback completed query failed:', fallbackError);
            }
          );
        }
      );

      return () => {
        unsubscribeActive();
        unsubscribeCompleted();
      };
    } catch (error) {
      console.error('[useTodos] Error setting up listeners:', error);
      setError('Error configurando los listeners de todos');
      setIsLoading(false);
    }
  }, [user?.id, isSynced]);

  /**
   * Add new todo
   */
  const addTodo = useCallback(
    async (text: string) => {
      if (!user?.id) {
        setError(TODO_VALIDATION.AUTH_ERROR);
        return;
      }

      const trimmedText = text.trim();

      if (!trimmedText) {
        setError(TODO_VALIDATION.EMPTY_ERROR);
        return;
      }

      if (trimmedText.length < TODO_VALIDATION.MIN_LENGTH) {
        setError(TODO_VALIDATION.MIN_LENGTH_ERROR);
        return;
      }

      if (trimmedText.length > TODO_VALIDATION.MAX_LENGTH) {
        setError(TODO_VALIDATION.MAX_LENGTH_ERROR);
        return;
      }

      try {
        const newTodo = {
          userId: user.id,
          text: trimmedText,
          completed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'todos'), newTodo);
        setError(null);
      } catch (error) {
        console.error('[useTodos] Error adding todo:', error);
        setError(TODO_VALIDATION.CREATE_ERROR);
      }
    },
    [user?.id]
  );

  /**
   * Toggle todo completion status
   */
  const toggleTodo = useCallback(
    async (todoId: string, completed: boolean) => {
      if (!user?.id) {
        setError(TODO_VALIDATION.AUTH_ERROR);
        return;
      }

      try {
        const todoRef = doc(db, 'todos', todoId);
        const updateData: {
          completed: boolean;
          updatedAt: ReturnType<typeof serverTimestamp>;
          completedDate?: string | null;
        } = {
          completed: !completed,
          updatedAt: serverTimestamp(),
        };

        if (!completed) {
          updateData.completedDate = getTodayDate();
        } else {
          updateData.completedDate = null;
        }

        await updateDoc(todoRef, updateData);
        setError(null);
      } catch (error) {
        console.error('[useTodos] Error toggling todo:', error);
        setError(TODO_VALIDATION.UPDATE_ERROR);
      }
    },
    [user?.id, getTodayDate]
  );

  /**
   * Delete todo
   */
  const deleteTodo = useCallback(
    async (todoId: string) => {
      if (!user?.id) {
        setError(TODO_VALIDATION.AUTH_ERROR);
        return;
      }

      try {
        await deleteDoc(doc(db, 'todos', todoId));
        setError(null);
      } catch (error) {
        console.error('[useTodos] Error deleting todo:', error);
        setError(TODO_VALIDATION.DELETE_ERROR);
      }
    },
    [user?.id]
  );

  /**
   * Get count of completed todos today
   */
  const getCompletedToday = useCallback(() => {
    const today = getTodayDate();
    return completedTodos.filter((todo) => todo.completedDate === today).length;
  }, [completedTodos, getTodayDate]);

  /**
   * Undo last completed todo
   */
  const undoLastCompleted = useCallback(async () => {
    if (!user?.id) {
      setError(TODO_VALIDATION.AUTH_ERROR);
      return;
    }

    try {
      const lastCompletedTodo = completedTodos[0];

      if (!lastCompletedTodo) {
        setError(TODO_VALIDATION.NO_UNDO_ERROR);
        return;
      }

      const todoRef = doc(db, 'todos', lastCompletedTodo.id);
      const updateData = {
        completed: false,
        completedDate: null,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(todoRef, updateData);
      setError(null);
    } catch (error) {
      console.error('[useTodos] Error undoing last completed todo:', error);
      setError(TODO_VALIDATION.UNDO_ERROR);
    }
  }, [user?.id, completedTodos]);

  return {
    todos,
    completedTodos,
    isLoading,
    error,
    addTodo,
    toggleTodo,
    deleteTodo,
    getCompletedToday,
    undoLastCompleted,
  };
};
