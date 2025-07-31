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
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Todo {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  completedDate?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const useTodos = () => {
  const { user } = useUser();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get today's date in ISO format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Load todos from Firestore
  useEffect(() => {
    if (!user?.id) {
      setTodos([]);
      setCompletedTodos([]);
      return;
    }

    // Loading todos
    setIsLoading(true);
    setError(null);

    try {
      // Query for active todos with composite index
      const activeTodosQuery = query(
        collection(db, 'todos'),
        where('userId', '==', user.id),
        where('completed', '==', false),
        orderBy('createdAt', 'desc')
      );

      // Query for completed todos with composite index
      const completedTodosQuery = query(
        collection(db, 'todos'),
        where('userId', '==', user.id),
        where('completed', '==', true),
        orderBy('completedDate', 'desc')
      );

      // Setting up active todos listener
      const unsubscribeActive = onSnapshot(
        activeTodosQuery,
        (snapshot) => {
          const activeTodosData: Todo[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as Todo));
          // Active todos loaded
          setTodos(activeTodosData);
          setIsLoading(false);
        },
        (error) => {
          console.error('[useTodos] Error loading active todos:', error);
          setError(`Error cargando todos activos: ${error.message}`);
          setIsLoading(false);
          
          // Fallback: try simpler query without orderBy
          console.log('[useTodos] Trying fallback query for active todos');
          const fallbackQuery = query(
            collection(db, 'todos'),
            where('userId', '==', user.id),
            where('completed', '==', false)
          );
          
          onSnapshot(fallbackQuery, (snapshot) => {
            const fallbackTodos: Todo[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            } as Todo));
            console.log('[useTodos] Fallback active todos loaded:', fallbackTodos.length);
            setTodos(fallbackTodos);
            setIsLoading(false);
          }, (fallbackError) => {
            console.error('[useTodos] Fallback query also failed:', fallbackError);
            setError('No se pudieron cargar los todos. Verifica los índices de Firestore.');
            setIsLoading(false);
          });
        }
      );

      // Setting up completed todos listener
      const unsubscribeCompleted = onSnapshot(
        completedTodosQuery,
        (snapshot) => {
          const completedTodosData: Todo[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as Todo));
          // Completed todos loaded
          setCompletedTodos(completedTodosData);
        },
        (error) => {
          console.error('[useTodos] Error loading completed todos:', error);
          setError(`Error cargando todos completados: ${error.message}`);
          
          // Fallback: try simpler query without orderBy
          console.log('[useTodos] Trying fallback query for completed todos');
          const fallbackQuery = query(
            collection(db, 'todos'),
            where('userId', '==', user.id),
            where('completed', '==', true)
          );
          
          onSnapshot(fallbackQuery, (snapshot) => {
            const fallbackTodos: Todo[] = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            } as Todo));
            console.log('[useTodos] Fallback completed todos loaded:', fallbackTodos.length);
            setCompletedTodos(fallbackTodos);
          }, (fallbackError) => {
            console.error('[useTodos] Fallback completed query also failed:', fallbackError);
          });
        }
      );

      return () => {
        // Cleaning up listeners
        unsubscribeActive();
        unsubscribeCompleted();
      };
    } catch (error) {
      console.error('[useTodos] Error setting up listeners:', error);
      setError('Error configurando los listeners de todos');
      setIsLoading(false);
    }
  }, [user?.id]);

  // Add new todo
  const addTodo = useCallback(async (text: string) => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      return;
    }

    const trimmedText = text.trim();
    
    // Validation
    if (!trimmedText) {
      setError('El todo no puede estar vacío');
      return;
    }
    
    if (trimmedText.length < 3) {
      setError('El todo debe tener al menos 3 caracteres');
      return;
    }
    
    if (trimmedText.length > 100) {
      setError('El todo no puede tener más de 100 caracteres');
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

      console.log('[useTodos] Adding new todo:', trimmedText);
      await addDoc(collection(db, 'todos'), newTodo);
      setError(null);
    } catch (error) {
      console.error('[useTodos] Error adding todo:', error);
      setError('Error al crear el todo');
    }
  }, [user?.id]);

  // Toggle todo completion
  const toggleTodo = useCallback(async (todoId: string, completed: boolean) => {
    if (!user?.id) {
      setError('Usuario no autenticado');
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
        // Marking as completed
        updateData.completedDate = getTodayDate();
      } else {
        // Marking as uncompleted
        updateData.completedDate = null;
      }

      console.log('[useTodos] Toggling todo:', todoId, 'to completed:', !completed);
      await updateDoc(todoRef, updateData);
      setError(null);
    } catch (error) {
      console.error('[useTodos] Error toggling todo:', error);
      setError('Error al actualizar el todo');
    }
  }, [user?.id]);

  // Delete todo
  const deleteTodo = useCallback(async (todoId: string) => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      return;
    }

    try {
      console.log('[useTodos] Deleting todo:', todoId);
      await deleteDoc(doc(db, 'todos', todoId));
      setError(null);
    } catch (error) {
      console.error('[useTodos] Error deleting todo:', error);
      setError('Error al eliminar el todo');
    }
  }, [user?.id]);

  // Get completed todos for today
  const getCompletedToday = useCallback(() => {
    const today = getTodayDate();
    return completedTodos.filter(todo => todo.completedDate === today).length;
  }, [completedTodos]);

  return {
    todos,
    completedTodos,
    isLoading,
    error,
    addTodo,
    toggleTodo,
    deleteTodo,
    getCompletedToday,
  };
}; 