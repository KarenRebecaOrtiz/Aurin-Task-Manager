'use client';
import { useUser, UserButton } from '@clerk/nextjs';
import ThemeToggler from './ThemeToggler';
import styles from './Header.module.scss';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

interface Notification {
  id: string;
  userId: string;
  taskId: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  recipientId: string;
}

interface HeaderProps {
  selectedContainer: 'tareas' | 'proyectos' | 'cuentas' | 'miembros';
  onChatSidebarOpen: (task: {
    id: string;
    clientId: string;
    project: string;
    name: string;
    description: string;
    status: string;
    priority: string;
    startDate: string | null;
    endDate: string | null;
    LeadedBy: string[];
    AssignedTo: string[];
    createdAt: string;
  }) => void;
  tasks: {
    id: string;
    clientId: string;
    project: string;
    name: string;
    description: string;
    status: string;
    priority: string;
    startDate: string | null;
    endDate: string | null;
    LeadedBy: string[];
    AssignedTo: string[];
    createdAt: string;
  }[];
  users: { id: string; fullName: string; firstName?: string; imageUrl: string }[];
}

const Header: React.FC<HeaderProps> = ({ selectedContainer, onChatSidebarOpen, tasks, users }) => {
  const { user } = useUser();
  const userName = user?.firstName || 'Usuario';
  const welcomeRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevNotificationsRef = useRef<Notification[]>([]);

  // Detectar interacción del usuario
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, []);

  const getSubtitle = () => {
    switch (selectedContainer) {
      case 'tareas':
        return 'Esta es una lista de tus tareas actuales';
      case 'proyectos':
        return 'Aquí puedes gestionar los proyectos asignados a cada cuenta';
      case 'cuentas':
        return 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización';
      case 'miembros':
        return 'Aquí puedes consultar y gestionar todos los miembros de tu organización';
      default:
        return 'Esta es una lista de tus tareas actuales';
    }
  };

  // Typewriter para bienvenida
  useEffect(() => {
    const currentWelcomeRef = welcomeRef.current;
    if (currentWelcomeRef) {
      const text = `Te damos la bienvenida de nuevo, ${userName}`;
      currentWelcomeRef.innerHTML = '';
      text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.innerHTML = char === ' ' ? ' ' : char;
        span.style.opacity = '0';
        span.className = styles.typewriterChar;
        currentWelcomeRef.appendChild(span);
        gsap.to(span, {
          opacity: 1,
          duration: 0.05,
          delay: index * 0.05,
          ease: 'power1.in',
        });
      });
    }

    return () => {
      if (currentWelcomeRef) {
        gsap.killTweensOf(currentWelcomeRef.querySelectorAll(`.${styles.typewriterChar}`));
      }
    };
  }, [userName]);

  // Animación GSAP del ícono
  useEffect(() => {
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0, rotate: 0 },
        {
          scale: 1,
          rotate: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.6)',
        }
      );
    }
  }, []);

  // Escuchar notificaciones en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up notifications listener for user:', user.id);
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const newNotifications: Notification[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          userId: doc.data().userId || '',
          taskId: doc.data().taskId || '',
          message: doc.data().message || '',
          timestamp: doc.data().timestamp || Timestamp.now(),
          read: doc.data().read || false,
          recipientId: doc.data().recipientId || '',
        }));

        const newUnread = newNotifications.filter(
          (notif) =>
            !notif.read &&
            !prevNotificationsRef.current.some((prev) => prev.id === notif.id)
        );
        console.log('New unread notifications:', newUnread.length, 'IDs:', newUnread.map(n => n.id));
        if (!audioRef.current) {
          audioRef.current = new Audio('/NotificationSound.mp3');
          console.log('Initialized audioRef in Header');
        }
        if (hasInteracted && newUnread.length > 0) {
          console.log('Playing sound for new unread notifications:', newUnread.map(n => n.id));
          audioRef.current.play().catch((error) => {
            console.error('Error playing notification sound:', error.message);
          });
        } else {
          console.log('No sound played for notifications', { newUnread: newUnread.length, hasInteracted });
        }

        setNotifications(newNotifications);
        prevNotificationsRef.current = newNotifications;
      },
      (error) => {
        console.error('Error listening to notifications:', error.message, error.code);
      }
    );

    return () => {
      console.log('Unsubscribing notifications listener for user:', user.id);
      unsubscribe();
    };
  }, [user?.id, hasInteracted]);

  // Marcar notificaciones como leídas al abrir el dropdown
  useEffect(() => {
    if (isNotificationsOpen && user?.id) {
      console.log('Notifications dropdown opened, marking unread as read');
      const unreadNotifications = notifications.filter((notif) => !notif.read);
      console.log('Unread notifications:', unreadNotifications.length, 'IDs:', unreadNotifications.map(n => n.id));
      unreadNotifications.forEach(async (notif) => {
        try {
          console.log('Marking notification as read:', notif.id);
          await updateDoc(doc(db, 'notifications', notif.id), {
            read: true,
          });
          console.log('Notification marked as read:', notif.id);
        } catch (error) {
          console.error('Error marking notification as read:', error.message, error.code);
        }
      });
    }
  }, [isNotificationsOpen, notifications, user?.id]);

  // GSAP animation for notifications dropdown
  useEffect(() => {
    if (isNotificationsOpen && notificationsRef.current) {
      gsap.fromTo(
        notificationsRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
      );
      console.log('Notifications dropdown animated');
    }
  }, [isNotificationsOpen]);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node) &&
        isNotificationsOpen
      ) {
        setIsNotificationsOpen(false);
        console.log('Closed notifications dropdown via outside click');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationsOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    setHasInteracted(true);
    if (!notification.read) {
      try {
        console.log('Clicking notification, marking as read:', notification.id);
        await updateDoc(doc(db, 'notifications', notification.id), {
          read: true,
        });
        console.log('Notification marked as read on click:', notification.id);
      } catch (error) {
        console.error('Error marking notification as read on click:', error.message, error.code);
      }
    }

    const task = tasks.find((t) => t.id === notification.taskId);
    if (task) {
      console.log('Opening ChatSidebar for task:', task.id);
      onChatSidebarOpen(task);
    } else {
      console.warn(`Task with ID ${notification.taskId} not found in tasks array`);
    }
    setIsNotificationsOpen(false);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  return (
    <div ref={wrapperRef} data-layer="Wrapper" className={styles.wrapper}>
      <div className='lefContainer'>
      <Image
          src="/HomeGif.gif"
          alt="Welcome GIF"
          width={200}
          height={200}
          className={styles.welcomeGif}
        />

        <div data-layer="Frame 14" className={styles.frame14}>
          <div data-layer="Title" className={styles.title}>
            <div
              data-layer="Te damos la bienvenida de nuevo"
              ref={welcomeRef}
              className={styles.welcome}
            />
          </div>
          <div data-layer="Text" className={styles.text}>
            <div data-layer="Subtitle" className={styles.subtitle}>
              {getSubtitle()}
            </div>
          </div>
        </div>
      </div>
      <div data-layer="Frame 2147225819" className={styles.frame2147225819}>
        <div className={styles.notificationContainer}>
          <button
            className={styles.notificationButton}
            onClick={() => {
              setIsNotificationsOpen((prev) => !prev);
              setHasInteracted(true);
              console.log('Toggled notifications dropdown, isOpen:', !isNotificationsOpen);
            }}
          >
            <Image
              src={notifications.some((n) => !n.read) ? '/NewNotification.svg' : '/EmptyNotification.svg'}
              alt="Notifications"
              width={24}
              height={24}
            />
          </button>
          {isNotificationsOpen && (
            <div ref={notificationsRef} className={styles.notificationDropdown}>
              {notifications.length === 0 ? (
                <div className={styles.notificationItem}>No hay notificaciones</div>
              ) : (
                notifications.map((notification) => {
                  const sender = users.find((u) => u.id === notification.userId);
                  return (
                    <div
                      key={notification.id}
                      className={styles.notificationItem}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <Image
                        src={sender?.imageUrl || '/default-avatar.png'}
                        alt={sender?.firstName || 'Usuario'}
                        width={24}
                        height={24}
                        className={styles.notificationAvatar}
                      />
                      <span>{truncateText(notification.message, 50)}</span>
                      <span className={styles.notificationTimestamp}>
                        {notification.timestamp.toDate().toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        <div ref={iconRef} className={styles.sunMoonWrapper}>
          <ThemeToggler />
        </div>
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: {
                width: '60px',
                height: '60px',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Header;
