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
  getDoc, 
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useUser } from '@clerk/nextjs';
import { gsap } from 'gsap';
import TimePicker from 'react-time-picker';
import DatePicker from 'react-datepicker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '@/lib/firebase';
import { deleteTask } from '@/lib/taskUtils';
import ImagePreviewOverlay from './ImagePreviewOverlay';
import { InputChat } from './ui/InputChat';
import styles from './ChatSidebar.module.scss';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | any;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
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
  const [isRefAttached, setIsRefAttached] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [task, setTask] = useState(initialTask);
  const [isHoursDropdownOpen, setIsHoursDropdownOpen] = useState(false);
  const [isResponsibleDropdownOpen, setIsResponsibleDropdownOpen] = useState(false);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const taskMenuRef = useRef<HTMLDivElement>(null);
  const deletePopupRef = useRef<HTMLDivElement>(null);
  const hoursDropdownRef = useRef<HTMLDivElement>(null);
  const responsibleDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const timerPanelRef = useRef<HTMLDivElement>(null);
  const timerButtonRef = useRef<HTMLDivElement>(null);
  const datePickerWrapperRef = useRef<HTMLDivElement>(null);
  const prevMessagesRef = useRef<Message[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMessagesRef = useRef<Map<string, string>>(new Map()); // Track pending message IDs to prevent duplicates

  // Check if sidebarRef is attached
  useEffect(() => {
    if (sidebarRef.current) {
      console.log('[ChatSidebar] sidebarRef.current attached:', sidebarRef.current);
      setIsRefAttached(true);
    } else {
      console.log('[ChatSidebar] sidebarRef.current not attached');
    }
  }, []);

  const isCreator = user?.id === task.CreatedBy;
  const isInvolved =
    user?.id &&
    (task.AssignedTo.includes(user.id) || task.LeadedBy.includes(user.id) || task.CreatedBy === user.id);
  const statusOptions = ['Por Iniciar', 'En Proceso', 'Diseño', 'Desarrollo', 'Backlog', 'Finalizado', 'Cancelado'];

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          setIsAdmin(userDoc.data().access === 'admin');
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('[ChatSidebar] Error fetching admin status:', error);
      }
    };
    fetchAdminStatus();
  }, [user?.id]);

  useEffect(() => {
    if (!task.id) {
      setIsLoading(false);
      return;
    }
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
            AssignedTo: doc.data().AssignedTo || [],
            CreatedBy: taskData.CreatedBy || '',
          });
        }
      },
      (error) => {
        console.error('[ChatSidebar] Error listening to task:', error);
      },
    );
    return () => unsubscribe();
  }, [task.id]);

  useEffect(() => {
    if (!task.id || !user?.id) {
      return;
    }
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
          } else {
            setTimerSeconds(timerData.accumulatedSeconds);
          }
        } else {
          setDoc(timerDocRef, {
            userId: user.id,
            isRunning: false,
            startTime: null,
            accumulatedSeconds: 0,
          }).catch((error) => {
            console.error('[ChatSidebar] Error initializing timer:', error);
          });
        }
      },
      (error) => {
        console.error('[ChatSidebar] Error listening to timer:', error);
      },
    );
    return () => unsubscribe();
  }, [task.id, user?.id, isTimerRunning]);

  useEffect(() => {
    if (!task.id) {
      return;
    }
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
      },
      (error) => {
        console.error('[ChatSidebar] Error listening to typing status:', error);
      },
    );
    return () => unsubscribe();
  }, [task.id, user?.id]);

  const handleTyping = useCallback(() => {
    if (!user?.id || !task.id) {
      return;
    }
    const typingDocRef = doc(db, `tasks/${task.id}/typing/${user.id}`);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setDoc(typingDocRef, {
      userId: user.id,
      isTyping: true,
      timestamp: Timestamp.now(),
    }).catch((error) => {
      console.error('[ChatSidebar] Error updating typing status:', error);
    });
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(typingDocRef, {
        userId: user.id,
        isTyping: false,
        timestamp: Timestamp.now(),
      }).catch((error) => {
        console.error('[ChatSidebar] Error stopping typing status:', error);
      });
    }, 3000);
  }, [user?.id, task.id]);

  useEffect(() => {
    if (sidebarRef.current) {
      if (isOpen) {
        gsap.fromTo(
          sidebarRef.current,
          { x: '100%', opacity: 0 },
          { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' },
        );
      } else {
        gsap.to(sidebarRef.current, {
          x: '100%',
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
      }
    }
  }, [isOpen, onClose]);

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
      }
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node) &&
        actionMenuOpenId
      ) {
        setActionMenuOpenId(null);
      }
      if (
        taskMenuRef.current &&
        !taskMenuRef.current.contains(event.target as Node) &&
        isTaskMenuOpen
      ) {
        setIsTaskMenuOpen(false);
      }
      if (
        deletePopupRef.current &&
        !deletePopupRef.current.contains(event.target as Node) &&
        isDeletePopupOpen
      ) {
        setIsDeletePopupOpen(false);
        setDeleteConfirm('');
      }
      if (
        hoursDropdownRef.current &&
        !hoursDropdownRef.current.contains(event.target as Node) &&
        isHoursDropdownOpen
      ) {
        setIsHoursDropdownOpen(false);
      }
      if (
        responsibleDropdownRef.current &&
        !responsibleDropdownRef.current.contains(event.target as Node) &&
        isResponsibleDropdownOpen
      ) {
        setIsResponsibleDropdownOpen(false);
      }
      if (
        teamDropdownRef.current &&
        !teamDropdownRef.current.contains(event.target as Node) &&
        isTeamDropdownOpen
      ) {
        setIsTeamDropdownOpen(false);
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
    isTeamDropdownOpen,
  ]);

  useEffect(() => {
    if (!task.id) {
      setIsLoading(false);
      return;
    }
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
        setMessages((prev) => {
          const pendingMessages = prev.filter((msg) => msg.isPending);
          // Only add new messages that aren't already pending or duplicates
          const uniqueMessages = newMessages.filter(
            (msg) => !pendingMessages.some((p) => p.id === msg.id) && !prev.some((m) => m.id === msg.id),
          );
          return [...pendingMessages, ...uniqueMessages];
        });
        setIsLoading(false);
      },
      (error) => {
        console.error('[ChatSidebar] Error fetching messages:', error);
        setIsLoading(false);
      },
    );
    return () => unsubscribe();
  }, [task.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      setHasInteracted(true);
      const unreadMessages = messages.filter((msg) => !msg.read && !msg.isPending);
      unreadMessages.forEach(async (msg) => {
        try {
          await updateDoc(doc(db, `tasks/${task.id}/messages`, msg.id), {
            read: true,
          });
        } catch (error) {
          console.error('[ChatSidebar] Error marking message as read:', error);
        }
      });
    }
  }, [isOpen, messages, user?.id, task.id]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/NotificationSound.mp3');
    }
    const newUnreadMessages = messages.filter(
      (msg) =>
        !msg.read &&
        !msg.isPending &&
        !prevMessagesRef.current.some(
          (prev) => prev.id === msg.id && prev.text === msg.text && prev.senderId === msg.senderId,
        ),
    );
    if (newUnreadMessages.length > 0 && user?.id && hasInteracted) {
      const latestMessage = newUnreadMessages[newUnreadMessages.length - 1];
      if (latestMessage.senderId !== user.id) {
        audioRef.current.play().catch((error) => {
          console.error('[ChatSidebar] Error playing notification sound:', error);
        });
      }
    }
    prevMessagesRef.current = messages;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [messages, user?.id, hasInteracted]);

  useEffect(() => {
    const handleScroll = () => {
      setActionMenuOpenId(null);
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

  useEffect(() => {
    if (chatRef.current) {
      const scrollToBottom = () => {
        chatRef.current!.scrollTop = chatRef.current!.scrollHeight;
      };
      requestAnimationFrame(scrollToBottom);
    }
  }, [messages, typingUsers]);

  useEffect(() => {
    if (actionMenuOpenId && actionMenuRef.current) {
      gsap.fromTo(
        actionMenuRef.current,
        { opacity: 0, y: -5, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [actionMenuOpenId]);

  useEffect(() => {
    if (isStatusDropdownOpen && statusDropdownRef.current) {
      gsap.fromTo(
        statusDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [isStatusDropdownOpen]);

  useEffect(() => {
    if (isTaskMenuOpen && taskMenuRef.current) {
      gsap.fromTo(
        taskMenuRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [isTaskMenuOpen]);

  useEffect(() => {
    if (isDeletePopupOpen && deletePopupRef.current) {
      gsap.fromTo(
        deletePopupRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
      );
      setDeleteConfirm('Eliminar');
    }
  }, [isDeletePopupOpen]);

  useEffect(() => {
    if (isHoursDropdownOpen && hoursDropdownRef.current) {
      gsap.fromTo(
        hoursDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [isHoursDropdownOpen]);

  useEffect(() => {
    if (isResponsibleDropdownOpen && responsibleDropdownRef.current) {
      gsap.fromTo(
        responsibleDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [isResponsibleDropdownOpen]);

  useEffect(() => {
    if (isTeamDropdownOpen && teamDropdownRef.current) {
      gsap.fromTo(
        teamDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [isTeamDropdownOpen]);

  useEffect(() => {
    if (timerPanelRef.current) {
      gsap.to(timerPanelRef.current, {
        height: isTimerPanelOpen ? 'auto' : 0,
        opacity: isTimerPanelOpen ? 1 : 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [isTimerPanelOpen]);

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
    if (!isCreator && !isAdmin) {
      return;
    }
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        status,
      });
      const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
      if (task.CreatedBy) recipients.add(task.CreatedBy);
      recipients.delete(user?.id || '');
      for (const recipientId of Array.from(recipients)) {
        await addDoc(collection(db, 'notifications'), {
          userId: user?.id,
          taskId: task.id,
          message: `${user?.firstName || 'Usuario'} cambió el estado de la tarea ${task.name} a ${status}`,
          timestamp: Timestamp.now(),
          read: false,
          recipientId,
        });
      }
    } catch (error) {
      console.error('[ChatSidebar] Error updating task status:', error);
    }
  };

  const handleEditTask = () => {
    if (!isCreator && !isAdmin) {
      return;
    }
    router.push(`/dashboard/edit-task?taskId=${task.id}`);
    setIsTaskMenuOpen(false);
  };

  const handleDeleteTask = async () => {
    if (!user?.id || deleteConfirm.toLowerCase() !== 'eliminar') {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteTask(task.id, user.id, isAdmin, task);
      setIsDeletePopupOpen(false);
      setDeleteConfirm('');
      onClose();
    } catch (error) {
      console.error('[ChatSidebar] Error deleting task:', error);
      alert(`Error al eliminar la tarea: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendMessage = async (
    messageData: Partial<Message>,
    isAudio = false,
    audioUrl?: string,
    duration?: number,
    tempId?: string,
  ) => {
    if (!user?.id) return;

    // If signaled to remove a failed message
    if (tempId && messageData.isPending && messageData.id) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      pendingMessagesRef.current.delete(tempId);
      return;
    }

    setIsSending(true);

    // Generate tempId if not provided
    const messageTempId = tempId || `temp-${Date.now()}-${Math.random()}`;
    if (!pendingMessagesRef.current.has(messageTempId)) {
      pendingMessagesRef.current.set(messageTempId, messageTempId);

      const optimisticMessage: Message = {
        id: messageTempId,
        senderId: user.id,
        senderName: user.firstName || 'Usuario',
        text: messageData.text || null,
        timestamp: Timestamp.fromDate(new Date()),
        read: false,
        imageUrl: messageData.imageUrl || null,
        fileUrl: messageData.fileUrl || audioUrl || null,
        fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
        fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
        filePath: messageData.filePath || null,
        hours: duration ? duration / 3600 : messageData.hours,
        isPending: true,
      };

      // Add optimistic message
      setMessages((prev) => [...prev, optimisticMessage]);
      setHasInteracted(true);

      try {
        const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
          ...messageData,
          senderId: user.id,
          senderName: user.firstName || 'Usuario',
          timestamp: serverTimestamp(),
          read: false,
        });

        // Update optimistic message with real ID
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageTempId
              ? {
                  ...msg,
                  id: docRef.id,
                  timestamp: serverTimestamp(),
                  isPending: false,
                }
              : msg,
          ),
        );
        pendingMessagesRef.current.delete(messageTempId);

        const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
        if (task.CreatedBy) recipients.add(task.CreatedBy);
        recipients.delete(user.id);
        for (const recipientId of recipients) {
          await addDoc(collection(db, 'notifications'), {
            userId: user.id,
            taskId: task.id,
            message: `${user.firstName || 'Usuario'} envió un mensaje en la tarea ${task.name}`,
            timestamp: Timestamp.now(),
            read: false,
            recipientId,
          });
        }
      } catch (error) {
        console.error('[ChatSidebar] Send message error:', error);
        setMessages((prev) => prev.filter((msg) => msg.id !== messageTempId));
        pendingMessagesRef.current.delete(messageTempId);
        alert('Error al enviar el mensaje');
      } finally {
        setIsSending(false);
      }
    } else {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!user?.id || !editingText.trim()) {
      return;
    }
    try {
      await updateDoc(doc(db, `tasks/${task.id}/messages`, messageId), {
        text: editingText.trim(),
        timestamp: Timestamp.now(),
      });
      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      console.error('[ChatSidebar] Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) {
      return;
    }
    try {
      const messageRef = doc(db, `tasks/${task.id}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        if (messageData.filePath) {
          try {
            const response = await fetch('/api/delete-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: messageData.filePath }),
            });
            if (!response.ok) {
              console.error('[ChatSidebar] Failed to delete GCS file:', await response.json());
            }
          } catch (error) {
            console.error('[ChatSidebar] Error deleting GCS file:', error);
          }
        }
      }
      await deleteDoc(messageRef);
      setActionMenuOpenId(null);
    } catch (error) {
      console.error('[ChatSidebar] Error deleting message:', error);
    }
  };

  const toggleTimer = async (e: React.MouseEvent) => {
    if (!user?.id || !task.id) {
      return;
    }
    handleClick(e.currentTarget as HTMLElement);
    const wasRunning = isTimerRunning;
    setIsTimerRunning((prev) => !prev);
    setHasInteracted(true);

    const timerDocRef = doc(db, `tasks/${task.id}/timers/${user.id}`);
    if (wasRunning && timerSeconds > 0) {
      const hours = timerSeconds / 3600;
      const displayHours = Math.floor(timerSeconds / 3600);
      const displayMinutes = Math.floor((timerSeconds % 3600) / 60);
      const timeEntry = `${displayHours}h ${displayMinutes}m`;
      const timestamp = Timestamp.now();

      try {
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
      } catch (error) {
        console.error('[ChatSidebar] Error adding time entry:', error);
      }
    } else if (!wasRunning) {
      try {
        await setDoc(timerDocRef, {
          userId: user.id,
          isRunning: true,
          startTime: Timestamp.now(),
          accumulatedSeconds: timerSeconds,
        });
      } catch (error) {
        console.error('[ChatSidebar] Error starting timer:', error);
      }
    }
  };

  const toggleTimerPanel = (e: React.MouseEvent) => {
    handleClick(e.currentTarget as HTMLElement);
    setIsTimerPanelOpen((prev) => !prev);
    setHasInteracted(true);
  };

  const handleAddTimeEntry = async () => {
    if (!user?.id) {
      alert('No se puede añadir la entrada de tiempo: usuario no autenticado.');
      return;
    }
    const [hours, minutes] = timerInput.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      alert('Por favor, introduce un formato de tiempo válido (HH:mm).');
      return;
    }
    const totalHours = hours + minutes / 60;
    const timeEntry = `${hours}h ${minutes}m`;
    const date = dateInput.toLocaleDateString('es-ES');

    try {
      const timestamp = Timestamp.now();
      await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: user.id,
        senderName: user.firstName || 'Usuario',
        text: `Añadó una entrada de tiempo de ${timeEntry} el ${date}`,
        timestamp,
        read: false,
        hours: totalHours,
      });
      if (commentInput.trim()) {
        await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId: user.id,
          senderName: user.firstName || 'Usuario',
          text: commentInput.trim(),
          timestamp: Timestamp.fromMillis(timestamp.toMillis() + 1),
          read: false,
        });
      }
      setTimerInput('00:00');
      setDateInput(new Date());
      setCommentInput('');
      setIsTimerPanelOpen(false);
      setIsCalendarOpen(false);
      setHasInteracted(true);
    } catch (error) {
      console.error('[ChatSidebar] Error adding time entry:', error);
      alert(`Error al añadir la entrada de tiempo: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
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
    const timeMessages = messages.filter((msg) => typeof msg.hours === 'number' && msg.hours > 0);
    let totalMinutes = 0;
    timeMessages.forEach((msg) => {
      totalMinutes += msg.hours * 60;
    });
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = Math.round(totalMinutes % 60);
    return `${totalHours}h ${remainingMinutes}m`;
  }, [messages]);

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

  const teamUsers = useMemo(() => {
    const teamUserIds = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
    return Array.from(teamUserIds).map((userId) => {
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
        role: task.LeadedBy.includes(userId) ? 'Responsable' : 'Asignado',
      };
    });
  }, [task.AssignedTo, task.LeadedBy, users]);

  const creator = users.find((u) => u.id === task.CreatedBy) || {
    fullName: 'Desconocido',
    firstName: 'Desconocido',
    imageUrl: '/default-image.png',
  };

  const renderMessageContent = (message: Message) => {
    if (message.imageUrl) {
      return (
        <div className={styles.imageWrapper}>
          <Image
            src={message.imageUrl}
            alt={message.fileName || 'Imagen'}
            width={200}
            height={200}
            className={styles.image}
            onClick={() => !message.isPending && setImagePreviewSrc(message.imageUrl!)}
            onError={(e) => console.warn('[ChatSidebar] Image load failed:', message.imageUrl)}
          />
        </div>
      );
    }
    if (message.fileUrl && message.fileType?.startsWith('audio/')) {
      return (
        <div className={styles.file}>
          <audio controls src={message.fileUrl} className="max-w-xs">
            Tu navegador no soporta el elemento de audio.
          </audio>
          {message.hours && (
            <span className={styles.timestamp}>
              {Math.floor((message.hours * 3600) / 60)}:{((message.hours * 3600) % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      );
    }
    if (message.fileUrl) {
      return (
        <div className={styles.file}>
          <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
            <Image src="/file.svg" alt="Archivo" width={16} height={16} />
            <span>{message.fileName}</span>
          </a>
        </div>
      );
    }
    if (message.text) {
      let text = message.text;
      const styles: React.CSSProperties = {};
      if (text.includes('**')) {
        text = text.replace(/\*\*(.*?)\*\*/g, '$1');
        styles.fontWeight = 'bold';
      }
      if (text.includes('*')) {
        text = text.replace(/\*(.*?)\*/g, '$1');
        styles.fontStyle = 'italic';
      }
      if (text.includes('__')) {
        text = text.replace(/__(.*?)__/g, '$1');
        styles.textDecoration = 'underline';
      }
      if (text.includes('`')) {
        text = text.replace(/`(.*?)`/g, '$1');
        styles.fontFamily = 'monospace';
        styles.backgroundColor = '#f3f4f6';
        styles.padding = '2px 4px';
        styles.borderRadius = '4px';
      }
      if (text.startsWith('- ')) {
        const items = text
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => line.replace(/^- /, ''));
        return (
          <ul className="list-disc pl-5">
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
      }
      if (text.match(/^\d+\. /)) {
        const items = text
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => line.replace(/^\d+\. /, ''));
        return (
          <ol className="list-decimal pl-5">
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
        );
      }
      return <span style={styles} >{text}</span>;
    }
    return null;
  };

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
            <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
          </div>
          <div className={styles.breadcrumb}>
            {clientName} {'>'} {task.project}
          </div>
          <div
            className={`${styles.elipsis} ${isCreator || isAdmin ? styles.clickable : styles.disabled}`}
            onClick={(e) => {
              if (isCreator || isAdmin) {
                handleClick(e.currentTarget);
                setIsTaskMenuOpen((prev) => !prev);
                setHasInteracted(true);
              }
            }}
          >
            <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
          </div>
          {isTaskMenuOpen && (isCreator || isAdmin) && (
            <div ref={taskMenuRef} className={styles.taskMenu}>
              <div className={styles.taskMenuItem} onClick={handleEditTask}>
                Editar Tarea
              </div>
              <div
                className={styles.taskMenuItem}
                onClick={() => {
                  setIsDeletePopupOpen(true);
                  setIsTaskMenuOpen(false);
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
            className={`${styles.card} ${isCreator || isAdmin ? styles.statusCard : ''}`}
            onMouseEnter={() => (isCreator || isAdmin) && setIsStatusDropdownOpen(true)}
            onMouseLeave={() => (isCreator || isAdmin) && setIsStatusDropdownOpen(false)}
          >
            <div className={styles.cardLabel}>Estado de la tarea:</div>
            <div className={styles.cardValue}>{task.status}</div>
            {isStatusDropdownOpen && (isCreator || isAdmin) && (
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
            onMouseEnter={() => isInvolved && setIsTeamDropdownOpen(true)}
            onMouseLeave={() => isInvolved && setIsTeamDropdownOpen(false)}
          >
            <div className={styles.cardLabel}>Equipo:</div>
            <div className={styles.cardValue}>{teamUsers.length} miembro(s)</div>
            {isTeamDropdownOpen && isInvolved && (
              <div ref={teamDropdownRef} className={styles.teamDropdown}>
                {teamUsers.length > 0 ? (
                  teamUsers.map((u) => (
                    <div key={u.id} className={styles.teamDropdownItem}>
                      <Image
                        src={u.imageUrl}
                        alt={u.firstName || 'Avatar del miembro'}
                        width={24}
                        height={24}
                        className={styles.avatar}
                      />
                      <span className={styles.teamUserName}>{u.firstName}</span>
                      <span className={styles.teamRole}>{u.role}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.teamDropdownItem}>No hay miembros asignados a esta tarea</div>
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
      <div className={styles.chat} ref={chatRef}>
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
              src={users.find((u) => u.id === message.senderId)?.imageUrl || '/default-avatar.png'}
              alt={message.senderName || 'Avatar del remitente'}
              width={46}
              height={46}
              className={styles.avatar}
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
                console.warn('[ChatSidebar] Avatar load failed:', message.senderId);
              }}
            />
            <div className={styles.messageContent}>
              <div className={styles.messageHeader}>
                <div className={styles.sender}>{message.senderName}</div>
                <div className={styles.timestampWrapper}>
                  <span className={styles.timestamp}>
                    {message.timestamp instanceof Timestamp
                      ? message.timestamp.toDate().toLocaleTimeString('es-ES')
                      : new Date(message.timestamp).toLocaleTimeString('es-ES')}
                  </span>
                  {user?.id === message.senderId && !message.isPending && (
                    <div className={styles.actionContainer}>
                      <button
                        className={styles.actionButton}
                        onClick={() => setActionMenuOpenId(actionMenuOpenId === message.id ? null : message.id)}
                      >
                        <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
                      </button>
                      {actionMenuOpenId === message.id && (
                        <div ref={actionMenuRef} className={styles.actionDropdown}>
                          <div
                            className={styles.actionDropdownItem}
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingText(message.text || '');
                              setActionMenuOpenId(null);
                            }}
                          >
                            Editar
                          </div>
                          <div
                            className={styles.actionDropdownItem}
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            Eliminar
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
                    autoFocus
                  />
                  <button
                    className={styles.editSaveButton}
                    onClick={() => handleEditMessage(message.id)}
                    disabled={!editingText.trim()}
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
                renderMessageContent(message)
              )}
              {message.read && (
                <div className={styles.readBy}>
                  Visto por {users.find((u) => u.id !== message.senderId)?.firstName || 'alguien'}
                </div>
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
      <div ref={timerPanelRef} className={styles.timerPanel} id="timerPanel">
        <div className={styles.timerPanelContent}>
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
            Has invertido: {Math.floor(timerSeconds / 3600)}h {Math.floor((timerSeconds % 3600) / 60)}m en esta tarea.
          </div>
          <div className={styles.timerActions}>
            <button type="button" className={styles.timerAddButton} onClick={handleAddTimeEntry}>
              Añadir entrada
            </button>
            <button
              type="button"
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
      {isRefAttached && (
        <InputChat
          taskId={task.id}
          userId={user?.id}
          userFirstName={user?.firstName}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          isSending={isSending}
          timerSeconds={timerSeconds}
          isTimerRunning={isTimerRunning}
          onToggleTimer={toggleTimer}
          onToggleTimerPanel={toggleTimerPanel}
          isTimerPanelOpen={isTimerPanelOpen}
          setIsTimerPanelOpen={setIsTimerPanelOpen}
          timerInput={timerInput}
          setTimerInput={setTimerInput}
          dateInput={dateInput}
          setDateInput={setDateInput}
          commentInput={commentInput}
          setCommentInput={setCommentInput}
          onAddTimeEntry={handleAddTimeEntry}
          containerRef={sidebarRef}
        />
      )}
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
                autoFocus
              />
              <div className={styles.deletePopupActions}>
                <button
                  className={styles.deleteConfirmButton}
                  onClick={handleDeleteTask}
                  disabled={deleteConfirm.toLowerCase() !== 'eliminar' || isDeleting}
                >
                  {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                </button>
                <button
                  className={styles.deleteCancelButton}
                  onClick={() => {
                    setIsDeletePopupOpen(false);
                    setDeleteConfirm('');
                  }}
                  disabled={isDeleting}
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