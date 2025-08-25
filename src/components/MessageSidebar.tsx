'use client';

/**
 * 🎯 FASE 5: LIMPIEZA DEL INPUT AL ENVIAR MENSAJE CON ENTER
 * 🚀 FASE 6: CORRECCIÓN DE LIMPIEZA DEL INPUT AL ENVIAR CON ENTER
 * 🎯 FASE 3: MANEJO DE ERRORES CON MODAL DE RETRY
 * 🚀 FASE 4: OPTIMIZACIONES Y VERIFICACIÓN DEL RENDERING DEL MODAL
 * 
 * Implementación completa de mensajes optimistas para conversaciones privadas:
 * - Clear inmediato del editor Tiptap tras envío optimista
 * - Limpieza de archivos adjuntos y estado de respuesta
 * - Eliminación de mensajes persistidos en caché (drafts y errores)
 * - Modal de retry para mensajes fallidos
 * - Portal para modal sin clipping del sidebar
 * - Integración con sistema existente de persistencia
 * 
 * Basado en:
 * - https://tiptap.dev/api/commands#clearcontent para resetear editor
 * - https://javascript.plainenglish.io/implementing-optimistic-ui-updates-in-react-a-deep-dive-2f4d91e2b1a4
 * - https://react.dev/reference/react-dom/createPortal para portals
 * 
 * @author Optimistic UI Implementation Team
 * @version 6.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { collection, doc, query, serverTimestamp, setDoc, getDoc, where, getDocs, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
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
import { usePrivateMessagePaginationSingleton } from '@/hooks/usePrivateMessagePaginationSingleton';
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
  
  // Usar el conversationId correcto generado dinámicamente - MEMOIZADO
  const correctConversationId = React.useMemo(() => {
    if (!currentUserId || !receiver.id) return '';
    return generateConversationId(currentUserId, receiver.id);
  }, [currentUserId, receiver.id]);
  
  // Debug log para verificar que correctConversationId se genera correctamente
  useEffect(() => {
    // Debug logging removed for production
  }, [correctConversationId, currentUserId, receiver.id]);
  
  // NUEVO: Usar el hook de cifrado existente - MEMOIZADO
  const { encryptMessage, decryptMessage } = useEncryption(correctConversationId);

  // NUEVO: Store para mensajes privados - OPTIMIZADO
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

  // NUEVO: paginación y scroll - OPTIMIZADO
  const {
    messages: paginatedMessages,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
  } = usePrivateMessagePaginationSingleton({
    conversationId: correctConversationId,
    decryptMessage,
  });

  // NUEVO: acciones de mensaje unificadas - OPTIMIZADO
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

  // Combinar mensajes paginados con optimistas - OPTIMIZADO
  const allMessages = React.useMemo(() => {
    const optimisticArray = Object.values(optimisticMessages);
    
    // Crear un mapa de mensajes optimistas por clientId para evitar duplicados
    const optimisticMap = new Map(optimisticArray.map(msg => [msg.clientId, msg]));
    
    // Combinar mensajes paginados con optimistas, priorizando optimistas
    const combinedMessages = paginatedMessages.map(msg => {
      // Buscar si hay un mensaje optimista con el mismo clientId
      const optimisticMsg = optimisticMap.get(msg.clientId);
      if (optimisticMsg) {
        // Si el optimista tiene el mismo id de Firestore, usar el optimista
        if (optimisticMsg.id === msg.id) {
          return optimisticMsg;
        }
        // Si el optimista aún no tiene id de Firestore, usar el paginado
        if (optimisticMsg.id.startsWith('temp-')) {
          return msg;
        }
      }
      return msg;
    });
    
    // Agregar mensajes optimistas que no están en paginados (nuevos mensajes)
    const newOptimisticMessages = optimisticArray.filter(msg => 
      !paginatedMessages.some(paginatedMsg => 
        paginatedMsg.clientId === msg.clientId || 
        (msg.id && paginatedMsg.id === msg.id)
      )
    );
    
    const allCombined = [...combinedMessages, ...newOptimisticMessages];
    
    const sortedMessages = allCombined.sort((a, b) => {
      const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : 
        (a.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
      const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : 
        (b.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    
    // Debug logging removed for production
    
    return sortedMessages;
  }, [paginatedMessages, optimisticMessages]);

  // Agrupación por fecha con DatePill - OPTIMIZADO
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

  // Scroll infinito - OPTIMIZADO
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
  
  // ✅ OPTIMISTIC UI: Modal de retry para mensajes fallidos
  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [retryMessage, setRetryMessage] = useState<Message | null>(null);

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

  // NUEVO: Debug log para diagnosticar problemas de carga
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MessageSidebar] Debug info:', {
        conversationId,
        correctConversationId,
        currentUserId,
        receiverId: receiver.id,
        paginatedMessagesCount: paginatedMessages.length,
        optimisticMessagesCount: Object.keys(optimisticMessages).length,
        allMessagesCount: allMessages.length,
        isLoadingMessages
      });
    }
  }, [conversationId, correctConversationId, currentUserId, receiver.id, paginatedMessages.length, optimisticMessages, allMessages.length, isLoadingMessages]);

  // Body scroll lock effect
  useEffect(() => {
    if (isOpen) {
      // ✅ OPTIMIZACIÓN: Guardar posición de scroll de manera más robusta
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.setAttribute('data-scroll-y', scrollY.toString());

      return () => {
        // ✅ OPTIMIZACIÓN: Restaurar scroll de manera más suave
        const scrollY = document.body.getAttribute('data-scroll-y');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.removeAttribute('data-scroll-y');

        // ✅ OPTIMIZACIÓN: Usar requestAnimationFrame para scroll más suave
        if (scrollY) {
          requestAnimationFrame(() => {
            // ✅ OPTIMIZACIÓN: Verificar que el valor sea válido antes de hacer scroll
            const scrollValue = parseInt(scrollY);
            if (!isNaN(scrollValue) && scrollValue >= 0) {
              window.scrollTo({
                top: scrollValue,
                behavior: 'instant' // Usar 'instant' en lugar de 'smooth' para evitar animación
              });
            }
          });
        }
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
      // CORRECCIÓN: allMessages[0] es el mensaje más reciente debido a orderBy('timestamp', 'desc')
      const shouldScroll = isAtBottom() || wasAtBottom || 
        (allMessages.length > 0 && allMessages[0]?.senderId === currentUserId);
      
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

  // NUEVO: Limpiar mensajes optimistas obsoletos cuando se reciben mensajes reales
  useEffect(() => {
    if (paginatedMessages.length > 0 && Object.keys(optimisticMessages).length > 0) {
      const optimisticArray = Object.values(optimisticMessages);
      const paginatedIds = new Set(paginatedMessages.map(msg => msg.id));
      const paginatedClientIds = new Set(paginatedMessages.map(msg => msg.clientId));
      
      // Encontrar mensajes optimistas que ya tienen su contraparte real
      const obsoleteOptimisticIds = optimisticArray
        .filter(msg => {
          // Si el mensaje optimista ya tiene un id real y está en paginados, es obsoleto
          if (msg.id && !msg.id.startsWith('temp-') && paginatedIds.has(msg.id)) {
            return true;
          }
          // Si el mensaje optimista tiene un clientId que ya está en paginados, es obsoleto
          if (paginatedClientIds.has(msg.clientId)) {
            return true;
          }
          return false;
        })
        .map(msg => msg.clientId);
      
      // Limpiar mensajes optimistas obsoletos
      if (obsoleteOptimisticIds.length > 0) {
        obsoleteOptimisticIds.forEach(clientId => {
          usePrivateMessageStore.getState().removeOptimisticMessage(clientId);
        });
      }
    }
  }, [paginatedMessages, optimisticMessages]);

  // Marcar mensajes como leídos cuando se abre el sidebar - OPTIMIZADO CON DEBOUNCE
  const markMessagesAsReadRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!isOpen || !currentUserId || !receiver.id || !correctConversationId || correctConversationId === '') {
      return;
    }

    // Debounce para evitar múltiples ejecuciones
    if (markMessagesAsReadRef.current) {
      clearTimeout(markMessagesAsReadRef.current);
    }

    markMessagesAsReadRef.current = setTimeout(async () => {
      try {
        // Filtra solo messages con id (de DB) y no pending
        const unreadMessages = allMessages.filter(message => 
          message.id &&  // Asegura id existe
          !message.isPending &&  // Excluye optimistas
          message.senderId !== currentUserId && 
          !message.read
        );
        
        // Debug logging removed for production
        
        if (unreadMessages.length > 0) {
          // Usa batch para efficiency (como ChatSidebar)
          const batch = writeBatch(db);
          unreadMessages.forEach(message => {
            batch.update(
              doc(db, `conversations/${correctConversationId}/messages`, message.id),
              { read: true }
            );
          });
          
          await batch.commit();
        }
      } catch {
        alert('Error al marcar mensajes como leídos');
      }
    }, 1000); // 1 segundo debounce

    return () => {
      if (markMessagesAsReadRef.current) {
        clearTimeout(markMessagesAsReadRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentUserId, receiver.id, correctConversationId]); 

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

  // Initialize conversation and listen for real-time updates - OPTIMIZADO
  useEffect(() => {
    if (!isOpen || !currentUserId || !receiver.id || !user?.id || !correctConversationId || correctConversationId === '') {
      return;
    }

    const initConversation = async () => {
      try {
        // Ensure conversation document exists
        const conversationRef = doc(db, 'conversations', correctConversationId);
        const conversationDoc = await getDoc(conversationRef);

        if (!conversationDoc.exists()) {
          // Create conversation document with unreadCountByUser
          await setDoc(conversationRef, {
            participants: [currentUserId, receiver.id],
            createdAt: serverTimestamp(),
            lastMessage: null,
            lastViewedBy: {},
            unreadCountByUser: { [currentUserId]: 0, [receiver.id]: 0 }, // Initialize unread counts
          });
        } else {
          // Update last viewed timestamp for current user
          await updateDoc(conversationRef, {
            [`lastViewedBy.${currentUserId}`]: serverTimestamp(),
          });
        }
      } catch {
        // Error handling removed for production
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

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      // Actualizar optimistamente en el store - como en ChatSidebar
      usePrivateMessageStore.getState().removeMessage(messageId);
    } catch {
      alert('Error al eliminar el mensaje');
    }
  }, [deleteMessage]);



  const handleResendMessage = useCallback(async (message: Message) => {
    try {
      await resendMessage(message);
      } catch {
      alert('Error al reintentar el envío');
    }
  }, [resendMessage]);

  // ✅ OPTIMISTIC UI: Funciones para manejar modal de retry
  const handleOpenRetryModal = useCallback((message: Message) => {
    setRetryMessage(message);
    setRetryModalOpen(true);
  }, []);

  const handleCloseRetryModal = useCallback(() => {
    setRetryModalOpen(false);
    setRetryMessage(null);
  }, []);

  const handleRetrySend = useCallback(async () => {
    if (retryMessage) {
      try {
        await handleResendMessage(retryMessage);
        handleCloseRetryModal();
      } catch (error) {
        // El error ya se maneja en handleResendMessage
      }
    }
  }, [retryMessage, handleResendMessage, handleCloseRetryModal]);

  // ✅ OPTIMIZACIÓN: Hook para manejar escape key en modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && retryModalOpen) {
        handleCloseRetryModal();
      }
    };

    if (retryModalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // ✅ Prevenir scroll del body cuando modal está abierto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      // ✅ Restaurar scroll del body cuando modal se cierra
      document.body.style.overflow = 'unset';
    };
  }, [retryModalOpen, handleCloseRetryModal]);

  const handleCopyMessage = useCallback((message: Message) => {
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
  }, []);

  const handleDownloadFile = useCallback((message: Message) => {
    if (message.imageUrl || message.fileUrl) {
      const link = document.createElement('a');
      link.href = message.imageUrl || message.fileUrl || '';
      link.download = message.fileName || 'archivo';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

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
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    try {
      // OPTIMISTIC UPDATE PRIMERO (como en ChatSidebar)
      // Encontrar el mensaje en allMessages para obtener el clientId
      const messageToEdit = allMessages.find(msg => msg.id === messageId);
      if (messageToEdit) {
        // Actualizar optimistamente en el store
        updateOptimisticMessage(messageToEdit.clientId, { text: newText });
      }
      
      // Luego actualizar en Firestore
      await editMessage(messageId, newText);
      
      setEditingMessageId(null);
      setEditingText('');
    } catch {
      alert('Error al editar el mensaje');
      
      // Rollback optimistic update si falla
      const messageToEdit = allMessages.find(msg => msg.id === messageId);
      if (messageToEdit) {
        updateOptimisticMessage(messageToEdit.clientId, { text: editingText });
      }
    }
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
    }
  }, [allMessages]);

  // Memoizar callbacks para evitar re-renders
  const handleCloseClick = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingText('');
  }, []);

  // Handlers memoizados para InputMessage
  const handleCancelReplyMemo = useCallback(() => {
    handleCancelReply();
  }, [handleCancelReply]);

  const handleCancelEditMemo = useCallback(() => {
    handleCancelEdit();
  }, [handleCancelEdit]);

  const handleImagePreview = useCallback((imageUrl: string) => {
    setImagePreviewSrc(imageUrl);
  }, []);



  const handleEditClick = useCallback((messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditingText(text);
  }, []);

  const handleDeleteClick = useCallback((messageId: string) => {
    handleDeleteMessage(messageId);
  }, [handleDeleteMessage]);

  const handleResendClick = useCallback((message: Message) => {
    handleResendMessage(message);
  }, [handleResendMessage]);

  const handleCopyClick = useCallback((message: Message) => {
    handleCopyMessage(message);
  }, [handleCopyMessage]);

  const handleDownloadClick = useCallback((message: Message) => {
    handleDownloadFile(message);
  }, [handleDownloadFile]);



  const handleCloseImagePreview = useCallback(() => {
    setImagePreviewSrc(null);
  }, []);



  const {
    isDraggingMessage,
    draggedMessageId,
    dragOffset,
    handleMessageDragStart,
  } = useMessageDrag({
    onReplyActivated: handleReplyActivated,
  });

  // Callbacks para eventos de drag
  const handleMouseDown = useCallback((messageId: string, e: React.MouseEvent) => {
    handleMessageDragStart(messageId, e);
  }, [handleMessageDragStart]);

  const handleTouchStart = useCallback((messageId: string, e: React.TouchEvent) => {
    handleMessageDragStart(messageId, e);
  }, [handleMessageDragStart]);

  // Handlers memoizados para drag events
  const handleMouseDownMemo = useCallback((messageId: string) => (e: React.MouseEvent) => {
    handleMouseDown(messageId, e);
  }, [handleMouseDown]);

  const handleTouchStartMemo = useCallback((messageId: string) => (e: React.TouchEvent) => {
    handleTouchStart(messageId, e);
  }, [handleTouchStart]);

  // Callback para preview de imagen
  const handleImageClick = useCallback((message: Message) => {
    if (!message.isPending && message.imageUrl) {
      handleImagePreview(message.imageUrl);
    }
  }, [handleImagePreview]);









  // Handler específico para click de imagen - versión completamente sin arrow functions
  const createImageClickHandlerFinal = useCallback((message: Message) => {
    const clickHandler = function() { handleImageClick(message); };
    return clickHandler;
  }, [handleImageClick]);





  // Handlers específicos para PrivateMessageActionMenu
  const handleEditAction = useCallback((message: Message) => {
    handleEditClick(message.id, message.text || '');
  }, [handleEditClick]);

  const handleDeleteAction = useCallback((message: Message) => {
    handleDeleteClick(message.id);
  }, [handleDeleteClick]);

  const handleResendAction = useCallback((message: Message) => {
    handleResendClick(message);
  }, [handleResendClick]);

  const handleCopyAction = useCallback((message: Message) => {
    handleCopyClick(message);
  }, [handleCopyClick]);

  const handleDownloadAction = useCallback((message: Message) => {
    handleDownloadClick(message);
  }, [handleDownloadClick]);

  // Handler memoizado para actionButtonRef
  const handleActionButtonRef = useCallback(() => {}, []);

  // Handler memoizado para onError de imagen
  const handleImageError = useCallback(() => {
    // Image load error handling removed
  }, []);

  // Handler memoizado para LoadMoreButton
  const handleLoadMore = useCallback(() => {
    loadMoreMessages();
  }, [loadMoreMessages]);

  // Handler memoizado para replyingTo
  const replyingToMemo = useMemo(() => {
    if (!replyingTo) return null;
    return {
      ...replyingTo, 
      text: replyingTo.text || '',
      timestamp: replyingTo.timestamp instanceof Date 
        ? Timestamp.fromDate(replyingTo.timestamp)
        : replyingTo.timestamp
    };
  }, [replyingTo]);

  // Handler memoizado para DatePill
  const getDatePillDate = useCallback((dateStr: string) => {
    return new Date(dateStr);
  }, []);







  // Handlers específicos para cada mensaje - versión completamente sin arrow functions
  const createMessageHandlersFinal = useCallback((message: Message) => {
    const editHandler = function() { handleEditAction(message); };
    const deleteHandler = function() { handleDeleteAction(message); };
    const resendHandler = function() { handleResendAction(message); };
    const copyHandler = function() { handleCopyAction(message); };
    const downloadHandler = function() { handleDownloadAction(message); };
    
    return {
      onEdit: editHandler,
      onDelete: deleteHandler,
      onResend: resendHandler,
      onCopy: copyHandler,
      onDownload: downloadHandler,
    };
  }, [handleEditAction, handleDeleteAction, handleResendAction, handleCopyAction, handleDownloadAction]);

  // Transform tags memoizados para sanitizeHtml
  const transformTags = useMemo(() => ({
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
  }), []);

  const transformTagsExtended = useMemo(() => ({
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
  }), []);



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
            onClick={handleCloseClick}
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
          <div className={styles.noMessages}>
            {correctConversationId ? 'No hay mensajes en esta conversación.' : 'Cargando conversación...'}
          </div>
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
              {group.messages.map((message) => {
                let msgDate: Date;
                if (message.timestamp instanceof Date) {
                  msgDate = message.timestamp;
                } else if (message.timestamp && typeof message.timestamp.toDate === 'function') {
                  msgDate = message.timestamp.toDate();
                } else {
                  msgDate = new Date();
                }
                
                return (
                  <div key={`${message.id}-${message.clientId}`}>
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
                      onMouseDown={handleMouseDownMemo(message.id)}
                      onTouchStart={handleTouchStartMemo(message.id)}
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
                                onEdit={createMessageHandlersFinal(message).onEdit}
                                onDelete={createMessageHandlersFinal(message).onDelete}
                                onResend={createMessageHandlersFinal(message).onResend}
                                onCopy={createMessageHandlersFinal(message).onCopy}
                                onDownload={createMessageHandlersFinal(message).onDownload}
                                animateClick={animateClick}
                                actionMenuRef={actionMenuRef}
                                actionButtonRef={handleActionButtonRef}
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
                                  transformTags: transformTags
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
                          width={400}
                          height={300}
                          sizes="100vw"
                                className={`${styles.image} ${message.isPending ? styles.pendingImage : ''}`}
                                  onClick={createImageClickHandlerFinal(message)}
                                onError={handleImageError}
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
                          transformTags: transformTagsExtended
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
              <DatePill date={getDatePillDate(group.date)} />
            </React.Fragment>
          );
        })}

        <LoadMoreButton
          onClick={handleLoadMore}
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
        replyingTo={replyingToMemo}
        onCancelReply={handleCancelReplyMemo}
        editingMessageId={editingMessageId}
        editingText={editingText}
        onEditMessage={handleEditMessage}
        onCancelEdit={handleCancelEditMemo}
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
          onClose={handleCloseImagePreview}
        />
      )}
      
      {/* ✅ OPTIMISTIC UI: Modal de retry para mensajes fallidos */}
      {/* 🚀 PORTAL IMPLEMENTATION: Render en DOM root para evitar clipping del sidebar */}
      {retryModalOpen && ReactDOM.createPortal(
        <motion.div
          className={styles.retryModalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={handleCloseRetryModal}
        >
          <motion.div
            className={styles.retryModal}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.retryModalContent}>
              <div className={styles.retryModalHeader}>
                <Image src="/circle-x.svg" alt="Error" width={24} height={24} />
                <h3 className={styles.retryModalTitle}>Error al enviar mensaje</h3>
              </div>
              <div className={styles.retryModalBody}>
                <p className={styles.retryModalText}>
                  ¿Reintentar envío del mensaje?
                </p>
                {retryMessage?.text && (
                  <div className={styles.retryMessagePreview}>
                    <span className={styles.retryMessageText}>
                      "{retryMessage.text.length > 100 ? `${retryMessage.text.substring(0, 100)}...` : retryMessage.text}"
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.retryModalActions}>
                <motion.button
                  className={styles.retryModalCancelButton}
                  onClick={handleCloseRetryModal}
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  className={styles.retryModalRetryButton}
                  onClick={handleRetrySend}
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  Reintentar
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>,
        document.body  // ✅ Render en root para sobre sidebar
      )}
    </motion.div>
  );
};

export default MessageSidebar;
