'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { useUser } from '@clerk/nextjs';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { gsap } from 'gsap';
import ImagePreviewOverlay from './ImagePreviewOverlay';
import { InputMessage } from './ui/InputMessage'; // Changed from default import to named import
import styles from './MessageSidebar.module.scss';

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [showDownArrow, setShowDownArrow] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const lastScrollTop = useRef(0);

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
        setActionMenuPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, actionMenuOpenId]);

  useEffect(() => {
    if (actionMenuOpenId && actionMenuRef.current) {
      gsap.fromTo(
        actionMenuRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
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
        setActionMenuPosition(null);
      }
      lastScrollTop.current = chat.scrollTop;
    }, 100);

    chat.addEventListener('scroll', debouncedHandleScroll);

    if (messages.length > 0) {
      const wasAtBottom = isAtBottom();
      if (wasAtBottom || messages[messages.length - 1].senderId === user?.id) {
        chat.scrollTop = chat.scrollHeight;
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

    setActionMenuPosition({ top, left });
    setActionMenuOpenId(actionMenuOpenId === messageId ? null : messageId);
  };

  const handleEditMessage = async (messageId: string) => {
    if (!user?.id || !editingText.trim()) {
      alert('El mensaje no puede estar vacío.');
      return;
    }

    try {
      // Cifrar el texto editado antes de guardarlo en Firestore
      const encryptedText = encryptMessage(editingText.trim());
      
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
        text: encryptedText, // Guardar el texto cifrado
        timestamp: serverTimestamp(),
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, text: editingText.trim(), timestamp: Timestamp.now() } // Mostrar texto descifrado en UI
            : msg,
        ),
      );
      setEditingMessageId(null);
      setEditingText('');
      setActionMenuOpenId(null);
      setActionMenuPosition(null);
    } catch (error) {
      console.error('[MessageSidebar] Error editing message:', error);
      alert('Error al editar el mensaje. Verifica que seas el autor del mensaje o intenta de nuevo.');
    }
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
      setActionMenuPosition(null);
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

      const finalMessageData = {
        senderId: user.id,
        receiverId: receiver.id,
        text: encryptedText, // Guardar el texto cifrado en Firestore
        timestamp: serverTimestamp(),
        imageUrl: messageData.imageUrl || null,
        fileUrl: messageData.fileUrl || audioUrl || null,
        fileName: messageData.fileName || (isAudio ? `audio_${Date.now()}.webm` : null),
        fileType: messageData.fileType || (isAudio ? 'audio/webm' : null),
        filePath: messageData.filePath || null,
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
          const isMe = m.senderId === user.id;
          const senderName = isMe ? (user.firstName || 'Yo') : receiver.fullName;

          return (
            <div
              key={m.id}
              data-message-id={m.id}
              className={`${styles.message} ${m.isPending ? styles.pending : ''}`}
            >
              <Image
                src={isMe ? (user.imageUrl || '') : (receiver.imageUrl || '')}
                alt={senderName}
                width={46}
                height={46}
                className={styles.avatar}
                onError={(e) => {
                  e.currentTarget.src = '';
                }}
              />
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <span className={styles.sender}>{senderName}</span>
                  <div className={styles.timestampWrapper}>
                    <span className={styles.timestamp}>
                      {m.timestamp instanceof Timestamp
                        ? m.timestamp.toDate().toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Mexico_City',
                          })
                        : 'Sin fecha'}
                    </span>
                    {isMe && !m.isPending && (
                      <div className={styles.messageActions}>
                        <button
                          className={styles.actionButton}
                          onClick={(e) => handleOpenActionMenu(m.id, e)}
                          aria-label="Opciones"
                        >
                          <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
                        </button>
                        {actionMenuOpenId === m.id &&
                          createPortal(
                            <div
                              ref={actionMenuRef}
                              className={styles.actionDropdown}
                              style={{
                                top: actionMenuPosition ? `${actionMenuPosition.top}px` : '0px',
                                left: actionMenuPosition ? `${actionMenuPosition.left}px` : '0px',
                                position: 'absolute',
                                zIndex: 130000,
                                opacity: 1,
                              }}
                            >
                              <div
                                className={styles.actionDropdownItem}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMessageId(m.id);
                                  setEditingText(m.text || '');
                                  setActionMenuOpenId(null);
                                  setActionMenuPosition(null);
                                }}
                              >
                                Editar mensaje
                              </div>
                              <div
                                className={styles.actionDropdownItem}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMessage(m.id);
                                  setActionMenuOpenId(null);
                                  setActionMenuPosition(null);
                                }}
                              >
                                Eliminar mensaje
                              </div>
                            </div>,
                            document.body,
                          )}
                      </div>
                    )}
                  </div>
                </div>
                {(m.fileUrl || m.imageUrl) && (
                  <div className={styles.fileActionsRow}>
                    <button
                      className={styles.downloadButton}
                      onClick={() => window.open(m.imageUrl || m.fileUrl, '_blank')}
                      aria-label="Descargar archivo"
                      disabled={m.isPending}
                    >
                      <Image src="/download.svg" alt="Descargar" width={16} height={16} />
                    </button>
                  </div>
                )}
                {editingMessageId === m.id ? (
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
                      onClick={() => handleEditMessage(m.id)}
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
                  <>
                    {m.text && (
                      <div className={styles.messageText}>
                        {(() => {
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
                          const sanitizedHtml = sanitizeHtml(m.text, sanitizeOptions);

                          return (
                            <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                          );
                        })()}
                      </div>
                    )}
                    {m.imageUrl && (
                      <div className={styles.imageWrapper}>
                        <Image
                          src={m.imageUrl}
                          alt={m.fileName || 'Imagen'}
                          width={200}
                          height={200}
                          className={styles.image}
                          onClick={() => !m.isPending && setImagePreviewSrc(m.imageUrl!)}
                          onError={(e) => {
                            e.currentTarget.src = '/default-image.png';
                          }}
                        />
                      </div>
                    )}
                    {m.fileUrl && !m.imageUrl && (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.file}
                        download={m.fileName}
                        onClick={(e) => m.isPending && e.preventDefault()}
                      >
                        <Image src="/file.svg" alt="Archivo" width={16} height={16} />
                        {m.fileName}
                      </a>
                    )}
                  </>
                )}
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
        taskId={conversationId}
        userId={user?.id}
        userFirstName={user?.firstName}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        containerRef={sidebarRef}
      />
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

export default MessageSidebar;
