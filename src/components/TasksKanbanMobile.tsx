'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, deleteDoc, addDoc, query, doc, getDocs, where, Timestamp } from 'firebase/firestore'; // Verified import
import Image from 'next/image';
import { gsap } from 'gsap';
import { db } from '@/lib/firebase'; 
import ActionMenu from './ui/ActionMenu';
import styles from './TasksKanbanMobile.module.scss';
import avatarStyles from './ui/AvatarGroup.module.scss';
import UserSwiper from '@/components/UserSwiper';
import { useAuth } from '@/contexts/AuthContext'; 
import Loader from '@/components/Loader'; 

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
}

type TaskView = 'table' | 'kanban';

interface AvatarGroupProps {
  assignedUserIds: string[];
  users: User[];
  currentUserId: string;
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ assignedUserIds, users, currentUserId }) => {
  const avatars = useMemo(() => {
    if (!Array.isArray(users)) {
      console.warn('[AvatarGroup] Users prop is not an array:', users);
      return [];
    }
    const matchedUsers = users.filter((user) => assignedUserIds.includes(user.id)).slice(0, 5);
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
              src={user.imageUrl || '/default-avatar.png'}
              alt={`${user.fullName}'s avatar`}
              width={24}
              height={24}
              className={avatarStyles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
              }}
            />
          </div>
        ))
      ) : (
        <span className={styles.noAssigned}>No asignados</span>
      )}
    </div>
  );
};

interface TasksKanbanMobileProps {
  tasks: Task[];
  clients: Client[];
  users: User[];
  onNewTaskOpen: () => void;
  onEditTaskOpen: (taskId: string) => void;
  onAISidebarOpen: () => void;
  onChatSidebarOpen: (task: Task) => void;
  onMessageSidebarOpen: (user: User) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onOpenProfile: (user: { id: string; imageUrl: string }) => void;
  onViewChange: (view: TaskView) => void;
}

