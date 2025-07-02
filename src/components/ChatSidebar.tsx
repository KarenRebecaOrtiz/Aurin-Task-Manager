'use client';

import { useState, useEffect, useRef, useCallback, memo, forwardRef, Dispatch, useMemo } from 'react';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { useUser } from '@clerk/nextjs';
import { Timestamp, doc, setDoc, serverTimestamp, collection, addDoc, updateDoc, query, where, getDocs, getDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { gsap } from 'gsap';
import InfiniteScroll from 'react-infinite-scroll-component';
import ImagePreviewOverlay from './ImagePreviewOverlay';
import InputChat from './ui/InputChat';
import styles from './ChatSidebar.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import Loader from '@/components/Loader';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from '@firebase/ai';
import { ai } from '@/lib/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import UserAvatar from './ui/UserAvatar';
import { useEncryption } from '@/hooks/useEncryption';
import { updateTaskActivity } from '@/lib/taskUtils';
import { useMessagePagination } from '@/hooks/useMessagePagination';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useMessageDrag } from '@/hooks/useMessageDrag';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | Date | null;
  read: boolean;
  hours?: number;
  dateString?: string;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
  hasError?: boolean;
  clientId: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string | null;
  } | null;
  isDatePill?: boolean;
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
  handleDeleteMessage: (messageId: string) => Promise<void>;
  setImagePreviewSrc: Dispatch<React.SetStateAction<string | null>>;
  editingMessageId: string | null;
  isDraggingMessage: boolean;
  draggedMessageId: string | null;
  dragOffset: number;
  onMessageDragStart: (messageId: string, e: React.MouseEvent | React.TouchEvent) => void;
  isNewChunk?: boolean;
  isLoadingChunk: boolean;
}

