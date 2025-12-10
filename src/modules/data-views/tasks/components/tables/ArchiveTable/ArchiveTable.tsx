'use client';

import { useEffect, useRef, useMemo, memo, useCallback, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import Table from '@/modules/data-views/components/shared/table/Table';
import ActionMenu from '@/modules/data-views/components/ui/ActionMenu';
import styles from './ArchiveTable.module.scss';

// ✅ Nuevos componentes atómicos
import { TasksHeader } from '@/modules/data-views/components/ui/TasksHeader';
import { AvatarGroup } from '@/modules/shared/components/atoms/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { TableSkeletonLoader, EmptyTableState } from '@/modules/data-views/components/shared';
import { markTaskAsViewed } from '@/lib/taskUtils';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useTaskArchiving } from '@/modules/data-views/tasks/hooks/useTaskArchiving';
import { useTasksCommon } from '@/modules/data-views/tasks/hooks/useTasksCommon';
import { useArchiveTableState } from './hooks/useArchiveTableState';
import { useAdvancedSearch } from '@/modules/data-views/hooks/useAdvancedSearch';

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

// type TaskView = 'table' | 'kanban';

// ✅ ELIMINADO: AvatarGroup ahora es un componente atómico reutilizable
// Se importa desde @/modules/shared/components/atoms/Avatar

interface ArchiveTableProps {
  onEditTaskOpen: (taskId: string) => void;
  onViewChange: (view: string) => void;
  onDeleteTaskOpen: (taskId: string) => void;
  onClose: () => void;
  onDataRefresh: () => void;
}

