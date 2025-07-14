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

    setIsLoading(true);
    setError(null);

    // Query for active todos
    const activeTodosQuery = query(
      collection(db, 'todos'),
      where('userId', '==', user.id),
      where('completed', '==', false),
      orderBy('createdAt', 'desc')
    );

    // Query for completed todos
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
        console.error('Error loading active todos:', error);
        setError('Error cargando todos activos');
        setIsLoading(false);
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
        console.error('Error loading completed todos:', error);
        setError('Error cargando todos completados');
      }
    );

    return () => {
      unsubscribeActive();
      unsubscribeCompleted();
    };
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

      await addDoc(collection(db, 'todos'), newTodo);
      setError(null);
    } catch (error) {
      console.error('Error adding todo:', error);
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

      await updateDoc(todoRef, updateData);
      setError(null);
    } catch (error) {
      console.error('Error toggling todo:', error);
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
      await deleteDoc(doc(db, 'todos', todoId));
      setError(null);
    } catch (error) {
      console.error('Error deleting todo:', error);
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