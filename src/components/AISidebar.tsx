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
} from 'firebase/firestore';
import { db, ai } from '@/lib/firebase';
import { gsap } from 'gsap';
import styles from './AISidebar.module.scss';

interface AIMessage {
  id: string;
  userId: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Timestamp | null;
  isPending?: boolean;
}

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const InputAI: React.FC<{
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}> = ({ onSendMessage, isSending, containerRef }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    await onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className={styles.inputWrapper}>
      <form onSubmit={handleSubmit} className={styles.inputContainer}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe tu mensaje aquí"
          className={styles.input}
          disabled={isSending}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={isSending || !inputText.trim()}
        >
          <Image src="/arrow-up.svg" alt="Enviar" width={13} height={13} />
        </button>
      </form>
    </div>
  );
};

const AISidebar: React.FC<AISidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // GSAP animation for open/close
  useEffect(() => {
    if (!sidebarRef.current) return;
    const el = sidebarRef.current;
    if (isOpen) {
      gsap.fromTo(
        el,
        { x: '100%', opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    } else {
      gsap.to(el, {
        x: '100%',
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      });
    }
    return () => {
      if (sidebarRef.current) {
        gsap.killTweensOf(sidebarRef.current);
      }
    };
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node) &&
        isOpen
      ) {
        gsap.to(sidebarRef.current, {
          x: '100%',
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (!chatRef.current || !messages.length) return;
    const chat = chatRef.current;
    const isAtBottom = () =>
      chat.scrollHeight - chat.scrollTop - chat.clientHeight < 50;
    if (isAtBottom() || messages[messages.length - 1].sender === 'user') {
      chat.scrollTop = chat.scrollHeight;
    }

    // Animate new messages
    const newMessages = messages.filter((m) => !messageRefs.current.has(m.id));
    newMessages.forEach((m) => {
      const div = chatRef.current?.querySelector(
        `[data-message-id="${m.id}"]`
      ) as HTMLDivElement;
      if (div) {
        messageRefs.current.set(m.id, div);
        gsap.fromTo(
          div,
          { y: 50, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out', delay: 0.1 }
        );
      }
    });
    messageRefs.current.forEach((_, id) => {
      if (!messages.find((m) => m.id === id)) {
        messageRefs.current.delete(id);
      }
    });
  }, [messages]);

  // Fetch messages from Firestore
  useEffect(() => {
    if (!isOpen || !user?.id) {
      setIsLoading(false);
      setError('Usuario no autenticado.');
      return;
    }

    const conversationId = `ai_${user.id}`;
    const messagesRef = collection(db, 'ai_conversations', conversationId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const data: AIMessage[] = snapshot.docs.map((d) => {
          const m = d.data();
          return {
            id: d.id,
            userId: m.userId,
            text: m.text,
            sender: m.sender,
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
        console.error('[AISidebar] Firestore messages listener error:', error);
        setError('No se pudo cargar la conversación.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, user?.id]);

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!user?.id || isSending) return;

      setIsSending(true);
      const conversationId = `ai_${user.id}`;
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticMessage: AIMessage = {
        id: tempId,
        userId: user.id,
        text,
        sender: 'user',
        timestamp: Timestamp.fromDate(new Date()),
        isPending: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        // Initialize conversation
        await setDoc(
          doc(db, 'ai_conversations', conversationId),
          {
            userId: user.id,
            createdAt: serverTimestamp(),
            lastMessage: text,
            lastMessageTimestamp: serverTimestamp(),
          },
          { merge: true }
        );

        // Save user message
        await addDoc(collection(db, 'ai_conversations', conversationId, 'messages'), {
          userId: user.id,
          text,
          sender: 'user',
          timestamp: serverTimestamp(),
        });

        // Fetch tasks from Firestore (example)
        const tasks = await getUserTasks(user.id);
        const prompt = `Dada esta lista de tareas: ${JSON.stringify(tasks)}, responde al siguiente prompt del usuario: "${text}". Devuelve la respuesta en texto claro.`;

        // Call Gemini API
        const model = ai.generativeModel({ modelName: 'gemini-2.5-flash' });
        const response = await model.generateContent(prompt);

        if (!response.text) {
          throw new Error('No response from Gemini API');
        }

        // Save AI response
        await addDoc(collection(db, 'ai_conversations', conversationId, 'messages'), {
          userId: user.id,
          text: response.text,
          sender: 'ai',
          timestamp: serverTimestamp(),
        });

        setError(null);
      } catch (error) {
        console.error('[AISidebar] Failed to send message:', error);
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        setError('No se pudo enviar el mensaje.');
      } finally {
        setIsSending(false);
      }
    },
    [user?.id, isSending]
  );

  // Example function to fetch tasks (implement as needed)
  const getUserTasks = async (userId: string) => {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  };

  if (!user?.id) {
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
            <div className={styles.breadcrumb}>Asistente</div> {/* Cambiado de "Asistente de Proyectos" */}
          </div>
          <div className={styles.title}>Asistente de Proyectos</div>
        </div>
        <div className={styles.error}>Debes iniciar sesión para usar el asistente.</div>
      </div>
    );
  }

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
          <div className={styles.breadcrumb}>Asistente</div>
        </div>
        <div className={styles.title}>Asistente de Proyectos</div>
        <div className={styles.description}>
          Consulta cualquier dato de tus tareas, cuentas o deadlines.
        </div>
      </div>

      <div className={styles.chat} ref={chatRef}>
        {error && <div className={styles.error}>{error}</div>}
        {isLoading && (
          <div className={styles.loader}>
            <div className={styles.spinner} />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className={styles.noMessages}>No hay mensajes. ¡Empieza a chatear!</div>
        )}
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          const senderName = isUser ? (user.firstName || 'Tú') : 'Asistente';

          return (
            <div
              key={m.id}
              data-message-id={m.id}
              className={`${styles.message} ${m.isPending ? styles.pending : ''}`}
            >
              <Image
                src={isUser ? (user.imageUrl || '/user-avatar.png') : '/ai-avatar.png'}
                alt={senderName}
                width={46}
                height={46}
                className={styles.avatar}
                onError={(e) => {
                  e.currentTarget.src = isUser ? '/user-avatar.png' : '/ai-avatar.png';
                }}
              />
              <div className={styles.messageContent}>
                <div className={styles.messageHeader}>
                  <span className={styles.sender}>{senderName}</span>
                  <span className={styles.timestamp}>
                    {m.timestamp instanceof Timestamp
                      ? m.timestamp.toDate().toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/Mexico_City',
                        })
                      : 'Enviando...'}
                  </span>
                </div>
                <div className={styles.text}>
                  {m.text.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <InputAI
        onSendMessage={handleSendMessage}
        isSending={isSending}
        containerRef={sidebarRef}
      />
    </div>
  );
};

export default AISidebar;
