'use client';

import { useUser } from '@clerk/nextjs';
import AdviceInput from '@/components/ui/AdviceInput';
import ToDoDynamic from '@/components/ToDoDynamic';
import AvailabilityToggle from '@/components/ui/AvailabilityToggle';
import GeoClock from '@/components/ui/GeoClock';
import styles from './Header.module.scss';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import AvatarDropdown from '../AvatarDropdown';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import SimpleTooltip from './SimpleTooltip';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useTaskNotificationsSingleton } from '@/hooks/useTaskNotificationsSingleton';
import { useMessageNotificationsSingleton } from '@/hooks/useMessageNotificationsSingleton';
import { TextShimmer } from './TextShimmer';
import { motion } from 'framer-motion';

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
  selectedContainer: 'tareas' | 'cuentas' | 'miembros' | 'config';
  isArchiveTableOpen?: boolean;
  users: { id: string; fullName: string; firstName?: string; imageUrl: string }[];
  notifications?: Notification[]; // Hacer opcional
  onNotificationClick?: (notification: Notification) => void; // Hacer opcional
  onLimitNotifications?: (notifications: Notification[]) => void; // Hacer opcional
  onChangeContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void;
  isCreateTaskOpen?: boolean;
  isEditTaskOpen?: boolean;
  hasUnsavedChanges?: boolean;
  personalLocations?: {
    home?: { name: string; address: string; lat: number; lng: number; radius: number };
    secondary?: { name: string; address: string; lat: number; lng: number; radius: number };
  };
}

