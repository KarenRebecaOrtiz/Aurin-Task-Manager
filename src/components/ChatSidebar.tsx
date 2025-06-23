'use client';

import { useState, useEffect, useRef, useMemo, useCallback, memo, forwardRef, Dispatch } from 'react';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
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
import { db } from '@/lib/firebase';
import { deleteTask } from '@/lib/taskUtils';
import ImagePreviewOverlay from './ImagePreviewOverlay';
import InputChat from './ui/InputChat';
import styles from './ChatSidebar.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import Loader from '@/components/Loader';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from '@firebase/ai';
import { ai } from '@/lib/firebase';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | Date | null;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
  hasError?: boolean;
  clientId: string;
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
}

interface MessageItemProps {
  message: Message;
  users: { id: string; fullName: string; firstName?: string; imageUrl: string }[];
  userId: string | undefined;
  styles: typeof styles;
  setActionMenuOpenId: Dispatch<React.SetStateAction<string | null>>;
  actionMenuOpenId: string | null;
  setEditingMessageId: Dispatch<React.SetStateAction<string | null>>;
  setEditingText: Dispatch<React.SetStateAction<string>>;
  handleEditMessage: (messageId: string) => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  handleResendMessage: (message: Message) => Promise<void>;
  setImagePreviewSrc: Dispatch<React.SetStateAction<string | null>>;
  editingMessageId: string | null;
  editingText: string;
}

const MessageItem = memo(
  forwardRef<HTMLDivElement, MessageItemProps>(
    (
      {
        message,
        users,
        userId,
        styles,
        setActionMenuOpenId,
        actionMenuOpenId,
        setEditingMessageId,
        setEditingText,
        handleEditMessage,
        handleDeleteMessage,
        handleResendMessage,
        setImagePreviewSrc,
        editingMessageId,
        editingText,
      },
      ref,
    ) => {
      const actionMenuRef = useRef<HTMLDivElement>(null);
      const renderMessageContent = useCallback(() => {
        if (message.imageUrl) {
          return (
            <div className={styles.imageWrapper}>
              <Image
                src={message.imageUrl}
                alt={message.fileName || 'Imagen'}
                width={200}
                height={200}
                className={`${styles.image} ${message.isPending ? styles.pendingImage : ''}`}
                onClick={() => !message.isPending && setImagePreviewSrc(message.imageUrl!)}
                onError={() => console.warn('Image load failed', message.imageUrl)}
              />
              {message.isPending && (
                <div className={styles.imageLoader}>
                  <svg width="24" height="24" viewBox="0 0 24 24" className="animate-spin">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="opacity-25"
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      className="opacity-75"
                    />
                  </svg>
                </div>
              )}
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
          // Configure sanitize-html to allow Tiptap's common HTML tags and attributes
          const sanitizeOptions = {
            allowedTags: [
              'p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'code', 'span', 'div'
            ],
            allowedAttributes: {
              '*': ['style', 'class']
            },
            transformTags: {
              // Apply consistent styling for Tiptap tags
              'strong': (tagName: string, attribs: Record<string, string>) => ({
                tagName,
                attribs: {
                  ...attribs,
                  style: `font-weight: bold; ${attribs.style || ''}`
                }
              }),
              'em': (tagName: string, attribs: Record<string, string>) => ({
                tagName,
                attribs: {
                  ...attribs,
                  style: `font-style: italic; ${attribs.style || ''}`
                }
              }),
              'u': (tagName: string, attribs: Record<string, string>) => ({
                tagName,
                attribs: {
                  ...attribs,
                  style: `text-decoration: underline; ${attribs.style || ''}`
                }
              }),
              'code': (tagName: string, attribs: Record<string, string>) => ({
                tagName,
                attribs: {
                  ...attribs,
                  style: `font-family: monospace; background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; ${attribs.style || ''}`
                }
              }),
              'ul': (tagName: string, attribs: Record<string, string>) => ({
                tagName,
                attribs: {
                  ...attribs,
                  class: `list-disc pl-5 ${attribs.class || ''}`
                }
              }),
              'ol': (tagName: string, attribs: Record<string, string>) => ({
                tagName,
                attribs: {
                  ...attribs,
                  class: `list-decimal pl-5 ${attribs.class || ''}`
                }
              })
            }
          };

          // Sanitize the HTML content
          const sanitizedHtml = sanitizeHtml(message.text, sanitizeOptions);

          return (
            <div 
              className={styles.messageText}
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          );
        }
        return null;
      }, [message, setImagePreviewSrc, styles]);

      return (
        <div
          ref={ref}
          className={`${styles.message} ${message.isPending ? styles.pending : ''} ${
            message.hasError && message.senderId === userId ? styles.error : ''
          }`}
        >
          <Image
            src={users.find((u) => u.id === message.senderId)?.imageUrl || ''}
            alt={message.senderName || 'Avatar del remitente'}
            width={46}
            height={46}
            className={styles.avatar}
            onError={(e) => {
              e.currentTarget.src = '';
            }}
          />
          <div className={styles.messageContent}>
            <div className={styles.messageHeader}>
              <div className={styles.sender}>{message.senderName}</div>
              <div className={styles.timestampWrapper}>
                <span className={styles.timestamp}>
                  {(message.timestamp instanceof Timestamp
                    ? message.timestamp.toDate()
                    : message.timestamp instanceof Date
                    ? message.timestamp
                    : new Date()
                  ).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Mexico_City',
                  })}
                </span>
                {userId === message.senderId && !message.isPending && (
                  <div className={styles.actionContainer}>
                    <button
                      className={styles.actionButton}
                      onClick={() => setActionMenuOpenId(actionMenuOpenId === message.id ? null : message.id)}
                    >
                      <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
                    </button>
                    {actionMenuOpenId === message.id && (
                      <div ref={actionMenuRef} className={styles.actionDropdown}>
                        {!message.hours && !message.hasError && (
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
                        )}
                        {message.hasError && (
                          <div
                            className={styles.actionDropdownItem}
                            onClick={() => {
                              handleResendMessage(message);
                              setActionMenuOpenId(null);
                            }}
                          >
                            Reenviar
                          </div>
                        )}
                        <div
                          className={styles.actionDropdownItem}
                          onClick={() => {
                            handleDeleteMessage(message.id);
                            setActionMenuOpenId(null);
                          }}
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
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className={styles.editInput}
                  autoFocus
                  rows={3}
                  style={{ resize: 'vertical', minHeight: '36px', maxHeight: '200px' }}
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
              renderMessageContent()
            )}
          </div>
        </div>
      );
    },
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.isPending === nextProps.message.isPending &&
      prevProps.message.hasError === nextProps.message.hasError &&
      prevProps.message.text === nextProps.message.text &&
      prevProps.actionMenuOpenId === nextProps.actionMenuOpenId &&
      prevProps.editingMessageId === nextProps.editingMessageId &&
      prevProps.editingText === nextProps.editingText
    );
  },
);