const ArchiveTable: React.FC<ArchiveTableProps> = memo(
  ({
    onEditTaskOpen,
    onViewChange,
    onDeleteTaskOpen,
    onClose,
    onDataRefresh,
  }) => {
    const { user } = useUser();
    const { isAdmin } = useAuth();
    
    // ✅ Hook consolidado para estado de ArchiveTable (debe estar antes de useTaskArchiving)
    const {
      effectiveTasks,
      effectiveClients,
      effectiveUsers,
      filteredTasks,
      sortKey,
      sortDirection,
      handleSort,
      searchQuery,
      searchCategory,
      setSearchQuery,
      setSearchCategory,
      priorityFilter,
      clientFilter,
      userFilter,
      setFilteredTasks,
    } = useArchiveTableState();
    
    // ✅ Hook centralizado para archivado/desarchivado
    const {
      handleUnarchiveTask: unarchiveTaskCentralized,
      handleUndo: undoCentralized,
      undoStack: centralizedUndoStack,
      showUndo: centralizedShowUndo
    } = useTaskArchiving({
      onSuccess: (task, action) => {
        // Callback para actualizar la UI después de cambios exitosos
        if (action === 'unarchive') {
          // Remover tarea desarchivada del filtrado local (ya que mostramos solo archivadas)
          setFilteredTasks(filteredTasks.filter(t => t.id !== task.id));
        } else {
          // Agregar tarea archivada al filtrado local
          setFilteredTasks([...filteredTasks, { ...task, archived: true }]);
        }
      },
      onError: (error, task, action) => {
        // eslint-disable-next-line no-console
        console.error(`Error ${action}ing task:`, error);
      }
    });
    
    // ✅ Hook común centralizado
    const {
      getInvolvedUserIds,
      getClientName,
      animateClick,
    } = useTasksCommon();
    
    // Hook para detectar el viewport
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
      const checkViewport = () => {
        setIsMobile(window.innerWidth < 768);
      };
      
      checkViewport();
      window.addEventListener('resize', checkViewport);
      
      return () => window.removeEventListener('resize', checkViewport);
    }, []);
    
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const userId = useMemo(() => user?.id || '', [user]);

    // CRÍTICO: ArchiveTable SIEMPRE filtra tareas NO archivadas (archived: false)
    const archivedTasks = useMemo(() => {
      const archived = effectiveTasks.filter(task => {
        const isArchived = Boolean(task.archived);
        return isArchived; // Solo mostrar tareas ARCHIVADAS
      });
      
      return archived;
    }, [effectiveTasks]);

    // ✅ ELIMINADO: getInvolvedUserIds ahora viene del hook centralizado useTasksCommon

    // Apply advanced search (searches in task name, description, client name, user names)
    const searchFiltered = useAdvancedSearch(
      archivedTasks,
      effectiveClients,
      effectiveUsers,
      searchQuery,
      getInvolvedUserIds,
      searchCategory
    );

    const memoizedFilteredTasks = useMemo(() => {
      let result = searchFiltered;

      // 🔒 FILTRO DE PERMISOS: Solo admins o usuarios involucrados pueden ver la tarea
      result = result.filter((task) => {
        const canViewTask = isAdmin || getInvolvedUserIds(task as Task).includes(userId);
        return canViewTask;
      });

      // Filter by priority
      if (priorityFilter) {
        result = result.filter(task => task.priority === priorityFilter);
      }

      // Filter by client
      if (clientFilter) {
        result = result.filter(task => task.clientId === clientFilter);
      }

      // Filter by user
      let filteredByUser = result;
      if (userFilter === 'me') {
        filteredByUser = result.filter(task => getInvolvedUserIds(task as Task).includes(userId));
      } else if (userFilter && userFilter !== 'me') {
        filteredByUser = result.filter(task => getInvolvedUserIds(task as Task).includes(userFilter));
      }

      return filteredByUser;
    }, [searchFiltered, priorityFilter, clientFilter, userFilter, userId, getInvolvedUserIds, isAdmin]);

    useEffect(() => {
      setFilteredTasks(memoizedFilteredTasks as Task[]);
    }, [memoizedFilteredTasks, setFilteredTasks]);

    // ✅ CENTRALIZADO: Usar hook centralizado para desarchivar tareas
    const handleUnarchiveTask = useCallback(async (task: Task) => {
      // ✅ CORREGIDO: Permitir desarchivar a admins Y creadores de la tarea
      if (!isAdmin && task.CreatedBy !== userId) {
        // eslint-disable-next-line no-console
        console.warn('[ArchiveTable] Unarchive intentado por usuario sin permisos:', { 
          isAdmin, 
          taskCreatedBy: task.CreatedBy, 
          currentUserId: userId 
        });
        return;
      }

      try {
        await unarchiveTaskCentralized(task, userId, isAdmin);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[ArchiveTable] Error unarchiving task:', error);
        if (onDataRefresh) {
          onDataRefresh();
        }
      }
    }, [isAdmin, userId, onDataRefresh, unarchiveTaskCentralized]);

    // ✅ CENTRALIZADO: Usar hook centralizado para deshacer
    const handleUndo = useCallback(async (undoItem?: {task: Task, action: 'archive' | 'unarchive', timestamp: number}) => {
      try {
        // Usar la función centralizada de undo
        if (undoItem) {
          const mappedUndoItem = {
            task: undoItem.task,
            action: undoItem.action,
            timestamp: undoItem.timestamp
          };
          await undoCentralized(mappedUndoItem);
        } else {
          await undoCentralized();
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[ArchiveTable] Error undoing action:', error);
      }
    }, [undoCentralized]);

    // Ordenar tareas
    const sortedTasks = useMemo(() => {
      return [...filteredTasks].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortKey) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'priority':
            const priorityOrder = { Alta: 3, Media: 2, Baja: 1 };
            aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            break;
          case 'status':
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case 'client':
            aValue = getClientName(a.clientId);
            bValue = getClientName(b.clientId);
            break;
          case 'archivedAt':
            aValue = a.archivedAt || a.createdAt;
            bValue = b.archivedAt || b.createdAt;
            break;
          case 'lastActivity':
            aValue = a.lastActivity || a.createdAt;
            bValue = b.lastActivity || a.createdAt;
            break;
          default:
            aValue = a.createdAt;
            bValue = b.createdAt;
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }, [filteredTasks, sortKey, sortDirection, getClientName]);

    const handleTaskRowClick = useCallback(async (task: Task) => {
      // Marcar la tarea como vista usando el nuevo sistema
      await markTaskAsViewed(task.id, userId);
      // Usar directamente el store en lugar de props para evitar re-renders
      const { openChatSidebar } = useSidebarStateStore.getState();
      // Buscar el nombre del cliente
      const clientName = effectiveClients?.find((c) => c.id === task.clientId)?.name || 'Sin cuenta';
      // Actualizar el store directamente
      openChatSidebar(task, clientName);
    }, [userId, effectiveClients]);

    // Handler para error de imagen
    const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      e.currentTarget.src = '/empty-image.png';
    }, []);

    // Handler para editar tarea
    const createEditHandler = useCallback((taskId: string) => () => {
      onEditTaskOpen(taskId);
    }, [onEditTaskOpen]);

    // Handler para eliminar tarea
    const createDeleteHandler = useCallback((taskId: string) => () => {
      onDeleteTaskOpen(taskId);
    }, [onDeleteTaskOpen]);

    // Handler para desarchiver tarea
    const createArchiveHandler = useCallback((task: Task) => async () => {
      try {
        await handleUnarchiveTask(task);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[ArchiveTable] Error unarchiving task:', error);
      }
    }, [handleUnarchiveTask]);

    // Handler para ref del botón de acción
    const createActionButtonRefHandler = useCallback((taskId: string) => (el: HTMLButtonElement | null) => {
      if (el) {
        actionButtonRefs.current.set(taskId, el);
      } else {
        actionButtonRefs.current.delete(taskId);
      }
    }, []);

    // Manejar clicks fuera del ActionMenu
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionMenuRef.current &&
          !actionMenuRef.current.contains(event.target as Node) &&
          !actionButtonRefs.current.has((event.target as Element).closest('button')?.id || '')
        ) {
          // setActionMenuOpenId(null); // Remover variable no usada
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []); // Remover variable no usada

    // Función para obtener la clase de la fila
    const getRowClassName = useCallback((task: Task) => {
      return styles.taskRow;
    }, []);

    // Configurar columnas de la tabla - ESPECÍFICO PARA ARCHIVETABLE
    const baseColumns = [
      {
        key: 'clientId',
        label: 'Cuenta',
        width: isMobile ? '30%' : '10%',
        mobileVisible: true,
        mobileWidth: '30%',
      },
      {
        key: 'name',
        label: 'Tarea',
        width: isMobile ? '40%' : '25%', 
        mobileVisible: true,
        mobileWidth: '40%',
      },
      {
        key: 'assignedTo',
        label: 'Asignados',
        width: isMobile ? '0%' : '20%',
        mobileVisible: false,
      },
      {
        key: 'archivedAt',
        label: 'Fecha de Archivado',
        width: isMobile ? '0%' : '20%',
        mobileVisible: false,
      },
      {
        key: 'action',
        label: 'Acciones',
        width: isMobile ? '30%' : '20%',
        mobileVisible: true,
        mobileWidth: '30%',
      },
    ];

    const columns = baseColumns.map((col) => {
      if (col.key === 'clientId') {
        return {
          ...col,
          render: (task: Task) => {
            const client = effectiveClients.find((c) => c.id === task.clientId);
            return client ? (
              <div className={styles.clientWrapper}>
                <Image
                  style={{ borderRadius: '999px' }}
                  src={client.imageUrl || '/empty-image.png'}
                  alt={client.name || 'Client Image'}
                  width={40}
                  height={40}
                  className={styles.clientImage}
                  onError={handleImageError}
                />
              </div>
            ) : 'Sin cuenta';
          },
        };
      }
      if (col.key === 'name') {
        return {
          ...col,
          render: (task: Task) => {
            return (
              <div className={styles.taskNameWrapper}>
                <span className={styles.taskName}>{task.name}</span>
              </div>
            );
          },
        };
      }
      if (col.key === 'assignedTo') {
        return {
          ...col,
          render: (task: Task) => {
            return <AvatarGroup assignedUserIds={task.AssignedTo} leadedByUserIds={task.LeadedBy} currentUserId={userId} />;
          },
        };
      }
      if (col.key === 'archivedAt') {
        return {
          ...col,
          render: (task: Task) => {
            return (
              <div className={styles.archivedAtWrapper}>
                {task.archivedAt ? (
                  <span>{new Date(task.archivedAt).toLocaleDateString()}</span>
                ) : (
                  <span>Sin archivar</span>
                )}
              </div>
            );
          },
        };
      }
      if (col.key === 'action') {
        return {
          ...col,
          render: (task: Task) => {
            // Admins y creadores pueden ver el ActionMenu en ArchiveTable
            const shouldShowActionMenu = isAdmin || task.CreatedBy === userId;
            if (!shouldShowActionMenu) {
              return null;
            }
            return (
                <ActionMenu
                  task={task}
                  userId={userId}
                  onEdit={createEditHandler(task.id)}
                  onDelete={createDeleteHandler(task.id)}
                  onArchive={createArchiveHandler(task)}
                  animateClick={animateClick}
                  actionMenuRef={actionMenuRef}
                  actionButtonRef={createActionButtonRefHandler(task.id)}
                />
              );
          },
        };
      }
      return col;
    });

    // Cleanup effect for timeouts
    useEffect(() => {
      const timeoutId = undoTimeoutRef.current;
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, []);

    const handleViewChange = useCallback((view: 'table' | 'kanban') => {
      onViewChange(view);
      onClose();
    }, [onViewChange, onClose]);

    const handleNewTaskOpen = useCallback(() => {}, []);
    const handleArchiveTableOpen = useCallback(() => {}, []);

    const handleRowClick = useCallback((task: Task) => {
      handleTaskRowClick(task);
    }, [handleTaskRowClick]);
    
    const handleUndoClick = useCallback(() => {
      const lastUndoItem = centralizedUndoStack.length > 0 ? centralizedUndoStack[centralizedUndoStack.length - 1] : undefined;
      handleUndo(lastUndoItem);
    }, [centralizedUndoStack, handleUndo]);

    const handleUndoMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      e.currentTarget.style.transform = 'scale(1.05)';
    }, []);

    const handleUndoMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      e.currentTarget.style.transform = 'scale(1)';
    }, []);

    // Loading state - show table immediately if external data is available
    if (!effectiveTasks || !effectiveClients || !effectiveUsers) {
      return (
        <div className={styles.container}>
          <TableSkeletonLoader type="archive" />
        </div>
      );
    }

    // ✅ NUEVO: Mostrar estado vacío elegante cuando no hay tareas archivadas
    const hasArchivedTasks = effectiveTasks.some(task => task.archived);
    if (!hasArchivedTasks && !searchQuery) {
      return (
        <div className={styles.container}>
          <TasksHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchCategory={searchCategory}
            setSearchCategory={setSearchCategory}
            onNewTaskOpen={handleNewTaskOpen}
            currentView="archive"
          />

          <EmptyTableState
            title="No hay tareas archivadas"
            description="Las tareas archivadas aparecerán aquí cuando las archives"
          />
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <TasksHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchCategory={searchCategory}
          setSearchCategory={setSearchCategory}
          onNewTaskOpen={handleNewTaskOpen}
          currentView="archive"
        />

        <Table
          data={sortedTasks}
          columns={columns}
          itemsPerPage={10}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={handleRowClick}
          getRowClassName={getRowClassName}
          emptyStateType="archive"
        />
        
        {/* Undo Notification */}
        {centralizedShowUndo && centralizedUndoStack.length > 0 && (
          <div
            className={styles.undoNotification}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              backgroundColor: '#10b981',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '14px',
              fontWeight: 500,
              minWidth: '280px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: 'white',
                borderRadius: '50%'
              }} />
              <span>
                {centralizedUndoStack[centralizedUndoStack.length - 1]?.action === 'unarchive'
                  ? 'Tarea desarchivada'
                  : 'Tarea archivada'}
              </span>
            </div>
            <button
              onClick={handleUndoClick}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={handleUndoMouseEnter}
              onMouseLeave={handleUndoMouseLeave}
            >
              Deshacer
            </button>
          </div>
        )}
      </div>
    );
  },
);

ArchiveTable.displayName = 'ArchiveTable';

export default ArchiveTable;
 