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
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<boolean>(false);
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [task, setTask] = useState(initialTask);
  const [isHoursDropdownOpen, setIsHoursDropdownOpen] = useState(false);
  const [isResponsibleDropdownOpen, setIsResponsibleDropdownOpen] = useState(false);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSending, setIsSending] = useState(false);
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
  const teamDropdownRef = useRef<HTMLDivElement>(null);
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

  // Fetch admin status
  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!user?.id) {
        console.warn('[ChatSidebar] No userId provided, skipping admin status fetch');
        setIsAdmin(false);
        return;
      }
      try {
        console.log('[ChatSidebar] Fetching admin status for user:', user.id);
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const access = userDoc.data().access;
          setIsAdmin(access === 'admin');
          console.log('[ChatSidebar] Admin status fetched:', {
            userId: user.id,
            access,
            isAdmin: access === 'admin',
          });
        } else {
          setIsAdmin(false);
          console.warn('[ChatSidebar] User document not found for ID:', user.id);
        }
      } catch (error) {
        console.error('[ChatSidebar] Error fetching admin status:', {
          error: error instanceof Error ? error.message : JSON.stringify(error),
          userId: user.id,
        });
        setIsAdmin(false);
      }
    };
    fetchAdminStatus();
  }, [user?.id]);

  // Real-time task listener
  useEffect(() => {
    if (!task.id) {
      console.warn('[ChatSidebar] No taskId provided for task listener');
      return;
    }

    console.log('[ChatSidebar] Setting up task listener for task:', task.id);
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
          console.log('[ChatSidebar] Task updated:', { taskId: doc.id, status: taskData.status });
        } else {
          console.warn('[ChatSidebar] Task document not found:', task.id);
        }
      },
      (error) => {
        console.error('[ChatSidebar] Error listening to task:', {
          error: error.message || 'Unknown error',
          code: error.code || 'No code',
          taskId: task.id,
        });
      },
    );

    return () => {
      console.log('[ChatSidebar] Unsubscribing task listener for task:', task.id);
      unsubscribe();
    };
  }, [task.id]);

  // Real-time timer listener
  useEffect(() => {
    if (!task.id || !user?.id) {
      console.warn('[ChatSidebar] No taskId or userId provided for timer listener');
      return;
    }

    console.log('[ChatSidebar] Setting up timer listener for user:', user.id, 'task:', task.id);
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
            console.log('[ChatSidebar] Timer synced:', { elapsedSeconds });
          } else {
            setTimerSeconds(timerData.accumulatedSeconds);
            console.log('[ChatSidebar] Timer stopped, accumulated:', timerData.accumulatedSeconds);
          }
        } else {
          setDoc(timerDocRef, {
            userId: user.id,
            isRunning: false,
            startTime: null,
            accumulatedSeconds: 0,
          }).catch((error) => {
            console.error('[ChatSidebar] Error initializing timer:', {
              error: error.message || 'Unknown error',
              code: error.code || 'No code',
              userId: user.id,
              taskId: task.id,
            });
          });
          console.log('[ChatSidebar] Initialized timer for user:', user.id);
        }
      },
      (error) => {
        console.error('[ChatSidebar] Error listening to timer:', {
          error: error.message || 'Unknown error',
          code: error.code || 'No code',
          userId: user.id,
          taskId: task.id,
        });
      },
    );

    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      console.log('[ChatSidebar] Unsubscribing timer listener for user:', user.id);
      unsubscribe();
      clearInterval(interval);
    };
  }, [task.id, user?.id, isTimerRunning]);

  // Real-time typing status listener
  useEffect(() => {
    if (!task.id) {
      console.warn('[ChatSidebar] No taskId provided for typing listener');
      return;
    }

    console.log('[ChatSidebar] Setting up typing listener for task:', task.id);
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
        console.log('[ChatSidebar] Typing users:', typing);
      },
      (error) => {
        console.error('[ChatSidebar] Error listening to typing status:', {
          error: error.message || 'Unknown error',
          code: error.code || 'No code',
          taskId: task.id,
        });
      },
    );

    return () => {
      console.log('[ChatSidebar] Unsubscribing typing listener for task:', task.id);
      unsubscribe();
    };
  }, [task.id, user?.id]);

  // Actualizar estado de escritura
  const handleTyping = useCallback(() => {
    if (!user?.id || !task.id) {
      console.warn('[ChatSidebar] No userId or taskId for typing update');
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
      console.error('[ChatSidebar] Error updating typing status:', {
        error: error.message || 'Unknown error',
        code: error.code || 'No code',
        userId: user.id,
        taskId: task.id,
      });
    });

    typingTimeoutRef.current = setTimeout(() => {
      setDoc(typingDocRef, {
        userId: user.id,
        isTyping: false,
        timestamp: Timestamp.now(),
      }).catch((error) => {
        console.error('[ChatSidebar] Error stopping typing status:', {
          error: error.message || 'Unknown error',
          code: error.code || 'No code',
          userId: user.id,
          taskId: task.id,
        });
      });
    }, 3000);

    console.log('[ChatSidebar] User typing:', user.id);
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
        console.log('[ChatSidebar] ChatSidebar opened');
      } else {
        gsap.to(sidebarRef.current, {
          x: '100%',
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
        console.log('[ChatSidebar] ChatSidebar closed');
      }
    } else {
      console.warn('[ChatSidebar] sidebarRef not found');
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
        console.log('[ChatSidebar] Closed ChatSidebar via outside click');
      }
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node) &&
        actionMenuOpenId
      ) {
        setActionMenuOpenId(null);
        console.log('[ChatSidebar] Closed message action menu via outside click');
      }
      if (
        taskMenuRef.current &&
        !taskMenuRef.current.contains(event.target as Node) &&
        isTaskMenuOpen
      ) {
        setIsTaskMenuOpen(false);
        console.log('[ChatSidebar] Closed task menu via outside click');
      }
      if (
        deletePopupRef.current &&
        !deletePopupRef.current.contains(event.target as Node) &&
        isDeletePopupOpen
      ) {
        setIsDeletePopupOpen(false);
        setDeleteConfirm('');
        console.log('[ChatSidebar] Closed delete popup via outside click');
      }
      if (
        hoursDropdownRef.current &&
        !hoursDropdownRef.current.contains(event.target as Node) &&
        isHoursDropdownOpen
      ) {
        setIsHoursDropdownOpen(false);
        console.log('[ChatSidebar] Closed hours dropdown via outside click');
      }
      if (
        responsibleDropdownRef.current &&
        !responsibleDropdownRef.current.contains(event.target as Node) &&
        isResponsibleDropdownOpen
      ) {
        setIsResponsibleDropdownOpen(false);
        console.log('[ChatSidebar] Closed responsible dropdown via outside click');
      }
      if (
        teamDropdownRef.current &&
        !teamDropdownRef.current.contains(event.target as Node) &&
        isTeamDropdownOpen
      ) {
        setIsTeamDropdownOpen(false);
        console.log('[ChatSidebar] Closed team dropdown via outside click');
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

  // Real-time messages listener
  useEffect(() => {
    if (!task.id) {
      console.warn('[ChatSidebar] No taskId provided for messages listener');
      setIsLoading(false);
      return;
    }

    console.log('[ChatSidebar] Setting up messages listener for task:', task.id);
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
        console.log('[ChatSidebar] Messages fetched:', {
          messageCount: newMessages.length,
          messageIds: newMessages.map((m) => m.id),
          taskId: task.id,
        });
        // Mantener mensajes optimistas que están pendientes
        setMessages((prev) => {
          const pendingMessages = prev.filter((msg) => msg.isPending);
          return [...pendingMessages, ...newMessages.filter((msg) => !msg.isPending)];
        });
        setIsLoading(false);
      },
      (error) => {
        console.error('[ChatSidebar] Error fetching messages:', {
          error: error.message || 'Unknown error',
          code: error.code || 'No code',
          taskId: task.id,
        });
        setIsLoading(false);
      },
    );

    return () => {
      console.log('[ChatSidebar] Unsubscribing messages listener for task:', task.id);
      unsubscribe();
    };
  }, [task.id]);

  // Mark messages as read when sidebar opens
  useEffect(() => {
    if (isOpen && user?.id) {
      console.log('[ChatSidebar] Checking unread messages for user:', user.id);
      setHasInteracted(true);
      const unreadMessages = messages.filter((msg) => !msg.read && !msg.isPending);
      console.log('[ChatSidebar] Unread messages:', {
        count: unreadMessages.length,
        messageIds: unreadMessages.map((m) => m.id),
      });
      unreadMessages.forEach(async (msg) => {
        try {
          console.log('[ChatSidebar] Marking message as read:', msg.id);
          await updateDoc(doc(db, `tasks/${task.id}/messages`, msg.id), {
            read: true,
          });
          console.log('[ChatSidebar] Message marked as read:', msg.id);
        } catch (error) {
          console.error('[ChatSidebar] Error marking message as read:', {
            error: error.message || 'Unknown error',
            code: error.code || 'No code',
            messageId: msg.id,
            taskId: task.id,
          });
        }
      });
    }
  }, [isOpen, messages, user?.id, task.id]);

  // Notification sound for new unread messages
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/NotificationSound.mp3');
      console.log('[ChatSidebar] Initialized audioRef');
    }

    console.log('[ChatSidebar] Sound useEffect triggered:', {
      messagesCount: messages.length,
      hasInteracted,
    });
    const newUnreadMessages = messages.filter(
      (msg) =>
        !msg.read &&
        !msg.isPending &&
        !prevMessagesRef.current.some(
          (prev) => prev.id === msg.id && prev.text === msg.text && prev.senderId === msg.senderId,
        ),
    );

    console.log('[ChatSidebar] New unread messages detected:', {
      count: newUnreadMessages.length,
      messageIds: newUnreadMessages.map((m) => m.id),
    });
    if (newUnreadMessages.length > 0 && user?.id && hasInteracted) {
      const latestMessage = newUnreadMessages[newUnreadMessages.length - 1];
      if (latestMessage.senderId !== user.id) {
        console.log('[ChatSidebar] Playing sound for new unread message:', {
          messageId: latestMessage.id,
          senderId: latestMessage.senderId,
        });
        audioRef.current.play().catch((error) => {
          console.error('[ChatSidebar] Error playing notification sound:', error.message);
        });
      } else {
        console.log('[ChatSidebar] Skipping sound: Message is from current user:', latestMessage.senderId);
      }
    } else {
      console.log('[ChatSidebar] No sound played:', {
        newUnreadMessagesCount: newUnreadMessages.length,
        userId: user?.id,
        hasInteracted,
      });
    }

    prevMessagesRef.current = messages;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        console.log('[ChatSidebar] Paused audioRef on cleanup');
      }
    };
  }, [messages, user?.id, hasInteracted]);

  // Scroll handling for closing action menu
  useEffect(() => {
    const handleScroll = () => {
      setActionMenuOpenId(null);
      console.log('[ChatSidebar] Closed action menu on scroll');
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
        console.log('[ChatSidebar] Scrolled to bottom of chat');
      }, 0);
    }
  }, [messages, typingUsers]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        console.log('[ChatSidebar] Revoked preview URL');
      }
    };
  }, [previewUrl]);

  // GSAP animations
  useEffect(() => {
    if (actionMenuOpenId && actionMenuRef.current) {
      gsap.fromTo(
        actionMenuRef.current,
        { opacity: 0, y: -5, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('[ChatSidebar] Action menu animated');
    }
  }, [actionMenuOpenId]);

  useEffect(() => {
    if (isStatusDropdownOpen && statusDropdownRef.current) {
      gsap.fromTo(
        statusDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('[ChatSidebar] Status dropdown animated');
    }
  }, [isStatusDropdownOpen]);

  useEffect(() => {
    if (isTaskMenuOpen && taskMenuRef.current) {
      gsap.fromTo(
        taskMenuRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('[ChatSidebar] Task menu animated');
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
      console.log('[ChatSidebar] Timer panel animated, open:', isTimerPanelOpen);
    }
  }, [isTimerPanelOpen]);

  useEffect(() => {
    if (isDeletePopupOpen && deletePopupRef.current) {
      gsap.fromTo(
        deletePopupRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
      );
      console.log('[ChatSidebar] Delete popup animated');
    }
  }, [isDeletePopupOpen]);

  useEffect(() => {
    if (isHoursDropdownOpen && hoursDropdownRef.current) {
      gsap.fromTo(
        hoursDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('[ChatSidebar] Hours dropdown animated');
    }
  }, [isHoursDropdownOpen]);

  useEffect(() => {
    if (isResponsibleDropdownOpen && responsibleDropdownRef.current) {
      gsap.fromTo(
        responsibleDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('[ChatSidebar] Responsible dropdown animated');
    }
  }, [isResponsibleDropdownOpen]);

  useEffect(() => {
    if (isTeamDropdownOpen && teamDropdownRef.current) {
      gsap.fromTo(
        teamDropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
      console.log('[ChatSidebar] Team dropdown animated');
    }
  }, [isTeamDropdownOpen]);

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
      console.warn('[ChatSidebar] Status change not allowed:', { isCreator, isAdmin, userId: user?.id });
      return;
    }

    try {
      console.log('[ChatSidebar] Changing task status to:', status);
      await updateDoc(doc(db, 'tasks', task.id), {
        status,
      });
      console.log('[ChatSidebar] Task status updated:', status);

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
      console.log('[ChatSidebar] Notifications sent for status change:', {
        recipientCount: recipients.size,
      });
    } catch (error) {
      console.error('[ChatSidebar] Error updating task status:', {
        error: error.message || 'Unknown error',
        code: error.code || 'No code',
        taskId: task.id,
      });
    }
  };

  const handleEditTask = () => {
    if (!isCreator && !isAdmin) {
      console.warn('[ChatSidebar] Edit task not allowed:', { isCreator, isAdmin });
      return;
    }
    console.log('[ChatSidebar] Navigating to edit task:', task.id);
    router.push(`/dashboard/edit-task?taskId=${task.id}`);
    setIsTaskMenuOpen(false);
  };

  const handleDeleteTask = async () => {
    if (!isCreator && !isAdmin || !user?.id || deleteConfirm.toLowerCase() !== 'eliminar') {
      console.warn('[ChatSidebar] Invalid task deletion attempt:', {
        isCreator,
        isAdmin,
        userId: user?.id,
        deleteConfirm,
      });
      return;
    }

    try {
      console.log('[ChatSidebar] Deleting task:', task.id);

      // Eliminar mensajes
      const messagesQuery = query(collection(db, `tasks/${task.id}/messages`));
      const messagesSnapshot = await getDocs(messagesQuery);
      await Promise.all(
        messagesSnapshot.docs.map(async (msgDoc) => {
          const msgData = msgDoc.data();
          if (msgData.filePath) {
            try {
              console.log('[ChatSidebar] Attempting to delete GCS file:', msgData.filePath);
              const response = await fetch('/api/delete-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: msgData.filePath }),
              });
              const responseData = await response.json();
              if (!response.ok) {
                console.error('[ChatSidebar] Failed to delete GCS file:', {
                  status: response.status,
                  error: responseData.error,
                  filePath: msgData.filePath,
                });
              } else {
                console.log('[ChatSidebar] Successfully deleted GCS file:', msgData.filePath);
              }
            } catch (err) {
              console.error('[ChatSidebar] Error deleting GCS file:', {
                error: err.message || 'Unknown error',
                code: err.code || 'No code',
                filePath: msgData.filePath,
              });
            }
          }
          await deleteDoc(doc(db, `tasks/${task.id}/messages`, msgDoc.id));
        }),
      );
      console.log('[ChatSidebar] Deleted messages for task:', task.id);

      // Eliminar timers
      const timersQuery = query(collection(db, `tasks/${task.id}/timers`));
      const timersSnapshot = await getDocs(timersQuery);
      await Promise.all(
        timersSnapshot.docs.map((timerDoc) => deleteDoc(doc(db, `tasks/${task.id}/timers`, timerDoc.id))),
      );
      console.log('[ChatSidebar] Deleted timers for task:', task.id);

      // Eliminar typing status
      const typingQuery = query(collection(db, `tasks/${task.id}/typing`));
      const typingSnapshot = await getDocs(typingQuery);
      await Promise.all(
        typingSnapshot.docs.map((typingDoc) => deleteDoc(doc(db, `tasks/${task.id}/typing`, typingDoc.id))),
      );
      console.log('[ChatSidebar] Deleted typing status for task:', task.id);

      // Eliminar notificaciones
      const notificationsQuery = query(collection(db, 'notifications'), where('taskId', '==', task.id));
      const notificationsSnapshot = await getDocs(notificationsQuery);
      await Promise.all(
        notificationsSnapshot.docs.map((notifDoc) => deleteDoc(doc(db, 'notifications', notifDoc.id))),
      );
      console.log('[ChatSidebar] Deleted notifications for task:', task.id);

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
      console.log('[ChatSidebar] Notifications sent for task deletion:', {
        recipientCount: recipients.size,
      });

      // Eliminar tarea
      await deleteDoc(doc(db, 'tasks', task.id));
      console.log('[ChatSidebar] Task deleted:', task.id);

      setIsDeletePopupOpen(false);
      setDeleteConfirm('');
      onClose();
    } catch (error) {
      console.error('[ChatSidebar] Error deleting task:', {
        error: error.message || 'Unknown error',
        code: error.code || 'No code',
        taskId: task.id,
      });
      alert('Error al eliminar la tarea');
    }
  };

  const selectFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      alert('El archivo supera los 10 MB.');
      console.log('[ChatSidebar] File too large:', f.size);
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
    console.log('[ChatSidebar] File selected:', { name: f.name, type: f.type, size: f.size });
  };

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && !f.name.includes('/paperclip.svg')) {
      selectFile(f);
    }
    if (e.target) e.target.value = '';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !f.name.includes('/paperclip.svg')) {
      selectFile(f);
    }
    console.log('[ChatSidebar] File dropped:', f?.name);
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
    console.log('[ChatSidebar] Removed selected file');
  };

  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!user?.id || (!newMessage.trim() && !file) || isSending) {
      console.warn('[ChatSidebar] Invalid message input:', {
        userId: user?.id,
        newMessage,
        hasFile: !!file,
        isSending,
      });
      return;
    }

    setIsSending(true);
    console.log('[ChatSidebar] Starting message send for task:', task.id);

    // Generar un ID temporal para el mensaje optimista
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: user.id,
      senderName: user.firstName || 'Usuario',
      text: newMessage.trim() || null,
      timestamp: Timestamp.fromDate(new Date()),
      read: false,
      imageUrl: file && file.type.startsWith('image/') ? previewUrl : null,
      fileUrl: file && !file.type.startsWith('image/') ? null : null,
      fileName: file ? file.name : null,
      fileType: file ? file.type : null,
      filePath: null,
      isPending: true,
    };

    // Añadir mensaje optimista a la lista
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setFile(null);
    setPreviewUrl(null);
    setHasInteracted(true);

    try {
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
          console.log('[ChatSidebar] File uploaded via API:', { url, fileName, fileType, filePath });

          messageData.fileName = fileName;
          messageData.fileType = fileType;
          messageData.filePath = filePath;

          if (file.type.startsWith('image/')) {
            messageData.imageUrl = url;
          } else {
            messageData.fileUrl = url;
          }
        } catch (error) {
          console.error('[ChatSidebar] Failed to upload file:', {
            error: error.message || 'Unknown error',
            code: error.code || 'No code',
            taskId: task.id,
            fileName: file.name,
          });
          // Eliminar mensaje optimista en caso de error
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
          alert('Error al subir el archivo');
          setIsSending(false);
          return;
        }
      }

      if (newMessage.trim()) {
        messageData.text = newMessage.trim();
      }

      // Guardar mensaje
      const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), messageData);
      console.log('[ChatSidebar] Message saved for task:', task.id, 'docId:', docRef.id);

      // Crear notificaciones
      const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
      if (task.CreatedBy) recipients.add(task.CreatedBy);
      recipients.delete(user.id);
      console.log('[ChatSidebar] Notification recipients:', Array.from(recipients));

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
          console.log('[ChatSidebar] Notification created for recipient:', recipientId);
        } catch (error) {
          console.error('[ChatSidebar] Failed to create notification:', {
            recipientId,
            error: error.message || 'Unknown error',
            code: error.code || 'No code',
          });
        }
      }

      console.log('[ChatSidebar] Message sent and notifications attempted');
    } catch (error) {
      console.error('[ChatSidebar] Send message error:', {
        error: error.message || 'Unknown error',
        code: error.code || 'No code',
        taskId: task.id,
      });
      // Eliminar mensaje optimista en caso de error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      alert('Error al enviar el mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!user?.id || !editingText.trim()) {
      console.warn('[ChatSidebar] Invalid edit attempt:', {
        userId: user?.id,
        messageId,
        editingText,
      });
      return;
    }

    try {
      console.log('[ChatSidebar] Editing message:', messageId);
      await updateDoc(doc(db, `tasks/${task.id}/messages`, messageId), {
        text: editingText.trim(),
        timestamp: Timestamp.now(),
      });
      setEditingMessageId(null);
      setEditingText('');
      console.log('[ChatSidebar] Message edited:', messageId);
    } catch (error) {
      console.error('[ChatSidebar] Error editing message:', {
        error: error.message || 'Unknown error',
        code: error.code || 'No code',
        messageId,
        taskId: task.id,
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) {
      console.warn('[ChatSidebar] No userId for message deletion:', { messageId });
      return;
    }

    try {
      console.log('[ChatSidebar] Deleting message:', messageId);
      const messageRef = doc(db, `tasks/${task.id}/messages`, messageId);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        if (messageData.filePath) {
          try {
            console.log('[ChatSidebar] Attempting to delete GCS file:', messageData.filePath);
            const response = await fetch('/api/delete-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: messageData.filePath }),
            });
            const responseData = await response.json();
            if (!response.ok) {
              console.error('[ChatSidebar] Failed to delete GCS file:', {
                status: response.status,
                error: responseData.error,
                filePath: messageData.filePath,
              });
            } else {
              console.log('[ChatSidebar] Successfully deleted GCS file:', messageData.filePath);
            }
          } catch (error) {
            console.error('[ChatSidebar] Error deleting GCS file:', {
              error: error.message || 'Unknown error',
              code: error.code || 'No code',
              filePath: messageData.filePath,
            });
          }
        }
      }
      await deleteDoc(messageRef);
      setActionMenuOpenId(null);
      console.log('[ChatSidebar] Message deleted:', messageId);
    } catch (error) {
      console.error('[ChatSidebar] Error deleting message:', {
        error: error.message || 'Unknown error',
        code: error.code || 'No code',
        messageId,
        taskId: task.id,
      });
    }
  };

  const toggleTimer = async (e: React.MouseEvent) => {
    if (!user?.id || !task.id) {
      console.warn('[ChatSidebar] No userId or taskId for timer toggle');
      return;
    }

    handleClick(e.currentTarget as HTMLElement);
    const wasRunning = isTimerRunning;
    setIsTimerRunning((prev) => !prev);
    setHasInteracted(true);
    console.log('[ChatSidebar] Timer toggled, running:', !wasRunning);

    const timerDocRef = doc(db, `tasks/${task.id}/timers/${user.id}`);
    if (wasRunning && timerSeconds > 0) {
      const hours = timerSeconds / 3600;
      const displayHours = Math.floor(timerSeconds / 3600);
      const displayMinutes = Math.floor((timerSeconds % 3600) / 60);
      const timeEntry = `${displayHours}h ${displayMinutes}m`;
      const timestamp = Timestamp.now();

      try {
        console.log('[ChatSidebar] Adding time entry:', { timeEntry, hours });
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
        console.log('[ChatSidebar] Time entry added and timer reset');
      } catch (error) {
        console.error('[ChatSidebar] Error adding time entry:', {
          error: error.message || 'Unknown error',
          code: error.code || 'No code',
          taskId: task.id,
        });
      }
    } else if (!wasRunning) {
      try {
        await setDoc(timerDocRef, {
          userId: user.id,
          isRunning: true,
          startTime: Timestamp.now(),
          accumulatedSeconds: timerSeconds,
        });
        console.log('[ChatSidebar] Timer started in Firestore');
      } catch (error) {
        console.error('[ChatSidebar] Error starting timer:', {
          error: error.message || 'Unknown error',
          code: error.code || 'No code',
          taskId: task.id,
        });
      }
    }
  };

  const toggleTimerPanel = (e: React.MouseEvent) => {
    handleClick(e.currentTarget as HTMLElement);
    setIsTimerPanelOpen((prev) => !prev);
    setHasInteracted(true);
    console.log('[ChatSidebar] Timer panel toggled');
  };

  const handleAddTimeEntry = async () => {
    if (!user?.id) {
      console.error('[ChatSidebar] No user ID available');
      alert('No se puede añadir la entrada de tiempo: usuario no autenticado.');
      return;
    }

    const [hours, minutes] = timerInput.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      console.error('[ChatSidebar] Invalid time input:', timerInput);
      alert('Por favor, introduce un formato de tiempo válido (HH:mm).');
      return;
    }

    const totalHours = hours + minutes / 60;
    const timeEntry = `${hours}h ${minutes}m`;
    const date = dateInput.toLocaleDateString('es-ES');

    try {
      console.log('[ChatSidebar] Adding manual time entry:', { timeEntry, date, totalHours, taskId: task.id });
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
      console.log('[ChatSidebar] Time entry message added successfully');

      // Add comment message if provided
      if (commentInput.trim()) {
        console.log('[ChatSidebar] Adding comment:', commentInput);
        await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId: user.id,
          senderName: user.firstName || 'Usuario',
          text: commentInput.trim(),
          timestamp: Timestamp.fromMillis(timestamp.toMillis() + 1),
          read: false,
        });
        console.log('[ChatSidebar] Comment message added successfully');
      }

      // Reset form state
      setTimerInput('00:00');
      setDateInput(new Date());
      setCommentInput('');
      setIsTimerPanelOpen(false);
      setIsCalendarOpen(false);
      setHasInteracted(true);
      console.log('[ChatSidebar] Manual time entry and comment processed successfully');
    } catch (error) {
      console.error('[ChatSidebar] Error adding time entry:', {
        error: error.message || 'Unknown error',
        code: error.code || 'No code',
        taskId: task.id,
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
    console.log('[ChatSidebar] Calculated total hours:', `${totalHours}h ${remainingMinutes}m`, {
      timeMessagesCount: timeMessages.length,
    });
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

  // Obtener equipo (AssignedTo + LeadedBy) para el dropdown
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
            className={`${styles.elipsis} ${isCreator || isAdmin ? styles.clickable : styles.disabled}`}
            onClick={(e) => {
              if (isCreator || isAdmin) {
                handleClick(e.currentTarget);
                setIsTaskMenuOpen((prev) => !prev);
                setHasInteracted(true);
                console.log('[ChatSidebar] Toggling task menu');
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
                  console.log('[ChatSidebar] Opened delete popup');
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
      <div
        className={styles.chat}
        ref={chatRef}
        onScroll={() => {
          setActionMenuOpenId(null);
          console.log('[ChatSidebar] Closed action menu on chat scroll');
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
                  {user?.id === message.senderId && !message.isPending && (
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
                      {!message.isPending && (
                        <button
                          className={styles.downloadButton}
                          onClick={() => window.open(message.imageUrl || message.fileUrl, '_blank')}
                          aria-label="Descargar archivo"
                        >
                          <Image src="/download.svg" alt="Descargar" width={16} height={16} />
                        </button>
                      )}
                      {message.imageUrl ? (
                        <div className={styles.imageWrapper}>
                          <Image
                            src={message.imageUrl}
                            alt={message.fileName || 'Imagen'}
                            width={200}
                            height={200}
                            className={styles.image}
                            onClick={() => !message.isPending && setImagePreviewSrc(message.imageUrl!)}
                            onError={(e) => {
                              e.currentTarget.src = '/default-image.png';
                              console.warn('[ChatSidebar] Image load failed:', message.imageUrl);
                            }}
                          />
                          {message.isPending && (
                            <div className={styles.imageLoader}>
                              <div className={styles.spinner} />
                            </div>
                          )}
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
              if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            className={styles.input}
            disabled={isSending}
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
            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
              <button
                type="button"
                className={styles.imageButton}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Adjuntar archivo"
                disabled={isSending}
              >
                <Image src="/paperclip.svg" alt="Adjuntar" width={16} height={16} className={styles.iconInvert} />
              </button>
              <button
                className={styles.sendButton}
                onClick={handleSendMessage}
                disabled={isSending || (!newMessage.trim() && !file)}
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
          disabled={isSending}
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
                    console.log('[ChatSidebar] Cancelled task deletion');
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