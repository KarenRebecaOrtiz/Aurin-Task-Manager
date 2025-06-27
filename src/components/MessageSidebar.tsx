'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { Timestamp, collection, doc, onSnapshot, addDoc, query, orderBy, serverTimestamp, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { gsap } from 'gsap';
import ImagePreviewOverlay from './ImagePreviewOverlay';
import { InputMessage } from './ui/InputMessage';
import styles from './MessageSidebar.module.scss';
import { useUser } from '@clerk/nextjs';
import UserAvatar from './ui/UserAvatar';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  timestamp: Timestamp | null;
  isPending?: boolean;
  hasError?: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string | null;
  } | null;
}

interface UserCard {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface MessageSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  senderId: string;
  receiver: UserCard;
  conversationId: string;
}

// Hook de cifrado end-to-end - idéntico al de ChatSidebar
const useEncryption = () => {
  const encryptMessage = useCallback((text: string): string => {
    try {
      // Cifrado simple usando btoa (Base64) - reemplaza con una librería de cifrado más robusta en producción
      const encoded = btoa(unescape(encodeURIComponent(text)));
      return `encrypted:${encoded}`;
    } catch (error) {
      console.error('Error al cifrar mensaje:', error);
      return text; // Fallback: retorna el texto sin cifrar si hay error
    }
  }, []);

  const decryptMessage = useCallback((encryptedText: string): string => {
    try {
      // Verificar si el texto está cifrado
      if (!encryptedText.startsWith('encrypted:')) {
        return encryptedText; // No está cifrado, retorna tal como está
      }
      
      // Descifrar el texto
      const encoded = encryptedText.replace('encrypted:', '');
      const decoded = decodeURIComponent(escape(atob(encoded)));
      return decoded;
    } catch (error) {
      console.error('Error al descifrar mensaje:', error);
      return encryptedText; // Fallback: retorna el texto cifrado si hay error
    }
  }, []);

  return { encryptMessage, decryptMessage };
};

// Uso de tipo genérico para evitar any
const debounce = <T extends unknown[]>(func: (...args: T) => void, delay: number) => {
  let timer: NodeJS.Timeout | null = null;
  return (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
      timer = null;
    }, delay);
  };
};

