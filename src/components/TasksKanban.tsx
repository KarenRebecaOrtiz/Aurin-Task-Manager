'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, deleteDoc, addDoc, query, doc, getDoc, getDocs, where } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { gsap } from 'gsap';
import { updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import styles from './TasksKanban.module.scss';
import avatarStyles from './ui/AvatarGroup.module.scss';
import { Client, User, Task } from './TasksTable'; // Import interfaces from TasksTable
import AvatarGroup from './TasksTable'; // Reuse AvatarGroup component
import UserSwiper from '@/components/UserSwiper';

interface TasksKanbanProps {
  tasks: Task[];
  clients: Client[];
  users: User[];
  onCreateClientOpen: () => void;
  onInviteMemberOpen: () => void;
  onNewTaskOpen: () => void;
  onEditTaskOpen: (taskId: string) => void;
  onAISidebarOpen: () => void;
  onChatSidebarOpen: (task: Task) => void;
  onMessageSidebarOpen: (user: User) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onOpenProfile: (user: { id: string; imageUrl: string }) => void;
  taskViewMode: 'table' | 'kanban';
  setTaskViewMode: React.Dispatch<React.SetStateAction<'table' | 'kanban'>>;
}

const TasksKanban: React.FC<TasksKanbanProps> = memo(
  ({
    tasks,
    clients,
    users,
    onCreateClientOpen,
    onInviteMemberOpen,
    onNewTaskOpen,
    onEditTaskOpen,
    onAISidebarOpen,
    onChatSidebarOpen,
    onMessageSidebarOpen,
    setTasks,
    onOpenProfile,
    taskViewMode,
    setTaskViewMode,
  }) => {
    const { user } = useUser();
    const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isAdminLoaded, setIsAdminLoaded] = useState<boolean>(false);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const deletePopupRef = useRef<HTMLDivElement>(null);

    const userId = useMemo(() => user?.id || '', [user]);

    // Fetch admin status
    useEffect(() => {
      const fetchAdminStatus = async () => {
        if (!userId) {
          setIsAdmin(false);
          setIsAdminLoaded(true);
          return;
        }
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          setIsAdmin(userDoc.exists() && userDoc.data().access === 'admin');
        } catch (error) {
          console.error('Error fetching admin status:', error);
          setIsAdmin(false);
        } finally {
          setIsAdminLoaded(true);
        }
      };
      fetchAdminStatus();
    }, [userId]);

    // Initialize filtered tasks
    useEffect(() => {
      setFilteredTasks(tasks);
    }, [tasks]);

    // Filter tasks
    const memoizedFilteredTasks = useMemo(() => {
      return tasks.filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        const matchesClient = !clientFilter || task.clientId === clientFilter;
        return matchesSearch && matchesPriority && matchesClient;
      });
    }, [tasks, searchQuery, priorityFilter, clientFilter]);

    useEffect(() => {
      setFilteredTasks(memoizedFilteredTasks);
    }, [memoizedFilteredTasks]);

    // Group tasks by status for columns
    const statusColumns = useMemo(() => {
      const statuses = ['Por Iniciar', 'En Proceso', 'Backlog', 'Finalizado', 'Cancelado'];
      return statuses.map((status) => ({
        id: status,
        title: status,
        tasks: filteredTasks.filter((task) => task.status === status),
      }));
    }, [filteredTasks]);

    // Handle drag-and-drop
    const handleDragEnd = async (result: DropResult) => {
      if (!isAdmin) return; // Only admins can drag tasks
      const { destination, source, draggableId } = result;
      if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
        return;
      }

      try {
        const task = tasks.find((t) => t.id === draggableId);
        if (!task) throw new Error('Task not found');

        const updatedTask = { ...task, status: destination.droppableId };
        await updateDoc(doc(db, 'tasks', task.id), { status: destination.droppableId });
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
      } catch (error) {
        console.error('Error updating task status:', error);
        alert('Error al mover la tarea');
      }
    };

    // Handle task deletion (same as TasksTable)
    const handleDeleteTask = async () => {
      const auth = getAuth();
      if (!userId || !deleteTaskId || deleteConfirm.toLowerCase() !== 'eliminar') return;

      try {
        const task = tasks.find((t) => t.id === deleteTaskId);
        if (!task) throw new Error('Task not found');
        if (!isAdmin && task.CreatedBy !== userId) throw new Error('Unauthorized to delete task');

        // Delete messages
        const messagesQuery = query(collection(db, `tasks/${deleteTaskId}/messages`));
        const messagesSnapshot = await getDocs(messagesQuery);
        for (const msgDoc of messagesSnapshot.docs) {
          await deleteDoc(doc(db, `tasks/${deleteTaskId}/messages`, msgDoc.id));
        }

        // Delete notifications
        const notificationsQuery = query(collection(db, 'notifications'), where('taskId', '==', deleteTaskId));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        for (const notifDoc of notificationsSnapshot.docs) {
          await deleteDoc(doc(db, 'notifications', notifDoc.id));
        }

        // Notify involved users
        const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
        if (task.CreatedBy) recipients.add(task.CreatedBy);
        recipients.delete(userId);
        for (const recipientId of recipients) {
          await addDoc(collection(db, 'notifications'), {
            userId,
            taskId: deleteTaskId,
            message: `${user?.firstName || 'Usuario'} eliminó la tarea ${task.name}`,
            timestamp: Timestamp.now(),
            read: false,
            recipientId,
          });
        }

        // Delete task
        await deleteDoc(doc(db, 'tasks', deleteTaskId));
        setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
        setIsDeletePopupOpen(false);
        setDeleteConfirm('');
        setDeleteTaskId(null);
      } catch (error) {
        console.error('Error deleting task:', error);
        alert(`Error al eliminar la tarea: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
        setIsDeletePopupOpen(false);
        setDeleteConfirm('');
        setDeleteTaskId(null);
      }
    };

    // Handle filter selections
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

    // Handle click outside to close dropdowns and popups
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
          setIsPriorityDropdownOpen(false);
        }
        if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
          setIsClientDropdownOpen(false);
        }
        if (deletePopupRef.current && !deletePopupRef.current.contains(event.target as Node)) {
          setIsDeletePopupOpen(false);
          setDeleteConfirm('');
          setDeleteTaskId(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Animate dropdowns and popups
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
      if (isDeletePopupOpen && deletePopupRef.current) {
        gsap.fromTo(
          deletePopupRef.current,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
        );
      }
    }, [isDeletePopupOpen]);

    return (
      <div className={styles.container}>
        <UserSwiper onOpenProfile={onOpenProfile} onMessageSidebarOpen={onMessageSidebarOpen} />
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
              <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsPriorityDropdownOpen((prev) => !prev);
                  }}
                >
                  <svg className="filterIcon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 3H10V4H2V3ZM4 5H8V6H4V5ZM5 7H7V8H5V7Z" fill="currentColor"/>
                  </svg>
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
                  <svg className="filterIcon" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 3H10V4H2V3ZM4 5H8V6H4V5ZM5 7H7V8H5V7Z" fill="currentColor"/>
                  </svg>
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
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 0L0 5.25V8.75L9 14L18 8.75V5.25L9 0ZM9 2.625L15.75 6.125V7.875L9 11.375L2.25 7.875V6.125L9 2.625Z" fill="currentColor"/>
              </svg>
              Pregunta a la IA
            </button>
            <button
              className={styles.createButton}
              onClick={(e) => {
                animateClick(e.currentTarget);
                onNewTaskOpen();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2H14V14H2V2ZM0 2C0 0.89543 0.89543 0 2 0H14C15.1046 0 16 0.89543 16 2V14C16 15.1046 15.1046 16 14 16H2C0.89543 16 0 15.1046 0 14V2ZM8 4V12V4ZM4 8H12H4Z" fill="currentColor"/>
              </svg>
              Crear Tarea
            </button>
            <button
              className={styles.viewToggleButton}
              onClick={() => setTaskViewMode('table')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 2C0 0.89543 0.89543 0 2 0H14C15.1046 0 16 0.89543 16 2V14C16 15.1046 15.1046 16 14 16H2C0.89543 16 0 15.1046 0 14V2ZM2 2V14H14V2H2ZM4 4H12V6H4V4ZM4 8H12V10H4V8ZM4 12H12V14H4V12Z" fill="currentColor"/>
              </svg>
              Vista de Tabla
            </button>
          </div>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={styles.kanbanBoard}>
            {statusColumns.map((column) => (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided) => (
                  <div className={styles.column} ref={provided.innerRef} {...provided.droppableProps}>
                    <div className={styles.columnHeader}>
                      <h3>{column.title}</h3>
                      <span className={styles.taskCount}>{column.tasks.length}</span>
                    </div>
                    <div className={styles.taskList}>
                      {column.tasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                          isDragDisabled={!isAdmin}
                        >
                          {(provided) => (
                            <div
                              className={styles.taskCard}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onChatSidebarOpen(task)}
                            >
                              <div className={styles.taskHeader}>
                                <h4>{task.name}</h4>
                                {(isAdmin || task.CreatedBy === userId) && (
                                  <div className={styles.taskActions}>
                                    {isAdmin && (
                                      <button
                                        className={styles.editButton}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditTaskOpen(task.id);
                                        }}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M1.5 8.5L0 10L1.5 11.5L3 10L8.5 4.5L7 3L1.5 8.5ZM9.5 3.5L8.5 2.5L10 1L11 2L9.5 3.5Z" fill="currentColor"/>
                                        </svg>
                                      </button>
                                    )}
                                    <button
                                      className={styles.deleteButton}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDeletePopupOpen(true);
                                        setDeleteTaskId(task.id);
                                      }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 0V2H0V3H1V10C1 11.1046 1.89543 12 3 12H9C10.1046 12 11 11.1046 11 10V3H12V2H9V0H3ZM4 2H8V3H4V2ZM3 4H4V9H3V4ZM5 4H6V9H5V4ZM8 4H9V9H8V4Z" fill="currentColor"/>
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p className={styles.taskDescription}>{task.description}</p>
                              <div className={styles.taskDetails}>
                                <div className={styles.priority}>
                                  <Image
                                    src={
                                      task.priority === 'Alta'
                                        ? '/arrow-up.svg'
                                        : task.priority === 'Media'
                                        ? '/arrow-right.svg'
                                        : '/arrow-down.svg'
                                    }
                                    alt={task.priority}
                                    width={12}
                                    height={12}
                                  />
                                  <span className={styles[`priority-${task.priority}`]}>{task.priority}</span>
                                </div>
                                <AvatarGroup
                                  assignedUserIds={task.AssignedTo}
                                  users={users}
                                  currentUserId={userId}
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
        {isDeletePopupOpen && (
          <div className={styles.deletePopupOverlay}>
            <div className={styles.deletePopup} ref={deletePopupRef}>
              <div className={styles.deletePopupContent}>
                <h2 className={styles.deletePopupTitle}>¿Seguro que quieres eliminar esta tarea?</h2>
                <p className={styles.deletePopupDescription}>
                  Eliminar esta tarea borrará permanentemente todas sus conversaciones y datos asociados.{' '}
                  <strong>Esta acción no se puede deshacer.</strong>
                </p>
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

TasksKanban.displayName = 'TasksKanban';

export default TasksKanban;
