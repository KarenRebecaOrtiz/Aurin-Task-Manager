'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { gsap } from 'gsap';
import Table from './Table';
import ActionMenu from './ui/ActionMenu';
import styles from './TasksTable.module.scss';
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
              src={user.imageUrl}
              alt={`${user.fullName}'s avatar`}
              width={40}
              height={40}
              className={avatarStyles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = '';
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

interface TasksTableProps {
  tasks: Task[];
  clients: Client[];
  users: User[];
  onNewTaskOpen: () => void;
  onEditTaskOpen: (taskId: string) => void;
  onChatSidebarOpen: (task: Task) => void;
  onMessageSidebarOpen: (user: User) => void;
  onOpenProfile: (user: { id: string; imageUrl: string }) => void;
  onViewChange: (view: TaskView) => void;
  onDeleteTaskOpen: (taskId: string) => void; // Add new prop for delete
}

const TasksTable: React.FC<TasksTableProps> = memo(
  ({
    tasks,
    clients,
    users,
    onNewTaskOpen,
    onEditTaskOpen,
    onChatSidebarOpen,
    onMessageSidebarOpen,
    onOpenProfile,
    onViewChange,
    onDeleteTaskOpen, // Destructure new prop
  }) => {
    const { user } = useUser();
    const { isAdmin, isLoading } = useAuth(); // Use useAuth to get isAdmin and isLoading
    const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
    const [sortKey, setSortKey] = useState<string>('createdAt');
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

    const userId = useMemo(() => user?.id || '', [user]);

    useEffect(() => {
      setFilteredTasks(tasks);
      console.log('[TasksTable] Initialized filteredTasks:', {
        totalTasks: tasks.length,
        taskIds: tasks.map((t) => t.id),
      });
    }, [tasks]);

    const getInvolvedUserIds = (task: Task) => {
      const ids = new Set<string>();
      if (task.CreatedBy) ids.add(task.CreatedBy);
      if (Array.isArray(task.AssignedTo)) task.AssignedTo.forEach((id) => ids.add(id));
      if (Array.isArray(task.LeadedBy)) task.LeadedBy.forEach((id) => ids.add(id));
      return Array.from(ids);
    };

    const handleUserFilter = (id: string) => {
      // Animate filter change
      const userDropdownTrigger = userDropdownRef.current?.querySelector(`.${styles.dropdownTrigger}`);
      if (userDropdownTrigger) {
        const filterIcon = userDropdownTrigger.querySelector('img');
        if (filterIcon) {
          gsap.to(filterIcon, {
            rotation: 360,
            scale: 1.2,
            duration: 0.3,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1
          });
        }
      }
      
      setUserFilter(id);
      setIsUserDropdownOpen(false);
    };

    const memoizedFilteredTasks = useMemo(() => {
      const filtered = tasks.filter((task) => {
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
    }, [tasks, searchQuery, priorityFilter, clientFilter, userFilter, userId]);

    useEffect(() => {
      setFilteredTasks(memoizedFilteredTasks);
      console.log('[TasksTable] Updated filteredTasks:', {
        filteredCount: memoizedFilteredTasks.length,
        filteredTaskIds: memoizedFilteredTasks.map((t) => t.id),
      });
    }, [memoizedFilteredTasks]);

    useEffect(() => {
      const currentActionMenuRef = actionMenuRef.current;
      if (actionMenuOpenId && currentActionMenuRef) {
        gsap.fromTo(
          currentActionMenuRef,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
        console.log('[TasksTable] Action menu animated for task:', actionMenuOpenId);
      }
      return () => {
        if (currentActionMenuRef) {
          gsap.killTweensOf(currentActionMenuRef);
        }
      };
    }, [actionMenuOpenId]);

    useEffect(() => {
      const priorityItems = priorityDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isPriorityDropdownOpen && priorityItems) {
        gsap.fromTo(
          priorityItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
        console.log('[TasksTable] Priority dropdown animated');
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
        console.log('[TasksTable] Client dropdown animated');
      }
    }, [isClientDropdownOpen]);

    useEffect(() => {
      const userItems = userDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isUserDropdownOpen && userItems) {
        gsap.fromTo(
          userItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
        console.log('[TasksTable] User dropdown animated');
      }
    }, [isUserDropdownOpen]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionMenuRef.current &&
          !actionMenuRef.current.contains(event.target as Node) &&
          !actionButtonRefs.current.get(actionMenuOpenId || '')?.contains(event.target as Node)
        ) {
          setActionMenuOpenId(null);
          console.log('[TasksTable] Action menu closed via outside click');
        }
        if (
          priorityDropdownRef.current &&
          !priorityDropdownRef.current.contains(event.target as Node) &&
          isPriorityDropdownOpen
        ) {
          setIsPriorityDropdownOpen(false);
          console.log('[TasksTable] Priority dropdown closed via outside click');
        }
        if (
          clientDropdownRef.current &&
          !clientDropdownRef.current.contains(event.target as Node) &&
          isClientDropdownOpen
        ) {
          setIsClientDropdownOpen(false);
          console.log('[TasksTable] Client dropdown closed via outside click');
        }
        if (
          userDropdownRef.current &&
          !userDropdownRef.current.contains(event.target as Node) &&
          isUserDropdownOpen
        ) {
          setIsUserDropdownOpen(false);
          console.log('[TasksTable] User dropdown closed via outside click');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId, isPriorityDropdownOpen, isClientDropdownOpen, isUserDropdownOpen]);

    const handleSort = (key: string) => {
      if (key === sortKey) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
      }
      console.log('[TasksTable] Sorting tasks:', { sortKey: key, sortDirection });
    };

    const sortedTasks = useMemo(() => {
      const sorted = [...filteredTasks];
      if (sortKey === 'clientId') {
        sorted.sort((a, b) => {
          const clientA = clients.find((c) => c.id === a.clientId)?.name || '';
          const clientB = clients.find((c) => c.id === b.clientId)?.name || '';
          return sortDirection === 'asc'
            ? clientA.localeCompare(clientB)
            : clientB.localeCompare(clientA);
        });
      } else if (sortKey === 'status') {
        const statusOrder = ['En Proceso', 'Backlog', 'Por Iniciar', 'Finalizado', 'Cancelado'];
        sorted.sort((a, b) => {
          const indexA = statusOrder.indexOf(a.status);
          const indexB = statusOrder.indexOf(b.status);
          return sortDirection === 'asc' ? indexA - indexB : indexB - indexA;
        });
      } else if (sortKey === 'priority') {
        const priorityOrder = ['Alta', 'Media', 'Baja'];
        sorted.sort((a, b) => {
          const indexA = priorityOrder.indexOf(a.priority);
          const indexB = priorityOrder.indexOf(b.priority);
          return sortDirection === 'asc' ? indexA - indexB : indexB - indexA;
        });
      } else if (sortKey === 'createdAt') {
        sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        });
      } else {
        sorted.sort((a, b) =>
          sortDirection === 'asc'
            ? String(a[sortKey as keyof Task]).localeCompare(String(b[sortKey as keyof Task]))
            : String(b[sortKey as keyof Task]).localeCompare(String(a[sortKey as keyof Task])),
        );
      }
      console.log('[TasksTable] Tasks sorted:', {
        sortedCount: sorted.length,
        sortedTaskIds: sorted.map((t) => t.id),
        sortKey,
        sortDirection,
      });
      return sorted;
    }, [filteredTasks, sortKey, sortDirection, clients]);

    const animateClick = (element: HTMLElement) => {
      gsap.to(element, {
        scale: 0.95,
        opacity: 0.8,
        duration: 0.15,
        ease: 'power1.out',
        yoyo: true,
        repeat: 1,
      });
      console.log('[TasksTable] Click animation triggered');
    };

    const handlePrioritySelect = (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      
      // Animate filter change
      const filterIcon = e.currentTarget.querySelector('img');
      if (filterIcon) {
        gsap.to(filterIcon, {
          rotation: 360,
          scale: 1.2,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1
        });
      }
      
      setPriorityFilter(priority);
      setIsPriorityDropdownOpen(false);
    };

    const handleClientSelect = (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      
      // Animate filter change
      const filterIcon = e.currentTarget.querySelector('img');
      if (filterIcon) {
        gsap.to(filterIcon, {
          rotation: 360,
          scale: 1.2,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1
        });
      }
      
      setClientFilter(clientId);
      setIsClientDropdownOpen(false);
    };

    
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
        width: '70%', 
        mobileVisible: true,
      },
      {
        key: 'assignedTo',
        label: 'Asignados',
        width: '20%',
        mobileVisible: false,
      },
      {
        key: 'status',
        label: 'Estado',
        width: '30%', 
        mobileVisible: false,
      },
      {
        key: 'priority',
        label: 'Prioridad',
        width: '10%',
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
            const client = clients.find((c) => c.id === task.clientId);
            console.log('[TasksTable] Rendering client column:', {
              taskId: task.id,
              clientId: task.clientId,
              clientName: client?.name,
            });
            return client ? (
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
            ) : 'Sin cuenta';
          },
        };
      }
      if (col.key === 'assignedTo') {
        return {
          ...col,
          render: (task: Task) => {
            console.log('[TasksTable] Rendering assignedTo column:', {
              taskId: task.id,
              assignedUserIds: task.AssignedTo,
              currentUserId: userId,
            });
            return <AvatarGroup assignedUserIds={task.AssignedTo} users={users} currentUserId={userId} />;
          },
        };
      }
      if (col.key === 'status') {
        return {
          ...col,
          render: (task: Task) => {
            console.log('[TasksTable] Rendering status column:', {
              taskId: task.id,
              status: task.status,
            });
            return (
              <div className={styles.statusWrapper}>
                <Image
                  src={
                    task.status === 'En Proceso'
                      ? '/timer.svg'
                      : task.status === 'Backlog'
                      ? '/circle-help.svg'
                      : task.status === 'Por Iniciar'
                      ? '/circle.svg'
                      : task.status === 'Cancelado'
                      ? '/circle-x.svg'
                      : '/timer.svg'
                  }
                  alt={task.status}
                  width={16}
                  height={16}
                />
                <span className={styles[`status-${task.status.replace(' ', '-')}`]}>{task.status}</span>
              </div>
            );
          },
        };
      }
      if (col.key === 'priority') {
        return {
          ...col,
          render: (task: Task) => {
            console.log('[TasksTable] Rendering priority column:', {
              taskId: task.id,
              priority: task.priority,
            });
            return (
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
            );
          },
        };
      }
      if (col.key === 'action') {
        return {
          ...col,
          render: (task: Task) => {
            if (isAdmin || task.CreatedBy === userId) {
              console.log('[TasksTable] Rendering action column:', {
                taskId: task.id,
                taskName: task.name,
                CreatedBy: task.CreatedBy,
                userId,
                isAdmin,
                canEditOrDelete: isAdmin || task.CreatedBy === userId,
              });
              return (
                <ActionMenu
                  task={task}
                  userId={userId}
                  isOpen={actionMenuOpenId === task.id}
                  onOpen={() => {
                    setActionMenuOpenId(actionMenuOpenId === task.id ? null : task.id);
                    console.log('[TasksTable] Action menu toggled for task:', task.id);
                  }}
                  onEdit={() => {
                    onEditTaskOpen(task.id);
                    console.log('[TasksTable] Edit action triggered for task:', task.id);
                  }}
                  onDelete={() => {
                    onDeleteTaskOpen(task.id);
                    console.log('[TasksTable] Delete action triggered for task:', task.id);
                  }}
                  animateClick={animateClick}
                  actionMenuRef={actionMenuRef}
                  actionButtonRef={(el) => {
                    if (el) {
                      actionButtonRefs.current.set(task.id, el);
                      console.log('[TasksTable] Action button ref set for task:', task.id);
                    } else {
                      actionButtonRefs.current.delete(task.id);
                      console.log('[TasksTable] Action button ref removed for task:', task.id);
                    }
                  }}
                  // Removed isAdmin prop
                />
              );
            }
            return null;
          },
        };
      }
      return col;
    });

    useEffect(() => {
      const containerElement = document.querySelector('.tasks-container');

      let startX = 0;
      let currentX = 0;

      const handleTouchStart = (event: TouchEvent) => {
        startX = event.touches[0].clientX;
      };

      const handleTouchMove = (event: TouchEvent) => {
        currentX = event.touches[0].clientX;
      };

      const handleTouchEnd = () => {
        const deltaX = currentX - startX;
        if (Math.abs(deltaX) > 50) {
          if (deltaX > 0) {
            console.log('Swipe right detected');
            // Logic to switch to the previous container
          } else {
            console.log('Swipe left detected');
            // Logic to switch to the next container
          }
        }
      };

      if (containerElement) {
        containerElement.addEventListener('touchstart', handleTouchStart);
        containerElement.addEventListener('touchmove', handleTouchMove);
        containerElement.addEventListener('touchend', handleTouchEnd);
      }

      return () => {
        if (containerElement) {
          containerElement.removeEventListener('touchstart', handleTouchStart);
          containerElement.removeEventListener('touchmove', handleTouchMove);
          containerElement.removeEventListener('touchend', handleTouchEnd);
        }
      };
    }, []);

    // Handle loading state - mostrar loader mientras cargan los datos
    if (isLoading || tasks.length === 0) {
      return (
        <div className={styles.container}>
          <UserSwiper
            onOpenProfile={onOpenProfile}
            onMessageSidebarOpen={onMessageSidebarOpen}
            className={styles.hideOnMobile}
          />
          <div className={styles.header} style={{margin:'30px 0px'}}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Buscar Tareas"
                value={searchQuery}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSearchQuery(newValue);
                  
                  // Animate search input when typing
                  const searchInput = e.currentTarget;
                  gsap.to(searchInput, {
                    scale: 1.02,
                    duration: 0.2,
                    ease: 'power2.out',
                    yoyo: true,
                    repeat: 1
                  });
                  
                  console.log('[TasksTable] Search query updated:', newValue);
                }}
                className={styles.searchInput}
                aria-label="Buscar tareas"
                disabled={isLoading}
                onKeyDown={(e) => {
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
              <button
                className={`${styles.viewButton} ${styles.hideOnMobile}`}
                onClick={(e) => {
                  if (isLoading) return;
                  animateClick(e.currentTarget);
                  onViewChange('kanban');
                  console.log('[TasksTable] Switching to Kanban view');
                }}
                disabled={isLoading}
              >
                <Image
                  src="/kanban.svg"
                  draggable="false"
                  alt="kanban"
                  width={20}
                  height={20}
                  style={{
                    marginLeft: '5px',
                    transition: 'transform 0.3s ease, filter 0.3s ease',
                    filter: isLoading 
                      ? 'grayscale(1) opacity(0.5)' 
                      : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
                  }}
                />
                Vista Kanban
              </button>

              <button
                className={styles.createButton}
                onClick={(e) => {
                  if (isLoading) return;
                  animateClick(e.currentTarget);
                  onNewTaskOpen();
                  console.log('[TasksTable] New task creation triggered');
                }}
                disabled={isLoading}
              >
                <Image src="/square-dashed-mouse-pointer.svg" alt="New Task" width={16} height={16} />
                Crear Tarea
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <Loader />
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: '300px',
              gap: '16px'
            }}>
              <Image
                src="/emptyStateImage.png"
                alt="No hay tareas"
                width={200}
                height={200}
                style={{ opacity: 0.6 }}
              />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ marginBottom: '8px', color: 'var(--text-color)' }}>
                  No hay tareas disponibles
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  {isAdmin ? 'Comienza creando tu primera tarea' : 'Las tareas aparecerán aquí cuando sean asignadas'}
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <UserSwiper
          onOpenProfile={onOpenProfile}
          onMessageSidebarOpen={onMessageSidebarOpen}
          className={styles.hideOnMobile} // Add hideOnMobile class
        />
        <div className={styles.header} style={{margin:'30px 0px'}}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Buscar Tareas"
              value={searchQuery}
              onChange={(e) => {
                const newValue = e.target.value;
                setSearchQuery(newValue);
                
                // Animate search input when typing
                const searchInput = e.currentTarget;
                gsap.to(searchInput, {
                  scale: 1.02,
                  duration: 0.2,
                  ease: 'power2.out',
                  yoyo: true,
                  repeat: 1
                });
                
                console.log('[TasksTable] Search query updated:', newValue);
              }}
              className={styles.searchInput}
              aria-label="Buscar tareas"
              disabled={isLoading}
              onKeyDown={(e) => {
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
  <button
    className={`${styles.viewButton} ${styles.hideOnMobile}`} // Add hideOnMobile class
    onClick={(e) => {
      animateClick(e.currentTarget);
      onViewChange('kanban');
      console.log('[TasksTable] Switching to Kanban view');
    }}
  >
    <Image
      src="/kanban.svg"
      draggable="false"
      alt="kanban"
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
  <div className={styles.filter}>
    <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
      <div
        className={styles.dropdownTrigger}
        onClick={(e) => {
          animateClick(e.currentTarget);
          setIsPriorityDropdownOpen((prev) => !prev);
          console.log('[TasksTable] Priority dropdown toggled');
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
  <div className={styles.filter}>
    <div className={styles.dropdownContainer} ref={clientDropdownRef}>
      <div
        className={styles.dropdownTrigger}
        onClick={(e) => {
          animateClick(e.currentTarget);
          setIsClientDropdownOpen((prev) => !prev);
          console.log('[TasksTable] Client dropdown toggled');
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

  {isAdmin && (
    <div className={styles.filter}>
      <div className={styles.dropdownContainer} ref={userDropdownRef}>
        <div
          className={styles.dropdownTrigger}
          onClick={(e) => {
            animateClick(e.currentTarget);
            setIsUserDropdownOpen((prev) => !prev);
            console.log('[TasksTable] User dropdown toggled');
          }}
        >
          <Image className="filterIcon" src="/filter.svg" alt="User" width={12} height={12} />
          <span>
            {userFilter === '' 
              ? 'Todos' 
              : userFilter === 'me' 
              ? 'Mis tareas' 
              : users.find(u => u.id === userFilter)?.fullName || 'Usuario'}
          </span>
        </div>
        {isUserDropdownOpen && (
          <div className={styles.dropdownItems}>
            <div
              className={styles.dropdownItem}
              style={{fontWeight: userFilter === '' ? 700 : 400}}
              onClick={() => handleUserFilter('')}
            >
              Todos
            </div>
            <div
              className={styles.dropdownItem}
              style={{fontWeight: userFilter === 'me' ? 700 : 400}}
              onClick={() => handleUserFilter('me')}
            >
              Mis tareas
            </div>
            {users
              .filter((u) => u.id !== userId)
              .map((u) => (
                <div
                  key={u.id}
                  className={styles.dropdownItem}
                  style={{fontWeight: userFilter === u.id ? 700 : 400}}
                  onClick={() => handleUserFilter(u.id)}
                >
                  {u.fullName}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )}

  
  <button
    className={styles.createButton}
    onClick={(e) => {
      animateClick(e.currentTarget);
      onNewTaskOpen();
      console.log('[TasksTable] New task creation triggered');
    }}
  >
    <Image src="/square-dashed-mouse-pointer.svg" alt="New Task" width={16} height={16} />
    Crear Tarea
  </button>
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
            onChatSidebarOpen(task);
            console.log('[TasksTable] Row clicked, opening chat for task:', task.id);
          }}
        />
      </div>
    );
  },
);

TasksTable.displayName = 'TasksTable';

export default TasksTable;