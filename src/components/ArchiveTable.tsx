'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import Table from './Table';
import ActionMenu from './ui/ActionMenu';
import styles from './TasksTable.module.scss';
import avatarStyles from './ui/AvatarGroup.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { hasUnreadUpdates, markTaskAsViewed, getUnreadCount } from '@/lib/taskUtils';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

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

type TaskView = 'table' | 'kanban';

interface AvatarGroupProps {
  assignedUserIds: string[];
  users: User[];
  currentUserId: string;
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ assignedUserIds, users, currentUserId }) => {
  console.log('[ArchiveTable AvatarGroup] Received data:', {
    assignedUserIds,
    usersCount: users.length,
    currentUserId,
    usersData: users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      imageUrl: u.imageUrl,
      hasImageUrl: !!u.imageUrl
    }))
  });

  const avatars = useMemo(() => {
    if (!Array.isArray(users)) {
      console.warn('[AvatarGroup] Users prop is not an array:', users);
      return [];
    }
    const matchedUsers = users.filter((user) => assignedUserIds.includes(user.id)).slice(0, 5);
    console.log('[ArchiveTable AvatarGroup] Matched users:', {
      assignedUserIds,
      matchedUsersCount: matchedUsers.length,
      matchedUsers: matchedUsers.map(u => ({
        id: u.id,
        fullName: u.fullName,
        imageUrl: u.imageUrl,
        clerkImageUrl: `https://img.clerk.com/${u.id}`
      }))
    });
    return matchedUsers.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [assignedUserIds, users, currentUserId]);

  return (
    <div className={avatarStyles.avatarGroup}>
      {avatars.length > 0 ? (
        avatars.map((user) => (
          <div key={user.id} className={avatarStyles.avatar}>
            <span className={avatarStyles.avatarName}>{user.fullName}</span>
            <Image
              src={user.imageUrl || `https://img.clerk.com/${user.id}`}
              alt={`${user.fullName}'s avatar`}
              width={40}
              height={40}
              className={avatarStyles.avatarImage}
              onError={(e) => {
                // Si falló la imagen de Firestore, intentar Clerk
                if (e.currentTarget.src === user.imageUrl) {
                  e.currentTarget.src = `https://img.clerk.com/${user.id}`;
                } else {
                  // Si falló Clerk, usar imagen por defecto
                  e.currentTarget.src = '/empty-image.png';
                }
              }}
            />
          </div>
        ))
      ) : (
        <span>No asignados</span>
      )}
    </div>
  );
};

interface ArchiveTableProps {
  onEditTaskOpen: (taskId: string) => void;
  onViewChange: (view: TaskView) => void;
  onDeleteTaskOpen: (taskId: string) => void;
  onClose: () => void;
  onChatSidebarOpen: (task: Task) => void;
  onTaskArchive?: (task: Task, action: 'archive' | 'unarchive') => Promise<boolean>;
  externalTasks?: Task[];
  externalClients?: Client[];
  externalUsers?: User[];
  onTaskUpdate?: (task: Task) => void;
  onDataRefresh?: () => void;
}