const TasksKanbanMobile: React.FC<TasksKanbanMobileProps> = memo(
  ({
    tasks,
    clients,
    users,
    onNewTaskOpen,
    onEditTaskOpen,
    onAISidebarOpen,
    onChatSidebarOpen,
    onMessageSidebarOpen,
    setTasks,
    onOpenProfile,
    onViewChange,
  }) => {
    const { user } = useUser();
    const { isAdmin, isLoading } = useAuth(); // Use useAuth to get isAdmin and isLoading
    const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [currentColumnIndex, setCurrentColumnIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const columnsContainerRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const deletePopupRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const statusColumns = useMemo(
      () => [
        { id: 'por-iniciar', title: 'Por Iniciar' },
        { id: 'diseno', title: 'Diseño' },
        { id: 'desarrollo', title: 'Desarrollo' },
        { id: 'en-proceso', title: 'En Proceso' },
        { id: 'finalizado', title: 'Finalizado' },
        { id: 'backlog', title: 'Backlog' },
        { id: 'cancelado', title: 'Cancelado' },
      ],
      [],
    );

    const userId = useMemo(() => {
      const id = user?.id || '';
      console.log('[TasksKanbanMobile] User ID:', { userId: id });
      return id;
    }, [user]);

    // Removed local isAdmin fetch useEffect

    // GSAP Animation for appearance and disappearance
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      gsap.fromTo(
        container,
        { opacity: 0, y: 50, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' },
      );

      return () => {
        gsap.to(container, {
          opacity: 0,
          y: -50,
          scale: 0.95,
          duration: 0.3,
          ease: 'power2.in',
        });
      };
    }, []);

    // Swipe gesture handling
    useEffect(() => {
      const container = columnsContainerRef.current;
      if (!container) return;

      const handleTouchStart = (e: TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX.current;
        const deltaY = touchEndY - touchStartY.current;

        if (Math.abs(deltaY) > Math.abs(deltaX)) return;

        const swipeThreshold = 50;
        if (deltaX > swipeThreshold && currentColumnIndex > 0) {
          setCurrentColumnIndex((prev) => {
            const newIndex = prev - 1;
            console.log('[TasksKanbanMobile] Swipe right to column:', { newIndex, column: statusColumns[newIndex]?.title });
            gsap.to(container, {
              x: `-${newIndex * 100}vw`,
              duration: 0.3,
              ease: 'power2.out',
            });
            return newIndex;
          });
        } else if (deltaX < -swipeThreshold && currentColumnIndex < statusColumns.length - 1) {
          setCurrentColumnIndex((prev) => {
            const newIndex = prev + 1;
            console.log('[TasksKanbanMobile] Swipe left to column:', { newIndex, column: statusColumns[newIndex]?.title });
            gsap.to(container, {
              x: `-${newIndex * 100}vw`,
              duration: 0.3,
              ease: 'power2.out',
            });
            return newIndex;
          });
        }

        touchStartX.current = null;
        touchStartY.current = null;
      };

      container.addEventListener('touchstart', handleTouchStart);
      container.addEventListener('touchend', handleTouchEnd);

      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }, [currentColumnIndex, statusColumns]);

    useEffect(() => {
      setFilteredTasks(tasks);
      console.log('[TasksKanbanMobile] Initialized filteredTasks:', {
        totalTasks: tasks.length,
        taskIds: tasks.map((t) => t.id),
        assignedToUser: tasks.filter((t) => t.AssignedTo.includes(userId)).map((t) => t.id),
      });
    }, [tasks, userId]);

    const memoizedFilteredTasks = useMemo(() => {
      const visibleTasks = isAdmin
        ? tasks // Admins see all tasks
        : tasks.filter((task) => task.AssignedTo.includes(userId) || task.CreatedBy === userId); // Non-admins see only assigned or created tasks
      return visibleTasks.filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        const matchesClient = !clientFilter || task.clientId === clientFilter;
        const passesFilters = matchesSearch && matchesPriority && matchesClient;
        console.log('[TasksKanbanMobile] Task filter check:', {
          taskId: task.id,
          taskName: task.name,
          status: task.status,
          assignedTo: task.AssignedTo,
          isAssignedToUser: task.AssignedTo.includes(userId),
          matchesSearch,
          matchesPriority,
          matchesClient,
          passesFilters,
        });
        return passesFilters;
      });
    }, [tasks, searchQuery, priorityFilter, clientFilter, userId, isAdmin]);

    useEffect(() => {
      setFilteredTasks(memoizedFilteredTasks);
      console.log('[TasksKanbanMobile] Updated filteredTasks:', {
        filteredCount: memoizedFilteredTasks.length,
        filteredTaskIds: memoizedFilteredTasks.map((t) => t.id),
        assignedToUser: memoizedFilteredTasks.filter((t) => t.AssignedTo.includes(userId)).map((t) => t.id),
      });
    }, [memoizedFilteredTasks, userId]);

    useEffect(() => {
      const currentActionMenuRef = actionMenuRef.current;
      if (actionMenuOpenId && currentActionMenuRef) {
        gsap.fromTo(
          currentActionMenuRef,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
      return () => {
        if (currentActionMenuRef) {
          gsap.killTweensOf(currentActionMenuRef);
        }
      };
    }, [actionMenuOpenId]);

    useEffect(() => {
      const currentDeletePopupRef = deletePopupRef.current;
      if (isDeletePopupOpen && currentDeletePopupRef) {
        gsap.fromTo(
          currentDeletePopupRef,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
        );
      }
      return () => {
        if (currentDeletePopupRef) {
          gsap.killTweensOf(currentDeletePopupRef);
        }
      };
    }, [isDeletePopupOpen]);

    useEffect(() => {
      const priorityItems = priorityDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isPriorityDropdownOpen && priorityItems) {
        gsap.fromTo(
          priorityItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }, [isPriorityDropdownOpen]);

    useEffect(() => {
      const clientItems = clientDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isClientDropdownOpen && clientItems) {
        gsap.fromTo(
          clientItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }, [isClientDropdownOpen]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionMenuRef.current &&
          !actionMenuRef.current.contains(event.target as Node) &&
          !actionButtonRefs.current.get(actionMenuOpenId || '')?.contains(event.target as Node)
        ) {
          setActionMenuOpenId(null);
        }
        if (
          priorityDropdownRef.current &&
          !priorityDropdownRef.current.contains(event.target as Node) &&
          isPriorityDropdownOpen
        ) {
          setIsPriorityDropdownOpen(false);
        }
        if (
          clientDropdownRef.current &&
          !clientDropdownRef.current.contains(event.target as Node) &&
          isClientDropdownOpen
        ) {
          setIsClientDropdownOpen(false);
        }
        if (
          deletePopupRef.current &&
          !deletePopupRef.current.contains(event.target as Node) &&
          isDeletePopupOpen
        ) {
          setIsDeletePopupOpen(false);
          setDeleteConfirm('');
          setDeleteTaskId(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId, isPriorityDropdownOpen, isClientDropdownOpen, isDeletePopupOpen]);

    const animateClick = (element: HTMLElement) => {
      gsap.to(element, {
        scale: 0.95,
        opacity: 0.8,
        duration: 0.15,
        ease: 'power1.out',
        yoyo: true,
        repeat: 1,
      });
    };

    const handleDeleteTask = async () => {
      if (!userId || !deleteTaskId || deleteConfirm.toLowerCase() !== 'eliminar') {
        console.warn('[TasksKanbanMobile] Invalid deletion attempt:', {
          userId,
          deleteTaskId,
          deleteConfirm,
        });
        return;
      }

      try {
        const task = tasks.find((t) => t.id === deleteTaskId);
        if (!task) {
          throw new Error('Task not found');
        }
        if (!isAdmin && task.CreatedBy !== userId) {
          throw new Error('Unauthorized to delete task');
        }

        const messagesQuery = query(collection(db, `tasks/${deleteTaskId}/messages`));
        const messagesSnapshot = await getDocs(messagesQuery);
        for (const msgDoc of messagesSnapshot.docs) {
          await deleteDoc(doc(db, `tasks/${deleteTaskId}/messages`, msgDoc.id));
        }

        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('taskId', '==', deleteTaskId),
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        for (const notifDoc of notificationsSnapshot.docs) {
          await deleteDoc(doc(db, 'notifications', notifDoc.id));
        }

        const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
        if (task.CreatedBy) recipients.add(task.CreatedBy);
        recipients.delete(userId);
        for (const recipientId of Array.from(recipients)) {
          await addDoc(collection(db, 'notifications'), {
            userId: userId,
            taskId: deleteTaskId,
            message: `${user?.firstName || 'Usuario'} eliminó la tarea ${task.name}`,
            timestamp: Timestamp.now(),
            read: false,
            recipientId,
          });
        }

        await deleteDoc(doc(db, 'tasks', deleteTaskId));
        setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
        setIsDeletePopupOpen(false);
        setDeleteConfirm('');
        setDeleteTaskId(null);
      } catch (error) {
        console.error('[TasksKanbanMobile] Error deleting task:', {
          error: error instanceof Error ? error.message : JSON.stringify(error),
          taskId: deleteTaskId,
          userId,
          isAdmin,
        });
        alert(`Error al eliminar la tarea: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
        setIsDeletePopupOpen(false);
        setDeleteConfirm('');
        setDeleteTaskId(null);
      }
    };

    const handlePrioritySelect = (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setPriorityFilter(priority);
      setIsPriorityDropdownOpen(false);
    };

    const handleClientSelect = (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setClientFilter(clientId);
      setIsClientDropdownOpen(false);
    };

    const groupedTasks = useMemo(() => {
      const groups: { [key: string]: Task[] } = {};
      statusColumns.forEach((status) => {
        groups[status.id] = filteredTasks.filter((task) => task.status === status.title);
      });
      console.log('[TasksKanbanMobile] Tasks grouped by status:', {
        groups: Object.keys(groups).map((statusId) => ({
          status: statusColumns.find((s) => s.id === statusId)?.title,
          taskCount: groups[statusId].length,
          taskIds: groups[statusId].map((t) => t.id),
          assignedToUser: groups[statusId].filter((t) => t.AssignedTo.includes(userId)).map((t) => t.id),
        })),
      });
      return groups;
    }, [filteredTasks, userId, statusColumns]);

    // Handle loading state
    if (isLoading) {
      return <Loader />;
    }

    return (
      <div className={styles.containerMobile} ref={containerRef}>
        <UserSwiper onOpenProfile={onOpenProfile} onMessageSidebarOpen={onMessageSidebarOpen} />
        <div className={`${styles.header} ${styles.headerMobile}`}>
          <div className={`${styles.searchWrapper} ${styles.searchWrapperMobile}`}>
            <input
              type="text"
              placeholder="Buscar Tareas"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                console.log('[TasksKanbanMobile] Search query updated:', e.target.value);
              }}
              className={styles.searchInput}
              aria-label="Buscar tareas"
            />
          </div>
          <div className={`${styles.filtersWrapper} ${styles.filtersWrapperMobile}`}>
            <button
              className={styles.viewButton}
              onClick={(e) => {
                animateClick(e.currentTarget);
                onViewChange('table');
              }}
            >
              <Image
                src="/table.svg"
                alt="table"
                width={20}
                height={20}
                style={{
                  marginLeft: '5px',
                  transition: 'transform 0.3s ease, filter 0.3s ease',
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.filter =
                    'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.41)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter =
                    'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
                }}
              />
            </button>
            <div className={`${styles.filter} ${styles.filterMobile}`}>
              <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsPriorityDropdownOpen((prev) => !prev);
                  }}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="Priority" width={12} height={12} />
                  <span>{priorityFilter || 'Prioridad'}</span>
                </div>
                {isPriorityDropdownOpen && (
                  <div className={styles.dropdownItems}>
                    {['Alta', 'Media', 'Baja', ''].map((priority) => (
                      <div
                        key={priority || 'all'}
                        className={styles.dropdownItem}
                        onClick={(e) => handlePrioritySelect(priority, e)}
                      >
                        {priority || 'Todos'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={`${styles.filter} ${styles.filterMobile}`}>
              <div className={styles.dropdownContainer} ref={clientDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsClientDropdownOpen((prev) => !prev);
                  }}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="Client" width={12} height={12} />
                  <span>{clients.find((c) => c.id === clientFilter)?.name || 'Cuenta'}</span>
                </div>
                {isClientDropdownOpen && (
                  <div className={styles.dropdownItems}>
                    {[{ id: '', name: 'Todos' }, ...clients].map((client) => (
                      <div
                        key={client.id || 'all'}
                        className={styles.dropdownItem}
                        onClick={(e) => handleClientSelect(client.id, e)}
                      >
                        {client.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              className={styles.filterButton}
              onClick={(e) => {
                animateClick(e.currentTarget);
                onAISidebarOpen();
              }}
            >
              <Image
                src="/gemini.svg"
                alt="AI"
                width={20}
                height={20}
                style={{
                  marginLeft: '5px',
                  transition: 'transform 0.3s ease, filter 0.3s ease',
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.2)';
                  e.currentTarget.style.filter =
                    'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.88)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter =
                    'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
                }}
              />
              Pregunta a Gemini
            </button>
            <button
              className={styles.createButton}
              onClick={(e) => {
                animateClick(e.currentTarget);
                onNewTaskOpen();
              }}
            >
              <Image src="/square-dashed-mouse-pointer.svg" alt="New Task" width={16} height={16} />
              Crear Tarea
            </button>
          </div>
        </div>
        <div className={styles.columnsContainer} ref={columnsContainerRef}>
          {statusColumns.map((column) => (
            <div
              key={column.id}
              className={`${styles.kanbanColumn} ${styles.kanbanColumnMobile}`}
              data-status={column.id}
            >
              <div className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>{column.title}</h2>
                <span className={styles.taskCount}>{groupedTasks[column.id]?.length || 0}</span>
              </div>
              <div className={`${styles.taskList} ${styles.taskListMobile}`}>
                {groupedTasks[column.id]?.map((task) => (
                  <div
                    key={task.id}
                    className={`${styles.taskCard} ${styles.taskCardMobile}`}
                    onClick={() => {
                      onChatSidebarOpen(task);
                      console.log('[TasksKanbanMobile] Task card clicked, opening chat for task:', task.id);
                    }}
                  >
                    <div className={styles.taskHeader}>
                      <span className={styles.taskName}>{task.name}</span>
                      {(isAdmin || task.CreatedBy === userId) && (
                        <ActionMenu
                          task={task}
                          userId={userId}
                          isOpen={actionMenuOpenId === task.id}
                          onOpen={() => {
                            setActionMenuOpenId(actionMenuOpenId === task.id ? null : task.id);
                          }}
                          onEdit={() => {
                            onEditTaskOpen(task.id);
                          }}
                          onDelete={() => {
                            setIsDeletePopupOpen(true);
                            setDeleteTaskId(task.id);
                          }}
                          animateClick={animateClick}
                          actionMenuRef={actionMenuRef}
                          actionButtonRef={(el) => {
                            if (el) {
                              actionButtonRefs.current.set(task.id, el);
                            } else {
                              actionButtonRefs.current.delete(task.id);
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className={styles.taskDetails}>
                      <div className={styles.clientInfo}>
                        {clients.find((c) => c.id === task.clientId) ? (
                          <Image
                            style={{ borderRadius: '999px' }}
                            src={clients.find((c) => c.id === task.clientId)?.imageUrl || '/empty-image.png'}
                            alt={clients.find((c) => c.id === task.clientId)?.name || 'Client Image'}
                            width={24}
                            height={24}
                            className={styles.clientImage}
                            onError={(e) => {
                              e.currentTarget.src = '/empty-image.png';
                            }}
                          />
                        ) : (
                          <span className={styles.noClient}>Sin cuenta</span>
                        )}
                      </div>
                      <div className={styles.priorityWrapper}>
                        <Image
                          src={
                            task.priority === 'Alta'
                              ? '/arrow-up.svg'
                              : task.priority === 'Media'
                              ? '/arrow-right.svg'
                              : '/arrow-down.svg'
                          }
                          alt={task.priority}
                          width={16}
                          height={16}
                        />
                        <span className={styles[`priority-${task.priority}`]}>{task.priority}</span>
                      </div>
                      <AvatarGroup assignedUserIds={task.AssignedTo} users={users} currentUserId={userId} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.columnIndicators}>
          {statusColumns.map((column, index) => (
            <div
              key={column.id}
              className={`${styles.columnIndicator} ${index === currentColumnIndex ? styles.columnIndicatorActive : ''}`}
              onClick={() => {
                setCurrentColumnIndex(index);
                gsap.to(columnsContainerRef.current!, {
                  x: `-${index * 100}vw`,
                  duration: 0.3,
                  ease: 'power2.out',
                });
                console.log('[TasksKanbanMobile] Column indicator clicked:', { index, column: column.title });
              }}
            />
          ))}
        </div>
        {isDeletePopupOpen && (
          <div className={styles.deletePopupOverlay}>
            <div className={styles.deletePopup} ref={deletePopupRef}>
              <div className={styles.deletePopupContent}>
                <div className={styles.deletePopupText}>
                  <h2 className={styles.deletePopupTitle}>¿Seguro que quieres eliminar esta tarea?</h2>
                  <p className={styles.deletePopupDescription}>
                    Eliminar esta tarea borrará permanentemente todas sus conversaciones y datos asociados. Se notificará a todos los involucrados.{' '}
                    <strong>Esta acción no se puede deshacer.</strong>
                  </p>
                </div>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => {
                    setDeleteConfirm(e.target.value);
                  }}
                  placeholder="Escribe 'Eliminar' para confirmar"
                  className={styles.deleteConfirmInput}
                  aria-label="Confirmar eliminación"
                />
                <div className={styles.deletePopupActions}>
                  <button
                    className={styles.deleteConfirmButton}
                    onClick={handleDeleteTask}
                    disabled={deleteConfirm.toLowerCase() !== 'eliminar'}
                  >
                    Confirmar Eliminación
                  </button>
                  <button
                    className={styles.deleteCancelButton}
                    onClick={() => {
                      setIsDeletePopupOpen(false);
                      setDeleteConfirm('');
                      setDeleteTaskId(null);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

TasksKanbanMobile.displayName = 'TasksKanbanMobile';

export default TasksKanbanMobile;