// Caché para mensajes con error
const getCachedMessages = (taskId: string) => {
  try {
    const cached = localStorage.getItem(`failedMessages_${taskId}`);
    if (!cached) return [];
    const parsed = JSON.parse(cached) as Message[];
    return parsed.filter(
      (msg) =>
        msg.timestamp &&
        (msg.timestamp instanceof Timestamp ||
          (msg.timestamp instanceof Date && !isNaN(msg.timestamp.getTime()))),
    );
  } catch (error) {
    console.error('Error parsing cached messages', error);
    return [];
  }
};

const saveCachedMessage = (taskId: string, message: Message) => {
  try {
    const cached = getCachedMessages(taskId);
    // Evitar duplicados por clientId
    if (!cached.some((msg) => msg.clientId === message.clientId)) {
      cached.push(message);
      localStorage.setItem(`failedMessages_${taskId}`, JSON.stringify(cached));
    }
  } catch (error) {
    console.error('Error saving to localStorage', error);
  }
};

const removeCachedMessage = (taskId: string, clientId: string) => {
  try {
    const cached = getCachedMessages(taskId);
    const updated = cached.filter((msg: Message) => msg.clientId !== clientId);
    localStorage.setItem(`failedMessages_${taskId}`, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing from localStorage', error);
  }
};

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  task: initialTask,
  clientName,
  users = [],
}) => {
  const { user } = useUser();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { isAdmin, isLoading } = useAuth();
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
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [task, setTask] = useState(initialTask);
  const [activeCardDropdown, setActiveCardDropdown] = useState<'status' | 'team' | 'hours' | null>(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSummarizeDropdownOpen, setIsSummarizeDropdownOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const taskMenuRef = useRef<HTMLDivElement>(null);
  const deletePopupRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const hoursDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const timerPanelRef = useRef<HTMLDivElement>(null);
  const summarizeDropdownRef = useRef<HTMLDivElement>(null);
  const prevMessagesRef = useRef<Message[]>([]);

  const isCreator = user?.id === task.CreatedBy;
  const isInvolved =
    user?.id &&
    (task.AssignedTo.includes(user.id) || task.LeadedBy.includes(user.id) || task.CreatedBy === user.id);
  const statusOptions = ['Por Iniciar', 'En Proceso', 'Diseño', 'Desarrollo', 'Backlog', 'Finalizado', 'Cancelado'];

  // Función para detectar si es móvil
  const isMobile = () => window.innerWidth < 768;

  // Función para bloquear/desbloquear scroll del body
  const toggleBodyScroll = (disable: boolean) => {
    if (typeof document !== 'undefined') {
      if (disable) {
        // Guardar la posición actual del scroll
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        // Guardar la posición en un atributo para restaurarla después
        document.body.setAttribute('data-scroll-y', scrollY.toString());
      } else {
        // Restaurar el scroll del body
        const scrollY = document.body.getAttribute('data-scroll-y');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.removeAttribute('data-scroll-y');
        // Restaurar la posición del scroll
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY));
        }
      }
    }
  };

  useEffect(() => {
    // Bloquear/desbloquear scroll cuando el sidebar se abre/cierra
    toggleBodyScroll(isOpen);
    
    // Cleanup: asegurar que el scroll se restaure al desmontar el componente
    return () => {
      if (isOpen) {
        toggleBodyScroll(false);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  useEffect(() => {
    if (!task.id) {
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
            AssignedTo: taskData.AssignedTo || [],
            CreatedBy: taskData.CreatedBy || '',
          });
        }
      },
      (error) => {
        console.error('Error listening to task', error);
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
            console.error('Error initializing timer', error);
          });
        }
      },
      (error) => {
        console.error('Error listening to timer', error);
      },
    );
    return () => unsubscribe();
  }, [task.id, user?.id]);

  useEffect(() => {
    if (sidebarRef.current) {
      const mobile = isMobile();
      if (isOpen) {
        gsap.fromTo(
          sidebarRef.current,
          mobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
          mobile ? { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' } : { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' },
        );
      } else {
        gsap.to(sidebarRef.current, {
          ...(mobile ? { y: '100%' } : { x: '100%' }),
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
      }
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && messages.length > 0 && lastMessageRef.current) {
      const timer = setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 350); // Slightly longer than the sidebar animation (300ms)
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isOpen) {
        const mobile = isMobile();
        gsap.to(sidebarRef.current, {
          ...(mobile ? { y: '100%' } : { x: '100%' }),
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
        activeCardDropdown === 'status' &&
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveCardDropdown(null);
      }
      if (
        activeCardDropdown === 'team' &&
        teamDropdownRef.current &&
        !teamDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveCardDropdown(null);
      }
      if (
        activeCardDropdown === 'hours' &&
        hoursDropdownRef.current &&
        !hoursDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveCardDropdown(null);
      }
      if (
        summarizeDropdownRef.current &&
        !summarizeDropdownRef.current.contains(event.target as Node) &&
        isSummarizeDropdownOpen
      ) {
        setIsSummarizeDropdownOpen(false);
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
    activeCardDropdown,
    isSummarizeDropdownOpen,
  ]);

  useEffect(() => {
    if (!task.id) {
      return;
    }
    const cachedMessages = getCachedMessages(task.id);
    if (cachedMessages.length > 0) {
      setMessages((prev) => {
        const messageMap = new Map<string, Message>(prev.map((msg) => [msg.id, msg]));
        cachedMessages.forEach((msg: Message) => {
          if (!messageMap.has(msg.id) && msg.timestamp) {
            messageMap.set(msg.id, {
              ...msg,
              timestamp: msg.timestamp instanceof Timestamp ? msg.timestamp : new Date(msg.timestamp),
            });
          }
        });
        return Array.from(messageMap.values()).sort((a, b) => {
          const aTime = a.timestamp
            ? a.timestamp instanceof Timestamp
              ? a.timestamp.toDate().getTime()
              : a.timestamp.getTime()
            : 0;
          const bTime = b.timestamp
            ? b.timestamp instanceof Timestamp
              ? b.timestamp.toDate().getTime()
              : b.timestamp.getTime()
            : 0;
          return aTime - bTime;
        });
      });
    }

    const messagesQuery = query(collection(db, `tasks/${task.id}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const newMessages: Message[] = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            if (!data.timestamp) {
              console.warn(`Mensaje con ID ${doc.id} tiene timestamp inválido: ${data.timestamp}`);
              return null;
            }
            return {
              id: doc.id,
              senderId: data.senderId,
              senderName: data.senderName,
              text: data.text,
              timestamp: data.timestamp,
              read: data.read || false,
              hours: data.hours,
              imageUrl: data.imageUrl || null,
              fileUrl: data.fileUrl || null,
              fileName: data.fileName || null,
              fileType: data.fileType || null,
              filePath: data.filePath || null,
              clientId: crypto.randomUUID(),
              isPending: false,
              hasError: false,
            };
          })
          .filter((msg) => msg !== null);
        setMessages((prev) => {
          const messageMap = new Map<string, Message>();
          prev.forEach((msg) => messageMap.set(msg.id, msg));
          newMessages.forEach((msg) => {
            if (!messageMap.has(msg.id)) {
              messageMap.set(msg.id, msg);
            }
          });
          const updatedMessages = Array.from(messageMap.values()).sort((a, b) => {
            const aTime = a.timestamp
              ? a.timestamp instanceof Timestamp
                ? a.timestamp.toDate().getTime()
                : a.timestamp.getTime()
              : 0;
            const bTime = b.timestamp
              ? b.timestamp instanceof Timestamp
                ? b.timestamp.toDate().getTime()
                : b.timestamp.getTime()
              : 0;
            return aTime - bTime;
          });
          return updatedMessages;
        });
      },
      (error) => {
        console.error('Error fetching messages', error);
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
          console.error('Error marking message as read', error);
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
          console.error('Error playing notification sound', error);
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
    if (lastMessageRef.current && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Solo hacer scroll si el último mensaje es nuevo (enviado o recibido)
      if (lastMessage.isPending || !prevMessagesRef.current.some((prev) => prev.id === lastMessage.id)) {
        lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

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
    if (actionMenuOpenId && actionMenuRef.current) {
      gsap.fromTo(
        actionMenuRef.current,
        { opacity: 0, y: -5, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [actionMenuOpenId]);

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
      console.error('Error updating task status', error);
    }
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
      console.error('Error deleting task', error);
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
  ) => {
    if (!user?.id || isSending) {
      return;
    }
    setIsSending(true);
  
    const clientId = messageData.clientId || crypto.randomUUID();
    const tempId = messageData.id || `temp-${clientId}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: user.id,
      senderName: user.firstName || 'Usuario',
      text: messageData.text || null,
      timestamp: new Date(),
      read: false,
      imageUrl: messageData.imageUrl || null,
      fileUrl: messageData.fileUrl || audioUrl || null,
      fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
      fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
      filePath: messageData.filePath || null,
      hours: duration ? duration / 3600 : undefined,
      isPending: messageData.isPending !== undefined ? messageData.isPending : true,
      hasError: messageData.hasError || false,
      clientId,
    };
  
    // Update or add the message
    setMessages((prev) => {
      const existingIndex = prev.findIndex((msg) => msg.clientId === clientId);
      if (existingIndex !== -1) {
        // Update existing message
        const updatedMessages = [...prev];
        updatedMessages[existingIndex] = { ...optimisticMessage };
        return updatedMessages;
      }
      // Add new message
      return [...prev, optimisticMessage];
    });
  
    setHasInteracted(true);
  
    // Skip Firestore update if the message is just an optimistic update (still pending)
    if (messageData.isPending) {
      setIsSending(false);
      return;
    }
  
    try {
      const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: user.id,
        senderName: user.firstName || 'Usuario',
        text: messageData.text || null,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: messageData.imageUrl || null,
        fileUrl: messageData.fileUrl || audioUrl || null,
        fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
        fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
        filePath: messageData.filePath || null,
        ...(duration && { hours: duration / 3600 }),
      });
  
      setMessages((prev) =>
        prev.map((msg) =>
          msg.clientId === clientId
            ? { ...msg, id: docRef.id, isPending: false, timestamp: Timestamp.now() }
            : msg,
        ),
      );
      removeCachedMessage(task.id, clientId);
    } catch (error) {
      console.error('Send message error', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.clientId === clientId
            ? { ...msg, isPending: false, hasError: true }
            : msg,
        ),
      );
      saveCachedMessage(task.id, { ...optimisticMessage, isPending: false, hasError: true });
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!user?.id || !editingText.trim()) {
      alert('El mensaje no puede estar vacío.');
      return;
    }
    try {
      await updateDoc(doc(db, `tasks/${task.id}/messages`, messageId), {
        text: editingText.trim(),
        timestamp: Timestamp.now(),
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, text: editingText.trim(), timestamp: Timestamp.now() }
            : msg,
        ),
      );
      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Error al editar el mensaje. Verifica que seas el autor del mensaje o intenta de nuevo.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) {
      console.log('[ChatSidebar:DeleteMessage] No user ID, aborting delete');
      return;
    }
    try {
      console.log('[ChatSidebar:DeleteMessage] Deleting message', messageId);
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
              console.error('[ChatSidebar:DeleteMessage] Failed to delete GCS file', await response.json());
            } else {
              console.log('[ChatSidebar:DeleteMessage] GCS file deleted successfully');
            }
          } catch (error) {
            console.error('[ChatSidebar:DeleteMessage] Error deleting GCS file', error);
          }
        }
      }
      await deleteDoc(messageRef);
      setActionMenuOpenId(null);
      setMessages((prev) => {
        const updated = prev.filter((msg) => msg.id !== messageId);
        const deletedMessage = prev.find((msg) => msg.id === messageId);
        if (deletedMessage?.hasError) {
          removeCachedMessage(task.id, deletedMessage.clientId);
        }
        return updated;
      });
      console.log('[ChatSidebar:DeleteMessage] Message deleted successfully');
    } catch (error) {
      console.error('[ChatSidebar:DeleteMessage] Error deleting message', error);
    }
  };

  const handleResendMessage = async (message: Message) => {
    if (!user?.id || isSending) {
      return;
    }
    setIsSending(true);

    const newTempId = `temp-${Date.now()}-${Math.random()}`;
    const newClientId = crypto.randomUUID();
    const resendMessage: Message = {
      ...message,
      id: newTempId,
      clientId: newClientId,
      timestamp: Timestamp.fromDate(new Date()),
      isPending: true,
      hasError: false,
    };

    setMessages((prev) => {
      const updated = prev.filter((msg) => msg.clientId !== message.clientId);
      return [...updated, resendMessage];
    });

    try {
      const docRef = await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: message.imageUrl,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileType: message.fileType,
        filePath: message.filePath,
        ...(message.hours && { hours: message.hours }),
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newTempId
            ? { ...msg, id: docRef.id, isPending: false, timestamp: Timestamp.now() }
            : msg,
        ),
      );
      removeCachedMessage(task.id, message.clientId);
    } catch (error) {
      console.error('Resend message error', error);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === newTempId) {
            const failedMessage = { ...msg, isPending: false, hasError: true };
            saveCachedMessage(task.id, failedMessage);
            return failedMessage;
          }
          return msg;
        }),
      );
      alert('Error al reenviar el mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const toggleTimer = async (_e: React.MouseEvent) => {
    if (!user?.id || !task.id) {
      return;
    }
    handleClick(_e.currentTarget as HTMLElement);
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
        console.error('Error adding time entry', error);
      }
    } else if (!wasRunning) {
      try {
        await setDoc(timerDocRef, {
          userId: user.id,
          isRunning: true,
          accumulatedSeconds: timerSeconds,
        });
      } catch (error) {
        console.error('Error starting timer', error);
      }
    }
  };

  const toggleTimerPanel = (_e: React.MouseEvent) => {
    if (isSending) return;
    _e.stopPropagation();
    setIsTimerPanelOpen((prev) => !prev);
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
    const date = dateInput.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });

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
      setHasInteracted(true);
    } catch (error) {
      console.error('Error adding time entry', error);
      alert(`Error al añadir la entrada de tiempo: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
  };

  const totalHours = useMemo(() => {
    const timeMessages = messages.filter((msg) => typeof msg.hours === 'number' && msg.hours > 0);
    let totalMinutes = 0;
    timeMessages.forEach((msg) => {
      totalMinutes += msg.hours! * 60;
    });
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = Math.round(totalMinutes % 60);
    return `${totalHours}h ${remainingMinutes}m`;
  }, [messages]);

  const hoursByUser = useMemo(() => {
    const timeMessages = messages.filter((msg) => typeof msg.hours === 'number' && msg.hours > 0);
    const hoursMap: { [userId: string]: number } = {};
    timeMessages.forEach((msg) => {
      hoursMap[msg.senderId] = (hoursMap[msg.senderId] || 0) + msg.hours!;
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

  const handleGenerateSummary = async (interval: string) => {
    if (!user?.id || !messages.length || isGeneratingSummary) return;

    setIsGeneratingSummary(true);
    setIsSummarizeDropdownOpen(false);
    
    try {
      if (!ai) {
        throw new Error('🤖 El servicio de Gemini AI no está disponible en este momento.');
      }

      const now = new Date();
      let startDate: Date;
      
      switch (interval) {
        case '1day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '3days':
          startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case '1week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '6months':
          startDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 1000);
          break;
        case '1year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      const filteredMessages = messages.filter(msg => {
        if (!msg.timestamp) return false;
        const msgDate = msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(msg.timestamp);
        return msgDate >= startDate;
      });

      if (filteredMessages.length === 0) {
        alert('No hay mensajes en el intervalo de tiempo seleccionado.');
        return;
      }

      const chatContext = filteredMessages
        .map(msg => {
          const date = msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(msg.timestamp);
          const timeStr = date.toLocaleDateString('es-MX') + ' ' + date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
          
          if (msg.hours) {
            return `[${timeStr}] ${msg.senderName}: Registró ${Math.floor(msg.hours)}h ${Math.round((msg.hours % 1) * 60)}m de tiempo en la tarea`;
          } else if (msg.text) {
            return `[${timeStr}] ${msg.senderName}: ${msg.text}`;
          } else if (msg.imageUrl) {
            return `[${timeStr}] ${msg.senderName}: Compartió una imagen (${msg.fileName || 'imagen'})`;
          } else if (msg.fileUrl) {
            return `[${timeStr}] ${msg.senderName}: Compartió un archivo (${msg.fileName || 'archivo'})`;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');

      const intervalLabels = {
        '1day': 'último día',
        '3days': 'últimos 3 días', 
        '1week': 'última semana',
        '1month': 'último mes',
        '6months': 'últimos 6 meses',
        '1year': 'último año'
      };

      const prompt = `Como experto analista de proyectos, genera un resumen ejecutivo y detallado de la actividad en esta tarea durante ${intervalLabels[interval as keyof typeof intervalLabels]}. 

Analiza el siguiente historial de conversación y actividades:

${chatContext}

Proporciona un resumen que incluya:

1. **📋 Resumen Ejecutivo**: Descripción general de la actividad y progreso
2. **💬 Actividad de Comunicación**: Número de mensajes, participantes más activos
3. **⏱️ Tiempo Registrado**: Total de horas trabajadas y por quién
4. **📎 Archivos Compartidos**: Lista de documentos e imágenes compartidas
5. **🎯 Puntos Clave**: Decisiones importantes, problemas identificados, próximos pasos
6. **📈 Estado del Proyecto**: Evaluación del progreso y momentum

Usa markdown para el formato y sé conciso pero informativo. Si hay poca actividad, menciona esto de manera constructiva.`;

      const generationConfig = {
        maxOutputTokens: 1000,
        temperature: 0.3,
        topK: 20,
        topP: 0.8,
      };

      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];

      const systemInstruction = `Eres un analista experto en gestión de proyectos. Creas resúmenes claros, estructurados y actionables de la actividad en tareas. Usa markdown para formatear tu respuesta y proporciona insights valiosos sobre el progreso y la colaboración del equipo.`;

      console.log(`[ChatSidebar:GenerateSummary] Iniciando resumen para ${interval}...`);
      
      const model = getGenerativeModel(ai, {
        model: 'gemini-1.5-flash',
        generationConfig,
        safetySettings,
        systemInstruction,
      });

      const result = await model.generateContent(prompt);
      
      if (!result || !result.response) {
        throw new Error('🚫 No se recibió respuesta del servidor de Gemini.');
      }

      let summaryText: string;
      try {
        summaryText = await result.response.text();
      } catch (textError) {
        console.error('[ChatSidebar:GenerateSummary] Error al extraer texto:', textError);
        throw new Error('⚠️ Error al procesar la respuesta de Gemini.');
      }

      if (!summaryText || summaryText.trim().length === 0) {
        throw new Error('📝 Gemini devolvió un resumen vacío.');
      }

      const summaryMessage: Partial<Message> = {
        senderId: 'ai-summary',
        senderName: '🤖 Resumen IA',
        text: `📊 Resumen de actividad - ${intervalLabels[interval as keyof typeof intervalLabels]}\n\n${summaryText}`,
        read: true,
      };

      await handleSendMessage(summaryMessage);
      
    } catch (error) {
      console.error('[ChatSidebar:GenerateSummary] Error:', error);
      
      let errorMessage = '❌ Error al generar el resumen.';
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          errorMessage = '🔒 No tienes permisos para usar la funcionalidad de resúmenes.';
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          errorMessage = '📊 Límite de resúmenes excedido por hoy.';
        } else {
          errorMessage = `❌ ${error.message}`;
        }
      }
      
      alert(errorMessage);
      
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const hasDataForInterval = useCallback((interval: string) => {
    if (!messages.length) return false;
    
    const now = new Date();
    let startDate: Date;
    
    switch (interval) {
      case '1day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '3days':
        startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '1week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '6months':
        startDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 1000);
        break;
      default:
        return true;
    }
    
    return messages.some(msg => {
      if (!msg.timestamp) return false;
      const msgDate = msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(msg.timestamp);
      return msgDate >= startDate;
    });
  }, [messages]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div
      className={`${styles.container} ${isOpen ? styles.open : ''}`}
      ref={sidebarRef}
    >
      <div className={styles.header}>
        <div className={styles.controls}>
          <div
            className={styles.arrowLeft}
            onClick={(e) => {
              handleClick(e.currentTarget);
              const mobile = isMobile();
              gsap.to(sidebarRef.current, {
                ...(mobile ? { y: '100%' } : { x: '100%' }),
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

          <div className={styles.dropdownContainer} ref={summarizeDropdownRef}>
            <button
              type="button"
              className={`${styles.imageButton} ${styles.tooltip} ${styles.summarizeButton} ${isGeneratingSummary ? 'processing' : ''}`}
              onClick={() => setIsSummarizeDropdownOpen((prev) => !prev)}
              disabled={isGeneratingSummary || messages.length === 0}
              aria-label="Generar resumen de actividad"
              title="Generar resumen de actividad 📊"
              aria-expanded={isSummarizeDropdownOpen}
            >
              <Image
                src="/Robot.svg"
                alt="Summarize"
                width={16}
                height={16}
              />
            </button>
            {isSummarizeDropdownOpen && (
              <div className={styles.dropdownMenu} role="menu">
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleGenerateSummary('1day')}
                  disabled={isGeneratingSummary || !hasDataForInterval('1day')}
                  role="menuitem"
                >
                  📅 1 día
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleGenerateSummary('3days')}
                  disabled={isGeneratingSummary || !hasDataForInterval('3days')}
                  role="menuitem"
                >
                  📅 3 días
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleGenerateSummary('1week')}
                  disabled={isGeneratingSummary || !hasDataForInterval('1week')}
                  role="menuitem"
                >
                  📅 1 semana
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleGenerateSummary('1month')}
                  disabled={isGeneratingSummary || !hasDataForInterval('1month')}
                  role="menuitem"
                >
                  📅 1 mes
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleGenerateSummary('6months')}
                  disabled={isGeneratingSummary || !hasDataForInterval('6months')}
                  role="menuitem"
                >
                  📅 6 meses
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleGenerateSummary('1year')}
                  disabled={isGeneratingSummary || !hasDataForInterval('1year')}
                  role="menuitem"
                >
                  📅 1 año
                </button>
              </div>
            )}
          </div>
        </div>
        <div className={styles.title}>{task.name}</div>
        <div className={styles.description}>{task.description || 'Sin descripción'}</div>
        <div className={styles.details}>
          <div
            className={`${styles.card} ${isCreator || isAdmin ? styles.statusCard : ''}`}
            onClick={() => {
              if (isCreator || isAdmin) {
                setActiveCardDropdown(activeCardDropdown === 'status' ? null : 'status');
              }
            }}
          >
            <div className={styles.cardLabel}>Estado de la tarea:</div>
            <div className={styles.cardValue}>{task.status}</div>
            {activeCardDropdown === 'status' && (isCreator || isAdmin) && (
              <div ref={statusDropdownRef} className={styles.cardDropdown}>
                {statusOptions.map((status) => (
                  <div key={status} className={styles.cardDropdownItem} onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(status);
                    setActiveCardDropdown(null);
                  }}>
                    {status}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            className={styles.card}
            onClick={() => {
              if (isInvolved) {
                setActiveCardDropdown(activeCardDropdown === 'team' ? null : 'team');
              }
            }}
          >
            <div className={styles.cardLabel}>Equipo:</div>
            <div className={styles.cardValue}>{teamUsers.length} miembro(s)</div>
            {activeCardDropdown === 'team' && isInvolved && (
              <div ref={teamDropdownRef} className={styles.cardDropdown}>
                {teamUsers.length > 0 ? (
                  teamUsers.map((u) => (
                    <div key={u.id} className={styles.cardDropdownItem}>
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
                  <div className={styles.cardDropdownItem}>No hay miembros asignados a esta tarea</div>
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
            onClick={() => {
              if (isInvolved) {
                setActiveCardDropdown(activeCardDropdown === 'hours' ? null : 'hours');
              }
            }}
          >
            <div className={styles.cardLabel}>Tiempo registrado:</div>
            <div className={styles.cardValue}>{totalHours}</div>
            {activeCardDropdown === 'hours' && isInvolved && (
              <div ref={hoursDropdownRef} className={styles.cardDropdown}>
                {hoursByUser.length > 0 ? (
                  teamUsers.map((u) => (
                    <div key={u.id} className={styles.cardDropdownItem}>
                      <Image
                        src={u.imageUrl}
                        alt={u.firstName || 'Avatar del usuario'}
                        width={24}
                        height={24}
                        className={styles.avatar}
                      />
                      <span className={styles.hoursUserName}>{u.firstName}</span>
                      <span className={styles.hoursValue}>
                        {hoursByUser.find((h) => h.id === u.id)?.hours || '0:00'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className={styles.cardDropdownItem}>Aún no hay tiempo registrado en esta tarea</div>
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
        {messages.map((message, index) => (
          <MessageItem
            key={message.clientId}
            message={message}
            users={users}
            userId={user?.id}
            styles={styles}
            setActionMenuOpenId={setActionMenuOpenId}
            actionMenuOpenId={actionMenuOpenId}
            setEditingMessageId={setEditingMessageId}
            setEditingText={setEditingText}
            handleEditMessage={handleEditMessage}
            handleDeleteMessage={handleDeleteMessage}
            handleResendMessage={handleResendMessage}
            setImagePreviewSrc={setImagePreviewSrc}
            editingMessageId={editingMessageId}
            editingText={editingText}
            ref={index === messages.length - 1 ? lastMessageRef : null}
          />
        ))}
      </div>
      <InputChat
        taskId={task.id}
        userId={user?.id}
        userFirstName={user?.firstName}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        setIsSending={setIsSending}
        timerSeconds={timerSeconds}
        isTimerRunning={isTimerRunning}
        onToggleTimer={toggleTimer}
        onToggleTimerPanel={toggleTimerPanel}
        isTimerPanelOpen={isTimerPanelOpen}
        setIsTimerPanelOpen={setIsTimerPanelOpen}
        containerRef={sidebarRef}
        timerPanelRef={timerPanelRef}
        timerInput={timerInput}
        setTimerInput={setTimerInput}
        dateInput={dateInput}
        setDateInput={setDateInput}
        commentInput={commentInput}
        setCommentInput={setCommentInput}
        onAddTimeEntry={handleAddTimeEntry}
        totalHours={totalHours}
      />
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