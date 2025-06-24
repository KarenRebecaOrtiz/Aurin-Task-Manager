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
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const userId = useMemo(() => {
      const id = user?.id || '';
      console.log('[TasksTable] User ID:', { userId: id });
      return id;
    }, [user]);

    // Removed local isAdmin fetch useEffect

    useEffect(() => {
      setFilteredTasks(tasks);
      console.log('[TasksTable] Initialized filteredTasks:', {
        totalTasks: tasks.length,
        taskIds: tasks.map((t) => t.id),
      });
    }, [tasks]);

    const memoizedFilteredTasks = useMemo(() => {
      const filtered = tasks.filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        const matchesClient = !clientFilter || task.clientId === clientFilter;
        const passesFilters = matchesSearch && matchesPriority && matchesClient;
        console.log('[TasksTable] Task filter check:', {
          taskId: task.id,
          taskName: task.name,
          matchesSearch,
          matchesPriority,
          matchesClient,
          passesFilters,
          searchQuery,
          priorityFilter,
          clientFilter,
        });
        return passesFilters;
      });
      console.log('[TasksTable] Filtered tasks:', {
        filteredCount: filtered.length,
        filteredTaskIds: filtered.map((t) => t.id),
      });
      return filtered;
    }, [tasks, searchQuery, priorityFilter, clientFilter]);

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
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId, isPriorityDropdownOpen, isClientDropdownOpen]);

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
      setPriorityFilter(priority);
      setIsPriorityDropdownOpen(false);
      console.log('[TasksTable] Priority filter selected:', priority);
    };

    const handleClientSelect = (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setClientFilter(clientId);
      setIsClientDropdownOpen(false);
      console.log('[TasksTable] Client filter selected:', clientId);
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

    // Handle loading state
    if (isLoading) {
      return <Loader />;
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
                setSearchQuery(e.target.value);
                console.log('[TasksTable] Search query updated:', e.target.value);
              }}
              className={styles.searchInput}
              aria-label="Buscar tareas"
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

  {/* <button
    className={`${styles.filterButton} ${styles.hideOnMobile}`} // Add hideOnMobile class
    onClick={(e) => {
      animateClick(e.currentTarget);
      onAISidebarOpen();
      console.log('[TasksTable] AI sidebar opened');
    }}
  >
    <Image
      src="/gemini.svg"
      alt="AI"
      width={20}
      height={20}
      
    />
  </button> */}

  
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