'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import ThemeToggler from './ThemeToggler';
import styles from './Header.module.scss';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';

interface Notification {
  id: string;
  userId: string;
  taskId?: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  recipientId: string;
  conversationId?: string;
  type?: string;
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
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
}

const Header: React.FC<HeaderProps> = ({
  selectedContainer,
  onChatSidebarOpen,
  tasks,
  users,
  notifications,
  onNotificationClick,
}) => {
  const { user } = useUser();
  const userName = user?.firstName || 'Usuario';

  /* ────────────────────────────────────────────
     REFS
  ──────────────────────────────────────────── */
  const welcomeRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevNotificationsRef = useRef<Notification[]>([]);

  /* ────────────────────────────────────────────
     STATE
  ──────────────────────────────────────────── */
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  /* ────────────────────────────────────────────
     EFFECTS – AUDIO INIT
  ──────────────────────────────────────────── */
  useEffect(() => {
    audioRef.current = new Audio('/NotificationSound.mp3');
    return () => audioRef.current?.pause();
  }, []);

  /* ────────────────────────────────────────────
     EFFECTS – USER INTERACTION TRACKING
  ──────────────────────────────────────────── */
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, []);

  /* ────────────────────────────────────────────
     EFFECTS – WATCH FOR NEW NOTIFICATIONS
     (PLAYS SOUND ON ARRIVAL)
  ──────────────────────────────────────────── */
  useEffect(() => {
    const newUnread = notifications.filter(
      (n) =>
        !n.read &&
        !prevNotificationsRef.current.some((p) => p.id === n.id),
    );

    if (newUnread.length > 0) {
      setHasViewedNotifications(false);
      // Reproduce el sonido sólo al recibir la notificación
      if (audioRef.current && (hasInteracted || audioRef.current.autoplay !== false)) {
        audioRef.current.play().catch(() => {});
      }
    }

    prevNotificationsRef.current = notifications;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  /* ────────────────────────────────────────────
     EFFECTS – DROPDOWN POSITION
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen && notificationButtonRef.current) {
      const rect = notificationButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isNotificationsOpen]);

  /* ────────────────────────────────────────────
     EFFECTS – MARK AS VIEWED WHEN OPENED
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen) setHasViewedNotifications(true);
  }, [isNotificationsOpen]);

  /* ────────────────────────────────────────────
     EFFECTS – TYPEWRITER WELCOME
  ──────────────────────────────────────────── */
  useEffect(() => {
    const el = welcomeRef.current;
    if (!el) return;
    const text = `Te damos la bienvenida de nuevo, ${userName}`;
    el.innerHTML = '';
    let charIndex = 0;
    text.split(' ').forEach((word, idx, arr) => {
      const span = document.createElement('span');
      span.className = styles.typewriterChar;
      span.style.opacity = '0';
      span.textContent = word;
      el.appendChild(span);
      if (idx < arr.length - 1) el.appendChild(document.createTextNode(' '));
      gsap.to(span, {
        opacity: 1,
        duration: 0.2,
        delay: charIndex * 0.1,
        ease: 'power1.in',
      });
      charIndex += word.length + 1;
    });
    return () => gsap.killTweensOf(el.querySelectorAll(`.${styles.typewriterChar}`));
  }, [userName]);

  /* ────────────────────────────────────────────
     EFFECTS – SUN/MOON ICON ENTRANCE
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.6)' },
      );
    }
  }, []);

  /* ────────────────────────────────────────────
     EFFECTS – DROPDOWN ANIMATION
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen) {
      setIsNotificationsVisible(true);
      gsap.fromTo(
        notificationsRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    } else if (isNotificationsVisible && notificationsRef.current) {
      gsap.to(notificationsRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => setIsNotificationsVisible(false),
      });
    }
  }, [isNotificationsOpen, isNotificationsVisible]);

  /* ────────────────────────────────────────────
     EFFECTS – CLOSE DROPDOWN ON OUTSIDE CLICK / ESC
  ──────────────────────────────────────────── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  /* ────────────────────────────────────────────
     HELPERS
  ──────────────────────────────────────────── */
  const truncateText = (txt: string, max: number) =>
    txt.length <= max ? txt : `${txt.slice(0, max - 3)}...`;

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

  /* ────────────────────────────────────────────
     NOTIFICATION BUTTON HANDLERS
  ──────────────────────────────────────────── */
  const toggleNotifications = () => {
    setIsNotificationsOpen((prev) => !prev);
    setHasInteracted(true);
  };

  const hasUnread = notifications.some((n) => !n.read);
  const iconSrc =
    hasUnread && !hasViewedNotifications ? '/NewNotification.svg' : '/EmptyNotification.svg';

  /* ────────────────────────────────────────────
     DROPDOWN COMPONENT
  ──────────────────────────────────────────── */
  const NotificationDropdown = () =>
    isNotificationsVisible
      ? createPortal(
          <div
            ref={(el) => {
              notificationsRef.current = el;
            }}
            className={styles.notificationDropdown}
            style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
            onMouseEnter={() => setIsNotificationsOpen(true)}
            onMouseLeave={() => {
              setTimeout(() => {
                if (!notificationButtonRef.current?.matches(':hover')) {
                  setIsNotificationsOpen(false);
                }
              }, 100);
            }}
          >
            {notifications.length === 0 ? (
              <div className={styles.notificationItem}>No hay notificaciones</div>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const sender = users.find((u) => u.id === n.userId);
                return (
                  <div
                    key={n.id}
                    className={`${styles.notificationItem} ${n.read ? styles.read : ''}`}
                    onClick={() => {
                      onNotificationClick(n);
                      setIsNotificationsOpen(false);
                    }}
                  >
                    <Image
                      src={sender?.imageUrl || '/default-avatar.png'}
                      alt={sender?.firstName || 'Usuario'}
                      width={24}
                      height={24}
                      className={styles.notificationAvatar}
                    />
                    <span>{truncateText(n.message, 50)}</span>
                    <span className={styles.notificationTimestamp}>
                      {n.timestamp.toDate().toLocaleString('es-ES', {
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
          </div>,
          document.body,
        )
      : null;

  /* ────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────── */
  return (
    <div ref={wrapperRef} data-layer="Wrapper" className={styles.wrapper}>
      {/* LEFT: Avatar + Welcome */}
      <div className={styles.lefContainer}>
        <UserButton
          appearance={{
            elements: { userButtonAvatarBox: { width: '60px', height: '60px' } },
          }}
        />
        <div data-layer="Frame 14" className={styles.frame14}>
          <div data-layer="Title" className={styles.title}>
            <div ref={welcomeRef} className={styles.welcome} />
          </div>
          <div data-layer="Text" className={styles.text}>
            <div className={styles.subtitle}>{getSubtitle()}</div>
          </div>
        </div>
      </div>

      {/* RIGHT: Notifications + Theme */}
      <div data-layer="Frame 2147225819" className={styles.frame2147225819}>
        <div className={styles.notificationContainer}>
          <button
            ref={notificationButtonRef}
            className={styles.notificationButton}
            onClick={toggleNotifications}
            onMouseEnter={() => {
              setIsNotificationsOpen(true);
              setHasViewedNotifications(true);
              setHasInteracted(true);
            }}
            onMouseLeave={() => {
              setTimeout(() => {
                if (!notificationsRef.current?.matches(':hover')) {
                  setIsNotificationsOpen(false);
                }
              }, 100);
            }}
            aria-label="Abrir notificaciones"
            aria-expanded={isNotificationsOpen}
            aria-controls="notification-dropdown"
          >
            <Image src={iconSrc} alt="Notifications" width={24} height={24} />
          </button>
          <NotificationDropdown />
        </div>

        <div ref={iconRef} className={styles.sunMoonWrapper}>
          <ThemeToggler />
        </div>
      </div>
    </div>
  );
};

export default Header;
