'use client';
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { gsap } from 'gsap';
import { db } from '@/lib/firebase';
import Table from './Table';
import styles from './TasksTable.module.scss';

interface Client {
  id: string;
  name: string;
}

interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: Date | null;
  endDate: Date | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
}

interface TasksTableProps {
  tasks: Task[];
  clients: Client[];
  users: { id: string; fullName: string; imageUrl: string }[];
  onCreateClientOpen: () => void;
  onInviteMemberOpen: () => void;
  onNewTaskOpen: () => void;
  onAISidebarOpen: () => void;
  onChatSidebarOpen: (task: Task) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TasksTable: React.FC<TasksTableProps> = memo(
  ({ tasks, clients, users, onCreateClientOpen, onInviteMemberOpen, onNewTaskOpen, onAISidebarOpen, onChatSidebarOpen, setTasks }) => {
    const { user } = useUser();
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [sortKey, setSortKey] = useState<string>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    // Fetch tasks
    useEffect(() => {
      const fetchTasks = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'tasks'));
          const tasksData: Task[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            clientId: doc.data().clientId || '',
            project: doc.data().project || '',
            name: doc.data().name || '',
            description: doc.data().description || '',
            status: doc.data().status || '',
            priority: doc.data().priority || '',
            startDate: doc.data().startDate ? new Date(doc.data().startDate.toDate()) : null,
            endDate: doc.data().endDate ? new Date(doc.data().endDate.toDate()) : null,
            LeadedBy: doc.data().LeadedBy || [],
            AssignedTo: doc.data().AssignedTo || [],
            createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
          }));
          setTasks(tasksData);
        } catch (error) {
          console.error('Error fetching tasks:', error);
        }
      };
      fetchTasks();
    }, [setTasks]);

    // Filter tasks
    const memoizedFilteredTasks = useMemo(() => {
      return tasks.filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || task.status === statusFilter;
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        const matchesClient = !clientFilter || task.clientId === clientFilter;
        return matchesSearch && matchesStatus && matchesPriority && matchesClient;
      });
    }, [tasks, searchQuery, statusFilter, priorityFilter, clientFilter]);

    useEffect(() => {
      setFilteredTasks(memoizedFilteredTasks);
    }, [memoizedFilteredTasks]);

    // GSAP animations for action menu
    useEffect(() => {
      if (actionMenuOpenId && actionMenuRef.current) {
        gsap.fromTo(
          actionMenuRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }, [actionMenuOpenId]);

    // GSAP animations for dropdowns
    useEffect(() => {
      if (isStatusDropdownOpen && statusDropdownRef.current) {
        gsap.fromTo(
          statusDropdownRef.current.querySelector(`.${styles.dropdownItems}`),
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
      if (isPriorityDropdownOpen && priorityDropdownRef.current) {
        gsap.fromTo(
          priorityDropdownRef.current.querySelector(`.${styles.dropdownItems}`),
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
      if (isClientDropdownOpen && clientDropdownRef.current) {
        gsap.fromTo(
          clientDropdownRef.current.querySelector(`.${styles.dropdownItems}`),
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }, [isStatusDropdownOpen, isPriorityDropdownOpen, isClientDropdownOpen]);

    // Close action menu and dropdowns on outside click
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
          statusDropdownRef.current &&
          !statusDropdownRef.current.contains(event.target as Node) &&
          isStatusDropdownOpen
        ) {
          setIsStatusDropdownOpen(false);
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
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId, isStatusDropdownOpen, isPriorityDropdownOpen, isClientDropdownOpen]);

    // Sorting handler
    const handleSort = useCallback((key: string) => {
      if (key === sortKey) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
      }
    }, [sortKey, sortDirection]);

    // Custom sorting logic
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
        const statusOrder = ['En Proceso', 'Backlog', 'Por Comenzar', 'Finalizado', 'Cancelada'];
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
            ? a[sortKey].localeCompare(b[sortKey])
            : b[sortKey].localeCompare(a[sortKey])
        );
      }
      return sorted;
    }, [filteredTasks, sortKey, sortDirection, clients]);

    // GSAP click animation
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

    // Action menu handler
    const handleActionClick = useCallback((taskId: string) => {
      setActionMenuOpenId((prev) => (prev === taskId ? null : taskId));
    }, []);

    // Filter handlers
    const handleStatusSelect = (status: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setStatusFilter(status);
      setIsStatusDropdownOpen(false);
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

    // Render action menu
    const renderActionMenu = useCallback(
      (task: Task) => (
        <div className={styles.actionContainer}>
          {user && (
            <>
              <button
                ref={(el) => {
                  if (el) actionButtonRefs.current.set(task.id, el);
                  else actionButtonRefs.current.delete(task.id);
                }}
                onClick={() => handleActionClick(task.id)}
                className={styles.actionButton}
                aria-label="Abrir acciones"
              >
                <Image src="/elipsis.svg" alt="Actions" width={16} height={16} />
              </button>
              {actionMenuOpenId === task.id && (
                <div ref={actionMenuRef} className={styles.dropdown}>
                  <div
                    className={styles.dropdownItem}
                    onClick={(e) => {
                      animateClick(e.currentTarget);
                      // Placeholder for edit/delete actions
                      setActionMenuOpenId(null);
                    }}
                  >
                    <Image src="/pencil.svg" alt="Edit" width={18} height={18} />
                    <span>Editar Tarea</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ),
      [user, actionMenuOpenId, handleActionClick]
    );

    // Table columns
    const columns = useMemo(
      () => [
        {
          key: 'clientId',
          label: 'Cuenta',
          width: '20%',
          mobileVisible: true,
          render: (task: Task) => {
            const client = clients.find((c) => c.id === task.clientId);
            return client ? client.name : 'Sin cuenta';
          },
        },
        {
          key: 'name',
          label: 'Tarea',
          width: '45%',
          mobileVisible: true,
        },
        {
          key: 'status',
          label: 'Estado',
          width: '15%',
          mobileVisible: false,
          render: (task: Task) => (
            <div className={styles.statusWrapper}>
              <Image
                src={
                  task.status === 'En Proceso' ? '/timer.svg' :
                  task.status === 'Backlog' ? '/circle-help.svg' :
                  task.status === 'Por Comenzar' ? '/circle.svg' :
                  task.status === 'Cancelada' ? '/circle-x.svg' :
                  '/timer.svg'
                }
                alt={task.status}
                width={16}
                height={16}
              />
              <span className={styles[`status-${task.status.replace(' ', '-')}`]}>{task.status}</span>
            </div>
          ),
        },
        {
          key: 'priority',
          label: 'Prioridad',
          width: '15%',
          mobileVisible: false,
          render: (task: Task) => (
            <div className={styles.priorityWrapper}>
              <Image
                src={
                  task.priority === 'Alta' ? '/arrow-up.svg' :
                  task.priority === 'Media' ? '/arrow-right.svg' :
                  '/arrow-down.svg'
                }
                alt={task.priority}
                width={16}
                height={16}
              />
              <span className={styles[`priority-${task.priority}`]}>{task.priority}</span>
            </div>
          ),
        },
        {
          key: 'action',
          label: 'Acciones',
          width: '5%',
          mobileVisible: true,
          render: renderActionMenu,
        },
      ],
      [clients, renderActionMenu]
    );

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Buscar Tareas"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Buscar tareas"
            />
          </div>
          <div className={styles.filtersWrapper}>
            <div className={styles.filter}>
              <div className={styles.dropdownContainer} ref={statusDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  }}
                >
                  <Image src="/circle-plus.svg" alt="Status" width={16} height={16} />
                  <span>{statusFilter || 'Estado'}</span>
                </div>
                {isStatusDropdownOpen && (
                  <div className={styles.dropdownItems}>
                    {['En Proceso', 'Backlog', 'Por Comenzar', 'Finalizado', 'Cancelada', ''].map((status) => (
                      <div
                        key={status || 'all'}
                        className={styles.dropdownItem}
                        onClick={(e) => handleStatusSelect(status, e)}
                      >
                        {status || 'Todos'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.filter}>
              <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsPriorityDropdownOpen(!isPriorityDropdownOpen);
                  }}
                >
                  <Image src="/circle-plus.svg" alt="Priority" width={16} height={16} />
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
                    setIsClientDropdownOpen(!isClientDropdownOpen);
                  }}
                >
                  <Image src="/vote.svg" alt="Client" width={17} height={17} />
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
                onCreateClientOpen();
              }}
            >
              <Image src="/wallet-cards.svg" alt="New Client" width={17} height={17} />
              Nuevo Cliente
            </button>
            <button
              className={styles.filterButton}
              onClick={(e) => {
                animateClick(e.currentTarget);
                onInviteMemberOpen();
              }}
            >
              <Image src="/square-user-round.svg" alt="Invite Member" width={17} height={17} />
              Invitar Miembro
            </button>
            <button
              className={styles.filterButton}
              onClick={(e) => {
                animateClick(e.currentTarget);
                onAISidebarOpen();
              }}
            >
              <Image src="/robot.svg" alt="AI" width={18} height={14} />
              Pregunta a la IA
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
        <Table
          data={sortedTasks}
          columns={columns}
          itemsPerPage={10}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={onChatSidebarOpen}
        />
      </div>
    );
  }
);

export default TasksTable;