const ArchiveTable: React.FC<ArchiveTableProps> = memo(
  ({
    onEditTaskOpen,
    onViewChange,
    onDeleteTaskOpen,
    onClose,
    onChatSidebarOpen,
    onTaskArchive,
    externalTasks,
    externalClients,
    externalUsers,
    onTaskUpdate,
    onDataRefresh,
  }) => {
    const { user } = useUser();
    const { isAdmin } = useAuth();
    
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [sortKey, setSortKey] = useState<string>('archivedAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const [userFilter, setUserFilter] = useState<string>('');

    // Estado para undo
    const [undoStack, setUndoStack] = useState<Array<{task: Task, action: 'archive' | 'unarchive', timestamp: number}>>([]);
    const [showUndo, setShowUndo] = useState(false);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const userId = useMemo(() => user?.id || '', [user]);

    // PRIORIDAD: Usar datos externos siempre que estén disponibles
    const effectiveTasks = externalTasks || [];
    const effectiveClients = externalClients || [];
    const effectiveUsers = externalUsers || [];

    console.log('[ArchiveTable] Data usage check:', {
      hasExternalTasks: !!externalTasks,
      hasExternalClients: !!externalClients,
      hasExternalUsers: !!externalUsers,
      effectiveTasksCount: effectiveTasks.length,
      archivedTasksCount: effectiveTasks.filter(t => t.archived === true).length,
      externalUsersCount: externalUsers?.length || 0,
      });

    // CRÍTICO: Actualizar inmediatamente cuando cambien los datos externos
    useEffect(() => {
      if (externalTasks && externalTasks.length > 0) {
        console.log('[ArchiveTable] External tasks updated, count:', externalTasks.length);
        const archivedCount = externalTasks.filter(t => t.archived === true).length;
        console.log('[ArchiveTable] Archived tasks in external data:', archivedCount);
      }
    }, [externalTasks]);

    useEffect(() => {
      if (externalClients && externalClients.length > 0) {
        console.log('[ArchiveTable] External clients updated, count:', externalClients.length);
        }
    }, [externalClients]);

    useEffect(() => {
      if (externalUsers && externalUsers.length > 0) {
        console.log('[ArchiveTable] External users updated, count:', externalUsers.length);
      }
    }, [externalUsers]);

    // CRÍTICO: ArchiveTable SIEMPRE filtra tareas NO archivadas (archived: false)
    const archivedTasks = useMemo(() => {
      const archived = effectiveTasks.filter(task => {
        const isArchived = Boolean(task.archived);
        if (!isArchived) {
          console.log('[ArchiveTable] EXCLUDING non-archived task:', {
            taskId: task.id,
            taskName: task.name,
            archived: task.archived
          });
        }
        return isArchived; // Solo mostrar tareas ARCHIVADAS
      });
      
      console.log('[ArchiveTable] Archive filtering results (ARCHIVED only):', {
        totalTasks: effectiveTasks.length,
        archivedTasksCount: archived.length,
        nonArchivedTasksCount: effectiveTasks.filter(t => !Boolean(t.archived)).length,
        archivedTaskIds: archived.map(t => t.id),
        nonArchivedTaskIds: effectiveTasks.filter(t => !Boolean(t.archived)).map(t => t.id)
      });
      return archived;
    }, [effectiveTasks]);

    // Helper function to get involved user IDs
    const getInvolvedUserIds = useCallback((task: Task) => {
      const ids = new Set<string>();
      if (task.CreatedBy) ids.add(task.CreatedBy);
      if (Array.isArray(task.AssignedTo)) task.AssignedTo.forEach((id) => ids.add(id));
      if (Array.isArray(task.LeadedBy)) task.LeadedBy.forEach((id) => ids.add(id));
      return Array.from(ids);
    }, []);

    const memoizedFilteredTasks = useMemo(() => {
      const filtered = archivedTasks.filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        const matchesClient = !clientFilter || task.clientId === clientFilter;
        let matchesUser = true;
        if (userFilter === 'me') {
          matchesUser = getInvolvedUserIds(task).includes(userId);
        } else if (userFilter && userFilter !== 'me') {
          matchesUser = getInvolvedUserIds(task).includes(userFilter);
        }
        return matchesSearch && matchesPriority && matchesClient && matchesUser;
      });
      return filtered;
    }, [archivedTasks, searchQuery, priorityFilter, clientFilter, userFilter, userId, getInvolvedUserIds]);

    useEffect(() => {
      setFilteredTasks(memoizedFilteredTasks);
      console.log('[ArchiveTable] Updated filteredTasks:', {
        filteredCount: memoizedFilteredTasks.length,
        filteredTaskIds: memoizedFilteredTasks.map((t) => t.id),
      });
    }, [memoizedFilteredTasks]);

    const handleUserFilter = (id: string) => {
      setUserFilter(id);
      setIsUserDropdownOpen(false);
    };

    // Función para obtener el nombre del cliente
    const getClientName = useCallback((clientId: string) => {
      const client = effectiveClients.find((c) => c.id === clientId);
      return client?.name || 'Cliente no encontrado';
    }, [effectiveClients]);

    // Handler reforzado para desarchivar - MEJORADO para sincronización inmediata
    const handleUnarchiveTask = useCallback(async (task: Task) => {
      if (!isAdmin) {
        console.warn('[ArchiveTable] Unarchive intentado por usuario no admin');
        return;
      }
      try {
        // Guardar en undo stack ANTES de desarchivar
        const undoItem = {
          task: { ...task },
          action: 'unarchive' as const,
          timestamp: Date.now()
        };
        setUndoStack(prev => [...prev, undoItem]);
        setShowUndo(true);

        // Limpiar timeout anterior
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }

        // Configurar timeout para limpiar undo
        undoTimeoutRef.current = setTimeout(() => {
          setShowUndo(false);
          setUndoStack(prev => prev.filter(item => item.timestamp !== undoItem.timestamp));
        }, 3000);
        
        // **CRÍTICO: Usar la función centralizada del padre**
        if (onTaskArchive) {
          console.log('[ArchiveTable] Unarchiving task via central handler:', task.id);
          const success = await onTaskArchive(task, 'unarchive');
          if (success) {
            console.log('[ArchiveTable] Task unarchived successfully via central handler:', task.id);
            // No necesitamos onTaskUpdate ni onDataRefresh aquí
            // porque la función onTaskArchive del padre ya se encarga
            // de actualizar el estado global y el onSnapshot lo reflejará.
          } else {
            console.error('[ArchiveTable] Failed to unarchive task via central handler');
            // Revertir el estado optimista local si el padre reporta fallo
            setUndoStack(prev => prev.filter(item => item.timestamp !== undoItem.timestamp));
            setShowUndo(false);
          }
        } else {
          console.error('[ArchiveTable] onTaskArchive prop is not provided to ArchiveTable');
          // Revertir el estado optimista si no hay manejador
          setUndoStack(prev => prev.filter(item => item.timestamp !== undoItem.timestamp));
          setShowUndo(false);
        }
      } catch (error) {
        console.error('[ArchiveTable] Error unarchiving task:', error);
        
        // En caso de error, trigger refresh para obtener estado actual
        if (onDataRefresh) {
          onDataRefresh();
        }
        throw error;
      }
    }, [userId, isAdmin, onTaskUpdate, onDataRefresh]);

    // Función para deshacer - SIMPLIFICADA para usar función centralizada
    const handleUndo = useCallback(async (undoItem: {task: Task, action: 'archive' | 'unarchive', timestamp: number}) => {
      try {
        if (undoItem.action === 'unarchive' && onTaskArchive) {
          console.log('[ArchiveTable] Undoing unarchive action (re-archiving task):', undoItem.task.id);
          const success = await onTaskArchive(undoItem.task, 'archive'); // Llama al padre para archivar de nuevo
          if (!success) {
            console.error('[ArchiveTable] Failed to re-archive task via central handler');
            return;
          }
          console.log('[ArchiveTable] Task re-archived successfully (undo unarchive):', undoItem.task.id);
        }
        
        // Remover del undo stack
        setUndoStack(prev => prev.filter(item => item.timestamp !== undoItem.timestamp));
        setShowUndo(false);
        
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }
        
        console.log('[ArchiveTable] Undo action completed successfully');
      } catch (error) {
        console.error('[ArchiveTable] Error undoing action:', error);
      }
    }, [onTaskArchive]); // Dependencia clave: onTaskArchive

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
            bValue = b.lastActivity || b.createdAt;
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

    const handleTaskRowClick = async (task: Task) => {
      // Marcar la tarea como vista
        await markTaskAsViewed(task.id, userId);
      
      // Abrir el chat de la tarea
      onChatSidebarOpen(task);
      console.log('[ArchiveTable] Row clicked, opening chat for task:', task.id);
    };

    // Manejar clicks fuera del ActionMenu
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionMenuRef.current &&
          !actionMenuRef.current.contains(event.target as Node) &&
          !actionButtonRefs.current.has((event.target as Element).closest('button')?.id || '')
        ) {
          setActionMenuOpenId(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSort = (key: string) => {
      if (sortKey === key) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDirection('desc');
      }
    };

    const animateClick = useCallback((element: HTMLElement) => {
      gsap.to(element, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
      });
    }, []);

    const handlePrioritySelect = (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setPriorityFilter(priority);
      setIsPriorityDropdownOpen(false);
    };

    const handleClientSelect = (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setClientFilter(clientId);
      setIsClientDropdownOpen(false);
    };

    // Función para obtener la clase de la fila
    const getRowClassName = (task: Task) => {
      let className = styles.taskRow;
      if (task.hasUnreadUpdates) {
        className += ` ${styles.unread}`;
      }
      return className;
    };

    // Configurar columnas de la tabla - ESPECÍFICO PARA ARCHIVETABLE
    const baseColumns = [
      {
        key: 'clientId',
        label: 'Cuenta',
        width: '10%',
        mobileVisible: false,
      },
      {
        key: 'name',
        label: 'Tarea',
        width: '50%', 
        mobileVisible: true,
      },
      {
        key: 'assignedTo',
        label: 'Asignados',
        width: '20%',
        mobileVisible: false,
      },
      {
        key: 'archivedAt',
        label: 'Fecha de Archivado',
        width: '20%',
        mobileVisible: false,
      },
      {
        key: 'action',
        label: 'Acciones',
        width: '20%',
        mobileVisible: false,
      },
    ];

    const columns = baseColumns.map((col) => {
      if (col.key === 'clientId') {
        return {
          ...col,
          render: (task: Task) => {
            const client = effectiveClients.find((c) => c.id === task.clientId);
            console.log('[ArchiveTable] Rendering client column:', {
              taskId: task.id,
              clientId: task.clientId,
              clientName: client?.name,
            });
            return client ? (
              <div className={styles.clientWrapper}>
                <Image
                  style={{ borderRadius: '999px' }}
                  src={client.imageUrl || '/empty-image.png'}
                  alt={client.name || 'Client Image'}
                  width={40}
                  height={40}
                  className={styles.clientImage}
                  onError={(e) => {
                    e.currentTarget.src = '/empty-image.png';
                  }}
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
            const hasUpdates = hasUnreadUpdates(task, userId);
            const updateCount = getUnreadCount(task, userId);
            console.log('[ArchiveTable] Rendering name column:', {
              taskId: task.id,
              taskName: task.name,
              hasUpdates,
              updateCount,
            });
            return (
              <div className={styles.taskNameWrapper}>
                <span className={styles.taskName}>{task.name}</span>
                {hasUpdates && updateCount > 0 && (
                  <div className={styles.updateIndicator}>
                    <div className={styles.updateDotRed}>
                      <span className={styles.updateDotPing}></span>
                      <span className={styles.updateDotNumber}>{updateCount}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          },
        };
      }
      if (col.key === 'assignedTo') {
        return {
          ...col,
          render: (task: Task) => {
            return <AvatarGroup assignedUserIds={task.AssignedTo} users={effectiveUsers} currentUserId={userId} />;
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
            // Solo admins pueden ver el ActionMenu en ArchiveTable
            if (isAdmin) {
              console.log('[ArchiveTable] Rendering action column:', {
                taskId: task.id,
                taskName: task.name,
                isAdmin,
              });
              return (
                <ActionMenu
                  task={task}
                  userId={userId}
                  isOpen={actionMenuOpenId === task.id}
                  onOpen={() => {
                    setActionMenuOpenId(actionMenuOpenId === task.id ? null : task.id);
                    console.log('[ArchiveTable] Action menu toggled for task:', task.id);
                  }}
                  onEdit={() => {
                    onEditTaskOpen(task.id);
                    setActionMenuOpenId(null);
                    console.log('[ArchiveTable] Edit action triggered for task:', task.id);
                  }}
                  onDelete={() => {
                    onDeleteTaskOpen(task.id);
                    setActionMenuOpenId(null);
                    console.log('[ArchiveTable] Delete action triggered for task:', task.id);
                  }}
                  onArchive={async () => {
                    try {
                      // Guardar en undo stack
                      const undoItem = {
                        task: { ...task },
                        action: 'unarchive' as const,
                        timestamp: Date.now()
                      };
                      setUndoStack(prev => [...prev, undoItem]);
                      setShowUndo(true);

                      // Limpiar timeout anterior
                      if (undoTimeoutRef.current) {
                        clearTimeout(undoTimeoutRef.current);
                      }

                      // Configurar timeout para limpiar undo
                      undoTimeoutRef.current = setTimeout(() => {
                        setShowUndo(false);
                        setUndoStack(prev => prev.filter(item => item.timestamp !== undoItem.timestamp));
                      }, 3000);
                      
                      // Ejecutar la función de desarchivo
                      await handleUnarchiveTask(task);
                      setActionMenuOpenId(null);
                      console.log('[ArchiveTable] Task unarchived successfully:', task.id);
                    } catch (error) {
                      console.error('[ArchiveTable] Error unarchiving task:', error);
                    }
                  }}
                  animateClick={animateClick}
                  actionMenuRef={actionMenuRef}
                  actionButtonRef={(el) => {
                    if (el) {
                      actionButtonRefs.current.set(task.id, el);
                      console.log('[ArchiveTable] Action button ref set for task:', task.id);
                    } else {
                      actionButtonRefs.current.delete(task.id);
                      console.log('[ArchiveTable] Action button ref removed for task:', task.id);
                    }
                  }}
                />
              );
            }
            return null;
          },
        };
      }
      return col;
    });

    // Cleanup effect for timeouts
    useEffect(() => {
      return () => {
        const timeoutId = undoTimeoutRef.current;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, []);

    // Loading state - show table immediately if external data is available
    if (!externalTasks || !externalClients || !externalUsers) {
      console.log('[ArchiveTable] Showing skeleton loader - waiting for external data');
      return (
        <div className={styles.container}>
          <SkeletonLoader type="tasks" />
        </div>
      );
    }

    console.log('[ArchiveTable] Showing table with', sortedTasks.length, 'archived tasks');
    return (
      <motion.div 
        className={styles.container}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.2, 
          ease: [0.25, 0.46, 0.45, 0.94],
          opacity: { duration: 0.15 },
          scale: { duration: 0.2 }
        }}
      >
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div className={styles.header} style={{margin:'30px 0px'}}>
          <div className={styles.searchWrapper}>
            <div className={styles.buttonWithTooltip}>
              <button
                className={`${styles.viewButton} ${styles.hideOnMobile}`}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  onViewChange('table');
                  onClose();
                  console.log('[ArchiveTable] Returning to Tasks Table');
                }}
              >
                <Image
                  src="/arrow-left.svg"
                  draggable="false"
                  alt="Volver a tareas"
                  width={20}
                  height={20}
                  style={{
                    marginLeft: '5px',
                    transition: 'transform 0.3s ease, filter 0.3s ease',
                    filter:
                      'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.filter =
                      'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.84)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.filter =
                      'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
                  }}
                />
              </button>
              <span className={styles.tooltip}>Volver a Tareas</span>
            </div>
            <input
              type="text"
              placeholder="Buscar tareas archivadas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                }
                if (e.ctrlKey || e.metaKey) {
                  switch (e.key.toLowerCase()) {
                    case 'a':
                      e.preventDefault();
                      e.currentTarget.select();
                      break;
                    case 'c':
                      e.preventDefault();
                      const targetC = e.currentTarget as HTMLInputElement;
                      if (targetC.selectionStart !== targetC.selectionEnd) {
                        const selectedText = searchQuery.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
                        navigator.clipboard.writeText(selectedText).catch(() => {
                          const textArea = document.createElement('textarea');
                          textArea.value = selectedText;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                        });
                      }
                      break;
                    case 'v':
                      e.preventDefault();
                      const targetV = e.currentTarget as HTMLInputElement;
                      navigator.clipboard.readText().then(text => {
                        if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
                          const start = targetV.selectionStart;
                          const end = targetV.selectionEnd;
                          const newValue = searchQuery.substring(0, start) + text + searchQuery.substring(end);
                          setSearchQuery(newValue);
                          setTimeout(() => {
                            targetV.setSelectionRange(start + text.length, start + text.length);
                          }, 0);
                        } else {
                          setSearchQuery(searchQuery + text);
                        }
                      }).catch(() => {
                        document.execCommand('paste');
                      });
                      break;
                    case 'x':
                      e.preventDefault();
                      const targetX = e.currentTarget as HTMLInputElement;
                      if (targetX.selectionStart !== targetX.selectionEnd) {
                        const selectedText = searchQuery.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
                        navigator.clipboard.writeText(selectedText).then(() => {
                          if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                            const start = targetX.selectionStart;
                            const end = targetX.selectionEnd;
                            const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
                            setSearchQuery(newValue);
                          } else {
                            setSearchQuery('');
                          }
                        }).catch(() => {
                          const textArea = document.createElement('textarea');
                          textArea.value = selectedText;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                          if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                            const start = targetX.selectionStart;
                            const end = targetX.selectionEnd;
                            const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
                            setSearchQuery(newValue);
                          } else {
                            setSearchQuery('');
                          }
                        });
                      }
                      break;
                  }
                }
              }}
            />
          </div>
          <div className={styles.filtersWrapper}>
            <div className={styles.buttonWithTooltip}>
              <div className={styles.filter}>
                <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                  <div
                    className={styles.dropdownTrigger}
                    onClick={(e) => {
                      animateClick(e.currentTarget);
                      setIsPriorityDropdownOpen((prev) => {
                        if (!prev) {
                          setIsClientDropdownOpen(false);
                          setIsUserDropdownOpen(false);
                        }
                        return !prev;
                      });
                      console.log('[ArchiveTable] Priority dropdown toggled');
                    }}
                  >
                    <Image className="filterIcon" src="/filter.svg" alt="Priority" width={12} height={12} />
                    <span>{priorityFilter || 'Prioridad'}</span>
                  </div>
                  {isPriorityDropdownOpen && (
                    <AnimatePresence>
                      <motion.div 
                        className={styles.dropdownItems}
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        {['Alta', 'Media', 'Baja', ''].map((priority, index) => (
                          <motion.div
                          key={priority || 'all'}
                          className={styles.dropdownItem}
                          onClick={(e) => handlePrioritySelect(priority, e)}
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          {priority || 'Todos'}
                          </motion.div>
                      ))}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
              <span className={styles.tooltip}>Filtrar por Prioridad</span>
            </div>
            <div className={styles.buttonWithTooltip}>
              <div className={styles.filter}>
                <div className={styles.dropdownContainer} ref={clientDropdownRef}>
                  <div
                    className={styles.dropdownTrigger}
                    onClick={(e) => {
                      animateClick(e.currentTarget);
                      setIsClientDropdownOpen((prev) => {
                        if (!prev) {
                          setIsPriorityDropdownOpen(false);
                          setIsUserDropdownOpen(false);
                        }
                        return !prev;
                      });
                      console.log('[ArchiveTable] Client dropdown toggled');
                    }}
                  >
                    <Image className="filterIcon" src="/filter.svg" alt="Client" width={12} height={12} />
                    <span>{effectiveClients.find((c) => c.id === clientFilter)?.name || 'Cuenta'}</span>
                  </div>
                  {isClientDropdownOpen && (
                    <AnimatePresence>
                      <motion.div 
                        className={styles.dropdownItems}
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        {[{ id: '', name: 'Todos' }, ...effectiveClients].map((client, index) => (
                          <motion.div
                          key={client.id || 'all'}
                          className={styles.dropdownItem}
                          onClick={(e) => handleClientSelect(client.id, e)}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                          {client.name}
                          </motion.div>
                      ))}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
              <span className={styles.tooltip}>Filtrar por Cuenta</span>
            </div>

            {isAdmin && (
              <div className={styles.buttonWithTooltip}>
                <div className={styles.filter}>
                  <div className={styles.dropdownContainer} ref={userDropdownRef}>
                    <div
                      className={styles.dropdownTrigger}
                      onClick={(e) => {
                        animateClick(e.currentTarget);
                        setIsUserDropdownOpen((prev) => {
                          if (!prev) {
                            setIsPriorityDropdownOpen(false);
                            setIsClientDropdownOpen(false);
                          }
                          return !prev;
                        });
                        console.log('[ArchiveTable] User dropdown toggled');
                      }}
                    >
                      <Image className="filterIcon" src="/filter.svg" alt="User" width={12} height={12} />
                      <span>
                        {userFilter === '' 
                          ? 'Todos' 
                          : userFilter === 'me' 
                          ? 'Mis tareas' 
                          : effectiveUsers.find(u => u.id === userFilter)?.fullName || 'Usuario'}
                      </span>
                    </div>
                    {isUserDropdownOpen && (
                      <AnimatePresence>
                        <motion.div 
                          className={styles.dropdownItems}
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <motion.div
                          className={styles.dropdownItem}
                          style={{fontWeight: userFilter === '' ? 700 : 400}}
                          onClick={() => handleUserFilter('')}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: 0 * 0.05 }}
                        >
                          Todos
                          </motion.div>
                          <motion.div
                          className={styles.dropdownItem}
                          style={{fontWeight: userFilter === 'me' ? 700 : 400}}
                          onClick={() => handleUserFilter('me')}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: 1 * 0.05 }}
                        >
                          Mis tareas
                          </motion.div>
                        {effectiveUsers
                          .filter((u) => u.id !== userId)
                            .map((u, index) => (
                              <motion.div
                              key={u.id}
                              className={styles.dropdownItem}
                              style={{fontWeight: userFilter === u.id ? 700 : 400}}
                              onClick={() => handleUserFilter(u.id)}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: (index + 2) * 0.05 }}
                            >
                              {u.fullName}
                              </motion.div>
                          ))}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
                <span className={styles.tooltip}>Filtrar por Usuario</span>
              </div>
            )}
          </div>
        </div>
        <Table
          data={sortedTasks}
          columns={columns}
          itemsPerPage={10}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={(task: Task) => {
            handleTaskRowClick(task);
          }}
          getRowClassName={getRowClassName}
          emptyStateType="archive"
        />
        
        {/* Undo Notification */}
        <AnimatePresence>
          {showUndo && undoStack.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
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
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }} />
                <span>Tarea desarchivada</span>
              </div>
              <button
                onClick={() => handleUndo(undoStack[undoStack.length - 1])}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Deshacer
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);

ArchiveTable.displayName = 'ArchiveTable';

export default ArchiveTable; 