const MessageSidebar: React.FC<MessageSidebarProps> = ({
  isOpen,
  onClose,
  senderId,
  receiver,
  conversationId,
}) => {
  const { user } = useUser();
  const { encryptMessage, decryptMessage } = useEncryption();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [showDownArrow, setShowDownArrow] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isDraggingMessage, setIsDraggingMessage] = useState(false);
  const [draggedMessageId, setDraggedMessageId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const lastScrollTop = useRef(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const actionMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const currentSidebar = sidebarRef.current;
    if (!currentSidebar) return;

    const isMobile = window.innerWidth < 768;

    if (isOpen) {
      gsap.fromTo(
        currentSidebar,
        isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 },
        {
          ...(isMobile ? { y: 0 } : { x: 0 }),
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        },
      );
    } else {
      gsap.to(currentSidebar, {
        ...(isMobile ? { y: '100%' } : { x: '100%' }),
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      });
    }
    return () => {
      if (currentSidebar) {
        gsap.killTweensOf(currentSidebar);
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const currentSidebar = sidebarRef.current;
    const currentActionMenu = actionMenuRef.current;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        currentSidebar &&
        !currentSidebar.contains(e.target as Node) &&
        (!currentActionMenu || !currentActionMenu.contains(e.target as Node))
      ) {
        const isMobile = window.innerWidth < 768;
        gsap.to(currentSidebar, {
          ...(isMobile ? { y: '100%' } : { x: '100%' }),
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
      }
      if (
        currentActionMenu &&
        !currentActionMenu.contains(e.target as Node) &&
        actionMenuOpenId
      ) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, actionMenuOpenId]);

  // GSAP animations for action menu
  useEffect(() => {
    if (actionMenuOpenId && actionMenuRef.current) {
      // Animate in
      gsap.fromTo(
        actionMenuRef.current,
        { 
          opacity: 0, 
          y: -10, 
          scale: 0.95,
          transformOrigin: 'top right'
        },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.2, 
          ease: 'power2.out' 
        }
      );
    } else if (actionMenuRef.current) {
      // Animate out
      gsap.to(actionMenuRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.15,
        ease: 'power2.in'
      });
    }
  }, [actionMenuOpenId]);

  useEffect(() => {
    if (!chatRef.current) return;

    const chat = chatRef.current;
    const isAtBottom = () => chat.scrollHeight - chat.scrollTop - chat.clientHeight < 50;

    const debouncedHandleScroll = debounce(() => {
      if (isAtBottom()) {
        setShowDownArrow(false);
      } else if (chat.scrollTop > lastScrollTop.current && !showDownArrow) {
        setShowDownArrow(true);
      }
      if (actionMenuOpenId) {
        setActionMenuOpenId(null);
      }
      lastScrollTop.current = chat.scrollTop;
    }, 100);

    chat.addEventListener('scroll', debouncedHandleScroll);

    if (messages.length > 0) {
      const wasAtBottom = isAtBottom();
      if (wasAtBottom || messages[messages.length - 1].senderId === user?.id) {
        // Scroll suave para mensajes nuevos
        chat.scrollTo({
          top: chat.scrollHeight,
          behavior: 'smooth'
        });
        setShowDownArrow(false);
      } else if (messages[messages.length - 1].senderId !== user?.id) {
        setShowDownArrow(true);
      }
    }

    return () => {
      chat.removeEventListener('scroll', debouncedHandleScroll);
    };
  }, [messages, user?.id, actionMenuOpenId, showDownArrow]);

  useEffect(() => {
    if (!isOpen || !senderId || !receiver.id || !user?.id || !conversationId) {
      setIsLoading(false);
      setError('Usuario no autenticado o datos inválidos.');
      return;
    }

    const initConversation = async () => {
      try {
        await setDoc(
          doc(db, 'conversations', conversationId),
          { participants: [senderId, receiver.id], createdAt: serverTimestamp() },
          { merge: true },
        );
      } catch (error) {
        console.error('[MessageSidebar] Error initializing conversation:', error);
        setError('No se pudo iniciar la conversación.');
        setIsLoading(false);
      }
    };
    initConversation();

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribeMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const data: Message[] = snapshot.docs.map((d) => {
          const m = d.data();
          
          // Descifrar el texto del mensaje al recibirlo de Firestore
          const decryptedText = m.text ? decryptMessage(m.text) : m.text;
          
          return {
            id: d.id,
            senderId: m.senderId,
            receiverId: m.receiverId,
            text: decryptedText, // Usar el texto descifrado
            imageUrl: m.imageUrl ?? null,
            fileUrl: m.fileUrl ?? null,
            fileName: m.fileName ?? null,
            fileType: m.fileType ?? null,
            filePath: m.filePath ?? null,
            timestamp: m.timestamp || null,
            isPending: false,
            replyTo: m.replyTo || null, // Incluir la información de replyTo
          };
        });
        setMessages((prev) => {
          const pendingMessages = prev.filter((msg) => msg.isPending);
          return [...pendingMessages, ...data.filter((msg) => !msg.isPending)];
        });
        setError(null);
        setIsLoading(false);
      },
      (error) => {
        console.error('[MessageSidebar] Firestore messages listener error:', error);
        setError('No se pudo cargar la conversación. Intenta enviar un mensaje.');
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribeMessages();
      setIsLoading(false);
    };
  }, [isOpen, senderId, receiver.id, conversationId, user?.id, decryptMessage]);

  useEffect(() => {
    if (!messages.length || !chatRef.current) return;

    const newMessages = messages.filter((m) => !messageRefs.current.has(m.id));
    newMessages.forEach((m) => {
      const li = chatRef.current?.querySelector(`[data-message-id="${m.id}"]`) as HTMLLIElement;
      if (li) {
        messageRefs.current.set(m.id, li);
        gsap.fromTo(
          li,
          { y: 50, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out', delay: 0.1 },
        );
      }
    });

    messageRefs.current.forEach((_, id) => {
      if (!messages.find((m) => m.id === id)) {
        messageRefs.current.delete(id);
      }
    });
  }, [messages]);

  const handleOpenActionMenu = (messageId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const menuWidth = 150;
    const menuHeight = 80;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 4;

    if (left + menuWidth > viewportWidth) {
      left = viewportWidth - menuWidth - 8;
    }
    if (top + menuHeight > viewportHeight) {
      top = rect.top + window.scrollY - menuHeight - 4;
    }

    setActionMenuOpenId(actionMenuOpenId === messageId ? null : messageId);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) {
      console.log('[MessageSidebar] No userId for message deletion:', { messageId });
      alert('Usuario no autenticado.');
      return;
    }

    try {
      console.log('[MessageSidebar] Deleting message:', messageId);
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        if (messageData.filePath) {
          try {
            console.log('[MessageSidebar] Attempting to delete GCS file:', messageData.filePath);
            const response = await fetch('/api/delete-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: messageData.filePath }),
            });
            const responseData = await response.json();
            if (!response.ok) {
              console.error('[MessageSidebar] Failed to delete GCS file:', {
                status: response.status,
                error: responseData.error,
                filePath: messageData.filePath,
              });
            } else {
              console.log('[MessageSidebar] Successfully deleted GCS file:', messageData.filePath);
            }
          } catch (error) {
            console.error('[MessageSidebar] Error deleting GCS file:', error);
          }
        }
      }
      await deleteDoc(messageRef);
      setActionMenuOpenId(null);
      console.log('[MessageSidebar] Message deleted:', messageId);
    } catch (error) {
      console.error('[MessageSidebar] Error deleting message:', error);
      alert('No se pudo eliminar el mensaje.');
    }
  };

  const handleSendMessage = async (
    messageData: Partial<Message>,
    isAudio = false,
    audioUrl?: string,
  ) => {
    if (!user?.id || isSending || !senderId || !receiver.id || !conversationId) {
      alert('El mensaje o archivo no puede estar vacío.');
      return;
    }

    setIsSending(true);

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: user.id,
      receiverId: receiver.id,
      text: messageData.text || null, // Mostrar texto sin cifrar en la UI
      timestamp: Timestamp.fromDate(new Date()),
      isPending: true,
      imageUrl: messageData.imageUrl || null,
      fileUrl: messageData.fileUrl || audioUrl || null,
      fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
      fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
      filePath: messageData.filePath || null,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderId === user.id ? (user.firstName || 'Yo') : receiver.fullName,
        text: replyingTo.text,
        imageUrl: replyingTo.imageUrl || undefined,
      } : null, // Incluir la información de replyTo en el mensaje optimista
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      // Cifrar el texto del mensaje antes de guardarlo en Firestore
      const encryptedText = messageData.text ? encryptMessage(messageData.text) : null;
      
      // Cifrar también el lastMessage para mantener consistencia
      const lastMessageText = messageData.text || messageData.fileName || '[Archivo]';
      const encryptedLastMessage = encryptMessage(lastMessageText);
      
      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          participants: [senderId, receiver.id],
          createdAt: serverTimestamp(),
          lastMessage: encryptedLastMessage, // Guardar el lastMessage cifrado
          lastMessageTimestamp: serverTimestamp(),
        },
        { merge: true },
      );

      const finalMessageData: Partial<Message> = {
        senderId,
        receiverId: receiver.id,
        text: encryptedText,
        timestamp: Timestamp.now(),
        isPending: false,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          senderName: replyingTo.senderId === user.id ? (user.firstName || 'Yo') : receiver.fullName,
          text: replyingTo.text,
          imageUrl: replyingTo.imageUrl || undefined,
        } : undefined,
      };

      await addDoc(
        collection(db, 'conversations', conversationId, 'messages'),
        finalMessageData,
      );

      try {
        // Crear notificación con texto descifrado para mejor UX
        const notificationText = messageData.text 
          ? `${user.firstName || 'Usuario'} te escribió: ${messageData.text.length > 50 ? messageData.text.substring(0, 50) + '...' : messageData.text}`
          : `${user.firstName || 'Usuario'} te ha enviado un mensaje privado`;
          
        await addDoc(collection(db, 'notifications'), {
          userId: senderId,
          message: notificationText,
          timestamp: Timestamp.now(),
          read: false,
          recipientId: receiver.id,
          conversationId,
          type: 'private_message',
        });
      } catch (error) {
        console.error('[MessageSidebar] Failed to create notification:', error);
      }

      setError(null);
      
      // Limpiar reply después de enviar
      setReplyingTo(null);
    } catch (error) {
      console.error('[MessageSidebar] Failed to send message:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      alert(`Error al enviar el mensaje: ${error instanceof Error ? error.message : 'Inténtalo de nuevo'}`);
      setError('No se pudo enviar el mensaje.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const sidebarElement = sidebarRef.current;
    if (!sidebarElement) return;

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch.clientY > sidebarElement.offsetHeight * 0.8) {
        gsap.to(sidebarElement, {
          y: '100%',
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
      }
    };

    sidebarElement.addEventListener('touchmove', handleTouchMove);

    return () => {
      sidebarElement.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onClose]);

  // Drag-to-close en mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return;
    // Si el touch es dentro del chat, no activar drag-to-close
    if (chatRef.current && chatRef.current.contains(e.target as Node)) return;
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.innerWidth >= 768 || !isDragging.current) return;
    if (chatRef.current && chatRef.current.contains(e.target as Node)) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY.current;
    if (deltaY > 0) setDragOffset(deltaY);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (window.innerWidth >= 768 || !isDragging.current) return;
    isDragging.current = false;
    if (dragOffset > window.innerHeight * 0.3) {
      onClose();
    }
    setDragOffset(0);
  }, [dragOffset, onClose]);

  // Funciones para manejar drag y reply
  const handleMessageDragStart = useCallback((messageId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[MessageSidebar] Drag start for message:', messageId);
    
    setIsDraggingMessage(true);
    setDraggedMessageId(messageId);
    setDragOffset(0);
  }, []);

  // Eventos globales para el drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingMessage && draggedMessageId) {
        const clientX = e.clientX;
        const startX = e.clientX;
        
        const deltaX = startX - clientX;
        const maxOffset = 80; // Máximo desplazamiento hacia la izquierda
        
        if (deltaX > 0) {
          setDragOffset(Math.min(deltaX, maxOffset));
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingMessage && draggedMessageId) {
        const threshold = 60; // Umbral para activar la respuesta
        
        // Activar respuesta si se arrastra hacia la izquierda más allá del umbral
        if (dragOffset >= threshold) {
          // Activar respuesta
          const messageToReply = messages.find(msg => msg.id === draggedMessageId);
          if (messageToReply) {
            setReplyingTo(messageToReply);
            console.log('[MessageSidebar] Reply activated for message:', messageToReply.id);
          }
        }
        
        // Resetear estados con animación
        setIsDraggingMessage(false);
        setDraggedMessageId(null);
        
        // Animar el regreso a la posición original
        setTimeout(() => {
          setDragOffset(0);
        }, 50);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDraggingMessage && draggedMessageId) {
        const clientX = e.touches[0].clientX;
        const startX = e.touches[0].clientX;
        
        const deltaX = startX - clientX;
        const maxOffset = 80; // Máximo desplazamiento hacia la izquierda
        
        if (deltaX > 0) {
          setDragOffset(Math.min(deltaX, maxOffset));
        }
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDraggingMessage && draggedMessageId) {
        const threshold = 60; // Umbral para activar la respuesta
        
        // Activar respuesta si se arrastra hacia la izquierda más allá del umbral
        if (dragOffset >= threshold) {
          // Activar respuesta
          const messageToReply = messages.find(msg => msg.id === draggedMessageId);
          if (messageToReply) {
            setReplyingTo(messageToReply);
            console.log('[MessageSidebar] Reply activated for message:', messageToReply.id);
          }
        }
        
        // Resetear estados con animación
        setIsDraggingMessage(false);
        setDraggedMessageId(null);
        
        // Animar el regreso a la posición original
        setTimeout(() => {
          setDragOffset(0);
        }, 50);
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDraggingMessage, draggedMessageId, dragOffset, messages]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Scroll to bottom when sidebar opens
  useEffect(() => {
    if (isOpen && chatRef.current && messages.length > 0) {
      const timer = setTimeout(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length]);

  if (!senderId || !user?.id) {
    return (
      <div className={`${styles.container} ${isOpen ? styles.open : ''}`} ref={sidebarRef}>
        <div className={styles.header}>
          <div className={styles.controls}>
            <div
              className={styles.arrowLeft}
              onClick={() => {
                const isMobile = window.innerWidth < 768;
                gsap.to(sidebarRef.current, {
                  ...(isMobile ? { y: '100%' } : { x: '100%' }),
                  opacity: 0,
                  duration: 0.3,
                  ease: 'power2.in',
                  onComplete: onClose,
                });
              }}
            >
              <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
            </div>
            <div className={styles.breadcrumb}>Chat</div>
          </div>
          <div className={styles.title}>Chat Privado</div>
        </div>
        <div className={styles.error}>Debes iniciar sesión para ver esta conversación.</div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.container} ${isOpen ? styles.open : ''}`}
      ref={sidebarRef}
      style={window.innerWidth < 768 ? { transform: `translateY(${dragOffset}px)` } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.header}>
        <div className={styles.controls}>
          <div
            className={styles.arrowLeft}
            onClick={() => {
              const isMobile = window.innerWidth < 768;
              gsap.to(sidebarRef.current, {
                ...(isMobile ? { y: '100%' } : { x: '100%' }),
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: onClose,
              });
            }}
          >
            <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
          </div>
          <div className={styles.breadcrumb}>Mensajes</div>
        </div>
        <div className={styles.title}>{receiver.fullName}</div>
        <div className={styles.description}>{receiver.role || 'Sin rol'}</div>
      </div>

      <div className={styles.chat} ref={chatRef}>
        {error && <div className={styles.error}>{error}</div>}
        {isLoading && (
          <div className={styles.loader}>
            <div className={styles.spinner} />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className={styles.noMessages}>No hay mensajes en esta conversación.</div>
        )}
        {messages.map((m) => {
          return (
            <div
              key={m.id}
              data-message-id={m.id}
              className={`${styles.message} ${m.isPending ? styles.pending : ''} ${
                isDraggingMessage && draggedMessageId === m.id ? styles.dragging : ''
              }`}
              style={{
                transform: isDraggingMessage && draggedMessageId === m.id 
                  ? `translateX(-${dragOffset}px)` 
                  : 'translateX(0)',
                transition: isDraggingMessage && draggedMessageId === m.id 
                  ? 'none' 
                  : 'transform 0.3s ease-out'
              }}
              data-drag-threshold={isDraggingMessage && draggedMessageId === m.id && dragOffset >= 60 ? 'true' : 'false'}
              onMouseDown={(e) => handleMessageDragStart(m.id, e)}
              onTouchStart={(e) => handleMessageDragStart(m.id, e)}
            >
              <UserAvatar
                userId={m.senderId}
                imageUrl={m.senderId === senderId ? user?.imageUrl : receiver.imageUrl}
                userName={m.senderId === senderId ? (user?.firstName || 'Yo') : receiver.fullName}
                size="medium"
                showStatus={true}
              />
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <div className={styles.sender}>
                    {m.senderId === senderId ? 'Tú' : receiver.fullName}
                  </div>
                  <div className={styles.timestampWrapper}>
                    <span className={styles.timestamp}>
                      {m.timestamp?.toDate().toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Mexico_City',
                      })}
                    </span>
                    {m.senderId === senderId && !m.isPending && (
                      <div className={styles.actionContainer}>
                        <button
                          className={styles.actionButton}
                          onClick={(e) => handleOpenActionMenu(m.id, e)}
                        >
                          <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
                        </button>
                        {actionMenuOpenId === m.id && (
                          <div ref={actionMenuRef} className={styles.actionDropdown}>
                            {!m.hasError && (
                              <div
                                className={styles.actionDropdownItem}
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                }}
                              >
                                Editar
                              </div>
                            )}
                            {m.hasError && (
                              <div
                                className={styles.actionDropdownItem}
                                onClick={() => {
                                  handleSendMessage(m);
                                  setActionMenuOpenId(null);
                                }}
                              >
                                Reintentar Envío
                              </div>
                            )}
                            {m.text && m.text.trim() && (
                              <div
                                className={styles.actionDropdownItem}
                                onClick={() => {
                                  // Copy message text
                                  const textToCopy = m.text || '';
                                  navigator.clipboard.writeText(textToCopy).catch(() => {
                                    // Fallback for older browsers
                                    const textArea = document.createElement('textarea');
                                    textArea.value = textToCopy;
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(textArea);
                                  });
                                  setActionMenuOpenId(null);
                                }}
                              >
                                Copiar
                              </div>
                            )}
                            {(m.imageUrl || m.fileUrl) && (
                              <div
                                className={styles.actionDropdownItem}
                                onClick={() => {
                                  // Download file
                                  if (m.imageUrl || m.fileUrl) {
                                    const link = document.createElement('a');
                                    link.href = m.imageUrl || m.fileUrl || '';
                                    link.download = m.fileName || 'archivo';
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
                              <div
                                className={styles.actionDropdownItem}
                              onClick={() => {
                                  handleDeleteMessage(m.id);
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
                
                {/* Estructura jerárquica: Cita 1, Archivo 2, Mensaje 3 */}
                <div className={styles.messageContentWrapper}>
                  {/* 1. Cita (replyTo) - PRIMERO */}
                  {m.replyTo && (
                    <div className={styles.replyIndicator}>
                      <div className={styles.replyContent}>
                        <div className={styles.replyHeader}>
                          <span className={styles.replyLabel}>Respondiendo a {m.replyTo.senderName}</span>
                        </div>
                        <div className={styles.replyPreview}>
                          {m.replyTo.imageUrl && (
                            <Image
                              src={m.replyTo.imageUrl}
                              alt="Imagen"
                              width={24}
                              height={24}
                              className={styles.replyImage}
                              draggable="false"
                            />
                          )}
                          {m.replyTo.text && (
                            <span 
                              className={styles.replyText}
                              dangerouslySetInnerHTML={{ 
                                __html: sanitizeHtml(m.replyTo.text, {
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
                          {!m.replyTo.text && !m.replyTo.imageUrl && (
                            <span className={styles.replyText}>Mensaje</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Archivo adjunto - SEGUNDO */}
                    {m.imageUrl && (
                      <div className={styles.imageWrapper}>
                        <Image
                          src={m.imageUrl}
                          alt={m.fileName || 'Imagen'}
                          width={0}
                          height={0}
                          sizes="100vw"
                        className={`${styles.image} ${m.isPending ? styles.pendingImage : ''}`}
                          onClick={() => !m.isPending && setImagePreviewSrc(m.imageUrl!)}
                        onError={() => console.warn('Image load failed', m.imageUrl)}
                          draggable="false"
                          style={{
                            width: 'auto',
                            height: 'auto',
                            maxWidth: '100%',
                            maxHeight: '300px',
                            objectFit: 'contain'
                          }}
                        />
                      {m.isPending && (
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
                  {m.text && (
                    <div 
                      className={styles.messageText}
                      dangerouslySetInnerHTML={{ 
                        __html: sanitizeHtml(m.text, {
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
          );
        })}
      </div>
      {showDownArrow && (
        <button
          className={styles.downArrowButton}
          onClick={() => {
            if (chatRef.current) {
              chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
              setShowDownArrow(false);
            }
          }}
          aria-label="Ver nuevos mensajes"
        >
          <Image src="/chevron-down.svg" alt="Nuevos mensajes" width={24} height={24} />
        </button>
      )}
      <InputMessage
        userId={user?.id}
        userFirstName={user?.firstName}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        containerRef={sidebarRef}
        replyingTo={replyingTo ? {
          id: replyingTo.id,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderId === user?.id ? (user?.firstName || 'Yo') : receiver.fullName,
          text: replyingTo.text,
          timestamp: replyingTo.timestamp,
          read: true,
          clientId: replyingTo.id,
          imageUrl: replyingTo.imageUrl,
        } : null}
        onCancelReply={handleCancelReply}
        conversationId={conversationId}
      />
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

export default MessageSidebar;
