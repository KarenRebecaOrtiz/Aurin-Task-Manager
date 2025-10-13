'use client';

import { useState, useCallback } from 'react';
import { archiveTask, unarchiveTask } from '@/lib/taskUtils';
import { useDataStore } from '@/stores/dataStore';

// Tipos
interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
  CreatedBy?: string;
  lastActivity?: string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: string };
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

interface ArchiveAction {
  task: Task;
  action: 'archive' | 'unarchive';
  timestamp: number;
}

interface UseTaskArchivingProps {
  onOptimisticUpdate?: (task: Task, action: 'archive' | 'unarchive') => void;
  onRollback?: (task: Task, action: 'archive' | 'unarchive') => void;
  onSuccess?: (task: Task, action: 'archive' | 'unarchive') => void;
  onError?: (error: Error, task: Task, action: 'archive' | 'unarchive') => void;
}

interface UseTaskArchivingReturn {
  // Estados
  undoStack: ArchiveAction[];
  showUndo: boolean;
  isProcessing: boolean;
  
  // Acciones principales
  handleArchiveTask: (task: Task, userId: string, isAdmin: boolean) => Promise<boolean>;
  handleUnarchiveTask: (task: Task, userId: string, isAdmin: boolean) => Promise<boolean>;
  handleUndo: (undoItem?: ArchiveAction) => Promise<boolean>;
  
  // Utilidades
  clearUndoStack: () => void;
  getLastUndoAction: () => ArchiveAction | null;
}

/**
 * Hook centralizado para manejar archivado/desarchivado de tareas
 * 
 * Características:
 * - Actualización optimista del dataStore
 * - Sistema de undo unificado
 * - Rollback automático en caso de error
 * - Callbacks opcionales para integración con UI existente
 * - Compatible con cualquier componente sin cambios
 */
