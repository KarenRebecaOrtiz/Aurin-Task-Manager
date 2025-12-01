/**
 * Client Tasks Table Component
 * Displays tasks related to a specific client
 * Reuses components from data-views module
 */

'use client';

import { motion } from 'framer-motion';
import { useClientTasks } from '../hooks/data/useClientTasks';
import { StatusCell, PriorityCell } from '@/modules/data-views/components/shared/cells';
import styles from './ClientTasksTable.module.scss';

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
      <motion.div variants={fadeInUp} className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Cargando tareas...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div variants={fadeInUp} className={styles.container}>
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeInUp} className={styles.container}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          Tareas Relacionadas
        </h3>
        <span className={styles.taskCount}>
          {totalTasks} {totalTasks === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className={styles.emptyState}>
          <svg
            className={styles.emptyIcon}
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
          <p className={styles.emptyTitle}>No hay tareas</p>
          <p className={styles.emptySubtitle}>
            {isAdmin
              ? 'Este cliente no tiene tareas asignadas'
              : 'No tienes tareas asignadas para este cliente'}
          </p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>Tarea</th>
                  <th className={styles.th}>Proyecto</th>
                  <th className={styles.th}>Estado</th>
                  <th className={styles.th}>Prioridad</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {tasks.map((task) => (
                  <tr key={task.id} className={styles.row}>
                    <td className={styles.td}>
                      <div className={styles.taskInfo}>
                        <span className={styles.taskName}>{task.name}</span>
                        {task.description && (
                          <span className={styles.taskDescription}>
                            {task.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.projectName}>{task.project}</span>
                    </td>
                    <td className={styles.td}>
                      <StatusCell status={task.status} />
                    </td>
                    <td className={styles.td}>
                      <PriorityCell priority={task.priority} />
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
