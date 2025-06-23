'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
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
import InputChat from './ui/InputChat'; // Reemplazar InputMessage por InputChat
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
          return {
            id: d.id,
            senderId: m.senderId,
            receiverId: m.receiverId,
            text: m.text ?? null,
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
  }, [isOpen, senderId, receiver.id, conversationId, user?.id]);

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
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
        text: editingText.trim(),
        timestamp: serverTimestamp(),
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
      text: messageData.text || null,
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
      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          participants: [senderId, receiver.id],
          createdAt: serverTimestamp(),
          lastMessage: messageData.text || messageData.fileName || '[Archivo]',
          lastMessageTimestamp: serverTimestamp(),
        },
        { merge: true },
      );

      const finalMessageData: Partial<Message> = {
        senderId: user.id,
        receiverId: receiver.id,
        text: messageData.text || null,
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
        await addDoc(collection(db, 'notifications'), {
          userId: senderId,
          message: `${user.firstName || 'Usuario'} te ha enviado un mensaje privado`,
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
                      <div className={styles.text}>
                        {m.text.split('\n').map((line, i) => (
                          <span key={i}>
                            {line}
                            <br />
                          </span>
                        ))}
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
      <InputChat
        taskId={conversationId}
        userId={user?.id}
        userFirstName={user?.firstName}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        setIsSending={setIsSending}
        timerSeconds={0}
        isTimerRunning={false}
        onToggleTimer={() => {}}
        onToggleTimerPanel={() => {}}
        isTimerPanelOpen={false}
        setIsTimerPanelOpen={() => {}}
        containerRef={sidebarRef}
        timerInput="00:00"
        setTimerInput={() => {}}
        dateInput={new Date()}
        setDateInput={() => {}}
        commentInput=""
        setCommentInput={() => {}}
        onAddTimeEntry={async () => {}}
        totalHours="0h 0m"
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