const MessageItem = memo(
  forwardRef<HTMLDivElement, MessageItemProps>(
    (props, ref) => {
      const {
        message,
        users,
        userId,
        styles,
        setActionMenuOpenId,
        actionMenuOpenId,
        setEditingMessageId,
        setEditingText,
        handleDeleteMessage,
        setImagePreviewSrc,
        editingMessageId,
        isDraggingMessage,
        draggedMessageId,
        dragOffset,
        onMessageDragStart,
        isNewChunk,
        isLoadingChunk,
      } = props;

      const actionMenuRef = useRef<HTMLDivElement>(null);
      const messageRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
            setActionMenuOpenId(null);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, [setActionMenuOpenId]);

      useEffect(() => {
        if (actionMenuOpenId === message.id && actionMenuRef.current) {
          gsap.fromTo(
            actionMenuRef.current,
            { opacity: 0, y: -10, scale: 0.95, transformOrigin: 'top right' },
            { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
          );
        } else if (actionMenuRef.current) {
          gsap.to(actionMenuRef.current, {
            opacity: 0, y: -10, scale: 0.95, duration: 0.15, ease: 'power2.in'
          });
        }
      }, [actionMenuOpenId, message.id]);

      useEffect(() => {
        if (isNewChunk && messageRef.current && !isLoadingChunk) {
          gsap.fromTo(
            messageRef.current,
            { opacity: 0, y: -30, scale: 0.95, rotationX: -5, filter: 'blur(2px)' },
            { opacity: 1, y: 0, scale: 1, rotationX: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out', delay: 0.2 }
          );
          gsap.fromTo(
            messageRef.current,
            { boxShadow: '0 0 0 rgba(59, 130, 246, 0)' },
            { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)', duration: 0.8, ease: 'power2.out', delay: 0.3, yoyo: true, repeat: 1 }
          );
        }
      }, [isNewChunk, isLoadingChunk]);

      const renderMessageContent = useCallback(() => {
        const contentElements: React.ReactNode[] = [];
        
        // Si es un mensaje de tiempo, solo mostrar el componente de tiempo
        if (message.hours) {
          contentElements.push(
            <div key="time" className={styles.timeMessage}>
              <Image src="/Clock.svg" alt="Tiempo" width={16} height={16} />
              <span>{message.hours} horas registradas</span>
            </div>
          );
          return contentElements;
        }

        // Si hay un mensaje al que se está respondiendo, mostrar la vista previa
        if (message.replyTo) {
          contentElements.push(
            <div key="reply" className={styles.replyPreview}>
              <div className={styles.replyHeader}>
                <span>Respondiendo a {message.replyTo.senderName}</span>
              </div>
              <div className={styles.replyContent}>
                {message.replyTo.imageUrl && (
                  <Image
                    src={message.replyTo.imageUrl}
                    alt="Imagen de respuesta"
                    width={40}
                    height={40}
                    className={styles.replyImage}
                    onError={(e) => { e.currentTarget.src = '/empty-image.png'; }}
                  />
                )}
                {message.replyTo.text && (
                  <span className={styles.replyText} dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.replyTo.text.length > 50 ? `${message.replyTo.text.substring(0, 50)}...` : message.replyTo.text) }} />
                )}
                {!message.replyTo.text && !message.replyTo.imageUrl && (
                  <span className={styles.replyText}>Mensaje</span>
                )}
              </div>
            </div>
          );
        }

        if (message.text) {
          contentElements.push(
            <div key="text" className={styles.messageText} dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.text) }} />
          );
        }

        if (message.imageUrl) {
          contentElements.push(
            <div key="image" className={styles.imageContainer}>
              <Image
                src={message.imageUrl}
                alt="Imagen"
                width={200}
                height={200}
                className={styles.messageImage}
                onClick={() => setImagePreviewSrc(message.imageUrl)}
                onError={(e) => { e.currentTarget.src = '/empty-image.png'; }}
              />
            </div>
          );
        }

        if (message.fileUrl && !message.fileType?.startsWith('image/')) {
          contentElements.push(
            <div key="file" className={styles.file}>
              <Image src="/file.svg" alt="Archivo" width={16} height={16} />
              <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileName}>
                {message.fileName || 'Archivo'}
              </a>
            </div>
          );
        }

        return contentElements;
      }, [message, setImagePreviewSrc, styles]);

      // Si es un pill de fecha, renderizar un diseño especial
      if (message.isDatePill) {
        return (
          <div className={styles.datePill}>
            <span className={styles.datePillText}>{message.text}</span>
          </div>
        );
      }

      return (
        <div
          ref={(el) => {
            if (typeof ref === 'function') {
              ref(el);
            } else if (ref) {
              ref.current = el;
            }
            messageRef.current = el;
          }}
          className={`${styles.message} ${message.isPending ? styles.pending : ''} ${
            message.hasError && message.senderId === userId ? styles.error : ''
          } ${isDraggingMessage && draggedMessageId === message.id ? styles.dragging : ''}`}
          data-message-id={message.id}
          style={{
            transform: isDraggingMessage && draggedMessageId === message.id 
              ? `translateX(-${dragOffset}px)` 
              : 'translateX(0)',
            transition: isDraggingMessage && draggedMessageId === message.id 
              ? 'none' 
              : 'transform 0.3s ease-out'
          }}
          data-drag-threshold={isDraggingMessage && draggedMessageId === message.id && dragOffset >= 60 ? 'true' : 'false'}
          onMouseDown={(e) => onMessageDragStart(message.id, e)}
          onTouchStart={(e) => onMessageDragStart(message.id, e)}
        >
          <UserAvatar
            userId={message.senderId}
            imageUrl={users.find((u) => u.id === message.senderId)?.imageUrl}
            userName={message.senderName}
            size="medium"
            showStatus={true}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuOpenId(actionMenuOpenId === message.id ? null : message.id);
                      }}
                    >
                      <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
                    </button>
                    {actionMenuOpenId === message.id && (
                      <div className={styles.actionDropdown} ref={actionMenuRef}>
                        <div className={styles.actionDropdownContent}>
                          {/* Solo mostrar opciones de editar y eliminar si el mensaje es del usuario actual */}
                          {message.senderId === userId && (
                            <>
                              {!message.hours && (
                                <div
                                  className={styles.actionDropdownItem}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMessageId(message.id);
                                    setEditingText(message.text || '');
                                    setActionMenuOpenId(null);
                                  }}
                                >
                                  Editar
                                </div>
                              )}
                              <div
                                className={styles.actionDropdownItem}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMessage(message.id);
                                  setActionMenuOpenId(null);
                                }}
                              >
                                Eliminar
                              </div>
                            </>
                          )}
                          {(message.imageUrl || message.fileUrl) && (
                            <div
                              className={styles.actionDropdownItem}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (message.imageUrl || message.fileUrl) {
                                  const link = document.createElement('a');
                                  link.href = message.imageUrl || message.fileUrl || '';
                                  link.download = message.fileName || 'archivo';
                                  link.target = '_blank';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
                                setActionMenuOpenId(null);
                              }}
                            >
                              Descargar Archivo
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {editingMessageId === message.id ? (
              <div className={styles.editContainer}>
                <div className={styles.editContent}>
                  <div className={styles.editHeader}>
                    <span className={styles.editLabel}>✏️ Editando en el input principal</span>
                  </div>
                  <div className={styles.editPreview}>
                    <span className={styles.editText}>Usa el input de abajo para editar este mensaje</span>
                  </div>
                </div>
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
      prevProps.editingMessageId === nextProps.editingMessageId
    );
  },
);

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
  const { encryptMessage, decryptMessage } = useEncryption();
  const { markAsViewed } = useTaskNotifications();
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false);
  const [timerInput, setTimerInput] = useState('00:00');
  const [dateInput, setDateInput] = useState<Date>(new Date());
  const [commentInput, setCommentInput] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [task, setTask] = useState(initialTask);
  const [activeCardDropdown, setActiveCardDropdown] = useState<'status' | 'team' | 'hours' | null>(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [isSummarizeDropdownOpen, setIsSummarizeDropdownOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isDetailsDropdownOpen, setIsDetailsDropdownOpen] = useState(false);
  const [isLoadingChunk, setIsLoadingChunk] = useState(false);
  const [newChunkMessageIds, setNewChunkMessageIds] = useState<Set<string>>(new Set());
  const [isRestoringTimer, setIsRestoringTimer] = useState(false);

  const lastMessageRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const taskMenuRef = useRef<HTMLDivElement>(null);
  const deletePopupRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const hoursDropdownRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const timerPanelRef = useRef<HTMLDivElement>(null);
  const summarizeDropdownRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading: isLoadingMessages,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
  } = useMessagePagination({
    taskId: task.id,
    pageSize: 10,
    decryptMessage,
  });

  const {
    isDraggingMessage,
    draggedMessageId,
    dragOffset,
    handleMessageDragStart,
  } = useMessageDrag({
    onReplyActivated: (messageId: string) => {
      const messageToReply = messages.find(msg => msg.id === messageId);
      if (messageToReply) {
        setReplyingTo(messageToReply);
        console.log('[ChatSidebar] Reply activated for message:', messageToReply.id);
      }
    },
  });

  // 🔄 RESTAURAR TIMER DESDE FIRESTORE
  useEffect(() => {
    const restoreTimer = async () => {
      if (!isOpen || !user?.id || !task.id) return;
      
      setIsRestoringTimer(true);
      console.log('[ChatSidebar] 🔄 Iniciando restauración de timer...', {
        userId: user.id,
        taskId: task.id,
        isOpen
      });

      try {
        const timerDocRef = doc(db, `tasks/${task.id}/timers/${user.id}`);
        const timerDoc = await getDoc(timerDocRef);
        
        if (timerDoc.exists()) {
          const timerData = timerDoc.data();
          console.log('[ChatSidebar] 📊 Datos de timer encontrados:', timerData);
          
          if (timerData.isRunning && timerData.startTime) {
            // Timer está corriendo - calcular tiempo transcurrido
            const startTime = timerData.startTime.toDate();
            const now = new Date();
            const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const totalSeconds = (timerData.accumulatedSeconds || 0) + elapsedSeconds;
            
            console.log('[ChatSidebar] ▶️ Restaurando timer activo:', {
              startTime: startTime.toISOString(),
              elapsedSeconds,
              accumulatedSeconds: timerData.accumulatedSeconds || 0,
              totalSeconds
            });
            
            setIsTimerRunning(true);
            setTimerSeconds(totalSeconds);
          } else if (!timerData.isRunning && timerData.accumulatedSeconds > 0) {
            // Timer pausado con tiempo acumulado
            console.log('[ChatSidebar] ⏸️ Restaurando timer pausado:', {
              accumulatedSeconds: timerData.accumulatedSeconds
            });
            
            setIsTimerRunning(false);
            setTimerSeconds(timerData.accumulatedSeconds);
          } else {
            // Timer en estado inicial
            console.log('[ChatSidebar] 🆕 Timer en estado inicial');
            setIsTimerRunning(false);
            setTimerSeconds(0);
          }
        } else {
          // No hay datos de timer - estado inicial
          console.log('[ChatSidebar] ❌ No se encontraron datos de timer - estado inicial');
          setIsTimerRunning(false);
          setTimerSeconds(0);
        }
      } catch (error) {
        console.error('[ChatSidebar] ❌ Error restaurando timer:', error);
        // En caso de error, mantener estado limpio
        setIsTimerRunning(false);
        setTimerSeconds(0);
      } finally {
        setIsRestoringTimer(false);
      }
    };

    restoreTimer();
  }, [isOpen, user?.id, task.id]);

  // Optimized task updates with periodic checks and local caching
  useEffect(() => {
    if (!isOpen || !task.id) return;

    const checkTaskUpdates = async () => {
      try {
        const lastModified = localStorage.getItem(`taskLastModified_${task.id}`);
        const taskRef = doc(db, 'tasks', task.id);
        const docSnap = await getDoc(taskRef);
        
        if (docSnap.exists()) {
          const taskData = docSnap.data();
          const serverLastModified = taskData.lastModified?.toDate();
          
          // Solo actualizar si hay cambios reales
          if (!lastModified || (serverLastModified && new Date(lastModified) < serverLastModified)) {
        setTask(prevTask => ({
          ...prevTask,
              ...taskData, // Usar spread para actualizar todos los campos
            }));
            
            if (serverLastModified) {
              localStorage.setItem(`taskLastModified_${task.id}`, serverLastModified.toISOString());
            }
            
            console.log('[ChatSidebar] Task actualizado desde Firestore:', taskData);
          }
      } else {
          console.warn('[ChatSidebar] Documento de tarea no existe:', task.id);
      }
      } catch (error) {
        console.error('[ChatSidebar] Error verificando actualizaciones de tarea:', error);
      }
    };

    // Verificar inmediatamente y luego cada 5 minutos
    checkTaskUpdates();
    const interval = setInterval(checkTaskUpdates, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, task.id]);

  const handleLoadMoreMessages = useCallback(async () => {
    if (hasMore && !isLoadingMore && !isLoadingChunk) {
      setIsLoadingChunk(true);
      
      const currentMessageCount = messages.length;
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        await loadMoreMessages();
        
        setTimeout(() => {
          const newMessages = messages.slice(currentMessageCount);
          const newMessageIds = new Set(newMessages.map(msg => msg.id));
          setNewChunkMessageIds(newMessageIds);
          
          setTimeout(() => {
            setNewChunkMessageIds(new Set());
          }, 3000);
        }, 100);
        
      } finally {
        setIsLoadingChunk(false);
      }
    }
  }, [hasMore, isLoadingMore, isLoadingChunk, loadMoreMessages, messages]);

  const {
    isSending,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTimeMessage,
  } = useMessageActions({
    task,
    encryptMessage,
    addOptimisticMessage,
    updateOptimisticMessage,
  });

  const isCreator = useMemo(() => user?.id === task.CreatedBy, [user?.id, task.CreatedBy]);
  const isInvolved = useMemo(() => 
    user?.id &&
    (task.AssignedTo.includes(user.id) || task.LeadedBy.includes(user.id) || task.CreatedBy === user.id),
    [user?.id, task.AssignedTo, task.LeadedBy, task.CreatedBy]
  );
  const canViewTeamAndHours = useMemo(() => isInvolved || isAdmin, [isInvolved, isAdmin]);
  const statusOptions = ['Por Iniciar', 'En Proceso', 'Diseño', 'Desarrollo', 'Backlog', 'Finalizado', 'Cancelado'];

  const isMobile = () => window.innerWidth < 768;

  const toggleBodyScroll = (disable: boolean) => {
    if (typeof document !== 'undefined') {
      if (disable) {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        document.body.setAttribute('data-scroll-y', scrollY.toString());
      } else {
        const scrollY = document.body.getAttribute('data-scroll-y');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.removeAttribute('data-scroll-y');
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY));
        }
      }
    }
  };

  useEffect(() => {
    toggleBodyScroll(isOpen);
    return () => {
      if (isOpen) {
        toggleBodyScroll(false);
      }
    };
  }, [isOpen]);

  // 🕒 TIMER ACTIVO - Actualizar cada segundo y sincronizar con Firestore
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    
    if (isTimerRunning && !isRestoringTimer) {
      // Actualizar contador local cada segundo
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          const newSeconds = prev + 1;
          
          // Auto-sincronizar cada 30 segundos sin dependencia externa
          if (newSeconds % 30 === 0 && user?.id && task.id) {
            const timerDocRef = doc(db, `tasks/${task.id}/timers/${user.id}`);
            updateDoc(timerDocRef, {
              lastSync: serverTimestamp(),
              accumulatedSeconds: newSeconds,
            }).then(() => {
              console.log("[ChatSidebar] 🔄 Timer auto-sincronizado:", newSeconds);
            }).catch((error) => {
              console.error("[ChatSidebar] ❌ Error auto-sincronizando timer:", error);
            });
          }
          
          return newSeconds;
        });
      }, 1000);
    }
      
    
    return () => {
      if (interval) clearInterval(interval);
      
    };
  }, [isTimerRunning, isRestoringTimer, user?.id, task.id]);

  // 📡 LISTENER EN TIEMPO REAL PARA TIMER - Detectar cambios de otros usuarios
  useEffect(() => {
    if (!isOpen || !user?.id || !task.id) return;

    console.log("[ChatSidebar] 📡 Configurando listener en tiempo real para timer...");

    const timerDocRef = doc(db, `tasks/${task.id}/timers/${user.id}`);
    const unsubscribe = onSnapshot(timerDocRef, (doc) => {
      if (doc.exists() && !isRestoringTimer) {
        const timerData = doc.data();
        console.log("[ChatSidebar] 🔄 Cambio detectado en timer remoto:", timerData);
        
        // Solo actualizar si el cambio viene de otro lugar (lastSync reciente)
        const lastSync = timerData.lastSync?.toDate();
        const now = new Date();
        const timeDiff = lastSync ? (now.getTime() - lastSync.getTime()) / 1000 : 999;
        
        if (timeDiff < 60) { // Cambio reciente (menos de 1 minuto)
          if (timerData.isRunning && timerData.startTime) {
            // Timer activo desde otro dispositivo
            const startTime = timerData.startTime.toDate();
            const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const totalSeconds = (timerData.accumulatedSeconds || 0) + elapsedSeconds;
            
            console.log("[ChatSidebar] 🔄 Sincronizando timer activo desde remoto:", totalSeconds);
            setIsTimerRunning(true);
            setTimerSeconds(totalSeconds);
          } else if (!timerData.isRunning) {
            // Timer pausado desde otro dispositivo
            console.log("[ChatSidebar] 🔄 Sincronizando timer pausado desde remoto:", timerData.accumulatedSeconds);
            setIsTimerRunning(false);
            setTimerSeconds(timerData.accumulatedSeconds || 0);
          }
        }
      }
    }, (error) => {
      console.error("[ChatSidebar] ❌ Error en listener de timer:", error);
    });

    return () => {
      console.log("[ChatSidebar] 🔌 Desconectando listener de timer...");
      unsubscribe();
    };
  }, [isOpen, user?.id, task.id, isRestoringTimer]);
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
    const handleScroll = () => {
      setActionMenuOpenId(null);
    };
    
    const chatEl = chatRef.current;
    if (chatEl) {
      chatEl.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (chatEl) {
        chatEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

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
    isDetailsDropdownOpen,
  ]);

  useEffect(() => {
    if (isOpen && user?.id) {
      // Operaciones batch optimizadas con lazy loading
      const batchOperations = async () => {
        try {
          const batch = writeBatch(db);
          let operationsCount = 0;
          
          // Marcar mensajes como leídos
      const unreadMessages = messages.filter((msg) => !msg.read && !msg.isPending);
          unreadMessages.forEach((msg) => {
            if (operationsCount < 490) { // Límite de Firestore batch
              batch.update(doc(db, `tasks/${task.id}/messages`, msg.id), { 
                read: true,
                lastModified: serverTimestamp()
              });
              operationsCount++;
            }
          });
          
          // Marcar notificaciones como leídas (lazy loading)
          const lastNotificationCheck = localStorage.getItem(`lastNotificationCheck_${task.id}_${user.id}`);
          const shouldCheckNotifications = !lastNotificationCheck || 
            (Date.now() - parseInt(lastNotificationCheck)) > 5 * 60 * 1000; // 5 minutos
          
          if (shouldCheckNotifications) {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('taskId', '==', task.id),
              where('recipients', 'array-contains', user.id),
        where('read', '==', false)
      );
            
            const snapshot = await getDocs(notificationsQuery);
            snapshot.docs.forEach((notifDoc) => {
              if (operationsCount < 490) {
                batch.update(doc(db, 'notifications', notifDoc.id), { read: true });
                operationsCount++;
              }
            });
            
            localStorage.setItem(`lastNotificationCheck_${task.id}_${user.id}`, Date.now().toString());
            console.log('[ChatSidebar] Verificación de notificaciones completada:', snapshot.docs.length);
          }

          // Ejecutar batch si hay operaciones
          if (operationsCount > 0) {
            await batch.commit();
            console.log('[ChatSidebar] Operaciones batch completadas:', operationsCount);
          }

          // Marcar tarea como vista
          await markAsViewed(task.id);
          
        } catch (error) {
          console.error('[ChatSidebar] Error en operaciones batch:', error);
        }
      };

      // Debounce mejorado con timeout más largo para reducir frecuencia
      const timeoutId = setTimeout(batchOperations, 1500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, messages, user?.id, task.id, markAsViewed]);

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

  const handleStatusChange = useCallback(async (status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[ChatSidebar] handleStatusChange called:', {
      status,
      isCreator,
      isAdmin,
      userId: user?.id,
      taskId: task.id,
      currentStatus: task.status
    });

    if (!isCreator && !isAdmin) {
      console.warn('[ChatSidebar] User not authorized to change status:', {
        userId: user?.id,
        isCreator,
        isAdmin
      });
      return;
    }

    if (!user?.id) {
      console.error('[ChatSidebar] No user ID available');
      return;
    }

    try {
      // Update local state for immediate UI feedback
      setTask(prevTask => ({ ...prevTask, status }));
      setActiveCardDropdown(null); // Close dropdown immediately
      
      console.log('[ChatSidebar] Updating task status in Firestore...');
      await updateDoc(doc(db, 'tasks', task.id), {
        status,
        lastActivity: serverTimestamp(),
      });
      
      await updateTaskActivity(task.id, 'status_change');
      
      const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
      if (task.CreatedBy) recipients.add(task.CreatedBy);
      recipients.delete(user.id);
      
      const notificationPromises = Array.from(recipients).map(recipientId =>
        addDoc(collection(db, 'notifications'), {
          userId: user.id,
          taskId: task.id,
          message: `${user.firstName || 'Usuario'} cambió el estado de la tarea "${task.name}" a "${status}"`,
          timestamp: Timestamp.now(),
          read: false,
          recipientId,
          type: 'task_status_changed',
        })
      );
      
      await Promise.all(notificationPromises);
      console.log('[ChatSidebar] Task status updated successfully:', status);
      
    } catch (error) {
      console.error('[ChatSidebar] Error updating task status:', error);
      // Revert local state if Firestore update fails
      setTask(prevTask => ({ ...prevTask, status: initialTask.status }));
      alert(`Error al cambiar el estado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }, [user?.id, user?.firstName, task.id, task.status, task.AssignedTo, task.LeadedBy, task.CreatedBy, task.name, initialTask.status, isCreator, isAdmin]);

  const handleDeleteTask = async () => {
    if (!user?.id || deleteConfirm.toLowerCase() !== 'eliminar') {
      return;
    }
    setIsDeleting(true);
    try {
      setIsDeletePopupOpen(false);
      setDeleteConfirm('');
      onClose();
    } catch (error) {
      console.error('Error closing task', error);
      alert(`Error al cerrar la tarea: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendMessage = async (
    messageData: Partial<Message>,
  ) => {
    if (!user?.id) return;
    
    const messageWithReply = {
      ...messageData,
      senderId: user.id,
      senderName: user.firstName || 'Usuario',
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderName,
        text: replyingTo.text,
        imageUrl: replyingTo.imageUrl,
      } : null,
    };
    
    await sendMessage(messageWithReply);
    
    const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
    if (task.CreatedBy) recipients.add(task.CreatedBy);
    recipients.delete(user.id);
    
    const notificationText = messageData.text
      ? `${user.firstName || 'Usuario'} escribió en "${task.name}": ${
          messageData.text.length > 50 ? messageData.text.substring(0, 50) + '...' : messageData.text
        }`
      : `${user.firstName || 'Usuario'} compartió un archivo en "${task.name}"`;
    
    for (const recipientId of recipients) {
      await addDoc(collection(db, 'notifications'), {
        userId: user.id,
        taskId: task.id,
        message: notificationText,
        timestamp: Timestamp.now(),
        read: false,
        recipientId,
        type: 'group_message',
      });
    }
    
    await updateTaskActivity(task.id, 'message');
    
    setReplyingTo(null);
  };

  const handleEditMessage = async (messageId: string, newText?: string) => {
    if (!user?.id) {
      alert('El mensaje no puede estar vacío.');
      return;
    }
    
    if (newText) {
      if (!newText.trim()) {
        alert('El mensaje no puede estar vacío.');
        return;
      }
      try {
        await editMessage(messageId, newText.trim());
        setEditingMessageId(null);
        setEditingText('');
      } catch (error) {
        console.error('Error editing message:', error);
        alert('Error al editar el mensaje. Verifica que seas el autor del mensaje o intenta de nuevo.');
      }
      return;
    }
    
    if (!editingText.trim()) {
      alert('El mensaje no puede estar vacío.');
      return;
    }
    try {
      await editMessage(messageId, editingText.trim());
      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Error al editar el mensaje. Verifica que seas el autor del mensaje o intenta de nuevo.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      setActionMenuOpenId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const toggleTimer = async (_e: React.MouseEvent) => {
    if (!user?.id || !task.id) {
      console.error('[ChatSidebar:ToggleTimer] Missing user ID or task ID:', { userId: user?.id, taskId: task.id });
      return;
    }
    
    handleClick(_e.currentTarget as HTMLElement);
    const wasRunning = isTimerRunning;
    const timerDocRef = doc(db, `tasks/${task.id}/timers/${user.id}`);
    
    console.log('[ChatSidebar] 🎯 Toggle timer:', {
      wasRunning,
      currentSeconds: timerSeconds,
      userId: user.id,
      taskId: task.id
    });

    if (wasRunning) {
      // ⏸️ PAUSAR TIMER
      console.log('[ChatSidebar] ⏸️ Pausando timer...');
      setIsTimerRunning(false);
      
      try {
        // Guardar estado pausado en Firestore
        await setDoc(timerDocRef, {
          userId: user.id,
          isRunning: false,
          startTime: null,
          accumulatedSeconds: timerSeconds,
          lastPaused: serverTimestamp(),
        }, { merge: true });
        
        console.log('[ChatSidebar] ✅ Timer pausado y guardado:', {
          accumulatedSeconds: timerSeconds,
          status: 'paused'
        });
      } catch (error) {
        console.error('[ChatSidebar] ❌ Error pausando timer:', error);
        // Revertir estado local en caso de error
        setIsTimerRunning(true);
      }
    } else {
      // ▶️ INICIAR/REANUDAR TIMER
      console.log('[ChatSidebar] ▶️ Iniciando/reanudando timer...');
      setIsTimerRunning(true);
      
      try {
        // Guardar estado activo en Firestore
        await setDoc(timerDocRef, {
          userId: user.id,
          isRunning: true,
          startTime: serverTimestamp(),
          accumulatedSeconds: timerSeconds,
          lastStarted: serverTimestamp(),
        }, { merge: true });
        
        console.log('[ChatSidebar] ✅ Timer iniciado y guardado:', {
          accumulatedSeconds: timerSeconds,
          status: 'running'
        });
      } catch (error) {
        console.error('[ChatSidebar] ❌ Error iniciando timer:', error);
        // Revertir estado local en caso de error
        setIsTimerRunning(false);
      }
    }
  };


  const toggleTimerPanel = () => {
    setIsTimerPanelOpen(prev => !prev);
    console.log('[ChatSidebar] Timer panel toggled');
  };

  // 🛑 FINALIZAR TIMER (función para cuando se quiere enviar el tiempo con doble click)
  const finalizeTimer = async () => {
    console.log('[ChatSidebar] 🎯 Iniciando finalizeTimer:', {
      userId: user?.id,
      taskId: task.id,
      timerSeconds,
      isTimerRunning,
      hasUser: !!user?.id,
      hasTask: !!task.id,
      hasTime: timerSeconds > 0
    });
    
    if (!user?.id) {
      console.warn('[ChatSidebar] ❌ No hay usuario autenticado');
      return;
    }
    
    if (!task.id) {
      console.warn('[ChatSidebar] ❌ No hay task ID');
      return;
    }
    
    if (timerSeconds === 0) {
      console.warn('[ChatSidebar] ❌ No hay tiempo para registrar (timerSeconds = 0)');
      return;
    }
    
    const hours = timerSeconds / 3600;
    const displayHours = Math.floor(timerSeconds / 3600);
    const displayMinutes = Math.floor((timerSeconds % 3600) / 60);
    const timeEntry = `${displayHours}h ${displayMinutes}m`;
    const timerDocRef = doc(db, `tasks/${task.id}/timers/${user.id}`);

    console.log('[ChatSidebar] 🛑 Finalizando timer con doble click:', {
      totalSeconds: timerSeconds,
      hours,
      timeEntry,
      displayHours,
      displayMinutes
    });

    try {
      // Enviar mensaje de tiempo
      console.log('[ChatSidebar] 📤 Enviando mensaje de tiempo...');
      await sendTimeMessage(user.id, user.firstName || "Usuario", hours, timeEntry);
      console.log('[ChatSidebar] ✅ Mensaje de tiempo enviado correctamente');
      
      // Limpiar timer en Firestore
      console.log('[ChatSidebar] 🧹 Limpiando timer en Firestore...');
      await setDoc(timerDocRef, {
        userId: user.id,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
        lastFinalized: serverTimestamp(),
      });
      console.log('[ChatSidebar] ✅ Timer limpiado en Firestore');
      
      // Limpiar estado local
      console.log('[ChatSidebar] 🧹 Limpiando estado local...');
      setIsTimerRunning(false);
      setTimerSeconds(0);
      
      console.log('[ChatSidebar] 🎉 Timer finalizado y tiempo registrado exitosamente:', timeEntry);
    } catch (error) {
      console.error('[ChatSidebar] ❌ Error finalizando timer:', error);
      // No revertir el estado local para permitir reintento
      alert(`Error al registrar el tiempo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };
  const handleAddTimeEntry = async (time?: string, date?: Date, comment?: string) => {
    if (!user?.id) {
      alert('No se puede añadir la entrada de tiempo: usuario no autenticado.');
      return;
    }
    
    const timeToUse = time || timerInput;
    const dateToUse = date || dateInput;
    const commentToUse = comment || commentInput;
    
    const [hours, minutes] = timeToUse.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      alert('Por favor, introduce un formato de tiempo válido (HH:mm).');
      return;
    }
    const totalHours = hours + minutes / 60;
    const timeEntry = `${hours}h ${minutes}m`;
    const dateString = dateToUse.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });

    try {
      await sendTimeMessage(user.id, user.firstName || 'Usuario', totalHours, timeEntry, dateString, commentToUse);
      setTimerInput('00:00');
      setDateInput(new Date());
      setCommentInput('');
      setIsTimerPanelOpen(false);
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
    
    const usersWithTime = Object.keys(hoursMap).filter(userId => hoursMap[userId] > 0);
    
    return usersWithTime.map((userId) => {
      const u = users.find((u) => u.id === userId) || {
        id: userId,
        fullName: 'Desconocido',
        firstName: 'Desconocido',
        imageUrl: '/default-image.png',
      };
      const totalMinutes = hoursMap[userId] * 60;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.round(totalMinutes % 60);
      return {
        id: userId,
        firstName: u.firstName || u.fullName.split(' ')[0],
        imageUrl: u.imageUrl,
        hours: `${hours}:${minutes.toString().padStart(2, '0')}`,
      };
    });
  }, [messages, users]);

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
          startDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
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
        startDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
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

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ''}`} ref={sidebarRef}>
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
              onClick={(e) => {
                e.stopPropagation();
                setIsSummarizeDropdownOpen((prev) => !prev);
              }}
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
              <div
                className={styles.dropdownMenu}
                role="menu"
                onClick={e => e.stopPropagation()}
              >
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
        <div 
          className={styles.headerSection}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(e.currentTarget);
            setIsDetailsDropdownOpen(!isDetailsDropdownOpen);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.title}>{task.name}</div>
          <div className={styles.description}>{task.description || 'Sin descripción'}</div>
          <Image 
            src="/chevron-down.svg" 
            alt="Ver detalles" 
            width={16} 
            height={16} 
            className={`${styles.chevronIcon} ${isDetailsDropdownOpen ? styles.rotated : ''}`}
          />
        </div>
        <AnimatePresence initial={false}>
          {isDetailsDropdownOpen && (
            <motion.div
              className={styles.details}
              key={`details-${task.id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div
                className={`${styles.card} ${isCreator || isAdmin ? styles.statusCard : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCreator || isAdmin) {
                    setActiveCardDropdown(activeCardDropdown === 'status' ? null : 'status');
                  }
                }}
              >
                <div className={styles.cardLabel}>Estado de la tarea:</div>
                <div className={styles.cardValue}>{task.status}</div>
                {activeCardDropdown === 'status' && (isCreator || isAdmin) && (
                  <div
                    ref={statusDropdownRef}
                    className={styles.cardDropdown}
                    onClick={e => e.stopPropagation()}
                  >
                    {statusOptions.map((status) => (
                      <div
                        key={status}
                        className={styles.cardDropdownItem}
                        onClick={(e) => handleStatusChange(status, e)}
                      >
                        {status}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div
                className={styles.card}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canViewTeamAndHours) {
                    setActiveCardDropdown(activeCardDropdown === 'team' ? null : 'team');
                  }
                }}
                style={{ cursor: canViewTeamAndHours ? 'pointer' : 'default' }}
              >
                <div className={styles.cardLabel}>Equipo:</div>
                <div className={styles.cardValue}>{teamUsers.length} miembro(s)</div>
                {activeCardDropdown === 'team' && (
                  <div
                    ref={teamDropdownRef}
                    className={styles.cardDropdown}
                    onClick={e => e.stopPropagation()}
                  >
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
              <div
                className={styles.card}
                onClick={e => e.stopPropagation()}
              >
                <div className={styles.cardLabel}>Fecha:</div>
                <div className={styles.cardValue}>
                  {formatDate(task.startDate)} - {formatDate(task.endDate)}
                </div>
              </div>
              <div
                className={styles.cardFullWidth}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canViewTeamAndHours) {
                    setActiveCardDropdown(activeCardDropdown === 'hours' ? null : 'hours');
                  }
                }}
                style={{ cursor: canViewTeamAndHours ? 'pointer' : 'default' }}
              >
                <div className={styles.cardLabel}>Tiempo registrado:</div>
                <div className={styles.cardValue}>{totalHours}</div>
                {activeCardDropdown === 'hours' && (
                  <div
                    ref={hoursDropdownRef}
                    className={styles.cardDropdown}
                    onClick={e => e.stopPropagation()}
                  >
                    {hoursByUser.length > 0 ? (
                      hoursByUser.map((u) => (
                        <div key={u.id} className={styles.cardDropdownItem}>
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
                      <div className={styles.cardDropdownItem}>Aún no hay tiempo registrado en esta tarea</div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={styles.chat} ref={chatRef} id="chat-container">
        {isLoadingMessages && (
          <div className={styles.loader}>
            <div className={styles.spinner} />
          </div>
        )}
        {!isLoadingMessages && messages.length === 0 && (
          <div className={styles.noMessages}>No hay mensajes en esta conversación.</div>
        )}
        <InfiniteScroll
          dataLength={messages.length}
          next={handleLoadMoreMessages}
          hasMore={hasMore}
          loader={
            <div className={styles.chunkLoader}>
              <div className={styles.loader}></div>
            </div>
          }
          endMessage={<div className={styles.noMessages}>No hay más mensajes.</div>}
          style={{ display: 'flex', flexDirection: 'column-reverse', overflowY: 'auto' }}
          scrollableTarget="chat-container"
          inverse={true}
          scrollThreshold="50px"
        >
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              users={users}
              userId={user?.id}
              styles={styles}
              setActionMenuOpenId={setActionMenuOpenId}
              actionMenuOpenId={actionMenuOpenId}
              setEditingMessageId={setEditingMessageId}
              setEditingText={setEditingText}
              handleDeleteMessage={handleDeleteMessage}
              setImagePreviewSrc={setImagePreviewSrc}
              editingMessageId={editingMessageId}
              isDraggingMessage={isDraggingMessage}
              draggedMessageId={draggedMessageId}
              dragOffset={dragOffset}
              onMessageDragStart={handleMessageDragStart}
              isNewChunk={newChunkMessageIds.has(message.id)}
              isLoadingChunk={isLoadingChunk}
              ref={message.id === messages[messages.length - 1]?.id ? lastMessageRef : null}
            />
          ))}
        </InfiniteScroll>
      </div>
      <InputChat
        taskId={task.id}
        userId={user?.id}
        userFirstName={user?.firstName}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        setIsSending={() => {}}
        timerSeconds={timerSeconds}
        isTimerRunning={isTimerRunning}
        onToggleTimer={toggleTimer}
        onFinalizeTimer={finalizeTimer}
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
        isRestoringTimer={isRestoringTimer}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        editingMessageId={editingMessageId}
        editingText={editingText}
        onEditMessage={handleEditMessage}
        onCancelEdit={() => {
          setEditingMessageId(null);
          setEditingText('');
        }}
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
          fileName={messages.find(m => m.imageUrl === imagePreviewSrc)?.fileName}
          onClose={() => setImagePreviewSrc(null)}
        />
      )}
    </div>
  );
};

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;