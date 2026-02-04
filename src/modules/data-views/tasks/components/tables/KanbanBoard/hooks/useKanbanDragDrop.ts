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
      let targetColumnId = String(over.id);

      // Verificar si over.id es una columna válida directamente
      const isValidColumn = statusColumns.some((col) => col.id === targetColumnId);

      if (!isValidColumn) {
        // Si over.id no es una columna, intentar encontrar la tarea para obtener su columna
        const overTask = effectiveTasks.find((t) => t.id === targetColumnId);
        if (overTask) {
          const normalized = normalizeStatus(overTask.status);
          targetColumnId = normalized.toLowerCase().replace(/\s+/g, '-');
        } else {
          // Si no es ni columna ni tarea, salir
          console.warn('[useKanbanDragDrop] Invalid drop target:', targetColumnId);
          return;
        }
      }

      // Verificar nuevamente que tenemos una columna válida después del mapeo
      if (!statusColumns.some((col) => col.id === targetColumnId)) {
        console.warn('[useKanbanDragDrop] Invalid target column:', targetColumnId);
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

      const task = effectiveTasks.find((t) => t.id === taskId);
      if (task && task.status !== newStatusName) {
        const previousStatus = task.status;
        const { updateTask } = useDataStore.getState();

        // ✅ OPTIMISTIC UPDATE: Actualizar UI inmediatamente
        updateTask(taskId, {
          status: newStatusName,
          lastActivity: new Date().toISOString(),
        });

        try {
          // Importar funciones de Firestore
          const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
          const { updateTaskActivity } = await import('@/lib/taskUtils');

          // Persistir en Firestore (en background)
          await updateDoc(doc(db, 'tasks', taskId), {
            status: newStatusName,
            lastActivity: serverTimestamp(),
          });

          // Actualizar la actividad de la tarea
          await updateTaskActivity(taskId, 'status_change');
        } catch (error) {
          // ❌ ROLLBACK: Si falla, revertir al estado anterior
          console.error('[useKanbanDragDrop] Error updating task status:', error);
          updateTask(taskId, {
            status: previousStatus,
            lastActivity: new Date().toISOString(),
          });
        }
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
