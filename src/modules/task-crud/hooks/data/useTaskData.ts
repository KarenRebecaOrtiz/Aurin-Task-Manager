/**
 * useTaskData Hook
 * Manages task data fetching and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Client } from '../../types/domain';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';

// Hook for fetching clients
export const useClients = () => {
  const { isSynced } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for Firebase Auth to be synced before making queries
    if (!isSynced) {
      return;
    }

    setIsLoading(true);
    const clientsCollection = collection(db, 'clients');

    const unsubscribe = onSnapshot(
      clientsCollection,
      (snapshot) => {
        const clientsData: Client[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || '',
          imageUrl: doc.data().imageUrl || '',
          projects: doc.data().projects || [],
          createdBy: doc.data().createdBy || '',
        }));
        setClients(clientsData);
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        console.error('[useClients] Error listening to clients:', error);
        setError(error.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isSynced]);

  return { clients, isLoading, error };
};

// Hook for fetching users from dataStore
export const useUsers = () => {
  const users = useDataStore(useShallow((state) => state.users));
  return { users };
};

// Hook for fetching a single task
export const useTask = (taskId: string | null) => {
  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;

    setIsLoading(true);
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      const taskData = taskDoc.data();
      setTask({ id: taskDoc.id, ...taskData });
      setError(null);
    } catch (err) {
      console.error('[useTask] Error fetching task:', err);
      setError(err instanceof Error ? err.message : 'Error fetching task');
      setTask(null);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  return { task, isLoading, error, refetch: fetchTask };
};

// Combined hook for task form data (clients + users)
export const useTaskFormData = () => {
  const { clients, isLoading: clientsLoading, error: clientsError } = useClients();
  const { users } = useUsers();

  return {
    clients,
    users,
    isLoading: clientsLoading,
    error: clientsError,
  };
};
