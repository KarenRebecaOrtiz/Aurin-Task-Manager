'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { gsap } from 'gsap';
import styles from './MessageSidebar.module.scss';

/* ---------- Tipado ---------- */
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  timestamp: FieldValue | Timestamp | null;
  isTyping: boolean;
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
}

/* ---------- Componente ---------- */
const MessageSidebar: React.FC<MessageSidebarProps> = ({
  isOpen,
  onClose,
  senderId,
  receiver,
  onOpenSidebar,
  sidebarId,
}) => {
  const { user } = useUser();

  /* ----- State ----- */
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  /* ----- Refs ----- */
  const sidebarRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLUListElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const conversationId = [senderId, receiver.id].sort().join('_');
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  /* ---------- Animación abrir/cerrar ---------- */
  useEffect(() => {
    if (!sidebarRef.current) return;
    const el = sidebarRef.current;
    if (isOpen) {
      gsap.fromTo(el, { x: '100%', opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    } else {
      gsap.to(el, { x: '100%', opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: onClose });
    }
    return () => {
      if (sidebarRef.current) {
        gsap.killTweensOf(sidebarRef.current);
      }
    };
  }, [isOpen, onClose]);

  /* ---------- Click fuera ---------- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        gsap.to(sidebarRef.current, { x: '100%', opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: onClose });
      }
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node) &&
        actionMenuOpenId
      ) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, actionMenuOpenId]);

  /* ---------- Listener Firestore ---------- */
  useEffect(() => {
    if (!isOpen || !senderId || !receiver.id || !user?.id) {
      setIsLoading(false);
      setError('Usuario no autenticado o datos inválidos.');
      return;
    }

    if (!auth.currentUser) {
      console.error('No Firebase authenticated user found');
      setError('No estás autenticado en Firebase.');
      setIsLoading(false);
      return;
    }

    console.log('MessageSidebar props:', { senderId, receiverId: receiver.id, conversationId });

    // Asegurar documento de conversación
    const initConversation = async () => {
      try {
        await setDoc(
          doc(db, 'conversations', conversationId),
          { participants: [senderId, receiver.id], createdAt: serverTimestamp() },
          { merge: true },
        );
        console.log('Conversation initialized:', conversationId);
      } catch (err: any) {
        console.error('Error initializing conversation:', {
          message: err.message || 'Unknown error',
          code: err.code || 'no-code',
          stack: err.stack || 'No stack trace',
          conversationId,
        });
        setError('No se pudo iniciar la conversación.');
        setIsLoading(false);
      }
    };
    initConversation();

    const msgsRef = collection(db, 'conversations', conversationId, 'messages');
    const msgsQuery = query(msgsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      msgsQuery,
      (snap) => {
        const data: Message[] = snap.docs.map((d) => {
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
            timestamp: m.timestamp || null,
            isTyping: m.isTyping ?? false,
          };
        });
        setMessages(data);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error('Firestore listener error:', {
          message: err.message || 'Unknown error',
          code: err.code || 'no-code',
          stack: err.stack || 'No stack trace',
          conversationId,
          userId: user?.id,
          firebaseUserId: auth.currentUser?.uid,
        });
        setError('No se pudo cargar la conversación. Intenta enviar un mensaje.');
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribe();
      setIsLoading(false);
    };
  }, [isOpen, senderId, receiver.id, conversationId, user?.id]);

  /* ---------- Typing ---------- */
  const handleTyping = useCallback(async () => {
    if (!user?.id || !conversationId || !auth.currentUser) {
      console.error('Cannot handle typing: invalid user or conversation', {
        userId: user?.id,
        conversationId,
        firebaseUserId: auth.currentUser?.uid,
      });
      return;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      let typingId = typingMessageId;

      if (!typingId) {
        const msgRef = await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
          senderId: user.id,
          receiverId: receiver.id,
          timestamp: serverTimestamp(),
          isTyping: true,
          text: null,
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
        });
        typingId = msgRef.id;
        setTypingMessageId(typingId);
        console.log('Created typing message:', typingId);
      } else {
        await updateDoc(doc(db, 'conversations', conversationId, 'messages', typingId), {
          isTyping: true,
          timestamp: serverTimestamp(),
        });
        console.log('Updated typing message:', typingId);
      }

      typingTimeoutRef.current = setTimeout(async () => {
        if (typingId) {
          await updateDoc(doc(db, 'conversations', conversationId, 'messages', typingId), {
            isTyping: false,
            timestamp: serverTimestamp(),
          });
          console.log('Stopped typing message:', typingId);
          setTypingMessageId(null);
        }
      }, 3000);
    } catch (err: any) {
      console.error('Error updating typing status:', {
        message: err.message || 'Unknown error',
        code: err.code || 'no-code',
        stack: err.stack || 'No stack trace',
        conversationId,
        messageId: typingMessageId,
        userId: user?.id,
        firebaseUserId: auth.currentUser?.uid,
      });
    }
  }, [user?.id, conversationId, typingMessageId, receiver.id]);

  /* ---------- Auto-scroll ---------- */
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  /* ---------- Animación menú de acciones ---------- */
  useEffect(() => {
    if (actionMenuOpenId && actionMenuRef.current) {
      gsap.fromTo(
        actionMenuRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [actionMenuOpenId]);

  /* ---------- Selección de archivo ---------- */
  const selectFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      setError('El archivo supera los 10 MB.');
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && !f.name.includes('image-up.svg') && !f.name.includes('paperclip.svg')) {
      selectFile(f);
    }
    if (e.target) e.target.value = '';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !f.name.includes('image-up.svg') && !f.name.includes('paperclip.svg')) {
      selectFile(f);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  /* ---------- Enviar mensaje ---------- */
  const handleSendMessage = useCallback(
    async (e: React.FormEvent | React.KeyboardEvent) => {
      e.preventDefault();
      if (!senderId || (!newMessage.trim() && !file) || !user?.id || !auth.currentUser) {
        setError('El mensaje o archivo no puede estar vacío.');
        console.error('Invalid message input:', {
          senderId,
          newMessage,
          file,
          userId: user?.id,
          firebaseUserId: auth.currentUser?.uid,
        });
        return;
      }

      try {
        console.log('Starting message send:', { senderId, receiverId: receiver.id, conversationId });

        // Actualizar conversación
        await setDoc(
          doc(db, 'conversations', conversationId),
          {
            participants: [senderId, receiver.id],
            createdAt: serverTimestamp(),
            lastMessage: newMessage.trim() || file?.name || '[Archivo]',
          },
          { merge: true },
        );
        console.log('Conversation updated:', conversationId);

        const messageData: Partial<Message> = {
          senderId,
          receiverId: receiver.id,
          timestamp: serverTimestamp(),
          isTyping: false,
          text: newMessage.trim() || null,
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
        };

        if (file) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('conversationId', conversationId);

            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to upload file');
            }

            const { url, fileName, fileType } = await response.json();
            if (file.type.startsWith('image/')) {
              messageData.imageUrl = url;
            } else {
              messageData.fileUrl = url;
              messageData.fileName = fileName;
              messageData.fileType = fileType;
            }
            console.log('File uploaded via API:', url);
          } catch (err: any) {
            console.error('Failed to upload file:', {
              message: err.message || 'Unknown error',
              code: err.code || 'no-code',
              stack: err.stack || 'No stack trace',
              conversationId,
              fileName: file.name,
            });
            throw err;
          }
        }

        // Guardar mensaje
        const msgRef = await addDoc(collection(db, 'conversations', conversationId, 'messages'), messageData);
        console.log('Message saved:', msgRef.id);

        // Crear notificación
        await addDoc(collection(db, 'notifications'), {
          userId: senderId,
          message: `${user.firstName || 'Usuario'} te ha enviado un mensaje privado`,
          timestamp: Timestamp.now(),
          read: false,
          recipientId: receiver.id,
          conversationId,
          type: 'private_message',
        });
        console.log('Notification created for recipient:', receiver.id);

        // Limpiar mensaje de escritura si existe
        if (typingMessageId) {
          await deleteDoc(doc(db, 'conversations', conversationId, 'messages', typingMessageId));
          setTypingMessageId(null);
          console.log('Deleted typing message:', typingMessageId);
        }

        setNewMessage('');
        setFile(null);
        setPreviewUrl(null);
        setError(null);
      } catch (err: any) {
        console.error('Failed to send message:', {
          message: err.message || 'Unknown error',
          code: err.code || 'no-code',
          stack: err.stack || 'No stack trace',
          conversationId,
          senderId,
          receiverId: receiver.id,
          userId: user?.id,
          firebaseUserId: auth.currentUser?.uid,
        });
        setError('No se pudo enviar el mensaje.');
      }
    },
    [senderId, receiver.id, newMessage, conversationId, user?.id, user?.firstName, file, typingMessageId],
  );

  /* ---------- Editar / Borrar mensaje ---------- */
  const handleEditMessage = async (messageId: string) => {
    if (!user?.id || !editingText.trim()) return;
    try {
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
        text: editingText.trim(),
        timestamp: serverTimestamp(),
      });
      console.log('Message edited:', messageId);
      setEditingMessageId(null);
      setEditingText('');
      setActionMenuOpenId(null);
    } catch (err: any) {
      console.error('Error editing message:', {
        message: err.message || 'Unknown error',
        code: err.code || 'no-code',
        stack: err.stack || 'No stack trace',
        conversationId,
        messageId,
      });
      setError('No se pudo editar el mensaje.');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) return;
    try {
      await deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageId));
      console.log('Message deleted:', messageId);
      setActionMenuOpenId(null);
      if (messageId === typingMessageId) setTypingMessageId(null);
    } catch (err: any) {
      console.error('Error deleting message:', {
        message: err.message || 'Unknown error',
        code: err.code || 'no-code',
        stack: err.stack || 'No stack trace',
        conversationId,
        messageId,
      });
      setError('No se pudo eliminar el mensaje.');
    }
  };

  /* ---------- Render ---------- */
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
            <div className={styles.headerTitle}>Chat</div>
          </div>
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
      {/* ---------- Header ---------- */}
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
          <div className={styles.headerTitle}>{receiver.fullName}</div>
        </div>
      </div>

      {/* ---------- Chat ---------- */}
      <ul className={styles.chat} ref={chatRef}>
        {error && <li className={styles.error}>{error}</li>}
        {isLoading && (
          <li className={styles.loader}>
            <div className={styles.spinner} />
          </li>
        )}
        {!isLoading && messages.length === 0 && (
          <li className={styles.noMessages}>No hay mensajes en esta conversación.</li>
        )}
        {messages.map((m) => {
          const isMe = m.senderId === user.id;
          const senderName = isMe ? (user.firstName || 'Yo') : receiver.fullName;
          const avatarSrc = isMe
            ? (user.imageUrl as string) || '/default-avatar.png'
            : receiver.imageUrl || '/default-avatar.png';

          return (
            <li
              key={m.id}
              className={`${styles.message} ${isMe ? styles.sent : styles.received}`}
            >
              <Image src={avatarSrc} alt={senderName} width={40} height={40} className={styles.avatar} />
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <span className={styles.sender}>{senderName}</span>
                  <span className={styles.timestamp}>
                    {m.timestamp instanceof Timestamp
                      ? m.timestamp.toDate().toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : 'Sin fecha'}
                  </span>
                  {isMe && !m.isTyping && (
                    <button
                      className={styles.actionButton}
                      onClick={() =>
                        setActionMenuOpenId(actionMenuOpenId === m.id ? null : m.id)
                      }
                    >
                      <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
                    </button>
                  )}
                  {actionMenuOpenId === m.id && isMe && (
                    <div ref={actionMenuRef} className={styles.actionDropdown}>
                      <div
                        className={styles.actionDropdownItem}
                        onClick={() => {
                          setEditingMessageId(m.id);
                          setEditingText(m.text || '');
                          setActionMenuOpenId(null);
                        }}
                      >
                        Editar
                      </div>
                      <div
                        className={styles.actionDropdownItem}
                        onClick={() => handleDeleteMessage(m.id)}
                      >
                        Eliminar
                      </div>
                    </div>
                  )}
                </div>

                {editingMessageId === m.id ? (
                  <div className={styles.editContainer}>
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className={styles.editInput}
                      aria-label="Editar mensaje"
                    />
                    <button
                      className={styles.editSaveButton}
                      onClick={() => handleEditMessage(m.id)}
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
                ) : m.isTyping ? (
                  <div className={styles.typingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                  <>
                    {m.text && <div className={styles.text}>{m.text}</div>}
                    {m.imageUrl && (
                      <Image
                        src={m.imageUrl}
                        alt={m.fileName || 'Imagen'}
                        width={200}
                        height={200}
                        className={styles.image}
                        onError={(e) => {
                          e.currentTarget.src = '/default-image.png';
                          console.warn('Image load failed:', m.imageUrl);
                        }}
                      />
                    )}
                    {m.fileUrl && !m.imageUrl && (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.file}
                        download={m.fileName}
                      >
                        <Image src="/file.svg" alt="Archivo" width={16} height={16} />
                        {m.fileName}
                      </a>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ---------- Input ---------- */}
      <form
        className={`${styles.inputWrapper} ${isDragging ? styles.dragging : ''}`}
        ref={inputWrapperRef}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onSubmit={handleSendMessage}
      >
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
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          className={styles.input}
          aria-label="Escribe un mensaje"
          disabled={!!error}
        />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.imageButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={!!error}
            aria-label="Adjuntar archivo"
          >
            <Image src="/icons/paperclip.svg" alt="Adjuntar" width={16} height={16} />
          </button>
          <button
            type="submit"
            className={styles.sendButton}
            disabled={(!newMessage.trim() && !file) || !!error}
            aria-label="Enviar mensaje"
          >
            <Image src="/icons/arrow-up.svg" alt="Enviar" width={13} height={13} />
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileInputChange}
          aria-label="Seleccionar archivo"
        />
      </form>
    </div>
  );
};

export default MessageSidebar;