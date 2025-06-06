'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { useUser } from '@clerk/nextjs';
import { gsap } from 'gsap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '@/lib/firebase';
import styles from './ChatSidebar.module.scss';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
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
    CreatedBy?: string;
  };
  clientName: string;
  users: { id: string; fullName: string; firstName?: string; imageUrl: string }[];
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, task: initialTask, clientName, users = [] }) => {
  const { user } = useUser();
  const router = useRouter();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false);
  const [timerInput, setTimerInput] = useState('00:00');
  const [dateInput, setDateInput] = useState<Date>(new Date());
  const [commentInput, setCommentInput] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [task, setTask] = useState(initialTask);
  const chatRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const timerPanelRef = useRef<HTMLDivElement>(null);
  const timerButtonRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const taskMenuRef = useRef<HTMLDivElement>(null);
  const deletePopupRef = useRef<HTMLDivElement>(null);
  const prevMessagesRef = useRef<Message[]>([]);

  const isCreator = user?.id === task.CreatedBy;
  const statusOptions = ['Por Iniciar', 'En Proceso', 'Diseño', 'Desarrollo', 'Backlog', 'Finalizado', 'Cancelado'];

  // Real-time task listener
  useEffect(() => {
    if (!task.id) return;

    console.log('Setting up task listener for task:', task.id);
    const unsubscribe = onSnapshot(doc(db, 'tasks', task.id), (doc) => {
      if (doc.exists()) {
        const taskData = doc.data();
        setTask({
          id: doc.id,
          clientId: taskData.clientId || '',
          project: taskData.project || '',
          name: taskData.name || '',
          description: taskData.description || '',
          status: taskData.status || '',
          priority: taskData.priority || '',
          startDate: taskData.startDate ? taskData.startDate.toDate().toISOString() : null,
          endDate: taskData.endDate ? taskData.endDate.toDate().toISOString() : null,
          LeadedBy: taskData.LeadedBy || [],
          AssignedTo: taskData.AssignedTo || [],
          CreatedBy: taskData.CreatedBy || '',
        });
        console.log('Task updated:', taskData.status);
      }
    }, (error) => {
      console.error('Error listening to task:', error.message, error.code);
    });

    return () => {
      console.log('Unsubscribing task listener for task:', task.id);
      unsubscribe();
    };
  }, [task.id]);

  // GSAP animation for open/close
  useEffect(() => {
    if (sidebarRef.current) {
      if (isOpen) {
        gsap.fromTo(
          sidebarRef.current,
          { x: '100%', opacity: 0 },
          { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
        console.log('ChatSidebar opened');
      } else {
        gsap.to(sidebarRef.current, {
          x: '100%',
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
        console.log('ChatSidebar closed');
      }
    }
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        gsap.to(sidebarRef.current, {
          x: '100%',
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
        console.log('Closed ChatSidebar via outside click');
      }
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node) &&
        actionMenuOpenId
      ) {
        setActionMenuOpenId(null);
        console.log('Closed message action menu via outside click');
      }
      if (
        taskMenuRef.current &&
        !taskMenuRef.current.contains(event.target as Node) &&
        isTaskMenuOpen
      ) {
        setIsTaskMenuOpen(false);
        console.log('Closed task menu via outside click');
      }
      if (
        deletePopupRef.current &&
        !deletePopupRef.current.contains(event.target as Node) &&
        isDeletePopupOpen
      ) {
        setIsDeletePopupOpen(false);
        setDeleteConfirm('');
        console.log('Closed delete popup via outside click');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, actionMenuOpenId, isTaskMenuOpen, isDeletePopupOpen]);

  // Real-time messages listener
  useEffect(() => {
    if (!task.id) return;

    console.log('Setting up messages listener for task:', task.id);
    const messagesQuery = query(
      collection(db, `tasks/${task.id}/messages`),
      orderBy('timestamp', 'asc'),
    );
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const newMessages: Message[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          senderId: doc.data().senderId,
          senderName: doc.data().senderName,
          text: doc.data().text,
          timestamp: doc.data().timestamp,
          read: doc.data().read || false,
        }));
        console.log('Received messages:', newMessages.length, 'IDs:', newMessages.map(m => m.id));
        setMessages(newMessages);
      },
      (error) => {
        console.error('Error listening to messages:', error.message, error.code);
      },
    );

    return () => {
      console.log('Unsubscribing messages listener for task:', task.id);
      unsubscribe();
    };
  }, [task.id]);

  // Mark messages as read when sidebar opens
  useEffect(() => {
    if (isOpen && user?.id) {
      console.log('Checking unread messages for user:', user.id);
      setHasInteracted(true);
      const unreadMessages = messages.filter((msg) => !msg.read);
      console.log('Unread messages:', unreadMessages.length, 'IDs:', unreadMessages.map(m => m.id));
      unreadMessages.forEach(async (msg) => {
        try {
          console.log('Marking message as read:', msg.id);
          await updateDoc(doc(db, `tasks/${task.id}/messages`, msg.id), {
            read: true,
          });
          console.log('Message marked as read:', msg.id);
        } catch (error) {
          console.error('Error marking message as read:', error.message, error.code);
        }
      });
    }
  }, [isOpen, messages, user?.id, task.id]);

  // Notification sound for new unread messages
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/NotificationSound.mp3');
      console.log('Initialized audioRef');
    }

    console.log('Sound useEffect triggered, messages:', messages.length, 'hasInteracted:', hasInteracted);
    const newUnreadMessages = messages.filter(
      (msg) =>
        !msg.read &&
        !prevMessagesRef.current.some(
          (prev) => prev.id === msg.id && prev.text === msg.text && prev.senderId === msg.senderId
        )
    );

    console.log('New unread messages detected:', newUnreadMessages.length, 'IDs:', newUnreadMessages.map(m => m.id));
    if (newUnreadMessages.length > 0 && user?.id && hasInteracted) {
      const latestMessage = newUnreadMessages[newUnreadMessages.length - 1];
      if (latestMessage.senderId !== user.id) {
        console.log('Playing sound for new unread message:', latestMessage.id, 'from:', latestMessage.senderId);
        audioRef.current.play().catch((error) => {
          console.error('Error playing notification sound:', error.message);
        });
      } else {
        console.log('Skipping sound: Message is from current user:', latestMessage.senderId);
      }
    } else {
      console.log('No sound played: Conditions not met', {
        newUnreadMessages: newUnreadMessages.length,
        userId: user?.id,
        hasInteracted,
      });
    }

    prevMessagesRef.current = messages;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        console.log('Paused audioRef on cleanup');
      }
    };
  }, [messages, user?.id, hasInteracted]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatRef.current) {
      setTimeout(() => {
        chatRef.current!.scrollTop = chatRef.current!.scrollHeight;
        console.log('Scrolled to bottom of chat');
      }, 0);
    }
  }, [messages]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
      console.log('Timer started');
    }
    return () => {
      clearInterval(interval);
      console.log('Timer cleared');
    };
  }, [isTimerRunning]);

  // GSAP animation for action menu
  useEffect(() => {
    if (actionMenuOpenId && actionMenuRef.current) {
      gsap.fromTo(
        actionMenuRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('Action menu animated');
    }
  }, [actionMenuOpenId]);

  // GSAP animation for status dropdown
  useEffect(() => {
    if (isStatusDropdownOpen && statusDropdownRef.current) {
      gsap.fromTo(
        statusDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('Status dropdown animated');
    }
  }, [isStatusDropdownOpen]);

  // GSAP animation for task menu
  useEffect(() => {
    if (isTaskMenuOpen && taskMenuRef.current) {
      gsap.fromTo(
        taskMenuRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('Task menu animated');
    }
  }, [isTaskMenuOpen]);

  // GSAP animation for timer panel
  useEffect(() => {
    if (timerPanelRef.current) {
      gsap.to(timerPanelRef.current, {
        height: isTimerPanelOpen ? 'auto' : 0,
        opacity: isTimerPanelOpen ? 1 : 0,
        duration: 0.3,
        ease: 'power2.out',
      });
      console.log('Timer panel animated, open:', isTimerPanelOpen);
    }
  }, [isTimerPanelOpen]);

  // GSAP animation for delete popup
  useEffect(() => {
    if (isDeletePopupOpen && deletePopupRef.current) {
      gsap.fromTo(
        deletePopupRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
      );
      console.log('Delete popup animated');
    }
  }, [isDeletePopupOpen]);

  const handleClick = (element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.95,
      opacity: 0.8,
      duration: 0.15,
      ease: 'power1.out',
      yoyo: true,
      repeat: 1,
    });
  };

  const handleStatusChange = async (status: string) => {
    if (!isCreator || !user?.id) return;

    try {
      console.log('Changing task status to:', status);
      await updateDoc(doc(db, 'tasks', task.id), {
        status,
      });
      console.log('Task status updated:', status);

      const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
      if (task.CreatedBy) recipients.add(task.CreatedBy);
      recipients.delete(user.id);
      for (const recipientId of Array.from(recipients)) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.id,
          taskId: task.id,
          message: `${user.firstName || 'Usuario'} cambió el estado de la tarea ${task.name} a ${status}`,
          timestamp: Timestamp.now(),
          read: false,
          recipientId,
        });
      }
      console.log('Notifications sent for status change');
    } catch (error) {
      console.error('Error updating task status:', error.message, error.code);
    }
  };

  const handleEditTask = () => {
    if (!isCreator) return;
    console.log('Navigating to edit task:', task.id);
    router.push(`/dashboard/edit-task?taskId=${task.id}`);
    setIsTaskMenuOpen(false);
  };

  const handleDeleteTask = async () => {
    if (!isCreator || !user?.id || deleteConfirm.toLowerCase() !== 'eliminar') return;

    try {
      console.log('Deleting task:', task.id);

      // Eliminar mensajes
      const messagesQuery = query(collection(db, `tasks/${task.id}/messages`));
      const messagesSnapshot = await getDocs(messagesQuery);
      await Promise.all(messagesSnapshot.docs.map((msgDoc) => deleteDoc(doc(db, `tasks/${task.id}/messages`, msgDoc.id))));
      console.log('Deleted messages for task:', task.id);

      // Eliminar notificaciones
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('taskId', '==', task.id)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      await Promise.all(notificationsSnapshot.docs.map((notifDoc) => deleteDoc(doc(db, 'notifications', notifDoc.id))));
      console.log('Deleted notifications for task:', task.id);

      // Notificar a involucrados
      const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
      if (task.CreatedBy) recipients.add(task.CreatedBy);
      recipients.delete(user.id);
      for (const recipientId of Array.from(recipients)) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.id,
          taskId: task.id,
          message: `${user.firstName || 'Usuario'} eliminó la tarea ${task.name}`,
          timestamp: Timestamp.now(),
          read: false,
          recipientId,
        });
      }
      console.log('Notifications sent for task deletion');

      // Eliminar tarea
      await deleteDoc(doc(db, 'tasks', task.id));
      console.log('Task deleted:', task.id);

      setIsDeletePopupOpen(false);
      setDeleteConfirm('');
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error.message, error.code);
      alert('Error al eliminar la tarea');
    }
  };

  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!user?.id || !newMessage.trim()) return;

    try {
      console.log('Sending message:', newMessage);
      await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: user.id,
        senderName: user.firstName || 'Usuario',
        text: newMessage.trim(),
        timestamp: Timestamp.now(),
        read: false,
      });

      const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
      if (task.CreatedBy) recipients.add(task.CreatedBy);
      recipients.delete(user.id);
      console.log('Notification recipients:', Array.from(recipients));
      for (const recipientId of Array.from(recipients)) {
        await addDoc(collection(db, 'notifications'), {
          userId: user.id,
          taskId: task.id,
          message: `${user.firstName || 'Usuario'} envió un mensaje en la tarea ${task.name}`,
          timestamp: Timestamp.now(),
          read: false,
          recipientId,
        });
      }

      setNewMessage('');
      setHasInteracted(true);
      console.log('Message sent and notifications created');
    } catch (error) {
      console.error('Error sending message:', error.message, error.code);
      throw error;
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!user?.id || !editingText.trim()) return;

    try {
      console.log('Editing message:', messageId);
      await updateDoc(doc(db, `tasks/${task.id}/messages`, messageId), {
        text: editingText.trim(),
        timestamp: Timestamp.now(),
      });
      setEditingMessageId(null);
      setEditingText('');
      console.log('Message edited:', messageId);
    } catch (error) {
      console.error('Error editing message:', error.message, error.code);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) return;

    try {
      console.log('Deleting message:', messageId);
      await deleteDoc(doc(db, `tasks/${task.id}/messages`, messageId));
      setActionMenuOpenId(null);
      console.log('Message deleted:', messageId);
    } catch (error) {
      console.error('Error deleting message:', error.message, error.code);
    }
  };

  const toggleTimer = async (e: React.MouseEvent) => {
    handleClick(e.currentTarget as HTMLElement);
    const wasRunning = isTimerRunning;
    setIsTimerRunning((prev) => !prev);
    setHasInteracted(true);
    console.log('Timer toggled, running:', !wasRunning);

    if (wasRunning && user?.id && timerSeconds > 0) {
      const hours = Math.floor(timerSeconds / 3600);
      const minutes = Math.floor((timerSeconds % 3600) / 60);
      const timeEntry = `${hours}h ${minutes}m`;
      const timestamp = Timestamp.now();

      try {
        console.log('Adding time entry:', timeEntry);
        await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId: user.id,
          senderName: user.firstName || 'Usuario',
          text: `Añadió una entrada de tiempo de ${timeEntry}`,
          timestamp,
          read: false,
        });
        setTimerSeconds(0);
        console.log('Time entry added');
      } catch (error) {
        console.error('Error adding time entry:', error.message, error.code);
      }
    }
  };

  const toggleTimerPanel = (e: React.MouseEvent<HTMLElement>) => {
    handleClick(e.currentTarget as HTMLElement); 
    setIsTimerPanelOpen((prev) => !prev);
    setHasInteracted(true);
    console.log('Timer panel toggled');
  };

  const handleAddTimeEntry = async () => {
    if (!user?.id) return;

    const [hours, minutes] = timerInput.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const timeEntry = `${hours}h ${minutes}m`;
    const date = dateInput.toLocaleDateString('es-ES');
    const timestamp = Timestamp.now();

    try {
      console.log('Adding manual time entry:', timeEntry, date);
      await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: user.id,
        senderName: user.firstName || 'Usuario',
        text: `Añadió una entrada de tiempo de ${timeEntry} el ${date}`,
        timestamp,
        read: false,
      });

      if (commentInput.trim()) {
        console.log('Adding comment:', commentInput);
        await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId: user.id,
          senderName: user.firstName || 'Usuario',
          text: commentInput.trim(),
          timestamp: new Timestamp(timestamp.seconds, timestamp.nanoseconds + 1000),
          read: false,
        });
      }

      setTimerInput('00:00');
      setDateInput(new Date());
      setCommentInput('');
      setIsTimerPanelOpen(false);
      setIsCalendarOpen(false);
      setHasInteracted(true);
      console.log('Manual time entry and comment added');
    } catch (error) {
      console.error('Error adding time entry:', error.message, error.code);
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES');
  };

  const totalHours = useMemo(() => {
    const timeMessages = messages.filter((msg) => msg.text.startsWith('Añadó una entrada de tiempo de'));
    let totalMinutes = 0;

    timeMessages.forEach((msg) => {
      const match = msg.text.match(/(\d+)h\s+(\d+)m/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        totalMinutes += hours * 60 + minutes;
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    console.log('Calculated total hours:', `${totalHours}h ${remainingMinutes}m`);
    return `${totalHours}h ${remainingMinutes}m`;
  }, [messages]);

  const pm = users.find((u) => task.LeadedBy.includes(u.id)) || { fullName: 'Sin responsable', imageUrl: '/default-avatar.png' };

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ''}`} ref={sidebarRef}>
      <div className={styles.header}>
        <div className={styles.controls}>
          <div
            className={styles.arrowLeft}
            onClick={(e) => {
              handleClick(e.currentTarget);
              gsap.to(sidebarRef.current, {
                x: '100%',
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: onClose,
              });
            }}
          >
            <Image src="/arrow-left.svg" alt="Close" width={15} height={16} />
          </div>
          <div className={styles.breadcrumb}>
            {clientName} {'>'} {task.project}
          </div>
          <div
            className={`${styles.ellipsis} ${isCreator ? styles.clickable : ''}`}
            onClick={(e) => {
              if (isCreator) {
                handleClick(e.currentTarget);
                setIsTaskMenuOpen((prev) => !prev);
                setHasInteracted(true);
                console.log('Toggled task menu');
              }
            }}
          >
            <Image src="/elipsis.svg" alt="Options" width={16} height={16} />
          </div>
          {isTaskMenuOpen && isCreator && (
            <div ref={taskMenuRef} className={styles.taskMenuDropdown}>
              <div
                className={styles.taskMenuItem}
                onClick={handleEditTask}
              >
                Editar Tarea
              </div>
              <div
                className={styles.taskMenuItem}
                onClick={() => {
                  setIsDeletePopupOpen(true);
                  setIsTaskMenuOpen(false);
                  console.log('Opened delete popup');
                }}
              >
                Eliminar Tarea
              </div>
            </div>
          )}
        </div>
        <div className={styles.title}>{task.name}</div>
        <div className={styles.description}>{task.description || 'Sin descripción'}</div>
        <div className={styles.details}>
          <div
            className={`${styles.card} ${isCreator ? styles.statusCard : ''}`}
            onMouseEnter={() => isCreator && setIsStatusDropdownOpen(true)}
            onMouseLeave={() => isCreator && setIsStatusDropdownOpen(false)}
          >
            <div className={styles.cardLabel}>Estado de la tarea:</div>
            <div className={styles.cardValue}>{task.status}</div>
            {isStatusDropdownOpen && isCreator && (
              <div ref={statusDropdownRef} className={styles.statusDropdown}>
                {statusOptions.map((status) => (
                  <div
                    key={status}
                    className={styles.statusOption}
                    onClick={() => handleStatusChange(status)}
                  >
                    {status}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Responsable:</div>
            <div className={styles.cardValue}>
              <Image
                src={pm.imageUrl}
                alt={pm.fullName}
                width={18}
                height={18}
                className={styles.avatar}
              />
              <span>{pm.fullName}</span>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Fecha:</div>
            <div className={styles.cardValue}>
              {formatDate(task.startDate)} - {formatDate(task.endDate)}
            </div>
          </div>
          <div className={styles.cardFullWidth}>
            <div className={styles.cardLabel}>Horas totales dedicadas:</div>
            <div className={styles.cardValue}>{totalHours}</div>
          </div>
        </div>
      </div>
      <div className={styles.chat} ref={chatRef}>
        {messages.map((message) => (
          <div key={message.id} className={styles.message}>
            <Image
              src={users.find((u) => u.id === message.senderId)?.imageUrl || '/default-avatar.png'}
              alt={message.senderName}
              width={46}
              height={46}
              className={styles.avatar}
            />
            <div className={styles.messageContent}>
              <div className={styles.messageHeader}>
                <div className={styles.sender}>{message.senderName}</div>
                <div className={styles.messageActions}>
                  <div className={styles.timestamp}>
                    {message.timestamp.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {user?.id === message.senderId && !message.text.startsWith('Añadió una entrada de tiempo de') && (
                    <div className={styles.actionContainer}>
                      <button
                        className={styles.actionButton}
                        onClick={() => {
                          setActionMenuOpenId(actionMenuOpenId === message.id ? null : message.id);
                          setHasInteracted(true);
                        }}
                      >
                        <Image src="/elipsis.svg" alt="Actions" width={16} height={16} />
                      </button>
                      {actionMenuOpenId === message.id && (
                        <div ref={actionMenuRef} className={styles.actionDropdown}>
                          <div
                            className={styles.actionDropdownItem}
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingText(message.text);
                              setActionMenuOpenId(null);
                            }}
                          >
                            Editar mensaje
                          </div>
                          <div
                            className={styles.actionDropdownItem}
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            Eliminar mensaje
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {editingMessageId === message.id ? (
                <div className={styles.editContainer}>
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className={styles.editInput}
                  />
                  <button
                    className={styles.editSaveButton}
                    onClick={() => handleEditMessage(message.id)}
                  >
                    Guardar
                  </button>
                  <button
                    className={styles.editCancelButton}
                    onClick={() => {
                      setEditingMessageId(null);
                      setEditingText('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className={styles.text}>{message.text}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.inputWrapper}>
        <div ref={timerPanelRef} className={styles.timerPanel}>
          <div className={styles.timerPanelContent}>
            <div className={styles.timerRow}>
              <div className={styles.timerCard}>
              <input
                  type="time"
                  value={timerInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.match(/^[0-2][0-9]:[0-5][0-9]$/)) {
                      setTimerInput(value);
                    }
                  }}
                  step="900"
                  className={styles.timerInput}
                  pattern="[0-2][0-9]:[0-5][0-9]"
                />
              </div>
              <div
                className={styles.timerCard}
                onMouseEnter={() => setIsCalendarOpen(true)}
                onMouseLeave={() => setIsCalendarOpen(false)}
              >
                <DatePicker
                  selected={dateInput}
                  onChange={(date: Date | null) => setDateInput(date || new Date())}
                  dateFormat="dd/MM/yy"
                  className={styles.timerInput}
                  popperClassName={styles.calendarPopper}
                  open={isCalendarOpen}
                />
              </div>
            </div>
            <div className={styles.timerCard}>
              <textarea
                placeholder="Añadir comentario"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className={styles.timerCommentInput}
              />
            </div>
            <div className={styles.timerTotal}>
              Has invertido: {totalHours} en esta tarea.
            </div>
            <div className={styles.timerActions}>
              <button
                className={styles.timerAddButton}
                onClick={handleAddTimeEntry}
              >
                Añadir entrada
              </button>
              <button
                className={styles.timerCancelButton}
                onClick={() => {
                  setIsTimerPanelOpen(false);
                  setIsCalendarOpen(false);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
        <div className={styles.inputContainer}>
          <input
            type="text"
            placeholder="Escribe tu mensaje aquí"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            className={styles.input}
          />
          <div className={styles.actions}>
            <div className={styles.timerContainer}>
              <button
                className={styles.playStopButton}
                onClick={toggleTimer}
              >
                <Image
                  src={isTimerRunning ? '/Stop.svg' : '/Play.svg'}
                  alt={isTimerRunning ? 'Stop' : 'Play'}
                  width={12}
                  height={12}
                />
              </button>
              <div
                ref={timerButtonRef}
                className={styles.timer}
                onClick={toggleTimerPanel}
              >
                <span>{formatTimer(timerSeconds)}</span>
                <Image src="/chevron-down.svg" alt="Timer" width={12} height={12} />
              </div>
            </div>
            <button className={styles.sendButton} onClick={handleSendMessage}>
              <Image src="/arrow-up.svg" alt="Send" width={13} height={13} />
            </button>
          </div>
        </div>
      </div>
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
                    console.log('Cancelled task deletion');
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
};

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;