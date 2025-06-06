'use client';
import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, getDocs, deleteDoc, addDoc, query, where, doc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { db } from '@/lib/firebase';
import Table from './Table';
import styles from './TasksTable.module.scss';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
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

interface TasksTableProps {
  tasks: Task[];
  clients: Client[];
  onCreateClientOpen: () => void;
  onInviteMemberOpen: () => void;
  onNewTaskOpen: () => void;
  onAISidebarOpen: () => void;
  onChatSidebarOpen: (task: Task) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const TasksTable: React.FC<TasksTableProps> = memo(
  ({ tasks, clients, onNewTaskOpen, onAISidebarOpen, onChatSidebarOpen, setTasks }) => {
    const { user } = useUser();
    const router = useRouter();
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
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const deletePopupRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    // Fetch tasks
    useEffect(() => {
      const fetchTasks = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'tasks'));
          const tasksData: Task[] = querySnapshot.docs
            .map((doc) => ({
              id: doc.id,
              clientId: doc.data().clientId || '',
              project: doc.data().project || '',
              name: doc.data().name || '',
              description: doc.data().description || '',
              status: doc.data().status || '',
              priority: doc.data().priority || '',
              startDate: doc.data().startDate ? doc.data().startDate.toDate().toISOString() : null,
              endDate: doc.data().endDate ? doc.data().endDate.toDate().toISOString() : null,
              LeadedBy: doc.data().LeadedBy || [],
              AssignedTo: doc.data().AssignedTo || [],
              createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
              CreatedBy: doc.data().CreatedBy || '',
            }))
            .filter(
              (task) =>
                task.AssignedTo.includes(user?.id || '') ||
                task.LeadedBy.includes(user?.id || '') ||
                task.CreatedBy === user?.id,
            );
          setTasks(tasksData);
        } catch (error) {
          console.error('Error fetching tasks:', error);
        }
      };
      if (user?.id) {
        fetchTasks();
      }
    }, [setTasks, user?.id]);

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

    // GSAP animations
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
      const statusItems = statusDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isStatusDropdownOpen && statusItems) {
        gsap.fromTo(
          statusItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }, [isStatusDropdownOpen]);

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

    // Handle click outside
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
    }, [actionMenuOpenId, isStatusDropdownOpen, isPriorityDropdownOpen, isClientDropdownOpen, isDeletePopupOpen]);

    // Sort tasks
    const handleSort = (key: string) => {
      if (key === sortKey) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
      }
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
            ? String(a[sortKey as keyof Task]).localeCompare(String(b[sortKey as keyof Task]))
            : String(b[sortKey as keyof Task]).localeCompare(String(a[sortKey as keyof Task])),
        );
      }
      return sorted;
    }, [filteredTasks, sortKey, sortDirection, clients]);

    // Animation handler
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

    // Handle task deletion
    const handleDeleteTask = async () => {
      if (!user?.id || !deleteTaskId || deleteConfirm.toLowerCase() !== 'eliminar') return;

      try {
        console.log('Deleting task:', deleteTaskId);

        // Eliminar mensajes
        const messagesQuery = query(collection(db, `tasks/${deleteTaskId}/messages`));
        const messagesSnapshot = await getDocs(messagesQuery);
        await Promise.all(messagesSnapshot.docs.map((msgDoc) => deleteDoc(doc(db, `tasks/${deleteTaskId}/messages`, msgDoc.id))));
        console.log('Deleted messages for task:', deleteTaskId);

        // Eliminar notificaciones
        const notificationsQuery = query(collection(db, 'notifications'), where('taskId', '==', deleteTaskId));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        await Promise.all(notificationsSnapshot.docs.map((notifDoc) => deleteDoc(doc(db, 'notifications', notifDoc.id))));
        console.log('Deleted notifications for task:', deleteTaskId);

        // Notificar a involucrados
        const task = tasks.find((t) => t.id === deleteTaskId);
        if (task) {
          const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
          if (task.CreatedBy) recipients.add(task.CreatedBy);
          recipients.delete(user.id);
          for (const recipientId of Array.from(recipients)) {
            await addDoc(collection(db, 'notifications'), {
              userId: user.id,
              taskId: deleteTaskId,
              message: `${user.firstName || 'Usuario'} eliminó la tarea ${task.name}`,
              timestamp: Timestamp.now(),
              read: false,
              recipientId,
            });
          }
          console.log('Notifications sent for task deletion');
        }

        // Eliminar tarea
        await deleteDoc(doc(db, 'tasks', deleteTaskId));
        console.log('Task deleted:', deleteTaskId);

        // Actualizar lista de tareas
        setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));

        setIsDeletePopupOpen(false);
        setDeleteConfirm('');
        setDeleteTaskId(null);
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Error al eliminar la tarea');
      }
    };

    // Action menu renderer
    const renderActionMenu = (task: Task) => (
      <div className={styles.actionContainer}>
        {user && (
          <>
            <button
              ref={(el) => {
                if (el) actionButtonRefs.current.set(task.id, el);
                else actionButtonRefs.current.delete(task.id);
              }}
              onClick={task.CreatedBy === user.id ? () => setActionMenuOpenId(actionMenuOpenId === task.id ? null : task.id) : undefined}
              className={`${styles.actionButton} ${task.CreatedBy !== user.id ? styles.disabled : ''}`}
              aria-label="Abrir acciones"
              disabled={task.CreatedBy !== user.id}
            >
              <Image src="/elipsis.svg" alt="Actions" width={16} height={16} />
            </button>
            {actionMenuOpenId === task.id && task.CreatedBy === user.id && (
              <div ref={actionMenuRef} className={styles.dropdown}>
                <div
                  className={styles.dropdownItem}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setActionMenuOpenId(null);
                    router.push(`/dashboard/edit-task?taskId=${task.id}`);
                  }}
                >
                  <Image src="/pencil.svg" alt="Edit" width={18} height={18} />
                  <span>Editar Tarea</span>
                </div>
                <div
                  className={styles.dropdownItem}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setActionMenuOpenId(null);
                    setIsDeletePopupOpen(true);
                    setDeleteTaskId(task.id);
                  }}
                >
                  <Image src="/trash-2.svg" alt="Delete" width={18} height={18} />
                  <span>Eliminar Tarea</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );

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

    // Table columns
    const baseColumns = [
      {
        key: 'clientId',
        label: 'Cuenta',
        width: '20%',
        mobileVisible: true,
      },
      {
        key: 'name',
        label: 'Tarea',
        width: '40%',
        mobileVisible: true,
      },
      {
        key: 'status',
        label: 'Estado',
        width: '15%',
        mobileVisible: false,
      },
      {
        key: 'priority',
        label: 'Prioridad',
        width: '15%',
        mobileVisible: false,
      },
      {
        key: 'action',
        label: 'Acciones',
        width: '5%',
        mobileVisible: true,
      },
    ];

    const columns = baseColumns.map((col) => {
      if (col.key === 'clientId') {
        return {
          ...col,
          render: (task: Task) => {
            const client = clients.find((c) => c.id === task.clientId);
            return client ? (
              <Image
                src={client.imageUrl || '/empty-image.png'}
                alt={client.name || 'Client Image'}
                width={32}
                height={32}
                className={styles.clientImage}
                onError={(e) => {
                  e.currentTarget.src = '/empty-image.png';
                }}
              />
            ) : 'Sin cuenta';
          },
        };
      }
      if (col.key === 'status') {
        return {
          ...col,
          render: (task: Task) => (
            <div className={styles.statusWrapper}>
              <Image
                src={
                  task.status === 'En Proceso'
                    ? '/timer.svg'
                    : task.status === 'Backlog'
                      ? '/circle-help.svg'
                      : task.status === 'Por Comenzar'
                        ? '/circle.svg'
                        : task.status === 'Cancelada'
                          ? '/circle-x.svg'
                          : '/timer.svg'
                }
                alt={task.status}
                width={16}
                height={16}
              />
              <span className={styles[`status-${task.status.replace(' ', '-')}`]}>{task.status}</span>
            </div>
          ),
        };
      }
      if (col.key === 'priority') {
        return {
          ...col,
          render: (task: Task) => (
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
          ),
        };
      }
      if (col.key === 'action') {
        return {
          ...col,
          render: renderActionMenu,
        };
      }
      return col;
    });

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
                    setIsStatusDropdownOpen((prev) => !prev);
                  }}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="Status" width={16} height={16} />
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
                    setIsPriorityDropdownOpen((prev) => !prev);
                  }}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="Priority" width={16} height={16} />
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
                  }}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="Client" width={17} height={17} />
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
        {isDeletePopupOpen && (
          <div className={styles.deletePopupOverlay}>
            <div className={styles.deletePopup} ref={deletePopupRef}>
              <div className={styles.deletePopupContent}>
                <Image
                  src="/message-circle-warning.svg"
                  alt="Warning"
                  width={24}
                  height={24}
                  className={styles.warningIcon}
                />
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
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Escribe 'Eliminar' para confirmar"
                  className={styles.deleteConfirmInput}
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

TasksTable.displayName = 'TasksTable';

export default TasksTable;