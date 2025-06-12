'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  where,
  setDoc,
  serverTimestamp,
  Timestamp,
  FieldValue,
  getDoc,
} from 'firebase/firestore';
import { useUser } from '@clerk/nextjs';
import { gsap } from 'gsap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import { db } from '@/lib/firebase';
import ImagePreviewOverlay from './ImagePreviewOverlay';
import styles from './ChatSidebar.module.scss';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp | FieldValue;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
}

interface TypingStatus {
  userId: string;
  isTyping: boolean;
  timestamp: Timestamp;
}

interface TimerState {
  userId: string;
  isRunning: boolean;
  startTime: Timestamp | null;
  accumulatedSeconds: number;
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
  sidebarId: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  task: initialTask,
  clientName,
  users = [],
  sidebarId,
}) => {

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
  const [isHoursDropdownOpen, setIsHoursDropdownOpen] = useState(false);
  const [isResponsibleDropdownOpen, setIsResponsibleDropdownOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const timerPanelRef = useRef<HTMLDivElement>(null);
  const timerButtonRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const taskMenuRef = useRef<HTMLDivElement>(null);
  const deletePopupRef = useRef<HTMLDivElement>(null);
  const hoursDropdownRef = useRef<HTMLDivElement>(null);
  const responsibleDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLFormElement>(null);
  const prevMessagesRef = useRef<Message[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const isCreator = user?.id === task.CreatedBy;
  const isInvolved =
    user?.id &&
    (task.AssignedTo.includes(user.id) || task.LeadedBy.includes(user.id) || task.CreatedBy === user.id);
  const statusOptions = ['Por Iniciar', 'En Proceso', 'Diseño', 'Desarrollo', 'Backlog', 'Finalizado', 'Cancelado'];

  // Real-time task listener
  useEffect(() => {
    if (!task.id) return;

    console.log('Setting up task listener for task:', task.id);
    const unsubscribe = onSnapshot(
      doc(db, 'tasks', task.id),
      (doc) => {
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
      },
      (error) => {
        console.error('Error listening to task:', error.message, error.code);
      },
    );

    return () => {
      console.log('Unsubscribing task listener for task:', task.id);
      unsubscribe();
    };
  }, [task.id]);

  // Real-time timer listener
  useEffect(() => {
    if (!task.id || !user?.id) return;

    console.log('Setting up timer listener for user:', user.id, 'task:', task.id);
    const timerDocRef = doc(db, `tasks/${task.id}/timers/${user.id}`);
    const unsubscribe = onSnapshot(
      timerDocRef,
      (doc) => {
        if (doc.exists()) {
          const timerData = doc.data() as TimerState;
          setIsTimerRunning(timerData.isRunning);
          if (timerData.isRunning && timerData.startTime) {
            const start = timerData.startTime.toDate().getTime();
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - start) / 1000) + timerData.accumulatedSeconds;
            setTimerSeconds(elapsedSeconds);
            console.log('Timer synced:', elapsedSeconds, 'seconds');
          } else {
            setTimerSeconds(timerData.accumulatedSeconds);
            console.log('Timer stopped, accumulated:', timerData.accumulatedSeconds);
          }
        } else {
          setDoc(timerDocRef, {
            userId: user.id,
            isRunning: false,
            startTime: null,
            accumulatedSeconds: 0,
          }).catch((error) => {
            console.error('Error initializing timer:', error.message, error.code);
          });
          console.log('Initialized timer for user:', user.id);
        }
      },
      (error) => {
        console.error('Error listening to timer:', error.message, error.code);
      },
    );

    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      console.log('Unsubscribing timer listener for user:', user.id);
      unsubscribe();
      clearInterval(interval);
    };
  }, [task.id, user?.id, isTimerRunning]);

  // Real-time typing status listener
  useEffect(() => {
    if (!task.id) return;

    console.log('Setting up typing listener for task:', task.id);
    const typingQuery = query(collection(db, `tasks/${task.id}/typing`));
    const unsubscribe = onSnapshot(
      typingQuery,
      (snapshot) => {
        const typing: string[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as TypingStatus;
          if (data.isTyping && data.userId !== user?.id) {
            const timestamp = data.timestamp.toDate().getTime();
            if (Date.now() - timestamp < 5000) {
              typing.push(data.userId);
            }
          }
        });
        setTypingUsers(typing);
        console.log('Typing users:', typing);
      },
      (error) => {
        console.error('Error listening to typing status:', error.message, error.code);
      },
    );

    return () => {
      console.log('Unsubscribing typing listener for task:', task.id);
      unsubscribe();
    };
  }, [task.id, user?.id]);

  // Actualizar estado de escritura
  const handleTyping = useCallback(() => {
    if (!user?.id || !task.id) return;

    const typingDocRef = doc(db, `tasks/${task.id}/typing/${user.id}`);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setDoc(typingDocRef, {
      userId: user.id,
      isTyping: true,
      timestamp: Timestamp.now(),
    }).catch((error) => {
      console.error('Error updating typing status:', error.message);
    });

    typingTimeoutRef.current = setTimeout(() => {
      setDoc(typingDocRef, {
        userId: user.id,
        isTyping: false,
        timestamp: Timestamp.now(),
      }).catch((error) => {
        console.error('Error stopping typing status:', error.message);
      });
    }, 3000);

    console.log('User typing:', user.id);
  }, [user?.id, task.id]);

  // GSAP animation for open/close
  useEffect(() => {
    if (sidebarRef.current) {
      if (isOpen) {
        gsap.fromTo(
          sidebarRef.current,
          { x: '100%', opacity: 0 },
          { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' },
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
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isOpen) {
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
      if (
        hoursDropdownRef.current &&
        !hoursDropdownRef.current.contains(event.target as Node) &&
        isHoursDropdownOpen
      ) {
        setIsHoursDropdownOpen(false);
        console.log('Closed hours dropdown via outside click');
      }
      if (
        responsibleDropdownRef.current &&
        !responsibleDropdownRef.current.contains(event.target as Node) &&
        isResponsibleDropdownOpen
      ) {
        setIsResponsibleDropdownOpen(false);
        console.log('Closed responsible dropdown via outside click');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [
    isOpen,
    onClose,
    actionMenuOpenId,
    isTaskMenuOpen,
    isDeletePopupOpen,
    isHoursDropdownOpen,
    isResponsibleDropdownOpen,
  ]);

  // Real-time messages listener
  useEffect(() => {
    if (!task.id) return;

    console.log('Setting up messages listener for task:', task.id);
    const messagesQuery = query(collection(db, `tasks/${task.id}/messages`), orderBy('timestamp', 'asc'));
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
          hours: doc.data().hours || 0,
          imageUrl: doc.data().imageUrl || null,
          fileUrl: doc.data().fileUrl || null,
          fileName: doc.data().fileName || null,
          fileType: doc.data().fileType || null,
          filePath: doc.data().filePath || null,
        }));
        console.log('Received messages:', newMessages.length, 'IDs:', newMessages.map((m) => m.id));
        setMessages(newMessages);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to messages:', error.message, error.code);
        setIsLoading(false);
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
      console.log('Unread messages:', unreadMessages.length, 'IDs:', unreadMessages.map((m) => m.id));
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
          (prev) => prev.id === msg.id && prev.text === msg.text && prev.senderId === msg.senderId,
        ),
    );

    console.log(
      'New unread messages detected:',
      newUnreadMessages.length,
      'IDs:',
      newUnreadMessages.map((m) => m.id),
    );
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
      console.log('No sound played:', {
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

  // Scroll handling for closing action menu
  useEffect(() => {
    const handleScroll = () => {
      setActionMenuOpenId(null);
      console.log('Closed action menu on scroll');
    };

    const chatEl = chatRef.current;
    if (chatEl) {
      chatEl.addEventListener('scroll', handleScroll);
    }
    window.addEventListener('scroll', handleScroll);

    return () => {
      if (chatEl) {
        chatEl.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatRef.current) {
      setTimeout(() => {
        chatRef.current!.scrollTop = chatRef.current!.scrollHeight;
        console.log('Scrolled to bottom of chat');
      }, 0);
    }
  }, [messages, typingUsers]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        console.log('Revoked preview URL');
      }
    };
  }, [previewUrl]);

  // GSAP animations
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

  useEffect(() => {
    if (isHoursDropdownOpen && hoursDropdownRef.current) {
      gsap.fromTo(
        hoursDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('Hours dropdown animated');
    }
  }, [isHoursDropdownOpen]);

  useEffect(() => {
    if (isResponsibleDropdownOpen && responsibleDropdownRef.current) {
      gsap.fromTo(
        responsibleDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('Responsible dropdown animated');
    }
  }, [isResponsibleDropdownOpen]);

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
      await Promise.all(
        messagesSnapshot.docs.map(async (msgDoc) => {
          const msgData = msgDoc.data();
          if (msgData.filePath) {
            try {
              console.log('Attempting to delete GCS file for message:', msgDoc.id, msgData.filePath);
              const response = await fetch('/api/delete-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: msgData.filePath }),
              });
              const responseData = await response.json();
              if (!response.ok) {
                console.error('Failed to delete GCS file:', {
                  status: response.status,
                  error: responseData.error,
                  details: responseData.details,
                  filePath: msgData.filePath,
                });
              } else {
                console.log('Successfully deleted GCS file:', msgData.filePath);
              }
            } catch (err: any) {
              console.error('Error deleting GCS file:', {
                message: err.message || 'Unknown error',
                code: err.code || 'unknown',
                stack: err.stack || 'No stack trace',
                filePath: msgData.filePath,
              });
            }
          }
          await deleteDoc(doc(db, `tasks/${task.id}/messages`, msgDoc.id));
        }),
      );
      console.log('Deleted messages for task:', task.id);

      // Eliminar timers
      const timersQuery = query(collection(db, `tasks/${task.id}/timers`));
      const timersSnapshot = await getDocs(timersQuery);
      await Promise.all(
        timersSnapshot.docs.map((timerDoc) => deleteDoc(doc(db, `tasks/${task.id}/timers`, timerDoc.id))),
      );
      console.log('Deleted timers for task:', task.id);

      // Eliminar typing status
      const typingQuery = query(collection(db, `tasks/${task.id}/typing`));
      const typingSnapshot = await getDocs(typingQuery);
      await Promise.all(
        typingSnapshot.docs.map((typingDoc) => deleteDoc(doc(db, `tasks/${task.id}/typing`, typingDoc.id))),
      );
      console.log('Deleted typing status for task:', task.id);

      // Eliminar notificaciones
      const notificationsQuery = query(collection(db, 'notifications'), where('taskId', '==', task.id));
      const notificationsSnapshot = await getDocs(notificationsQuery);
      await Promise.all(
        notificationsSnapshot.docs.map((notifDoc) => deleteDoc(doc(db, 'notifications', notifDoc.id))),
      );
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

  const selectFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      alert('El archivo supera los 10 MB.');
      console.log('File too large:', f.size);
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
    console.log('File selected:', f.name, f.type, f.size);
  };

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && !f.name.includes('/paperclip.svg')) {
      selectFile(f);
    }
    if (e.target) e.target.value = '';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !f.name.includes('/paperclip.svg')) {
      selectFile(f);
    }
    console.log('File dropped:', f?.name);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
    console.log('Removed selected file');
  };

  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!user?.id || (!newMessage.trim() && !file)) {
      console.warn('[ChatSidebar] invalid message input:', { userId: user?.id, newMessage, file });
      return;
    }

    try {
      console.log('Starting message send for task:', task.id);

      const messageData: Partial<Message> = {
        senderId: user.id,
        senderName: user.firstName || 'Usuario',
        text: newMessage.trim() || null,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        filePath: null,
      };

      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('conversationId', task.id);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload file');
          }

          const { url, fileName, fileType, filePath } = await response.json();
          console.log('File uploaded via API:', { url, fileName, fileType, filePath });

          messageData.fileName = fileName;
          messageData.fileType = fileType;
          messageData.filePath = filePath;

          if (file.type.startsWith('image/')) {
            messageData.imageUrl = url;
          } else {
            messageData.fileUrl = url;
          }
        } catch (err: any) {
          console.error('Failed to upload file:', {
            message: err.message || 'Unknown error',
            code: err.code || 'unknown',
            stack: err.stack || 'No stack trace',
            taskId: task.id,
            fileName: file.name,
          });
          alert('Error al subir el archivo');
          return;
        }
      }

      if (newMessage.trim()) {
        messageData.text = newMessage.trim();
      }

      // Guardar mensaje
      await addDoc(collection(db, `tasks/${task.id}/messages`), messageData);
      console.log('Message saved for task:', task.id);

      // Crear notificaciones
      const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
      if (task.CreatedBy) recipients.add(task.CreatedBy);
      recipients.delete(user.id);
      console.log('Notification recipients:', Array.from(recipients));

      for (const recipientId of Array.from(recipients)) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: user.id,
            taskId: task.id,
            message: `${user.firstName || 'Usuario'} envió un mensaje en la tarea ${task.name}`,
            timestamp: Timestamp.now(),
            read: false,
            recipientId,
          });
          console.log('Notification created for recipient:', recipientId);
        } catch (err) {
          console.error('Failed to create notification for recipient:', recipientId, err);
        }
      }

      setNewMessage('');
      setFile(null);
      setPreviewUrl(null);
      setHasInteracted(true);
      console.log('Message sent and notifications attempted');
    } catch (err) {
      console.error('Send message error:', err);
      alert('Error al enviar el mensaje');
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
      const messageRef = doc(db, `tasks/${task.id}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        if (messageData.filePath) {
          try {
            console.log('Attempting to delete GCS file:', messageData.filePath);
            const response = await fetch('/api/delete-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: messageData.filePath }),
            });
            const responseData = await response.json();
            if (!response.ok) {
              console.error('Failed to delete GCS file:', {
                status: response.status,
                error: responseData.error,
                details: responseData.details,
                filePath: messageData.filePath,
              });
            } else {
              console.log('Successfully deleted GCS file:', messageData.filePath);
            }
          } catch (err: any) {
            console.error('Error deleting GCS file:', {
              message: err.message || 'Unknown error',
              code: err.code || 'unknown',
              stack: err.stack || 'No stack trace',
              filePath: messageData.filePath,
            });
          }
        }
      }
      await deleteDoc(messageRef);
      setActionMenuOpenId(null);
      console.log('Message deleted:', messageId);
    } catch (error) {
      console.error('Error deleting message:', error.message, error.code);
    }
  };

  const toggleTimer = async (e: React.MouseEvent) => {
    if (!user?.id || !task.id) return;

    handleClick(e.currentTarget as HTMLElement);
    const wasRunning = isTimerRunning;
    setIsTimerRunning((prev) => !prev);
    setHasInteracted(true);
    console.log('Timer toggled, running:', !wasRunning);

    const timerDocRef = doc(db, `tasks/${task.id}/timers/${user.id}`);
    if (wasRunning && timerSeconds > 0) {
      const hours = timerSeconds / 3600;
      const displayHours = Math.floor(timerSeconds / 3600);
      const displayMinutes = Math.floor((timerSeconds % 3600) / 60);
      const timeEntry = `${displayHours}h ${displayMinutes}m`;
      const timestamp = Timestamp.now();

      try {
        console.log('Adding time entry:', timeEntry, 'hours:', hours);
        await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId: user.id,
          senderName: user.firstName || 'Usuario',
          text: `Añadó una entrada de tiempo de ${timeEntry}`,
          timestamp,
          read: false,
          hours,
        });
        await setDoc(timerDocRef, {
          userId: user.id,
          isRunning: false,
          startTime: null,
          accumulatedSeconds: 0,
        });
        setTimerSeconds(0);
        console.log('Time entry added and timer reset');
      } catch (error) {
        console.error('Error adding time entry:', error.message, error.code);
      }
    } else if (!wasRunning) {
      try {
        await setDoc(timerDocRef, {
          userId: user.id,
          isRunning: true,
          startTime: Timestamp.now(),
          accumulatedSeconds: timerSeconds,
        });
        console.log('Timer started in Firestore');
      } catch (error) {
        console.error('Error starting timer:', error.message, error.code);
      }
    }
  };

  const toggleTimerPanel = (e: React.MouseEvent) => {
    handleClick(e.currentTarget as HTMLElement);
    setIsTimerPanelOpen((prev) => !prev);
    setHasInteracted(true);
    console.log('Timer panel toggled');
  };

  const handleAddTimeEntry = async () => {
    if (!user?.id) {
      console.error('No user ID available');
      alert('No se puede añadir la entrada de tiempo: usuario no autenticado.');
      return;
    }

    const [hours, minutes] = timerInput.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      console.error('Invalid time input:', timerInput);
      alert('Por favor, introduce un formato de tiempo válido (HH:mm).');
      return;
    }

    const totalHours = hours + minutes / 60;
    const timeEntry = `${hours}h ${minutes}m`;
    const date = dateInput.toLocaleDateString('es-ES');

    try {
      console.log('Adding manual time entry:', { timeEntry, date, totalHours, taskId: task.id });
      const timestamp = Timestamp.now();

      // Add time entry message
      await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: user.id,
        senderName: user.firstName || 'Usuario',
        text: `Añadó una entrada de tiempo de ${timeEntry} el ${date}`,
        timestamp,
        read: false,
        hours: totalHours,
      });
      console.log('Time entry message added successfully');

      // Add comment message if provided
      if (commentInput.trim()) {
        console.log('Adding comment:', commentInput);
        // Use a new timestamp with a slight delay to ensure ordering
        await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId: user.id,
          senderName: user.firstName || 'Usuario',
          text: commentInput.trim(),
          timestamp: Timestamp.fromMillis(timestamp.toMillis() + 1),
          read: false,
        });
        console.log('Comment message added successfully');
      }

      // Reset form state
      setTimerInput('00:00');
      setDateInput(new Date());
      setCommentInput('');
      setIsTimerPanelOpen(false);
      setIsCalendarOpen(false);
      setHasInteracted(true);
      console.log('Manual time entry and comment processed successfully');
    } catch (error: any) {
      console.error('Error adding time entry:', {
        message: error.message || 'Unknown error',
        code: error.code || 'unknown',
        stack: error.stack || 'No stack trace',
        taskId: task.id,
        userId: user.id,
      });
      alert(`Error al añadir la entrada de tiempo: ${error.message || 'Inténtalo de nuevo.'}`);
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

  // Calcular horas totales
  const totalHours = useMemo(() => {
    const timeMessages = messages.filter((msg) => typeof msg.hours === 'number' && msg.hours > 0);
    let totalMinutes = 0;

    timeMessages.forEach((msg) => {
      totalMinutes += msg.hours * 60;
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = Math.round(totalMinutes % 60);
    console.log('Calculated total hours:', `${totalHours}h ${remainingMinutes}m`, { timeMessages });
    return `${totalHours}h ${remainingMinutes}m`;
  }, [messages]);

  // Calcular horas por usuario para el dropdown
  const hoursByUser = useMemo(() => {
    const timeMessages = messages.filter((msg) => typeof msg.hours === 'number' && msg.hours > 0);
    const hoursMap: { [userId: string]: number } = {};

    timeMessages.forEach((msg) => {
      hoursMap[msg.senderId] = (hoursMap[msg.senderId] || 0) + msg.hours;
    });

    const involvedUsers = new Set<string>([...task.LeadedBy, ...task.AssignedTo, task.CreatedBy || '']);
    return Array.from(involvedUsers)
      .map((userId) => {
        const u = users.find((u) => u.id === userId) || {
          id: userId,
          fullName: 'Desconocido',
          firstName: 'Desconocido',
          imageUrl: '/default-image.png',
        };
        const totalMinutes = (hoursMap[userId] || 0) * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60);
        return {
          id: userId,
          firstName: u.firstName || u.fullName.split(' ')[0],
          imageUrl: u.imageUrl,
          hours: `${hours}:${minutes.toString().padStart(2, '0')}`,
        };
      })
      .filter((u) => hoursMap[u.id]);
  }, [messages, users, task.LeadedBy, task.AssignedTo, task.CreatedBy]);

  // Obtener responsables para el dropdown
  const responsibleUsers = useMemo(() => {
    const pmUsers = task.LeadedBy.map((userId) => {
      const u = users.find((u) => u.id === userId) || {
        id: userId,
        fullName: 'Desconocido',
        firstName: 'Desconocido',
        imageUrl: '/default-image.png',
      };
      return {
        id: userId,
        firstName: u.firstName || u.fullName.split(' ')[0],
        imageUrl: u.imageUrl,
      };
    });
    return pmUsers.length > 0 ? pmUsers : null;
  }, [task.LeadedBy, users]);

  const creator = users.find((u) => u.id === task.CreatedBy) || {
    fullName: 'Desconocido',
    firstName: 'Desconocido',
    imageUrl: '/default-image.png',
  };

  return (
    <div
      className={`${styles.container} ${isOpen ? styles.open : ''} ${isDragging ? styles.dragging : ''}`}
      ref={sidebarRef}
    >
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
            <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
          </div>
          <div className={styles.breadcrumb}>
            {clientName} {'>'} {task.project}
          </div>
          <div
            className={`${styles.elipsis} ${isCreator ? styles.clickable : styles.disabled}`}
            onClick={(e) => {
              if (isCreator) {
                handleClick(e.currentTarget);
                setIsTaskMenuOpen((prev) => !prev);
                setHasInteracted(true);
                console.log('Toggling task menu');
              }
            }}
          >
            <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
          </div>
          {isTaskMenuOpen && isCreator && (
            <div ref={taskMenuRef} className={styles.taskMenu}>
              <div className={styles.taskMenuItem} onClick={handleEditTask}>
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
                  <div key={status} className={styles.statusOption} onClick={() => handleStatusChange(status)}>
                    {status}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            className={styles.card}
            onMouseEnter={() => isInvolved && setIsResponsibleDropdownOpen(true)}
            onMouseLeave={() => isInvolved && setIsResponsibleDropdownOpen(false)}
          >
            <div className={styles.cardLabel}>Responsable:</div>
            <div className={styles.cardValue}>
              <Image
                src={creator.imageUrl}
                alt={creator.firstName || 'Avatar del responsable'}
                width={18}
                height={18}
                className={styles.avatar}
              />
              <span>{creator.firstName || creator.fullName.split(' ')[0]}</span>
            </div>
            {isResponsibleDropdownOpen && isInvolved && (
              <div ref={responsibleDropdownRef} className={styles.responsibleDropdown}>
                {responsibleUsers ? (
                  responsibleUsers.map((u) => (
                    <div key={u.id} className={styles.responsibleDropdownItem}>
                      <Image
                        src={u.imageUrl}
                        alt={u.firstName || 'Avatar del responsable'}
                        width={24}
                        height={24}
                        className={styles.avatar}
                      />
                      <span>{u.firstName}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.responsibleDropdownItem}>No hay más responsables en esta tarea</div>
                )}
              </div>
            )}
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Fecha:</div>
            <div className={styles.cardValue}>
              {formatDate(task.startDate)} - {formatDate(task.endDate)}
            </div>
          </div>
          <div
            className={styles.cardFullWidth}
            onMouseEnter={() => isInvolved && setIsHoursDropdownOpen(true)}
            onMouseLeave={() => isInvolved && setIsHoursDropdownOpen(false)}
          >
            <div className={styles.cardLabel}>Tiempo registrado:</div>
            <div className={styles.cardValue}>{totalHours}</div>
            {isHoursDropdownOpen && isInvolved && (
              <div ref={hoursDropdownRef} className={styles.hoursDropdown}>
                {hoursByUser.length > 0 ? (
                  hoursByUser.map((u) => (
                    <div key={u.id} className={styles.hoursDropdownItem}>
                      <Image
                        src={u.imageUrl}
                        alt={u.firstName || 'Avatar del usuario'}
                        width={24}
                        height={24}
                        className={styles.avatar}
                      />
                      <span className={styles.hoursUserName}>{u.firstName}</span>
                      <span className={styles.hoursValue}>{u.hours}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.hoursDropdownItem}>Aún no hay tiempo registrado en esta tarea</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className={styles.chat}
        ref={chatRef}
        onScroll={() => {
          setActionMenuOpenId(null);
          console.log('Closed action menu on chat scroll');
        }}
      >
        {isLoading && (
          <div className={styles.loader}>
            <div className={styles.spinner} />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className={styles.noMessages}>No hay mensajes en esta conversación.</div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={styles.message}>
            <Image
              src={users.find((u) => u.id === message.senderId)?.imageUrl || '/default-image.png'}
              alt={message.senderName || 'Avatar del remitente'}
              width={46}
              height={46}
              className={styles.avatar}
            />
            <div className={styles.messageContent}>
              <div className={styles.messageHeader}>
                <div className={styles.sender}>{message.senderName}</div>
                <div className={styles.messageActions}>
                  <div className={styles.timestamp}>
                    {message.timestamp instanceof Timestamp
                      ? message.timestamp.toDate().toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : 'Sin fecha'}
                  </div>
                  {user?.id === message.senderId && (
                    <div className={styles.actionContainer}>
                      <button
                        className={styles.actionButton}
                        onClick={() => {
                          setActionMenuOpenId(actionMenuOpenId === message.id ? null : message.id);
                          setHasInteracted(true);
                        }}
                      >
                        <Image src="/elipsis.svg" alt="Acciones" width={16} height={16} />
                      </button>
                      {actionMenuOpenId === message.id && (
                        <div ref={actionMenuRef} className={styles.actionDropdown}>
                          {message.text && !message.text.startsWith('Añadó una entrada de tiempo de') && (
                            <div
                              className={styles.actionDropdownItem}
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditingText(message.text || '');
                                setActionMenuOpenId(null);
                              }}
                            >
                              Editar mensaje
                            </div>
                          )}
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
                  <button className={styles.editSaveButton} onClick={() => handleEditMessage(message.id)}>
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
                <>
                  {message.text && <div className={styles.text}>{message.text}</div>}
                  {(message.fileUrl || message.imageUrl) && (
                    <div className={styles.fileActionsRow}>
                      <button
                        className={styles.downloadButton}
                        onClick={() => window.open(message.imageUrl || message.fileUrl, '_blank')}
                        aria-label="Descargar archivo"
                      >
                        <Image src="/download.svg" alt="Descargar" width={16} height={16} />
                      </button>
                      {message.imageUrl ? (
                        <div className={styles.imageWrapper}>
                          <Image
                            src={message.imageUrl}
                            alt={message.fileName || 'Imagen'}
                            width={200}
                            height={200}
                            className={styles.image}
                            onClick={() => setImagePreviewSrc(message.imageUrl!)}
                            onError={(e) => {
                              e.currentTarget.src = '/default-image.png';
                              console.warn('Image load failed:', message.imageUrl);
                            }}
                          />
                          {message.fileName && (
                            <div className={styles.fileName}>
                              <Image src="/file.svg" alt="Archivo" width={16} height={16} />
                              {message.fileName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <a
                          href={message.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.file}
                          download={message.fileName}
                        >
                          <Image src="/file.svg" alt="Archivo" width={16} height={16} />
                          {message.fileName}
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        {typingUsers.length > 0 && (
          <div className={styles.typingIndicator}>
            <div className={styles.typingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>{users.find((u) => typingUsers.includes(u.id))?.firstName || 'Alguien'} está escribiendo...</span>
          </div>
        )}
      </div>
      <form
        className={`${styles.inputWrapper} ${isDragging ? styles.dragging : ''}`}
        ref={inputWrapperRef}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onSubmit={handleSendMessage}
      >
          <div ref={timerPanelRef} className={styles.timerPanel} id="timerPanel">          <div className={styles.timerPanelContent}>
            <div className={styles.timerRow}>
              <div className={styles.timerCard}>
                <TimePicker
                  onChange={(value: string | null) => setTimerInput(value || '00:00')}
                  value={timerInput}
                  format="HH:mm"
                  clockIcon={null}
                  clearIcon={null}
                  disableClock
                  locale="es-ES"
                  className={styles.timerInput}
                />
              </div>
              <div
                className={styles.timerCard}
                ref={datePickerWrapperRef}
                onMouseEnter={() => setIsCalendarOpen(true)}
                onMouseLeave={() => setTimeout(() => setIsCalendarOpen(false), 200)}
              >
                <DatePicker
                  selected={dateInput}
                  onChange={(date: Date | null) => setDateInput(date || new Date())}
                  dateFormat="dd/MM/yy"
                  className={styles.timerInput}
                  popperClassName={styles.calendarPopper}
                  onCalendarOpen={() => setIsCalendarOpen(true)}
                  onCalendarClose={() => setIsCalendarOpen(false)}
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
              <button className={styles.timerAddButton} onClick={handleAddTimeEntry}>
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
          {previewUrl && (
            <div className={styles.imagePreview}>
              <Image src={previewUrl} alt="Previsualización" width={50} height={50} className={styles.previewImage} />
              <button className={styles.removeImageButton} onClick={handleRemoveFile}>
                <Image src="/elipsis.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} />
              </button>
            </div>
          )}
          {file && !previewUrl && (
            <div className={styles.filePreview}>
              <Image src="/file.svg" alt="Archivo" width={16} height={16} />
              <span>{file.name}</span>
              <button className={styles.removeImageButton} onClick={handleRemoveFile}>
                <Image src="/elipsis.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} />
              </button>
            </div>
          )}
          <input
            type="text"
            placeholder="Escribe tu mensaje aquí"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
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
              <button className={styles.playStopButton} onClick={toggleTimer}>
                <Image
                  src={isTimerRunning ? '/Stop.svg' : '/Play.svg'}
                  alt={isTimerRunning ? 'Detener temporizador' : 'Iniciar temporizador'}
                  width={12}
                  height={12}
                />
              </button>
              <div ref={timerButtonRef} className={styles.timer} onClick={toggleTimerPanel}>
                <span>{formatTimer(timerSeconds)}</span>
                <Image src="/chevron-down.svg" alt="Abrir panel de temporizador" width={12} height={12} />
              </div>
            </div>
            <div style={{display:'flex', flexDirection: 'row', gap:'10px' }}>
            <button
              type="button"
              className={styles.imageButton}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Adjuntar archivo"
            >
              <Image src="/paperclip.svg" alt="Adjuntar" width={16} height={16} className={styles.iconInvert} />
            </button>
            <button
              className={styles.sendButton}
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && !file}
              aria-label="Enviar mensaje"
            >
              <Image src="/arrow-up.svg" alt="Enviar mensaje" width={13} height={13} />
            </button>

            </div>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileInputChange}
          aria-label="Seleccionar archivo"
        />
      </form>
      {isDeletePopupOpen && (
        <div className={styles.deletePopupOverlay}>
          <div className={styles.deletePopup} ref={deletePopupRef}>
            <div className={styles.deletePopupContent}>

              <div className={styles.deletePopupText}>
                <h2 className={styles.deletePopupTitle}>¿Seguro que quieres eliminar esta tarea?</h2>
                <p className={styles.deletePopupDescription}>
                  Eliminar esta tarea borrará permanentemente todas sus conversaciones y datos asociados. Se notificará a
                  todos los involucrados. <strong>Esta acción no se puede deshacer.</strong>
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
      {imagePreviewSrc && (
        <ImagePreviewOverlay
          src={imagePreviewSrc}
          alt="Vista previa de imagen"
          onClose={() => setImagePreviewSrc(null)}
        />
      )}
    </div>
  );
};

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;