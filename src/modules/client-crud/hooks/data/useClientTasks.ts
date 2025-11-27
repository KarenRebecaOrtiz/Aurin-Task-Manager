/**
 * Client Tasks Hook
 * Fetches and filters tasks for a specific client
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Task } from '@/types';

interface UseClientTasksProps {
  clientId: string;
  isAdmin: boolean;
}

export function useClientTasks({ clientId, isAdmin }: UseClientTasksProps) {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !user) return;

    const fetchClientTasks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch tasks from Firestore
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, where('clientId', '==', clientId));
        const querySnapshot = await getDocs(q);

        const allTasks: Task[] = [];
        querySnapshot.forEach((doc) => {
          allTasks.push({
            id: doc.id,
            ...doc.data(),
          } as Task);
        });

        // If not admin, filter to show only tasks user is assigned to
        let filteredTasks = allTasks;
        if (!isAdmin && user.id) {
          filteredTasks = filteredTasks.filter(task =>
            task.LeadedBy?.includes(user.id) ||
            task.AssignedTo?.includes(user.id) ||
            task.CreatedBy === user.id
          );
        }

        // Sort by creation date (newest first)
        filteredTasks.sort((a, b) => {
          const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any)?.getTime?.() || 0;
          const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any)?.getTime?.() || 0;
          return dateB - dateA;
        });

        setTasks(filteredTasks);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientTasks();
  }, [clientId, user, isAdmin]);

  return {
    tasks,
    isLoading,
    error,
    totalTasks: tasks.length,
  };
}
