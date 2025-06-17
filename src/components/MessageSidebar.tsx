'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  FieldValue,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { gsap } from 'gsap';
import ImagePreviewOverlay from './ImagePreviewOverlay';
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
  timestamp: FieldValue | Timestamp | null;
  isPending?: boolean;
}

interface TypingStatus {
  userId: string;
  isTyping: boolean;
  timestamp: Timestamp;
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
  onOpenSidebar: (receiverId: string) => void;
  sidebarId: string;
  conversationId: string;
}

const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timer: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
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
  onOpenSidebar,
  sidebarId,
  conversationId,
}) => {
  const { user } = useUser();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [showDownArrow, setShowDownArrow] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const lastScrollTop = useRef(0);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLFormElement>(null);
  const messageRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  useEffect(() => {
    if (!sidebarRef.current) return;
    const el = sidebarRef.current;
    if (isOpen) {
      gsap.fromTo(el, { x: '100%', opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      console.log('[MessageSidebar] Sidebar opened');
    } else {
      gsap.to(el, { x: '100%', opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: onClose });
      console.log('[MessageSidebar] Sidebar closed');
    }
    return () => {
      if (sidebarRef.current) {
        gsap.killTweensOf(sidebarRef.current);
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        (!actionMenuRef.current || !actionMenuRef.current.contains(e.target as Node))
      ) {
        gsap.to(sidebarRef.current, { x: '100%', opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: onClose });
        console.log('[MessageSidebar] Closed via outside click');
      }
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node) &&
        actionMenuOpenId
      ) {
        console.log('[MessageSidebar] Closing action menu via outside click', { messageId: actionMenuOpenId });
        setActionMenuOpenId(null);
        setActionMenuPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, actionMenuOpenId]);

  useEffect(() => {
    if (actionMenuOpenId && actionMenuRef.current) {
      console.log('[MessageSidebar] Animating action menu:', { messageId: actionMenuOpenId });
      gsap.fromTo(
        actionMenuRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
      );
    }
    return () => {
      if (actionMenuRef.current) {
        gsap.killTweensOf(actionMenuRef.current);
      }
    };
  }, [actionMenuOpenId]);

  useEffect(() => {
    if (!chatRef.current) return;

    const chat = chatRef.current;
    const isAtBottom = () => chat.scrollHeight - chat.scrollTop - chat.clientHeight < 50;

    const debouncedHandleScroll = debounce(() => {
      console.log('[MessageSidebar] Scroll processed:', { actionMenuOpenId, showDownArrow });
      if (isAtBottom()) {
        setShowDownArrow(false);
        console.log('[MessageSidebar] At bottom, hiding down arrow');
      } else if (chat.scrollTop > lastScrollTop.current && !showDownArrow) {
        setShowDownArrow(true);
        console.log('[MessageSidebar] Scrolled up, showing down arrow');
      }
      if (actionMenuOpenId) {
        console.log('[MessageSidebar] Closing action menu due to scroll', { messageId: actionMenuOpenId });
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
        console.log('[MessageSidebar] Scrolled to bottom');
      } else if (messages[messages.length - 1].senderId !== user?.id) {
        setShowDownArrow(true);
        console.log('[MessageSidebar] New message, showing down arrow');
      }
    }

    return () => {
      console.log('[MessageSidebar] Cleaning up scroll listener');
      chat.removeEventListener('scroll', debouncedHandleScroll);
    };
  }, [messages, user?.id]);

  useEffect(() => {
    if (!isOpen || !senderId || !receiver.id || !user?.id || !conversationId) {
      setIsLoading(false);
      setError('Usuario no autenticado o datos inválidos.');
      console.warn('[MessageSidebar] Invalid props:', { isOpen, senderId, receiverId: receiver.id, userId: user?.id, conversationId });
      return;
    }

    console.log('[MessageSidebar] Initializing Firestore listeners:', { senderId, receiverId: receiver.id, conversationId });

    const initConversation = async () => {
      try {
        await setDoc(
          doc(db, 'conversations', conversationId),
          { participants: [senderId, receiver.id], createdAt: serverTimestamp() },
          { merge: true },
        );
        console.log('[MessageSidebar] Conversation initialized:', conversationId);
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
        console.log('[MessageSidebar] Messages received:', { count: data.length, ids: data.map((m) => m.id) });
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

    const typingQuery = query(collection(db, `conversations/${conversationId}/typing`));
    const unsubscribeTyping = onSnapshot(
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
        console.log('[MessageSidebar] Typing users:', typing);
      },
      (error) => {
        console.error('[MessageSidebar] Firestore typing listener error:', error);
      },
    );

    return () => {
      console.log('[MessageSidebar] Unsubscribing listeners for conversation:', conversationId);
      unsubscribeMessages();
      unsubscribeTyping();
      setIsLoading(false);
    };
  }, [isOpen, senderId, receiver.id, conversationId, user?.id]);

  const handleTyping = useCallback(
    debounce(async () => {
      if (!user?.id || !conversationId) {
        console.warn('[MessageSidebar] Cannot handle typing: invalid user or conversation', { userId: user?.id, conversationId });
        return;
      }

      try {
        const typingDocRef = doc(db, `conversations/${conversationId}/typing/${user.id}`);
        await setDoc(typingDocRef, {
          userId: user.id,
          isTyping: true,
          timestamp: Timestamp.now(),
        });
        console.log('[MessageSidebar] Typing status updated:', user.id);

        setTimeout(async () => {
          await setDoc(typingDocRef, {
            userId: user.id,
            isTyping: false,
            timestamp: Timestamp.now(),
          });
          console.log('[MessageSidebar] Typing status cleared:', user.id);
        }, 3000);
      } catch (error) {
        console.error('[MessageSidebar] Error updating typing status:', error);
      }
    }, 500),
    [user?.id, conversationId]
  );

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
          { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out', delay: 0.1 }
        );
        console.log('[MessageSidebar] Animated new message:', m.id);
      }
    });

    messageRefs.current.forEach((_, id) => {
      if (!messages.find((m) => m.id === id)) {
        messageRefs.current.delete(id);
      }
    });
  }, [messages]);

  const selectFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      alert('El archivo supera los 10 MB.');
      console.log('[MessageSidebar] File too large:', f.size);
      return;
    }
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
    const fileExtension = f.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      alert(`Extensión no soportada. Permitidas: ${validExtensions.join(', ')}`);
      console.log('[MessageSidebar] Invalid file extension:', fileExtension);
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
    console.log('[MessageSidebar] File selected:', { name: f.name, type: f.type, size: f.size });
  };

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && !f.name.includes('/paperclip.svg')) {
      selectFile(f);
    }
    if (e.target) e.target.value = '';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !f.name.includes('/paperclip.svg')) {
      selectFile(f);
    }
    console.log('[MessageSidebar] File dropped:', f?.name);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      console.log('[MessageSidebar] Revoked preview URL');
    }
    setPreviewUrl(null);
    console.log('[MessageSidebar] Removed selected file');
  };

  const handleOpenActionMenu = (messageId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    console.log('[MessageSidebar] Opening action menu:', { messageId, currentOpenId: actionMenuOpenId });
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
    console.log('[MessageSidebar] Action menu position set:', { top, left });
  };

  const handleEditMessage = async (messageId: string) => {
    if (!user?.id || !editingText.trim()) {
      console.warn('[MessageSidebar] Invalid edit attempt:', {
        userId: user?.id,
        messageId,
        editingText,
      });
      setError('El mensaje no puede estar vacío.');
      return;
    }

    try {
      console.log('[MessageSidebar] Editing message:', messageId);
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
        text: editingText.trim(),
        timestamp: serverTimestamp(),
      });
      setEditingMessageId(null);
      setEditingText('');
      setActionMenuOpenId(null);
      console.log('[MessageSidebar] Message edited:', messageId);
    } catch (error) {
      console.error('[MessageSidebar] Error editing message:', error);
      setError('No se pudo editar el mensaje.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) {
      console.warn('[MessageSidebar] No userId for message deletion:', { messageId });
      setError('Usuario no autenticado.');
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
      setError('No se pudo eliminar el mensaje.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!user?.id || (!newMessage.trim() && !file) || isSending || !senderId || !receiver.id || !conversationId) {
      console.warn('[MessageSidebar] Invalid message input:', {
        userId: user?.id,
        newMessage,
        hasFile: !!file,
        isSending,
        senderId,
        receiverId: receiver.id,
        conversationId,
      });
      setError('El mensaje o archivo no puede estar vacío.');
      return;
    }

    setIsSending(true);
    console.log('[MessageSidebar] Starting message send:', { senderId, receiverId: receiver.id, conversationId });

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: user.id,
      receiverId: receiver.id,
      text: newMessage.trim() || null,
      timestamp: Timestamp.fromDate(new Date()),
      isPending: true,
      imageUrl: null,
      fileUrl: null,
      fileName: file ? file.name : null,
      fileType: file ? file.type : null,
      filePath: null,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      await setDoc(
        doc(db, 'conversations', conversationId),
        {
          participants: [senderId, receiver.id],
          createdAt: serverTimestamp(),
          lastMessage: newMessage.trim() || file?.name || '[Archivo]',
          lastMessageTimestamp: serverTimestamp(),
        },
        { merge: true }
      );
      console.log('[MessageSidebar] Conversation updated:', conversationId);

      const messageData: Partial<Message> = {
        senderId: user.id,
        receiverId: receiver.id,
        timestamp: serverTimestamp(),
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        filePath: null,
      };

      let hasContent = false;

      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', user.id);
          formData.append('type', 'message');
          formData.append('conversationId', conversationId);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            headers: { 'x-clerk-user-id': user.id },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload file');
          }

          const { url, fileName, fileType, filePath } = await response.json();
          console.log('[MessageSidebar] File uploaded:', { url, fileName, fileType, filePath });

          if (fileName) messageData.fileName = fileName;
          if (fileType) messageData.fileType = fileType;
          if (filePath) messageData.filePath = filePath;

          if (file.type.startsWith('image/') && url) {
            messageData.imageUrl = url;
            hasContent = true;
          } else if (url) {
            messageData.fileUrl = url;
            hasContent = true;
          }
        } catch (error) {
          console.error('[MessageSidebar] Failed to upload file:', error, {
            message: error.message || 'Unknown error',
            fileName: file.name,
            conversationId,
          });
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
          alert(`Error al subir el archivo: ${error.message || 'Inténtalo de nuevo'}`);
          setIsSending(false);
          return;
        }
      }

      if (newMessage.trim()) {
        messageData.text = newMessage.trim();
        hasContent = true;
      }

      if (!hasContent) {
        console.warn('[MessageSidebar] No content to send:', { conversationId });
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        setIsSending(false);
        return;
      }

      const msgRef = await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);
      console.log('[MessageSidebar] Message saved:', msgRef.id);

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
        console.log('[MessageSidebar] Notification created for recipient:', receiver.id);
      } catch (error) {
        console.error('[MessageSidebar] Failed to create notification:', error);
      }

      setError(null);
    } catch (error) {
      console.error('[MessageSidebar] Failed to send message:', error, {
        message: error.message || 'Unknown error',
        conversationId,
        senderId,
        receiverId: receiver.id,
        userId: user?.id,
      });
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      alert(`Error al enviar el mensaje: ${error.message || 'Inténtalo de nuevo'}`);
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
              onClick={() =>
                gsap.to(sidebarRef.current, {
                  x: '100%',
                  opacity: 0,
                  duration: 0.3,
                  ease: 'power2.in',
                  onComplete: onClose,
                })
              }
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
      className={`${styles.container} ${isOpen ? styles.open : ''} ${isDragging ? styles.dragging : ''}`}
      ref={sidebarRef}
    >
      <div className={styles.header}>
        <div className={styles.controls}>
          <div
            className={styles.arrowLeft}
            onClick={() =>
              gsap.to(sidebarRef.current, {
                x: '100%',
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: onClose,
              })
            }
          >
            <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
          </div>
          <div className={styles.breadcrumb}>Mensajes</div>
        </div>
        <div className={styles.title}>{receiver.fullName}</div>
        <div className={styles.description}>{receiver.role || 'Sin rol'}</div>
        <div className={styles.details}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Estado:</div>
            <div className={styles.cardValue}>En línea</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Mensajes:</div>
            <div className={styles.cardValue}>{messages.length}</div>
          </div>
        </div>
      </div>

      <div
        className={styles.chat}
        ref={chatRef}
        onScroll={() => {
          console.log('[MessageSidebar] Chat scroll event triggered');
          if (actionMenuOpenId !== null) {
            console.log('[MessageSidebar] Closed action menu via scroll');
            setActionMenuOpenId(null);
            setActionMenuPosition(null);
          }
        }}
      >
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
              className={styles.message}
            >
              <Image
                src={isMe ? (user.imageUrl || '/default-avatar.png') : (receiver.imageUrl || '/default-avatar.png')}
                alt={senderName}
                width={46}
                height={46}
                className={styles.avatar}
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png';
                  console.warn('[MessageSidebar] Avatar load failed:', isMe ? user.imageUrl : receiver.imageUrl);
                }}
              />
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <span className={styles.sender}>{senderName}</span>
                  <div className={styles.timestampWrapper}>
                    <span className={styles.timestamp}>
                      {m.timestamp instanceof Timestamp
                        ? m.timestamp.toDate().toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
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
                                  console.log('[MessageSidebar] Opening edit mode for message:', m.id);
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
                                  console.log('[MessageSidebar] Triggering delete for message:', m.id);
                                  handleDeleteMessage(m.id);
                                  setActionMenuOpenId(null);
                                  setActionMenuPosition(null);
                                }}
                              >
                                Eliminar mensaje
                              </div>
                            </div>,
                            document.body
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
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className={styles.editInput}
                      aria-label="Editar mensaje"
                      autoFocus
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
                    {m.text && <div className={styles.text}>{m.text}</div>}
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
                            console.warn('[MessageSidebar] Image load failed:', m.imageUrl);
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
        {typingUsers.length > 0 && (
          <div className={styles.typingIndicator}>
            <div className={styles.typingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>{receiver.fullName} está escribiendo...</span>
          </div>
        )}
      </div>
      {showDownArrow && (
        <button
          className={styles.downArrowButton}
          onClick={() => {
            if (chatRef.current) {
              chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
              setShowDownArrow(false);
              console.log('[MessageSidebar] Scrolled to bottom via down arrow');
            }
          }}
          aria-label="Ver nuevos mensajes"
        >
          <Image src="/chevron-down.svg" alt="Nuevos mensajes" width={24} height={24} />
        </button>
      )}

      <form
        className={`${styles.inputWrapper} ${isDragging ? styles.dragging : ''}`}
        ref={inputWrapperRef}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSending) handleSendMessage(e);
        }}
      >
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
            aria-label="Escribe un mensaje"
            disabled={isSending || !!error}
          />
          <div className={styles.actions}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
              <button
                type="button"
                className={styles.imageButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || !!error}
                aria-label="Adjuntar archivo"
              >
                <Image
                  src="/paperclip.svg"
                  alt="Adjuntar"
                  width={16}
                  height={16}
                  className={styles.iconInvert}
                />
              </button>
              <button
                type="submit"
                className={styles.sendButton}
                disabled={isSending || (!newMessage.trim() && !file) || !!error}
                aria-label="Enviar mensaje"
              >
                <Image src="/arrow-up.svg" alt="Enviar" width={13} height={13} />
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