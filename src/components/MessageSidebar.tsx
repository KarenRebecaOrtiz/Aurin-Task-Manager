'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { collection, doc, query, serverTimestamp, setDoc, getDoc, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { motion } from 'framer-motion';
import ImagePreviewOverlay from './ImagePreviewOverlay';
import { InputMessage } from './ui/InputMessage';
import styles from './ChatSidebar.module.scss';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import UserAvatar from './ui/UserAvatar';
import LoadMoreButton from './ui/LoadMoreButton';
import DatePill from './ui/DatePill';
import PrivateMessageActionMenu from './ui/PrivateMessageActionMenu';
import { usePrivateMessagePagination } from '@/hooks/usePrivateMessagePagination';
import { useScrollDetection } from '@/hooks/useScrollDetection';
import { usePrivateMessageActions } from '@/hooks/usePrivateMessageActions';
import { useEncryption } from '@/hooks/useEncryption';
import { useMessageDrag } from '@/hooks/useMessageDrag';
import { usePrivateMessageStore } from '@/stores/privateMessageStore';
import { useSidebarManager } from '@/hooks/useSidebarManager';
import { useShallow } from 'zustand/react/shallow';
import { Message } from '@/types';

// Función para generar conversationId de manera consistente
const generateConversationId = (userId1: string, userId2: string): string => {
  // Ordenar los IDs para que siempre sea el mismo conversationId
  const sortedIds = [userId1, userId2].sort();
  return `conversation_${sortedIds[0]}_${sortedIds[1]}`;
};

interface UserCard {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface MessageSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  receiver: UserCard;
  conversationId: string;
}

