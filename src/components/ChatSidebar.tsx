'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useUser } from '@clerk/nextjs';
import { gsap } from 'gsap';
import { db } from '@/lib/firebase';
import styles from './ChatSidebar.module.scss';
import firebase from 'firebase/firestore';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: firebase.Timestamp;
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
    startDate: Date | null;
    endDate: Date | null;
    LeadedBy: string[];
    AssignedTo: string[];
  };
  clientName: string;
  users: { id: string; fullName: string; imageUrl: string }[];
}

export default function ChatSidebar({ isOpen, onClose, task, clientName, users = [] }: ChatSidebarProps) {
  const { user } = useUser();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);

  // GSAP animation for open/close
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current,
        { x: '100%', opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    } else if (sidebarRef.current) {
      gsap.to(sidebarRef.current, {
        x: '100%',
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      });
    }
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
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

  // Real-time messages listener
  useEffect(() => {
    const messagesQuery = query(
      collection(db, `tasks/${task.id}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [task.id]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, `tasks/${task.id}/messages`), {
        senderId: user.id,
        senderName: user.fullName || 'Usuario',
        text: newMessage.trim(),
        timestamp: firebase.Timestamp.now(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const toggleTimer = async (e: React.MouseEvent) => {
    handleClick(e.currentTarget as HTMLElement);
    setIsTimerRunning((prev) => !prev);

    if (isTimerRunning && user) {
      const hours = Math.floor(timerSeconds / 3600);
      const minutes = Math.floor((timerSeconds % 3600) / 60);
      const timeEntry = `${hours}h ${minutes}m`;

      try {
        await addDoc(collection(db, `tasks/${task.id}/messages`), {
          senderId: user.id,
          senderName: user.fullName || 'Usuario',
          text: `Añadió una entrada de tiempo de ${timeEntry}`,
          timestamp: firebase.Timestamp.now(),
        });
        setTimerSeconds(0);
      } catch (error) {
        console.error('Error adding time entry:', error);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date | null) => (date ? date.toLocaleDateString('es-ES') : 'N/A');

  const pm = users.find((u) => task.LeadedBy.includes(u.id)) || { fullName: 'Sin responsable', imageUrl: '/default-avatar.png' };

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ''}`} ref={sidebarRef}>
      <div className={styles.header}>
        <div className={styles.controls}>
          <div
            className={styles.arrowLeft}
            onClick={(e) => {
              handleClick(e.currentTarget);
              gsap.to(sidebarRef.current, {
                x: '100%',
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: onClose,
              });
            }}
          >
            <Image src="/arrow-left.svg" alt="Close" width={15} height={16} />
          </div>
          <div className={styles.breadcrumb}>
            {clientName} &gt; {task.project}
          </div>
          <div
            className={styles.ellipsis}
            onClick={(e) => handleClick(e.currentTarget)}
          >
            <Image src="/ellipsis.svg" alt="Options" width={16} height={16} />
          </div>
        </div>
        <div className={styles.title}>{task.name}</div>
        <div className={styles.description}>{task.description || 'Sin descripción'}</div>
        <div className={styles.details}>
          <div className={styles.card} style={{ background: '#FFF0B0' }}>
            <div className={styles.cardLabel}>Estado de la tarea:</div>
            <div className={styles.cardValue}>{task.status}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Responsable:</div>
            <div className={styles.cardValue}>
              <Image
                src={pm.imageUrl}
                alt={pm.fullName}
                width={18}
                height={18}
                className={styles.avatar}
              />
              <span>{pm.fullName}</span>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Fecha:</div>
            <div className={styles.cardValue}>
              {formatDate(task.startDate)} - {formatDate(task.endDate)}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.chat} ref={chatRef}>
        {messages.map((message) => (
          <div key={message.id} className={styles.message}>
            <Image
              src={users.find((u) => u.id === message.senderId)?.imageUrl || '/default-avatar.png'}
              alt={message.senderName}
              width={46}
              height={46}
              className={styles.avatar}
            />
            <div className={styles.messageContent}>
              <div className={styles.messageHeader}>
                <div className={styles.sender}>{message.senderName}</div>
                <div className={styles.timestamp}>
                  {message.timestamp.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div className={styles.text}>{message.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.inputWrapper}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            placeholder="Escribe tu mensaje aquí"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className={styles.input}
          />
          <div className={styles.actions}>
            <div className={styles.timer} onClick={toggleTimer}>
              <span>{formatTimer(timerSeconds)}</span>
              <Image src="/chevron-down.svg" alt="Timer" width={12} height={12} />
            </div>
            <button className={styles.sendButton} onClick={handleSendMessage}>
              <span>Enviar</span>
              <Image src="/send.svg" alt="Send" width={13} height={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}