export const useTaskArchiving = (props: UseTaskArchivingProps = {}): UseTaskArchivingReturn => {
  const {
    onOptimisticUpdate,
    onRollback,
    onSuccess,
    onError
  } = props;

  // Estados locales
  const [undoStack, setUndoStack] = useState<ArchiveAction[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Timeout para auto-ocultar undo
  const [undoTimeoutRef, setUndoTimeoutRef] = useState<NodeJS.Timeout | null>(null);

  // Helper para limpiar timeout
  const clearUndoTimeout = useCallback(() => {
    if (undoTimeoutRef) {
      clearTimeout(undoTimeoutRef);
      setUndoTimeoutRef(null);
    }
  }, [undoTimeoutRef]);

  // Helper para configurar auto-hide del undo
  const setupUndoTimeout = useCallback(() => {
    clearUndoTimeout();
    const timeoutId = setTimeout(() => {
      setShowUndo(false);
    }, 5000); // 5 segundos para deshacer
    setUndoTimeoutRef(timeoutId);
  }, [clearUndoTimeout]);

  // Actualización optimista del dataStore
  const performOptimisticUpdate = useCallback((task: Task, action: 'archive' | 'unarchive') => {
    const { updateTask } = useDataStore.getState();
    
    if (action === 'archive') {
      updateTask(task.id, {
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: task.CreatedBy // Se actualizará con el userId real
      });
    } else {
      updateTask(task.id, {
        archived: false,
        archivedAt: undefined,
        archivedBy: undefined
      });
    }
    
    // Callback opcional para UI específica
    onOptimisticUpdate?.(task, action);
  }, [onOptimisticUpdate]);

  // Rollback del dataStore
  const performRollback = useCallback((task: Task, action: 'archive' | 'unarchive') => {
    const { updateTask } = useDataStore.getState();
    
    // Revertir al estado original
    if (action === 'archive') {
      // Si estábamos archivando, revertir a no archivado
      updateTask(task.id, {
        archived: false,
        archivedAt: task.archivedAt || undefined,
        archivedBy: task.archivedBy || undefined
      });
    } else {
      // Si estábamos desarchivando, revertir a archivado
      updateTask(task.id, {
        archived: true,
        archivedAt: task.archivedAt || new Date().toISOString(),
        archivedBy: task.archivedBy
      });
    }
    
    // Callback opcional para UI específica
    onRollback?.(task, action);
  }, [onRollback]);

  // Función principal para archivar
  const handleArchiveTask = useCallback(async (
    task: Task, 
    userId: string, 
    isAdmin: boolean
  ): Promise<boolean> => {
    if (isProcessing) return false;
    
    try {
      setIsProcessing(true);
      
      // 1. Verificar permisos
      if (!isAdmin && task.CreatedBy !== userId) {
        throw new Error('No tienes permisos para archivar esta tarea');
      }

      // 2. Crear acción para undo
      const undoAction: ArchiveAction = {
        task: { ...task },
        action: 'archive',
        timestamp: Date.now()
      };

      // 3. Actualización optimista
      performOptimisticUpdate(task, 'archive');

      // 4. Agregar al stack de undo
      setUndoStack(prev => [...prev, undoAction]);
      setShowUndo(true);
      setupUndoTimeout();

      // 5. Operación en Firestore
      await archiveTask(task.id, userId, isAdmin, task);

      // 6. Éxito
      onSuccess?.(task, 'archive');
      return true;

    } catch (error) {
      // Rollback en caso de error
      performRollback(task, 'archive');
      
      // Remover del undo stack si falló
      setUndoStack(prev => prev.filter(item => item.timestamp !== Date.now()));
      setShowUndo(false);
      clearUndoTimeout();

      const errorObj = error instanceof Error ? error : new Error(String(error));
      onError?.(errorObj, task, 'archive');
      
      // eslint-disable-next-line no-console
      console.error('[useTaskArchiving] Error archiving task:', error);
      return false;
      
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, performOptimisticUpdate, setupUndoTimeout, onSuccess, performRollback, onError, clearUndoTimeout]);

  // Función principal para desarchivar
  const handleUnarchiveTask = useCallback(async (
    task: Task, 
    userId: string, 
    isAdmin: boolean
  ): Promise<boolean> => {
    if (isProcessing) return false;
    
    try {
      setIsProcessing(true);
      
      // 1. Verificar permisos
      if (!isAdmin && task.CreatedBy !== userId) {
        throw new Error('No tienes permisos para desarchivar esta tarea');
      }

      // 2. Crear acción para undo
      const undoAction: ArchiveAction = {
        task: { ...task },
        action: 'unarchive',
        timestamp: Date.now()
      };

      // 3. Actualización optimista
      performOptimisticUpdate(task, 'unarchive');

      // 4. Agregar al stack de undo
      setUndoStack(prev => [...prev, undoAction]);
      setShowUndo(true);
      setupUndoTimeout();

      // 5. Operación en Firestore
      await unarchiveTask(task.id, userId, isAdmin, task);

      // 6. Éxito
      onSuccess?.(task, 'unarchive');
      return true;

    } catch (error) {
      // Rollback en caso de error
      performRollback(task, 'unarchive');
      
      // Remover del undo stack si falló
      setUndoStack(prev => prev.filter(item => item.timestamp !== Date.now()));
      setShowUndo(false);
      clearUndoTimeout();

      const errorObj = error instanceof Error ? error : new Error(String(error));
      onError?.(errorObj, task, 'unarchive');
      
      // eslint-disable-next-line no-console
      console.error('[useTaskArchiving] Error unarchiving task:', error);
      return false;
      
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, performOptimisticUpdate, setupUndoTimeout, onSuccess, performRollback, onError, clearUndoTimeout]);

  // Función para deshacer la última acción
  const handleUndo = useCallback(async (undoItem?: ArchiveAction): Promise<boolean> => {
    const actionToUndo = undoItem || undoStack[undoStack.length - 1];
    
    if (!actionToUndo) return false;
    if (isProcessing) return false;

    try {
      setIsProcessing(true);
      clearUndoTimeout();

      // Remover del stack inmediatamente
      setUndoStack(prev => prev.filter(item => item.timestamp !== actionToUndo.timestamp));
      setShowUndo(false);

      // Ejecutar acción opuesta
      const oppositeAction = actionToUndo.action === 'archive' ? 'unarchive' : 'archive';
      
      // Actualización optimista para la acción opuesta
      performOptimisticUpdate(actionToUndo.task, oppositeAction);

      // Llamar a la función correcta de taskUtils
      if (actionToUndo.action === 'archive') {
        // Si la acción original fue archivar, ahora desarchivamos
        await unarchiveTask(
          actionToUndo.task.id, 
          actionToUndo.task.CreatedBy || '', 
          true, // Asumimos admin para undo
          actionToUndo.task
        );
      } else {
        // Si la acción original fue desarchivar, ahora archivamos
        await archiveTask(
          actionToUndo.task.id, 
          actionToUndo.task.CreatedBy || '', 
          true, // Asumimos admin para undo
          actionToUndo.task
        );
      }

      return true;

    } catch (error) {
      // Rollback si falla el undo
      performRollback(actionToUndo.task, actionToUndo.action === 'archive' ? 'unarchive' : 'archive');
      
      // eslint-disable-next-line no-console
      console.error('[useTaskArchiving] Error undoing action:', error);
      return false;
      
    } finally {
      setIsProcessing(false);
    }
  }, [undoStack, isProcessing, clearUndoTimeout, performOptimisticUpdate, performRollback]);

  // Utilidades
  const clearUndoStack = useCallback(() => {
    setUndoStack([]);
    setShowUndo(false);
    clearUndoTimeout();
  }, [clearUndoTimeout]);

  const getLastUndoAction = useCallback((): ArchiveAction | null => {
    return undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
  }, [undoStack]);

  // Cleanup al desmontar
  // useEffect(() => {
  //   return () => {
  //     clearUndoTimeout();
  //   };
  // }, [clearUndoTimeout]);

  return {
    // Estados
    undoStack,
    showUndo,
    isProcessing,
    
    // Acciones principales
    handleArchiveTask,
    handleUnarchiveTask,
    handleUndo,
    
    // Utilidades
    clearUndoStack,
    getLastUndoAction
  };
};

export default useTaskArchiving;
