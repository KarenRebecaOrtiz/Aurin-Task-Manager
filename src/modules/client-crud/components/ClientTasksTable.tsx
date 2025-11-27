/**
 * Client Tasks Table Component
 * Displays tasks related to a specific client
 */

'use client';

import { motion } from 'framer-motion';
import { useClientTasks } from '../hooks/data/useClientTasks';
import { Task } from '@/types';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ClientTasksTableProps {
  clientId: string;
  isAdmin: boolean;
}

export function ClientTasksTable({ clientId, isAdmin }: ClientTasksTableProps) {
  const { tasks, isLoading, error, totalTasks } = useClientTasks({ clientId, isAdmin });

  if (isLoading) {
    return (
      <motion.div variants={fadeInUp} className="md:col-span-2">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-sm text-gray-500">Cargando tareas...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div variants={fadeInUp} className="md:col-span-2">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeInUp} className="md:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Tareas Relacionadas
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {totalTasks} {totalTasks === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-sm text-gray-600 font-medium">No hay tareas</p>
          <p className="text-xs text-gray-500 mt-1">
            {isAdmin
              ? 'Este cliente no tiene tareas asignadas'
              : 'No tienes tareas asignadas para este cliente'}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tarea
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha Límite
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{task.name}</span>
                        {task.description && (
                          <span className="text-xs text-gray-500 truncate max-w-xs">
                            {task.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{task.project}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {task.endDate ? formatDate(task.endDate) : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Helper components
function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    'Por Iniciar': 'bg-gray-100 text-gray-700',
    'En Progreso': 'bg-blue-100 text-blue-700',
    'En Revisión': 'bg-yellow-100 text-yellow-700',
    'Completada': 'bg-green-100 text-green-700',
    'Bloqueada': 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        statusColors[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const priorityColors: Record<string, string> = {
    'Baja': 'bg-gray-100 text-gray-600',
    'Media': 'bg-yellow-100 text-yellow-700',
    'Alta': 'bg-orange-100 text-orange-700',
    'Crítica': 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        priorityColors[priority] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {priority}
    </span>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}
