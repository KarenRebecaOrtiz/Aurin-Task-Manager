// src/components/ChatSidebar.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, memo, forwardRef, Dispatch, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { useUser } from '@clerk/nextjs';
import { Timestamp, doc, serverTimestamp, collection, addDoc, updateDoc, query, where, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

import ImagePreviewOverlay from './ImagePreviewOverlay';
import InputChat from './ui/InputChat';
import DatePill from './ui/DatePill';
import styles from './ChatSidebar.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import Loader from '@/components/Loader';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from '@firebase/ai';
import { ai } from '@/lib/firebase';
import UserAvatar from './ui/UserAvatar';
import { useEncryption } from '@/hooks/useEncryption';
import { updateTaskActivity } from '@/lib/taskUtils';
import { useMessagePagination } from '@/hooks/useMessagePagination';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useMessageDrag } from '@/hooks/useMessageDrag';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { useTimerStoreHook } from '@/hooks/useTimerStore';
import { useDataStore } from '@/stores/dataStore';
import { useSidebarManager } from '@/hooks/useSidebarManager';
import LoadMoreButton from './ui/LoadMoreButton';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useShallow } from 'zustand/react/shallow';


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

const intervalLabels = {
  '1day': 'último día',
  '3days': 'últimos 3 días',
  '1week': 'última semana',
  '1month': 'último mes',
  '6months': 'últimos 6 meses',
  '1year': 'último año'
};

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
      const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

      const handleCopyMessage = useCallback(async (messageText: string) => {
        try {
          await navigator.clipboard.writeText(messageText);
          console.log('[MessageItem] Mensaje copiado al portapapeles');
        } catch (error) {
          console.error('[MessageItem] Error copiando mensaje:', error);
          const textArea = document.createElement('textarea');
          textArea.value = messageText;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      }, []);

      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
            setActionMenuOpenId(null);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, [setActionMenuOpenId]);

      const formatTimeToHHMMSS = useCallback((hours: number): string => {
        const totalSeconds = Math.round(hours * 3600);
        const hh = Math.floor(totalSeconds / 3600);
        const mm = Math.floor((totalSeconds % 3600) / 60);
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }, []);

      const renderMessageContent = useCallback(() => {
        const contentElements: React.ReactNode[] = [];

        if (message.hours) {
          const formattedTime = formatTimeToHHMMSS(message.hours);
          contentElements.push(
            <div key="time" className={styles.timeMessage}>
              <Image src="/Clock.svg" alt="Tiempo" width={16} height={16} />
              <span>{formattedTime}</span>
            </div>
          );
          return contentElements;
        }

        if (message.replyTo) {
          contentElements.push(
            <div key="reply" className={styles.replyContainer}>
              <div className={styles.replyContent}>
                <div className={styles.replyHeader}>
                  <span className={styles.replyLabel}>Respondiendo a {message.replyTo.senderName}</span>
                </div>
                <div className={styles.replyPreview}>
                  {message.replyTo.imageUrl && (
                    <Image
                      src={message.replyTo.imageUrl}
                      alt="Imagen de respuesta"
                      width={40}
                      height={40}
                      className={styles.replyImage}
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
      }, [message, setImagePreviewSrc, formatTimeToHHMMSS, styles]);

      if (message.isDatePill) {
        return (
          <div className={styles.datePill}>
            <span className={styles.datePillText}>{message.text}</span>
          </div>
        );
      }

      return (
        <motion.div
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
          initial={isNewChunk && !isLoadingChunk ? { opacity: 0, y: -30, scale: 0.95 } : false}
          animate={isNewChunk && !isLoadingChunk ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
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
                {!message.isPending && (
                  <div className={styles.actionContainer}>
                    <motion.button
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActionMenuPosition({
                          top: rect.bottom + window.scrollY,
                          left: rect.left + window.scrollX - 150, // Adjust left position as needed for alignment
                        });
                        setActionMenuOpenId(actionMenuOpenId === message.id ? null : message.id);
                      }}
                      whileTap={{ scale: 0.95, opacity: 0.8 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
                    </motion.button>
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
          {actionMenuOpenId === message.id && ReactDOM.createPortal(
            <motion.div
              className={styles.actionDropdown}
              ref={actionMenuRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: actionMenuPosition.top,
                left: actionMenuPosition.left,
                zIndex: 1000,
              }}
            >
              <div className={styles.actionDropdownContent}>
                <motion.div
                  className={styles.actionDropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyMessage(message.text || '');
                    setActionMenuOpenId(null);
                  }}
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  Copiar
                </motion.div>
                {message.senderId === userId && (
                  <>
                    {!message.hours && (
                      <motion.div
                        className={styles.actionDropdownItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMessageId(message.id);
                          setEditingText(message.text || '');
                          setActionMenuOpenId(null);
                        }}
                        whileTap={{ scale: 0.95, opacity: 0.8 }}
                      >
                        Editar
                      </motion.div>
                    )}
                    <motion.div
                      className={styles.actionDropdownItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMessage(message.id);
                        setActionMenuOpenId(null);
                      }}
                      whileTap={{ scale: 0.95, opacity: 0.8 }}
                    >
                      Eliminar
                    </motion.div>
                  </>
                )}
                {(message.imageUrl || message.fileUrl) && (
                  <motion.div
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
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                  >
                    Descargar Archivo
                  </motion.div>
                )}
              </div>
            </motion.div>,
            document.body
          )}
        </motion.div>
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



const ChatSidebar: React.FC<ChatSidebarProps> = memo(
  ({
    isOpen,
    onClose,
    users = [],
  }) => {
    // Debug logging disabled to reduce console spam
  
    const { user } = useUser();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const { isAdmin, isLoading } = useAuth();
    
    // Usar el store para el estado del sidebar
    const chatSidebar = useSidebarStateStore(useShallow(state => state.chatSidebar));
    
    // Usar currentTask del store
    const task = chatSidebar.task;
    const clientName = chatSidebar.clientName;
    
    // Debug logging disabled to reduce console spam
    

    
    const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');
    const { markAsViewed } = useTaskNotifications();

    const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false);
    const [timerInput, setTimerInput] = useState('00:00');
    const [dateInput, setDateInput] = useState<Date>(new Date());
    const [commentInput, setCommentInput] = useState('');
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    // Usar task del store directamente
    const [activeCardDropdown, setActiveCardDropdown] = useState<'status' | 'team' | 'hours' | null>(null);
    const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
    const [isSummarizeDropdownOpen, setIsSummarizeDropdownOpen] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [isDetailsDropdownOpen, setIsDetailsDropdownOpen] = useState(false);
          const [isLoadingChunk, setIsLoadingChunk] = useState(false);
    const [newChunkMessageIds, setNewChunkMessageIds] = useState<Set<string>>(new Set());

    const { addMessage, updateMessage } = useDataStore();
    
    // Usar el hook para manejar un solo sidebar abierto
    const { handleClose } = useSidebarManager({
      isOpen,
      sidebarType: 'chat',
      sidebarId: task?.id || '',
      onClose,
    });

    const {
      startTimer,
      pauseTimer,
      finalizeTimer,
      isTimerRunning,
      timerSeconds,
      isRestoringTimer,
    } = useTimerStoreHook(task?.id || '', user?.id || '');
    
    // Debug logging disabled to reduce console spam

    const lastMessageRef = useRef<HTMLDivElement>(null);
    const deletePopupRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const hoursDropdownRef = useRef<HTMLDivElement>(null);
    const teamDropdownRef = useRef<HTMLDivElement>(null);
    const timerPanelRef = useRef<HTMLDivElement>(null);
    const summarizeDropdownRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);

    const {
      messages,
      groupedMessages,
      isLoading: isLoadingMessages,
      isLoadingMore,
      hasMore,
      loadMoreMessages,
    } = useMessagePagination({
      taskId: task?.id || '',
      pageSize: 10,
      decryptMessage,
    });
    
    // Debug logging disabled to reduce console spam



    // Debug: Track component renders
    // console.log('[ChatSidebar] Component rendered'); // Comentado para reducir logs

    // Memoizar el callback de reply para evitar re-renders
    const handleReplyActivated = useCallback((messageId: string) => {
      const messageToReply = messages.find(msg => msg.id === messageId);
      if (messageToReply) {
        setReplyingTo(messageToReply);
        console.log('[ChatSidebar] Reply activated for message:', messageToReply.id);
      }
    }, [messages]);

    const {
      isDraggingMessage,
      draggedMessageId,
      dragOffset,
      handleMessageDragStart,
    } = useMessageDrag({
      onReplyActivated: handleReplyActivated,
    });

    useEffect(() => {
      if (!isOpen || !task.id) return;



      const taskRef = doc(db, 'tasks', task.id);
      
      const unsubscribe = onSnapshot(
        taskRef,
        (docSnap) => {
          if (docSnap.exists()) {

          } else {
            console.warn('[ChatSidebar] Task document does not exist:', task.id);
          }
        },
        (error) => {
          console.error('[ChatSidebar] Error in task onSnapshot:', error);
        }
      );

      return () => {
        unsubscribe();
      };
    }, [isOpen, task.id, task.status, task.priority]);

    const handleLoadMoreMessages = useCallback(async () => {
      console.log('[ChatSidebar] handleLoadMoreMessages called. hasMore:', hasMore, 'isLoadingMore:', isLoadingMore, 'isLoadingChunk:', isLoadingChunk);
      if (hasMore && !isLoadingMore && !isLoadingChunk) {
        setIsLoadingChunk(true);
        // Debug logging disabled to reduce console spam
        const currentMessageCount = messages.length;
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          await loadMoreMessages();
          setTimeout(() => {
            const newMessages = messages.slice(currentMessageCount);
            const newMessageIds = new Set<string>(newMessages.map(msg => msg.id));
            setNewChunkMessageIds(newMessageIds);
            setTimeout(() => {
              setNewChunkMessageIds(new Set<string>());
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
      addOptimisticMessage: (message: Message) => addMessage(task.id, message),
      updateOptimisticMessage: (clientId: string, updates: Partial<Message>) => updateMessage(task.id, clientId, updates),
    });

    const isCreator = useMemo(() => user?.id === task.CreatedBy, [user?.id, task.CreatedBy]);
    const isInvolved = useMemo(() => 
      user?.id &&
      (task.AssignedTo.includes(user.id) || task.LeadedBy.includes(user.id) || task.CreatedBy === user.id),
      [user?.id, task.AssignedTo, task.LeadedBy, task.CreatedBy]
    );
    const canViewTeamAndHours = useMemo(() => isInvolved || isAdmin, [isInvolved, isAdmin]);
    const statusOptions = useMemo(() => ['Por Iniciar', 'En Proceso', 'Backlog', 'Por Finalizar', 'Finalizado', 'Cancelado'], []);
    
    // Memoizar computados costosos
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
        const totalSeconds = Math.round(hoursMap[userId] * 3600);
        const hh = Math.floor(totalSeconds / 3600);
        const mm = Math.floor((totalSeconds % 3600) / 60);
        return {
          id: userId,
          firstName: u.firstName || u.fullName.split(' ')[0],
          imageUrl: u.imageUrl,
          hours: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
        };
      });
    }, [messages, users]);


    const isMobile = useCallback(() => window.innerWidth < 768, []);

    const toggleBodyScroll = useCallback((disable: boolean) => {
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
    }, []);

    useEffect(() => {
      toggleBodyScroll(isOpen);
      return () => {
        if (isOpen) {
          toggleBodyScroll(false);
        }
      };
    }, [isOpen, toggleBodyScroll]);

    // Click outside para cerrar sidebar
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
          // No cerrar si hay modales abiertos
                  if (!isDeletePopupOpen && !isTimerPanelOpen && !isSummarizeDropdownOpen) {
          handleClose();
        }
        }
      };
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
          }, [isOpen, handleClose, isDeletePopupOpen, isTimerPanelOpen, isSummarizeDropdownOpen]);

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

    const handleClick = useCallback((element: HTMLElement) => {
      element.animate(
        {
          scale: [1, 0.95, 1],
          opacity: [1, 0.8, 1],
        },
        { duration: 150, easing: 'ease-out' }
      );
    }, []);

    const handleStatusChange = useCallback(async (status: string) => {
      if (!isCreator && !isAdmin) {
        console.warn('[ChatSidebar] User not authorized to change status');
        return;
      }
      if (!user?.id) {
        console.error('[ChatSidebar] No user ID available');
        return;
      }
      try {
        const taskRef = doc(db, 'tasks', task.id);
        await updateDoc(taskRef, {
          status,
          lastActivity: serverTimestamp(),
        });
        // Actualizar status en el store
        console.log('[ChatSidebar] Status updated in store');
        setActiveCardDropdown(null);
        const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
        if (task.CreatedBy) recipients.add(task.CreatedBy);
        recipients.delete(user.id);
        for (const recipientId of recipients) {
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: user.id,
              recipientId,
              message: `${user.fullName || 'Usuario'} ha cambiado el estado de la tarea "${task.name}" a "${status}"`,
              timestamp: serverTimestamp(),
              read: false,
              type: 'task_status_changed',
              taskId: task.id,
            });
          } catch (error) {
            console.warn('[ChatSidebar] Error sending notification:', error);
          }
        }
        console.log('[ChatSidebar] Task status updated successfully:', {
          taskId: task.id,
          newStatus: status,
          notifiedUsers: Array.from(recipients)
        });
      } catch (error) {
        console.error('[ChatSidebar] Error updating task status:', error);
        // Actualizar task en el store
        console.log('[ChatSidebar] Task updated in store');
        setActiveCardDropdown(null);
      }
    }, [isCreator, isAdmin, user?.id, user?.fullName, task]);

    const handleDeleteTask = useCallback(async () => {
      if (!user?.id || deleteConfirm.toLowerCase() !== 'eliminar') {
        return;
      }
      setIsDeleting(true);
      try {
        setIsDeletePopupOpen(false);
        setDeleteConfirm('');
        handleClose();
      } catch (error) {
        console.error('Error closing task', error);
        alert(`Error al cerrar la tarea: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
      } finally {
        setIsDeleting(false);
      }
    }, [user?.id, deleteConfirm, handleClose]);

    const handleSendMessage = useCallback(async (
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
    }, [user?.id, user?.firstName, task, replyingTo, sendMessage]);

    const handleDeleteMessage = useCallback(async (messageId: string) => {
      try {
        await deleteMessage(messageId);
        useDataStore.getState().deleteMessage(task.id, messageId);
        console.log('[ChatSidebar] Mensaje eliminado:', messageId);
      } catch (error) {
        console.error('[ChatSidebar] Error eliminando mensaje:', error);
      }
    }, [deleteMessage, task.id]);

    const handleGenerateSummary = useCallback(async (interval: string) => {
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
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 1000);
            break;
          case '1month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 1000);
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
    }, [user?.id, messages, isGeneratingSummary, handleSendMessage]);

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
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 1000);
          break;
        case '1month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 1000);
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

    const handleCancelReply = useCallback(() => {
      setReplyingTo(null);
    }, []);

    const toggleTimer = useCallback(async (e: React.MouseEvent) => {
      if (!user?.id || !task.id) {
        console.error('[ChatSidebar:ToggleTimer] Missing user ID or task ID:', { userId: user?.id, taskId: task.id });
        return;
      }
      handleClick(e.currentTarget as HTMLElement);
      console.log('[ChatSidebar] 🎯 Toggle timer:', {
        isRunning: isTimerRunning,
        currentSeconds: timerSeconds,
        userId: user.id,
        taskId: task.id
      });
      try {
        if (isTimerRunning) {
          console.log('[ChatSidebar] ⏸️ Pausando timer...');
          await pauseTimer();
          console.log('[ChatSidebar] ✅ Timer pausado correctamente');
        } else {
          console.log('[ChatSidebar] ▶️ Iniciando/reanudando timer...');
          await startTimer();
          console.log('[ChatSidebar] ✅ Timer iniciado correctamente');
        }
      } catch (error) {
        console.error('[ChatSidebar] ❌ Error en toggle timer:', error);
      }
    }, [user?.id, task.id, isTimerRunning, timerSeconds, startTimer, pauseTimer, handleClick]);

    const handleFinalizeTimer = useCallback(async () => {
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
      console.log('[ChatSidebar] 🛑 Finalizando timer con doble click:', {
        totalSeconds: timerSeconds,
        hours,
        timeEntry,
        displayHours,
        displayMinutes
      });
      try {
        console.log('[ChatSidebar] 📤 Enviando mensaje de tiempo...');
        await sendTimeMessage(user.id, user.firstName || "Usuario", hours, timeEntry);
        console.log('[ChatSidebar] ✅ Mensaje de tiempo enviado correctamente');
        await finalizeTimer();
        console.log('[ChatSidebar] 🎉 Timer finalizado y tiempo registrado exitosamente:', timeEntry);
      } catch (error) {
        console.error('[ChatSidebar] ❌ Error finalizando timer:', error);
        alert(`Error al registrar el tiempo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }, [user?.id, user?.firstName, task.id, timerSeconds, isTimerRunning, sendTimeMessage, finalizeTimer]);

    const handleAddTimeEntry = useCallback(async (time?: string, date?: Date, comment?: string) => {
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
    }, [user?.id, user?.firstName, timerInput, dateInput, commentInput, sendTimeMessage]);

    const formatDate = useCallback((date: string | Timestamp | null) => {
      if (!date) return 'N/A';
      let jsDate: Date;
      if (typeof date === 'string') {
        jsDate = new Date(date);
      } else if (date instanceof Timestamp) {
        jsDate = date.toDate();
      } else {
        return 'Invalid Date';
      }
      if (isNaN(jsDate.getTime())) return 'Invalid Date';
      return jsDate.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
    }, []);

    const totalHours = useMemo(() => {
      const timeMessages = messages.filter((msg) => typeof msg.hours === 'number' && msg.hours > 0);
      let totalSeconds = 0;
      timeMessages.forEach((msg) => {
        totalSeconds += Math.round(msg.hours! * 3600);
      });
      const hh = Math.floor(totalSeconds / 3600);
      const mm = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }, [messages]);

    useEffect(() => {
      if (isOpen && user?.id) {
        const batchOperations = async () => {
          try {
            const batch = writeBatch(db);
            let operationsCount = 0;
            const unreadMessages = messages.filter((msg) => !msg.read && !msg.isPending);
            unreadMessages.forEach((msg) => {
              if (operationsCount < 490) {
                batch.update(doc(db, `tasks/${task.id}/messages`, msg.id), { 
                  read: true,
                  lastModified: serverTimestamp()
                });
                operationsCount++;
              }
            });
            const lastNotificationCheck = localStorage.getItem(`lastNotificationCheck_${task.id}_${user.id}`);
            const shouldCheckNotifications = !lastNotificationCheck || 
              (Date.now() - parseInt(lastNotificationCheck)) > 5 * 60 * 1000;
            if (shouldCheckNotifications) {
              const notificationsQuery = query(
                collection(db, 'notifications'),
                where('taskId', '==', task.id),
                where('recipientId', '==', user.id),
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
            if (operationsCount > 0) {
              await batch.commit();
              console.log('[ChatSidebar] Operaciones batch completadas:', operationsCount);
            }
            await markAsViewed(task.id);
          } catch (error) {
            console.error('[ChatSidebar] Error en operaciones batch:', error);
          }
        };
        const timeoutId = setTimeout(batchOperations, 1500);
        return () => clearTimeout(timeoutId);
      }
    }, [isOpen, messages, user?.id, task.id, markAsViewed]);

    if (isLoading) {
      return <Loader />;
    }

    return (
      <motion.div
        className={`${styles.container} ${isOpen ? styles.open : ''}`}
        ref={sidebarRef}
        initial={isMobile() ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 }}
        animate={isOpen ? { y: 0, x: 0, opacity: 1 } : { y: isMobile() ? '100%' : 0, x: isMobile() ? 0 : '100%', opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className={styles.header}>
          <div className={styles.controls}>
            <motion.div
              className={styles.arrowLeft}
              onClick={(e) => {
                handleClick(e.currentTarget);
                onClose();
              }}
              whileTap={{ scale: 0.95, opacity: 0.8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
            </motion.div>
            <div className={styles.breadcrumb}>
              {clientName} {'>'} {task.project}
            </div>
            <div className={styles.dropdownContainer} ref={summarizeDropdownRef}>
              <motion.button
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
                whileTap={{ scale: 0.95, opacity: 0.8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <Image
                  src="/Robot.svg"
                  alt="Summarize"
                  width={16}
                  height={16}
                />
              </motion.button>
              {isSummarizeDropdownOpen && (
                <motion.div
                  className={styles.dropdownMenu}
                  role="menu"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  onClick={e => e.stopPropagation()}
                >
                  <motion.button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => handleGenerateSummary('1day')}
                    disabled={isGeneratingSummary || !hasDataForInterval('1day')}
                    role="menuitem"
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                  >
                    📅 1 día
                  </motion.button>
                  <motion.button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => handleGenerateSummary('3days')}
                    disabled={isGeneratingSummary || !hasDataForInterval('3days')}
                    role="menuitem"
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                  >
                    📅 3 días
                  </motion.button>
                  <motion.button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => handleGenerateSummary('1week')}
                    disabled={isGeneratingSummary || !hasDataForInterval('1week')}
                    role="menuitem"
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                  >
                    📅 1 semana
                  </motion.button>
                  <motion.button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => handleGenerateSummary('1month')}
                    disabled={isGeneratingSummary || !hasDataForInterval('1month')}
                    role="menuitem"
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                  >
                    📅 1 mes
                  </motion.button>
                  <motion.button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => handleGenerateSummary('6months')}
                    disabled={isGeneratingSummary || !hasDataForInterval('6months')}
                    role="menuitem"
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                  >
                    📅 6 meses
                  </motion.button>
                  <motion.button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => handleGenerateSummary('1year')}
                    disabled={isGeneratingSummary || !hasDataForInterval('1year')}
                    role="menuitem"
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                  >
                    📅 1 año
                  </motion.button>
                </motion.div>
              )}
            </div>
          </div>
          <motion.div
            className={styles.headerSection}
            onClick={(e) => {
              e.stopPropagation();
              setIsDetailsDropdownOpen(!isDetailsDropdownOpen);
            }}
            style={{ cursor: 'pointer' }}
            whileTap={{ scale: 0.95, opacity: 0.8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className={styles.title}>{task.name}</div>
            <div className={styles.description}>{task.description || 'Sin descripción'}</div>
            <motion.img
              src="/chevron-down.svg"
              alt="Ver detalles"
              width={16}
              height={16}
              className={`${styles.chevronIcon} ${isDetailsDropdownOpen ? styles.rotated : ''}`}
              animate={isDetailsDropdownOpen ? { rotate: 180 } : { rotate: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          </motion.div>
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
                    <motion.div
                      ref={statusDropdownRef}
                      className={styles.cardDropdown}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {statusOptions.map((status) => (
                        <motion.div
                          key={status}
                          className={styles.cardDropdownItem}
                          onClick={() => handleStatusChange(status)}
                          whileTap={{ scale: 0.95, opacity: 0.8 }}
                        >
                          {status}
                        </motion.div>
                      ))}
                    </motion.div>
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
                    <motion.div
                      ref={teamDropdownRef}
                      className={styles.cardDropdown}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {teamUsers.length > 0 ? (
                        teamUsers.map((u, index) => (
                          <motion.div
                            key={`${u.id}-${index}`}
                            className={styles.cardDropdownItem}
                            whileTap={{ scale: 0.95, opacity: 0.8 }}
                          >
                            <Image
                              src={u.imageUrl}
                              alt={u.firstName || 'Avatar del miembro'}
                              width={24}
                              height={24}
                              className={styles.avatar}
                            />
                            <span className={styles.teamUserName}>{u.firstName}</span>
                            <span className={styles.teamRole}>{u.role}</span>
                          </motion.div>
                        ))
                      ) : (
                        <motion.div className={styles.cardDropdownItem} whileTap={{ scale: 0.95, opacity: 0.8 }}>
                          No hay miembros asignados a esta tarea
                        </motion.div>
                      )}
                    </motion.div>
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
                    <motion.div
                      ref={hoursDropdownRef}
                      className={styles.cardDropdown}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {hoursByUser.length > 0 ? (
                        hoursByUser.map((u, index) => (
                          <motion.div
                            key={`${u.id}-${index}`}
                            className={styles.cardDropdownItem}
                            whileTap={{ scale: 0.95, opacity: 0.8 }}
                          >
                            <Image
                              src={u.imageUrl}
                              alt={u.firstName || 'Avatar del usuario'}
                              width={24}
                              height={24}
                              className={styles.avatar}
                            />
                            <span className={styles.hoursUserName}>{u.firstName}</span>
                            <span className={styles.hoursValue}>{u.hours}</span>
                          </motion.div>
                        ))
                      ) : (
                        <motion.div className={styles.cardDropdownItem} whileTap={{ scale: 0.95, opacity: 0.8 }}>
                          Aún no hay tiempo registrado en esta tarea
                        </motion.div>
                      )}
                    </motion.div>
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
          {groupedMessages.map((group, groupIndex) => {
            // Validación defensiva para evitar "Invalid time value"
            const dateKey = group.date instanceof Date && !isNaN(group.date.getTime())
              ? group.date.toISOString()
              : `invalid-date-${groupIndex}`; // Usar índice como fallback para fechas inválidas

            return (
              <React.Fragment key={dateKey}>
                {group.messages.map((message, messageIndex) => (
                <MessageItem
                    key={`${message.id}-${message.clientId}-${messageIndex}`}
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
                  ref={message.id === messages[0]?.id ? lastMessageRef : null}
                />
              ))}
              <DatePill date={group.date} />
            </React.Fragment>
            );
          })}

          <LoadMoreButton
            onClick={handleLoadMoreMessages}
            isLoading={isLoadingMore}
            hasMoreMessages={hasMore}
            className={styles.loadMoreButtonContainer}
          />

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
          onFinalizeTimer={handleFinalizeTimer}
          onToggleTimerPanel={() => setIsTimerPanelOpen(prev => !prev)}
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
          onEditMessage={editMessage}
          onCancelEdit={() => {
            setEditingMessageId(null);
            setEditingText('');
          }}
        />
        {isDeletePopupOpen && (
          <motion.div
            className={styles.deletePopupOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <motion.div
              className={styles.deletePopup}
              ref={deletePopupRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
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
                  <motion.button
                    className={styles.deleteConfirmButton}
                    onClick={handleDeleteTask}
                    disabled={deleteConfirm.toLowerCase() !== 'eliminar' || isDeleting}
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                  </motion.button>
                  <motion.button
                    className={styles.deleteCancelButton}
                    onClick={() => {
                      setIsDeletePopupOpen(false);
                      setDeleteConfirm('');
                    }}
                    disabled={isDeleting}
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    Cancelar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {imagePreviewSrc && (
          <ImagePreviewOverlay
            src={imagePreviewSrc}
            alt="Vista previa de imagen"
            fileName={messages.find(m => m.imageUrl === imagePreviewSrc)?.fileName}
            onClose={() => setImagePreviewSrc(null)}
          />
                )}
      </motion.div>
    );
  }
);

// Log adicional para verificar que el componente se exporta correctamente
console.log('[ChatSidebar] ✅ Component definition completed');

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;