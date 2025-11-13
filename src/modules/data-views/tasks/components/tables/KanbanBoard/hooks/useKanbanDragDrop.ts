import { useCallback, useState } from 'react';
import { DragStartEvent, DragEndEvent, useSensors, useSensor, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { db } from '@/lib/firebase';
import { useDataStore } from '@/stores/dataStore';

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

interface StatusColumn {
  id: string;
  label: string;
  value: string;
}

interface UseKanbanDragDropProps {
  effectiveTasks: Task[];
  statusColumns: StatusColumn[];
  normalizeStatus: (status: string) => string;
  isAdmin: boolean;
}

export const useKanbanDragDrop = ({
  effectiveTasks,
  statusColumns,
  normalizeStatus,
  isAdmin,
}: UseKanbanDragDropProps) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configurar sensores con restricciones para evitar drag accidental
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms delay before drag starts
        tolerance: 5, // 5px tolerance for finger movement during delay
      },
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      // 🔒 Bloquear drag para usuarios no admin
      if (!isAdmin) {
        return;
      }

      const taskId = event.active.id;
      const task = effectiveTasks.find((t) => t.id === taskId);
      if (task) {
        setActiveTask(task);
      }
    },
    [isAdmin, effectiveTasks]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over || !isAdmin) {
        return;
      }

      const taskId = String(active.id);
      let targetColumnId = over.id as string;

      // Fix: Si over.id NO es una columna válida, buscar la columna padre
      if (!statusColumns.some((col) => col.id === targetColumnId)) {
        // Si over es una tarea, usar la columna de esa tarea
        const overTask = effectiveTasks.find((t) => t.id === targetColumnId);
        if (overTask) {
          const normalized = normalizeStatus(overTask.status);
          targetColumnId = normalized.toLowerCase().replace(/\s+/g, '-');
        } else {
          return;
        }
      }

      // Verificar que tenemos una columna válida
      if (!statusColumns.some((col) => col.id === targetColumnId)) {
        return;
      }

      // Map column IDs back to proper status names
      const columnToStatusMap: { [key: string]: string } = {
        'por-iniciar': 'Por Iniciar',
        'en-proceso': 'En Proceso',
        'backlog': 'Backlog',
        'por-finalizar': 'Por Finalizar',
        'finalizado': 'Finalizado',
        'cancelado': 'Cancelado',
      };

      const newStatusName = columnToStatusMap[targetColumnId];

      if (!newStatusName) {
        return;
      }

      try {
        const task = effectiveTasks.find((t) => t.id === taskId);
        if (task && task.status !== newStatusName) {
          // Importar funciones de Firestore
          const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
          const { updateTaskActivity } = await import('@/lib/taskUtils');

          // Actualizar el estado en Firestore
          await updateDoc(doc(db, 'tasks', taskId), {
            status: newStatusName,
            lastActivity: serverTimestamp(),
          });

          // Fix 2: Actualización optimista en dataStore para UI inmediata
          const { updateTask } = useDataStore.getState();
          updateTask(taskId, {
            status: newStatusName,
            lastActivity: new Date().toISOString(),
          });

          // Actualizar la actividad de la tarea
          await updateTaskActivity(taskId, 'status_change');
        }
      } catch (error) {
        console.error('[useKanbanDragDrop] Error updating task status:', error);
      }
    },
    [isAdmin, effectiveTasks, statusColumns, normalizeStatus]
  );

  return {
    sensors,
    activeTask,
    handleDragStart,
    handleDragEnd,
  };
};