const MessageSidebar: React.FC<MessageSidebarProps> = ({
  isOpen,
  onClose,
  receiver,
  conversationId,
}) => {
  const { user } = useUser();
  const { userId: currentUserId } = useClerkAuth();
  
  // Usar el conversationId correcto generado dinámicamente
  const correctConversationId = generateConversationId(currentUserId || '', receiver.id);
  
  // NUEVO: Usar el hook de cifrado existente
  const { encryptMessage, decryptMessage } = useEncryption(correctConversationId);

  // NUEVO: Store para mensajes privados
  const {
    optimisticMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
  } = usePrivateMessageStore(
    useShallow(state => ({
      optimisticMessages: state.optimisticMessages,
      addOptimisticMessage: state.addOptimisticMessage,
      updateOptimisticMessage: state.updateOptimisticMessage,
    }))
  );

  // NUEVO: paginación y scroll
  const {
    messages: paginatedMessages,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
  } = usePrivateMessagePagination({
    conversationId: correctConversationId,
    decryptMessage,
  });

  // NUEVO: acciones de mensaje unificadas
  const {
    sendMessage,
    deleteMessage,
    editMessage,
    resendMessage,
    isSending,
  } = usePrivateMessageActions({
    conversationId: correctConversationId,
    senderId: currentUserId || '',
    receiverId: receiver.id,
    senderName: user?.firstName || 'Yo',
    encryptMessage,
    addOptimisticMessage,
    updateOptimisticMessage,
  });

  // Combinar mensajes paginados con optimistas
  const allMessages = React.useMemo(() => {
    const optimisticArray = Object.values(optimisticMessages);
    
    // Crear un mapa de mensajes optimistas por clientId para evitar duplicados
    const optimisticMap = new Map(optimisticArray.map(msg => [msg.clientId, msg]));
    
    // Combinar mensajes paginados con optimistas, priorizando optimistas
    const combinedMessages = paginatedMessages.map(msg => 
      optimisticMap.has(msg.clientId) ? optimisticMap.get(msg.clientId)! : msg
    );
    
    // Agregar mensajes optimistas que no están en paginados (nuevos mensajes)
    const newOptimisticMessages = optimisticArray.filter(msg => 
      !paginatedMessages.some(paginatedMsg => paginatedMsg.clientId === msg.clientId)
    );
    
    const allCombined = [...combinedMessages, ...newOptimisticMessages];
    
    return allCombined.sort((a, b) => {
      const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : 
        (a.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
      const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : 
        (b.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
  }, [paginatedMessages, optimisticMessages]);

  // Agrupación por fecha con DatePill
  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; messages: Message[]; groupIndex: number }[] = [];
    let lastDate = '';
    let groupIndex = 0;
    allMessages.forEach((msg) => {
      const date = msg.timestamp
        ? (msg.timestamp instanceof Date
            ? msg.timestamp
            : (msg.timestamp as { toDate?: () => Date; seconds?: number }).toDate?.() || new Date((msg.timestamp as { seconds: number }).seconds * 1000))
        : new Date();
      const dateStr = date.toDateString();
      if (dateStr !== lastDate) {
        groups.push({ date: dateStr, messages: [msg], groupIndex });
        lastDate = dateStr;
        groupIndex++;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  }, [allMessages]);

  // Scroll infinito
  const { containerRef } = useScrollDetection({
    onLoadMore: loadMoreMessages,
    hasMore,
    isLoadingMore,
    threshold: 0.1, // Cargar más cuando el usuario está cerca del tope
  });

  // Usar containerRef para el chat
  useEffect(() => {
    if (containerRef.current && chatRef.current) {
      containerRef.current = chatRef.current;
    }
  }, [containerRef]);



  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [messageSent, setMessageSent] = useState(false); // Indicador de mensaje enviado
  const [isOffline, setIsOffline] = useState(false); // Indicador de sin conexión
  const [messageDelivered, setMessageDelivered] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const lastScrollTop = useRef(0);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Usar el hook para manejar un solo sidebar abierto
  const { handleClose } = useSidebarManager({
    isOpen,
    sidebarType: 'message',
    sidebarId: correctConversationId,
    onClose,
  });

  // Función para detectar si es móvil
  const isMobile = () => window.innerWidth < 768;

  // Body scroll lock effect
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Lock body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore body scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';

        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Efecto para marcar notificaciones como leídas cuando se abre el sidebar
  useEffect(() => {
    if (isOpen && user?.id) {
      // Mark private message notifications as read
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('conversationId', '==', conversationId),
        where('recipientId', '==', user.id),
        where('read', '==', false)
      );
      getDocs(notificationsQuery).then((snapshot) => {
        const updatePromises = snapshot.docs.map((notifDoc) =>
          updateDoc(doc(db, 'notifications', notifDoc.id), { read: true })
        );
        Promise.all(updatePromises);
      });
    }
  }, [isOpen, user?.id, conversationId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatRef.current) {
      const chat = chatRef.current;
      const isAtBottom = () => chat.scrollHeight - chat.scrollTop - chat.clientHeight < 100; // Aumentar threshold
      const wasAtBottom = lastScrollTop.current >= chat.scrollHeight - chat.clientHeight - 150; // Verificar si estaba cerca del fondo
      
      // Solo hacer scroll si estaba cerca del fondo o si es un mensaje propio
      const shouldScroll = isAtBottom() || wasAtBottom || 
        (allMessages.length > 0 && allMessages[allMessages.length - 1]?.senderId === currentUserId);
      
      if (shouldScroll) {
        // Usar requestAnimationFrame para un scroll más suave
        requestAnimationFrame(() => {
          chat.scrollTop = chat.scrollHeight;
        });
      }
    }
  }, [allMessages, currentUserId]);

  // Controlar estado de carga de mensajes
  useEffect(() => {
    if (allMessages.length > 0 || paginatedMessages.length > 0) {
      setIsLoadingMessages(false);
    }
  }, [allMessages, paginatedMessages]);

  // Marcar mensajes como leídos cuando se abre el sidebar
  useEffect(() => {
    if (isOpen && currentUserId && receiver.id) {
      const markMessagesAsRead = async () => {
        try {
          // Marcar todos los mensajes del otro usuario como leídos
          const unreadMessages = allMessages.filter(message => 
            message.senderId !== currentUserId && !message.read
          );
          
          if (unreadMessages.length > 0) {
            // Marcar cada mensaje como leído
            const markPromises = unreadMessages.map(message => 
              updateDoc(doc(db, `conversations/${correctConversationId}/messages`, message.id), {
                read: true,
              })
            );
            
            await Promise.all(markPromises);
            console.log('[MessageSidebar] Marked', unreadMessages.length, 'messages as read for conversation:', correctConversationId);
          }
        } catch (error) {
          console.error('[MessageSidebar] Error marking messages as read:', error);
        }
      };
      
      markMessagesAsRead();
    }
  }, [isOpen, currentUserId, receiver.id, allMessages, correctConversationId]);

  // Scroll detection for down arrow
  useEffect(() => {
    const chat = chatRef.current;
    if (!chat) return;

    const handleScroll = () => {
      lastScrollTop.current = chat.scrollTop;
    };

    chat.addEventListener('scroll', handleScroll);
    return () => chat.removeEventListener('scroll', handleScroll);
  }, []);

  // Click outside para cerrar sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Initialize conversation and listen for real-time updates
  useEffect(() => {
    if (!isOpen || !currentUserId || !receiver.id || !user?.id || !correctConversationId) {
      return;
    }

    const initConversation = async () => {
      try {
        // Ensure conversation document exists
        const conversationRef = doc(db, 'conversations', correctConversationId);
        const conversationDoc = await getDoc(conversationRef);

        if (!conversationDoc.exists()) {
          // Create conversation document
          await setDoc(conversationRef, {
            participants: [currentUserId, receiver.id],
            createdAt: serverTimestamp(),
            lastMessage: null,
            lastViewedBy: {},
          });
        } else {
          // Update last viewed timestamp for current user
          await updateDoc(conversationRef, {
            [`lastViewedBy.${currentUserId}`]: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error('[MessageSidebar] Error initializing conversation:', error);
      }
    };

    initConversation();


  }, [isOpen, currentUserId, receiver.id, correctConversationId, user?.id]);

  // Detectar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    // Verificar estado inicial
    setIsOffline(!navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      // Actualizar optimistamente en el store - como en ChatSidebar
      usePrivateMessageStore.getState().removeMessage(messageId);
      console.log('[MessageSidebar] Message deleted successfully:', messageId);
    } catch (error) {
      console.error('[MessageSidebar] Error deleting message:', error);
      alert('Error al eliminar el mensaje');
    }
  };



  const handleResendMessage = async (message: Message) => {
    try {
      await resendMessage(message);
      } catch (error) {
      console.error('[MessageSidebar] Error resending message:', error);
      alert('Error al reintentar el envío');
    }
  };

  const handleCopyMessage = (message: Message) => {
    const textToCopy = message.text || '';
    navigator.clipboard.writeText(textToCopy).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  };

  const handleDownloadFile = (message: Message) => {
    if (message.imageUrl || message.fileUrl) {
      const link = document.createElement('a');
      link.href = message.imageUrl || message.fileUrl || '';
      link.download = message.fileName || 'archivo';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleQuoteMessage = (message: Message) => {
    // Crear un objeto replyTo limpio sin campos undefined
    const cleanReplyTo = {
      id: message.id,
      senderName: message.senderName || 'Usuario', // Asegurar que senderName no sea undefined
      text: message.text,
      imageUrl: message.imageUrl || null, // Asegurar que no sea undefined
    };
    
    const messageWithCleanReply = {
      ...message,
      replyTo: cleanReplyTo
    };
    
    setReplyingTo(messageWithCleanReply);
    console.log('[MessageSidebar] Quoting message:', messageWithCleanReply);
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    try {
      // NO actualizar optimistamente - como en ChatSidebar
      // El listener de tiempo real se encargará de actualizar la UI
      await editMessage(messageId, newText);
      setEditingMessageId(null);
      setEditingText('');
      console.log('[MessageSidebar] Message edited successfully:', messageId);
    } catch (error) {
      console.error('[MessageSidebar] Error editing message:', error);
      alert('Error al editar el mensaje');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const animateClick = (element: HTMLElement) => {
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      element.style.transform = '';
    }, 150);
  };

  // Función para manejar el envío de mensajes con el senderId correcto
  const handleSendMessage = useCallback(async (
    messageData: Partial<Message>,
  ) => {
    if (!currentUserId) return;
    const messageWithReply = {
      ...messageData,
      senderId: currentUserId, // Usar el ID del usuario actual
      senderName: user?.firstName || 'Usuario',
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderName,
        text: replyingTo.text,
        imageUrl: replyingTo.imageUrl,
      } : null,
    };
    await sendMessage(messageWithReply);
    setReplyingTo(null);
    
    // Mostrar indicador de mensaje enviado
    setMessageSent(true);
    setTimeout(() => setMessageSent(false), 2000); // Ocultar después de 2 segundos
    
    // Simular mensaje entregado después de 1 segundo
    setTimeout(() => {
      setMessageDelivered(true);
      setTimeout(() => setMessageDelivered(false), 2000); // Ocultar después de 2 segundos
    }, 1000);
  }, [currentUserId, user?.firstName, replyingTo, sendMessage]);

  // Memoizar el callback de reply para evitar re-renders
  const handleReplyActivated = useCallback((messageId: string) => {
    const messageToReply = allMessages.find(msg => msg.id === messageId);
    if (messageToReply) {
      handleQuoteMessage(messageToReply);
      console.log('[MessageSidebar] Reply activated for message:', messageToReply.id);
    }
  }, [allMessages]);

  const {
    isDraggingMessage,
    draggedMessageId,
    dragOffset,
    handleMessageDragStart,
  } = useMessageDrag({
    onReplyActivated: handleReplyActivated,
  });



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
                          onClick={handleClose}
            whileTap={{ scale: 0.95, opacity: 0.8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
          </motion.div>
          <div className={styles.breadcrumb}>
            Conversación con {receiver.fullName}
          </div>
        </div>
                <div className={styles.headerSection}>
          <div className={styles.headerAvatar}>
            <UserAvatar
              userId={receiver.id}
              imageUrl={receiver.imageUrl}
              userName={receiver.fullName}
              size="medium"
              showStatus={true}
            />
      </div>
          <div className={styles.headerInfo}>
            <div className={styles.title}>
              {receiver.fullName}
              
            </div>
            <div className={styles.description}>
              {receiver.role}
            </div>
            {/* {unreadCount > 0 && ( // Eliminado
              <div className={styles.unreadBadge}> // Eliminado
                {unreadCount} {unreadCount === 1 ? 'mensaje' : 'mensajes'} no leído{unreadCount === 1 ? '' : 's'} // Eliminado
              </div> // Eliminado
            )} // Eliminado */}
            {isOffline && (
              <div className={styles.offlineIndicator}>
                ⚠️ Sin conexión
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.chat} ref={chatRef} id="chat-container">
        {isLoadingMessages && allMessages.length === 0 && (
          <div className={styles.loadingMessages}>
            <div className={styles.skeletonMessage}>
              <div className={styles.skeletonAvatar}></div>
              <div className={styles.skeletonContent}>
                <div className={styles.skeletonName}></div>
                <div className={styles.skeletonText}></div>
              </div>
            </div>
            <div className={styles.skeletonMessage}>
              <div className={styles.skeletonAvatar}></div>
              <div className={styles.skeletonContent}>
                <div className={styles.skeletonName}></div>
                <div className={styles.skeletonText}></div>
              </div>
            </div>
            <div className={styles.skeletonMessage}>
              <div className={styles.skeletonAvatar}></div>
              <div className={styles.skeletonContent}>
                <div className={styles.skeletonName}></div>
                <div className={styles.skeletonText}></div>
              </div>
            </div>
          </div>
        )}
        {allMessages.length === 0 && !isLoadingMessages && (
          <div className={styles.noMessages}>No hay mensajes en esta conversación.</div>
        )}
        {/* {isTyping && ( // Eliminado
          <div className={styles.typingIndicator}> // Eliminado
            <div className={styles.typingDots}> // Eliminado
              <span></span> // Eliminado
              <span></span> // Eliminado
              <span></span> // Eliminado
            </div> // Eliminado
            <span className={styles.typingText}>{receiver.fullName} está escribiendo...</span> // Eliminado
          </div> // Eliminado
        )} */}
        {groupedMessages.map((group) => {
          // Validación defensiva para evitar "Invalid time value"
          const dateKey = typeof group.date === 'string' && !isNaN(new Date(group.date).getTime())
            ? `${new Date(group.date).toISOString()}-${group.groupIndex}`
            : `invalid-date-${group.groupIndex}`; // Usar índice único del grupo

          return (
            <React.Fragment key={dateKey}>
              {group.messages.map((message, messageIndex) => {
                let msgDate: Date;
                if (message.timestamp instanceof Date) {
                  msgDate = message.timestamp;
                } else if (message.timestamp && typeof message.timestamp.toDate === 'function') {
                  msgDate = message.timestamp.toDate();
                } else {
                  msgDate = new Date();
                }
                
                return (
                  <div key={`${message.id}-${message.clientId}-${messageIndex}`}>
                    <div
                      data-message-id={message.id}
                      className={`${styles.message} ${message.isPending ? styles.pending : ''} ${
                        isDraggingMessage && draggedMessageId === message.id ? styles.dragging : ''
              }`}
              style={{
                        transform: isDraggingMessage && draggedMessageId === message.id 
                  ? `translateX(-${dragOffset}px)` 
                  : 'translateX(0)',
                        transition: isDraggingMessage && draggedMessageId === message.id 
                  ? 'none' 
                  : 'transform 0.3s ease-out'
              }}
                      data-drag-threshold={isDraggingMessage && draggedMessageId === message.id && dragOffset >= 40 ? 'true' : 'false'}
                      onMouseDown={(e) => handleMessageDragStart(message.id, e)}
                      onTouchStart={(e) => handleMessageDragStart(message.id, e)}
            >
              <UserAvatar
                        userId={message.senderId}
                        imageUrl={message.senderId === currentUserId ? user?.imageUrl : receiver.imageUrl}
                        userName={message.senderId === currentUserId ? (user?.firstName || 'Yo') : receiver.fullName}
                size="medium"
                showStatus={true}
              />
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <div className={styles.sender}>
                            {message.senderId === currentUserId ? 'Tú' : receiver.fullName}
                  </div>
                  <div className={styles.timestampWrapper}>
                    <span 
                      className={styles.timestamp}
                      title={`${msgDate.toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/Mexico_City',
                      })}`}
                    >
                      {msgDate.toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/Mexico_City',
                      })}
                    </span>
                                                        {message.senderId === currentUserId && !message.isPending && (
                              <PrivateMessageActionMenu
                                message={message}
                                userId={currentUserId}

                                onEdit={() => {
                                  setEditingMessageId(message.id);
                                  setEditingText(message.text || '');
                                }}
                                onDelete={() => handleDeleteMessage(message.id)}
                                onResend={() => handleResendMessage(message)}
                                onCopy={() => handleCopyMessage(message)}
                                onDownload={() => handleDownloadFile(message)}
                                animateClick={animateClick}
                                actionMenuRef={actionMenuRef}
                                actionButtonRef={() => {}}
                              />
                            )}
                  </div>
                </div>
                
                {/* Estructura jerárquica: Cita 1, Archivo 2, Mensaje 3 */}
                <div className={styles.messageContentWrapper}>
                  {/* 1. Cita (replyTo) - PRIMERO */}
                          {message.replyTo && (
                    <div className={styles.replyIndicator}>
                      <div className={styles.replyContent}>
                        <div className={styles.replyHeader}>
                                  <span className={styles.replyLabel}>Respondiendo a {message.replyTo.senderName}</span>
                        </div>
                        <div className={styles.replyPreview}>
                                  {message.replyTo.imageUrl && (
                            <Image
                                      src={message.replyTo.imageUrl}
                              alt="Imagen"
                              width={24}
                              height={24}
                              className={styles.replyImage}
                              draggable="false"
                            />
                          )}
                                  {message.replyTo.text && (
                            <span 
                              className={styles.replyText}
                              dangerouslySetInnerHTML={{ 
                                        __html: sanitizeHtml(message.replyTo.text, {
                                  allowedTags: ['strong', 'em', 'u', 'code'],
                                  allowedAttributes: {
                                    '*': ['style', 'class']
                                  },
                                  transformTags: {
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
                                        style: `font-family: monospace; background-color: #f3f4f6; padding: 1px 3px; border-radius: 2px; ${attribs.style || ''}`
                                      }
                                    })
                                  }
                                })
                              }}
                            />
                          )}
                                  {!message.replyTo.text && !message.replyTo.imageUrl && (
                            <span className={styles.replyText}>Mensaje</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Archivo adjunto - SEGUNDO */}
                            {message.imageUrl && (
                      <div className={styles.imageWrapper}>
                        <Image
                                  src={message.imageUrl}
                                  alt={message.fileName || 'Imagen'}
                          width={0}
                          height={0}
                          sizes="100vw"
                                className={`${styles.image} ${message.isPending ? styles.pendingImage : ''}`}
                                  onClick={() => !message.isPending && setImagePreviewSrc(message.imageUrl!)}
                                onError={() => console.warn('Image load failed', message.imageUrl)}
                          draggable="false"
                          style={{
                            width: 'auto',
                            height: 'auto',
                            maxWidth: '100%',
                            maxHeight: '300px',
                            objectFit: 'contain'
                          }}
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
                            )}

                  {/* 3. Mensaje de texto - TERCERO */}
                          {message.text && (
                    <div 
                      className={styles.messageText}
                      dangerouslySetInnerHTML={{ 
                                __html: sanitizeHtml(message.text, {
                          allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'code', 'span', 'div'],
                          allowedAttributes: {
                            '*': ['style', 'class']
                          },
                          transformTags: {
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
                        })
                      }}
                    />
                  )}
                        </div>
                </div>
              </div>
            </div>
          );
        })}
              <DatePill date={new Date(group.date)} />
            </React.Fragment>
          );
        })}

        <LoadMoreButton
          onClick={loadMoreMessages}
          isLoading={isLoadingMore}
          hasMoreMessages={hasMore}
          className={styles.loadMoreButtonContainer}
        />
      </div>

            <InputMessage
        userId={currentUserId}
        userFirstName={user?.firstName}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        containerRef={sidebarRef}
        replyingTo={replyingTo ? { 
          ...replyingTo, 
          text: replyingTo.text || '',
          timestamp: replyingTo.timestamp instanceof Date 
            ? Timestamp.fromDate(replyingTo.timestamp)
            : replyingTo.timestamp
        } : null}
        onCancelReply={() => setReplyingTo(null)}
        editingMessageId={editingMessageId}
        editingText={editingText}
        onEditMessage={handleEditMessage}
        onCancelEdit={handleCancelEdit}
        conversationId={correctConversationId}
      />
      
      {messageSent && (
        <div className={styles.messageSentIndicator}>
          ✓ Mensaje enviado
        </div>
      )}
      
      {messageDelivered && (
        <div className={styles.messageDeliveredIndicator}>
          ✓✓ Mensaje entregado
        </div>
      )}

      {imagePreviewSrc && (
        <ImagePreviewOverlay
          src={imagePreviewSrc}
          alt="Vista previa de imagen"
          onClose={() => setImagePreviewSrc(null)}
        />
      )}
    </motion.div>
  );
};

export default MessageSidebar;
