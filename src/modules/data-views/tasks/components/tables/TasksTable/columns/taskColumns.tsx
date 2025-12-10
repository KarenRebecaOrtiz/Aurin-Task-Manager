import { useMemo, useCallback } from 'react';
import { Task, Client, User } from '@/types';
import { AvatarGroup } from '@/modules/shared/components/atoms/Avatar';
import { ClientCell, StatusCell, PriorityCell } from '@/modules/shared/components/molecules/TableCell';
import ActionMenu from '@/modules/data-views/components/ui/ActionMenu';
import { hasUnreadUpdates, getUnreadCount } from '@/lib/taskUtils';
import styles from '../TasksTable.module.scss';

interface UseTaskColumnsProps {
  clients: Client[];
  users: User[];
  userId: string;
  isAdmin: boolean;
  onEditTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (taskId: string) => void;
  actionMenuOpenId: string | null;
  setActionMenuOpenId: (id: string | null) => void;
}

export const useTaskColumns = ({
  clients,
  users,
  userId,
  isAdmin,
  onEditTask,
  onDeleteTask,
  onArchiveTask,
  actionMenuOpenId,
  setActionMenuOpenId,
}: UseTaskColumnsProps) => {
  const handleEdit = useCallback((taskId: string) => () => onEditTask(taskId), [onEditTask]);
  const handleDelete = useCallback((taskId: string) => () => onDeleteTask(taskId), [onDeleteTask]);
  const handleArchive = useCallback((taskId: string) => () => onArchiveTask(taskId), [onArchiveTask]);
  const handleToggle = useCallback((taskId: string) => () => {
    setActionMenuOpenId(actionMenuOpenId === taskId ? null : taskId);
  }, [actionMenuOpenId, setActionMenuOpenId]);

  return useMemo(() => {
    const baseColumns = [
      {
        key: 'clientId',
        label: 'Cuenta',
        width: '20%',
        mobileVisible: true,
        mobileWidth: '30%',
        sortable: true,
      },
      {
        key: 'name',
        label: 'Tarea',
        width: '60%',
        mobileVisible: true,
        mobileWidth: '40%',
        sortable: true,
      },
      {
        key: 'assignedTo',
        label: 'Asignados',
        width: '20%',
        mobileVisible: false,
        sortable: false,
      },
      {
        key: 'status',
        label: 'Estado',
        width: '30%',
        mobileVisible: false,
        sortable: true,
      },
      {
        key: 'priority',
        label: 'Prioridad',
        width: '10%',
        mobileVisible: false,
        sortable: true,
      },
      {
        key: 'action',
        label: 'Acciones',
        width: '10%',
        mobileVisible: true,
        mobileWidth: '30%',
        sortable: false,
      },
    ];

    return baseColumns.map((col) => {
      // Client column
      if (col.key === 'clientId') {
        return {
          ...col,
          render: (task: Task) => {
            const client = clients.find((c) => c.id === task.clientId);
            return <ClientCell client={client} />;
          },
        };
      }

      // Task name column with notification
      if (col.key === 'name') {
        return {
          ...col,
          render: (task: Task) => {
            const hasUpdates = hasUnreadUpdates(task, userId);
            const updateCount = getUnreadCount(task, userId);
            
            return (
              <div className={styles.taskNameWrapper}>
                <span className={styles.taskName}>{task.name}</span>
                {hasUpdates && updateCount > 0 && (
                  <div className={styles.updateDotRed}>
                    <span className={styles.updateDotPing}></span>
                    <span className={styles.updateDotNumber}>{updateCount}</span>
                  </div>
                )}
              </div>
            );
          },
        };
      }

      // Assigned users column
      if (col.key === 'assignedTo') {
        return {
          ...col,
          render: (task: Task) => (
            <AvatarGroup
              assignedUserIds={task.AssignedTo}
              leadedByUserIds={task.LeadedBy}
              currentUserId={userId}
            />
          ),
        };
      }

      // Status column
      if (col.key === 'status') {
        return {
          ...col,
          render: (task: Task) => <StatusCell status={task.status} />,
        };
      }

      // Priority column
      if (col.key === 'priority') {
        return {
          ...col,
          render: (task: Task) => <PriorityCell priority={task.priority as 'Alta' | 'Media' | 'Baja'} />,
        };
      }

      // Action column
      if (col.key === 'action') {
        return {
          ...col,
          render: (task: Task) => {
            if (!isAdmin) return null;

            const animateClick = (element: HTMLElement) => {
              element.classList.add(styles.clicked);
              setTimeout(() => element.classList.remove(styles.clicked), 200);
            };

            return (
              <ActionMenu
                task={task}
                userId={userId}
                onEdit={handleEdit(task.id)}
                onDelete={handleDelete(task.id)}
                onArchive={handleArchive(task.id)}
                animateClick={animateClick}
                actionMenuRef={null}
                actionButtonRef={() => {}}
              />
            );
          },
        };
      }

      return col;
    });
  }, [clients, users, userId, isAdmin, handleEdit, handleDelete, handleArchive]);
};