const Header: React.FC<HeaderProps> = ({
  selectedContainer,
  isArchiveTableOpen,
  users,
  onNotificationClick,
  onLimitNotifications,
  onChangeContainer,
  isCreateTaskOpen = false,
  isEditTaskOpen = false,
  hasUnsavedChanges = false,
  personalLocations,
}) => {
  const { user, isLoaded } = useUser();
  const { isAdmin } = useAuth();
  const { isDarkMode } = useTheme();
  const userName = isLoaded && user ? user.firstName || 'Usuario' : 'Usuario';

  // Usar los singletons de notificaciones
  const { taskNotifications } = useTaskNotificationsSingleton();
  const { messageNotifications } = useMessageNotificationsSingleton();

  /* ────────────────────────────────────────────
     REFS
  ──────────────────────────────────────────── */
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
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

  // Combinar notificaciones de ambos sistemas
  const allNotifications: Notification[] = useMemo(() => [
    ...taskNotifications.map(notif => ({
      id: notif.id,
      userId: notif.recipientId,
      taskId: notif.taskId,
      message: notif.message,
      timestamp: notif.timestamp,
      read: notif.read,
      recipientId: notif.recipientId,
      type: notif.type
    })),
    ...messageNotifications.map(notif => ({
      id: notif.conversationId,
      userId: notif.senderId,
      conversationId: notif.conversationId,
      message: notif.lastMessage || 'Nuevo mensaje privado',
      timestamp: notif.lastMessageTime,
      read: false,
      recipientId: '',
      type: 'private_message'
    }))
  ], [taskNotifications, messageNotifications]);

  // Calcular conteos basados en las notificaciones combinadas
  const hasUnread = allNotifications.some((n) => !n.read);
  const unreadCount = allNotifications.filter((n) => !n.read).length;

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
  ──────────────────────────────────────────── */
  useEffect(() => {
    const newUnread = allNotifications.filter(
      (n) => !n.read && !prevNotificationsRef.current.some((p) => p.id === n.id),
    );

    if (newUnread.length > 0) {
      setHasViewedNotifications(false);
      if (audioRef.current && (hasInteracted || audioRef.current.autoplay !== false)) {
        audioRef.current.play().catch(() => {});
      }
    }

    if (allNotifications.length > 20) {
      onLimitNotifications?.(allNotifications);
    }

    prevNotificationsRef.current = allNotifications;
  }, [allNotifications, hasInteracted, onLimitNotifications]);

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
    // Sincronizar isNotificationsVisible con isNotificationsOpen
    setIsNotificationsVisible(isNotificationsOpen);
  }, [isNotificationsOpen]);



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
     EFFECTS – CLOSE DROPDOWN ON OUTSIDE CLICK / ESC
  ──────────────────────────────────────────── */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNotificationsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Si el dropdown no está abierto, no hacer nada
      if (!isNotificationsOpen) return;
      
      // Si el click fue en el botón de notificaciones, no cerrar (ya se maneja en toggleNotifications)
      if (notificationButtonRef.current?.contains(target)) return;
      
      // Si el click fue dentro del dropdown, no cerrar
      if (target.closest('[data-notification-dropdown]')) return;
      
      // Si llegamos aquí, el click fue fuera del dropdown y del botón, entonces cerrar
      setIsNotificationsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  /* ────────────────────────────────────────────
     EFFECTS – BLOCK BODY SCROLL WHEN DROPDOWN IS OPEN
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen) {
      const scrollPosition = window.scrollY;
      document.body.classList.add('no-scroll');
      document.body.style.top = `-${scrollPosition}px`;
    } else {
      document.body.classList.remove('no-scroll');
      document.body.style.top = '';
      window.scrollTo(0, parseInt(document.body.style.top || '0'));
    }

    return () => {
      document.body.classList.remove('no-scroll');
      document.body.style.top = '';
    };
  }, [isNotificationsOpen]);





  /* ────────────────────────────────────────────
     HELPERS
  ──────────────────────────────────────────── */
  const getSubtitle = () => {
    // Si el archivo está abierto, mostrar texto específico para archivo
    if (isArchiveTableOpen) {
      return 'Aquí puedes ver y gestionar todas las tareas archivadas';
    }
    
    switch (selectedContainer) {
      case 'tareas':
        return 'Esta es una lista de tus tareas actuales';
      case 'cuentas':
        return 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización';
      case 'miembros':
        return 'Aquí puedes consultar y gestionar todos los miembros de tu organización';
      case 'config':
        return 'Configura tus preferencias y ajustes personales';
      default:
        return 'Esta es una lista de tus tareas actuales';
    }
  };

  /* ────────────────────────────────────────────
     CONTAINER CHANGE HANDLER WITH UNSAVED CHANGES CHECK
  ──────────────────────────────────────────── */
  const handleContainerChange = useCallback((newContainer: 'tareas' | 'cuentas' | 'miembros' | 'config') => {
    // Si estamos en CreateTask o EditTask, verificar cambios no guardados
    if (isCreateTaskOpen || isEditTaskOpen) {
      if (hasUnsavedChanges) {
        // Si hay cambios no guardados, almacenar el container pendiente y abrir el popup de confirmación
        const { openConfirmExitPopup, setPendingContainer } = useTasksPageStore.getState();
        setPendingContainer(newContainer);
        openConfirmExitPopup();
      } else {
        // Si no hay cambios no guardados, cambiar container directamente
        onChangeContainer(newContainer);
      }
    } else {
      // Comportamiento normal cuando no estamos en modales
      onChangeContainer(newContainer);
    }
  }, [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges, onChangeContainer]);

  /* ────────────────────────────────────────────
     NOTIFICATION BUTTON HANDLERS
  ──────────────────────────────────────────── */
  const toggleNotifications = useCallback(() => {
    const newIsOpen = !isNotificationsOpen;
    setIsNotificationsOpen(newIsOpen);
    setHasInteracted(true);
    
    // Si se está abriendo el dropdown, marcar como vistas
    if (newIsOpen) {
      setHasViewedNotifications(true);
    }
  }, [isNotificationsOpen]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    // Si se proporciona un callback externo, usarlo
    if (onNotificationClick) {
      onNotificationClick(notification);
      return;
    }

    // Manejo interno de notificaciones
    try {
      switch (notification.type) {
        case 'task_created':
        case 'task_status_changed':
        case 'task_deleted':
        case 'task_archived':
        case 'task_unarchived':
        case 'group_message':
        case 'time_log':
          if (notification.taskId) {
            // Aquí podrías abrir el chat de la tarea
            // Por ahora solo cerramos el dropdown
            setIsNotificationsOpen(false);
          }
          break;
          
        case 'private_message':
          if (notification.conversationId) {
            // Aquí podrías abrir el chat privado
            // Por ahora solo cerramos el dropdown
            setIsNotificationsOpen(false);
          }
          break;
          
        default:
          setIsNotificationsOpen(false);
          break;
      }
    } catch {
      // Silently handle error
      setIsNotificationsOpen(false);
    }
  }, [onNotificationClick]);

  const handleCloseNotifications = useCallback(() => {
    setIsNotificationsOpen(false);
  }, []);

  // Handlers para eventos del logo
  const handleLogoClick = useCallback(() => {
    handleContainerChange('tareas');
  }, [handleContainerChange]);

  const handleLogoMouseEnter = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.filter = isDarkMode 
      ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5)) brightness(1.1)' 
      : 'drop-shadow(0 6px 12px rgba(255, 255, 255, 0.5)) brightness(1.1)';
  }, [isDarkMode]);

  const handleLogoMouseLeave = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.filter = isDarkMode 
      ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
      : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))';
  }, [isDarkMode]);

  /* ────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────── */
  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.logoAndWelcomeContainer}>
        <div 
          className={styles.logoContainer}
          onClick={handleLogoClick}
          onMouseEnter={handleLogoMouseEnter}
          onMouseLeave={handleLogoMouseLeave}
        >
          <Image
            src={isDarkMode ? '/logoDark.svg' : '/logoLight.svg'}
            alt="Logo"
            width={180}
            height={68}
            priority
            style={{
              transition: 'all 0.3s ease',
              filter: isDarkMode 
                ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
                : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))'
            }}
          />
        </div>
        <div className={styles.lefContainer}style={{justifyContent: 'start'}}>
          <div className={styles.AvatarMobile}>
            <AvatarDropdown onChangeContainer={handleContainerChange} />
          </div>
          <div className={styles.frame14}>
            <div className={styles.title}>
              <div className={styles.welcome}>
                <span className={styles.welcomeText}>
                  Te damos la bienvenida de nuevo,{' '}
                  <TextShimmer as="span" className={styles.userNameShimmer}>
                    {userName}
                  </TextShimmer>
                </span>
                {isAdmin && (
                  <motion.div 
                    className={styles.adminBadge}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.5
                    }}
                    whileHover={{ 
                      scale: 1.15, 
                      rotate: 5,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className={styles.adminBadgeInner}>
                      <Image
                        src="/verified.svg"
                        alt="Admin Verified"
                        width={16}
                        height={16}
                        className={styles.adminBadgeIcon}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            <div className={styles.text}>
              <div className={styles.subtitle}>{getSubtitle()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.headerContainer}>
        <div className={styles.superiorHeader}>
          <GeoClock personalLocations={personalLocations} />

          <div className={styles.todoContainer}>
            <ToDoDynamic />
          </div>

          <div className={styles.availabilityContainer}>
            <AvailabilityToggle />
          </div>

          <div className={styles.notificationContainer}>
            <SimpleTooltip text="Notificaciones">
              <button
                ref={notificationButtonRef}
                className={styles.notificationButton}
                onClick={toggleNotifications}
                aria-label="Abrir notificaciones"
                aria-expanded={isNotificationsOpen}
                aria-controls="notification-dropdown"
              >
                {hasUnread && !hasViewedNotifications ? (
                  <div className={styles.notification}>
                    <div className={styles.bellContainer}>
                      <div className={styles.bell}></div>
                    </div>
                    {unreadCount > 0 && (
                      <span className={styles.notificationCount} aria-live="polite">{unreadCount}</span>
                    )}
                  </div>
                ) : (
                  <Image
                    src="/EmptyNotification.svg"
                    alt="Notificaciones"
                    width={24}
                    height={24}
                    priority
                    style={{ width: 'auto', height: 'auto' }}
                  />
                )}
              </button>
            </SimpleTooltip>
            <NotificationDropdown
              isVisible={isNotificationsVisible}
              isOpen={isNotificationsOpen}
              users={users}
              dropdownPosition={dropdownPosition}
              onNotificationClick={handleNotificationClick}
              onClose={handleCloseNotifications}
              notifications={allNotifications}
            />
          </div>

          <div className={styles.AvatarDesktop}>
            <AvatarDropdown onChangeContainer={handleContainerChange} />
          </div>
        </div>
        <div className={styles.adviceContainer}>
          <AdviceInput isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
};

export default Header;