"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import styles from './NotificationDropdown.module.scss';
import React from 'react';
import { useTaskNotificationsSingleton } from '@/hooks/useTaskNotificationsSingleton';
import { useMessageNotificationsSingleton } from '@/hooks/useMessageNotificationsSingleton';

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
  action?: 'open-task-chat' | 'open-private-chat' | 'show-notification';
}

interface NotificationDropdownProps {
  isVisible: boolean;
  isOpen: boolean;
  users: { id: string; fullName: string; firstName?: string; imageUrl: string }[];
  dropdownPosition: { top: number; right: number };
  onNotificationClick: (notification: Notification) => void;
  onClose: () => void;
}

export default React.memo(function NotificationDropdown({
  isVisible,
  isOpen,
  users,
  dropdownPosition,
  onNotificationClick,
  onClose,
  notifications = [], // Agregar prop para notificaciones
}: NotificationDropdownProps & { notifications?: Notification[] }) {
  const { 
    markAsRead: markTaskNotificationAsRead, 
    markTaskAsViewed 
  } = useTaskNotificationsSingleton();
  
  const { 
    markConversationAsRead 
  } = useMessageNotificationsSingleton();
  const isLoading = false; // Los singletons manejan el loading internamente
  const error = null;
  const hasMore = false; // Los singletons cargan todo
  const isLoadingMore = false;
  
  const markAsRead = useCallback(async (notificationId: string) => {
    // Intentar marcar en ambos sistemas
    try {
      await markTaskNotificationAsRead(notificationId);
    } catch (error) {
      console.error('[NotificationDropdown] Error marking task notification as read:', error);
    }
  }, [markTaskNotificationAsRead]);
  
  const deleteNotification = useCallback(async (notificationId: string) => {
    // Por ahora, solo marcar como leído
    await markAsRead(notificationId);
  }, [markAsRead]);
  
  const loadMore = useCallback(() => {
    // Los singletons manejan la carga automáticamente
  }, []);
  
  // Infinite scroll setup
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Load more when intersection observer triggers
  useEffect(() => {
    if (inView && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [inView, hasMore, isLoadingMore, loadMore]);
  
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const dragStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  // REMOVED: Swipe states to prevent conflicts

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    try {
      console.log('🔥 [NotificationDropdown] CLICK DETECTED for notification:', {
        id: notification.id,
        type: notification.type,
        taskId: notification.taskId,
        conversationId: notification.conversationId,
        message: notification.message
      });
      
      // Marcar como leído primero
      await markAsRead(notification.id);

      // Manejar diferentes tipos de notificaciones
      switch (notification.type) {
        case 'group_message':
        case 'task_status_changed':
        case 'task_created':
        case 'task_deleted':
        case 'task_archived':
        case 'task_unarchived':
          if (notification.taskId) {
            console.log('🔥 [NotificationDropdown] TASK NOTIFICATION - Marking as viewed:', notification.taskId);
            await markTaskAsViewed(notification.taskId);
            // Abrir ChatSidebar para la tarea
            const notificationWithAction = {
              ...notification,
              action: 'open-task-chat' as const,
              taskId: notification.taskId,
            };
            console.log('🔥 [NotificationDropdown] Calling onNotificationClick with:', notificationWithAction);
            onNotificationClick(notificationWithAction);
          }
          break;

        case 'private_message':
          if (notification.conversationId) {
            console.log('🔥 [NotificationDropdown] PRIVATE MESSAGE - Marking conversation as viewed:', notification.conversationId);
            await markConversationAsRead(notification.conversationId);
            // Abrir MessageSidebar para la conversación
            const notificationWithAction = {
              ...notification,
              action: 'open-private-chat' as const,
              conversationId: notification.conversationId,
            };
            console.log('🔥 [NotificationDropdown] Calling onNotificationClick with:', notificationWithAction);
            onNotificationClick(notificationWithAction);
          }
          break;

        default:
          console.log('🔥 [NotificationDropdown] UNKNOWN TYPE - notification type:', notification.type);
          // Para otros tipos, solo mostrar la notificación
                      const notificationWithAction = {
              ...notification,
              action: 'show-notification' as const,
            };
          console.log('🔥 [NotificationDropdown] Calling onNotificationClick with:', notificationWithAction);
          onNotificationClick(notificationWithAction);
          break;
      }

      console.log('🔥 [NotificationDropdown] SUCCESS - Closing dropdown');
      onClose();
    } catch (error) {
      console.error('🔥 [NotificationDropdown] ERROR handling notification click:', error);
      // Aún cerrar el dropdown aunque haya error
      onClose();
    }
  }, [markAsRead, markTaskAsViewed, markConversationAsRead, onNotificationClick, onClose]);

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    await deleteNotification(notificationId);
  }, [deleteNotification]);

  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Bloquear scroll del body en mobile cuando el dropdown está abierto
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  // Manejar drag en móvil
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isDragging.current) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY.current;
    
    // Solo permitir drag hacia abajo
    if (deltaY > 0) {
      setDragOffset(deltaY);
    }
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isDragging.current) return;
    
    isDragging.current = false;
    
    // Si se arrastró más del 30% de la pantalla, cerrar
    if (dragOffset > window.innerHeight * 0.3) {
      onClose();
    }
    
    setDragOffset(0);
  }, [isMobile, dragOffset, onClose]);

  // REMOVED: Swipe handlers to prevent conflicts

  // Memoizar el cálculo de tiempo relativo para evitar recálculos innecesarios
  const formatRelativeTime = useCallback((timestamp: Timestamp) => {
    const now = new Date();
    const date = timestamp.toDate();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'hace unos segundos';
    if (diffMinutes < 60) return `hace ${diffMinutes} minuto${diffMinutes === 1 ? '' : 's'}`;
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`;
    if (diffDays < 30) return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`;
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }, []);

  // Filtrar notificaciones - OPTIMIZADO
  const filteredNotifications = useMemo(() => {
    if (!isVisible) return [];
    
    return notifications
      .filter(notification => notification.type !== 'task_archived')
      .sort((a, b) => {
        const aTime = a.timestamp.toMillis();
        const bTime = b.timestamp.toMillis();
        return bTime - aTime;
      });
  }, [notifications, isVisible]);

  const truncateText = useCallback((txt: string, max: number) => {
    // Limpiar el texto de posibles HTML tags
    const cleanText = txt.replace(/<[^>]*>/g, '');
    
    if (cleanText.length <= max) {
      return cleanText;
    }
    
    // Intentar cortar en una palabra completa
    const truncated = cleanText.slice(0, max - 3);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > max * 0.7) { // Si el último espacio está en el 70% del texto
      return truncated.slice(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }, []);

  // Componente para renderizar item de notificación - SIMPLIFICADO
  const NotificationItem = useCallback(({ notification }: { notification: Notification; index: number }) => {
    const sender = users.find((u) => u.id === notification.userId);
    const relativeTime = formatRelativeTime(notification.timestamp);
    
    return (
      <div
        className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔥 [NotificationDropdown] RAW CLICK DETECTED on notification:', notification.id);
          handleNotificationClick(notification);
        }}
      >
        <div className={styles.notificationContent}>
          <div className={styles.notificationHeader}>
            <div className={styles.senderInfo}>
              <Image
                src={sender?.imageUrl || '/empty-image.png'}
                alt={sender?.fullName || 'Usuario'}
                width={32}
                height={32}
                className={styles.senderAvatar}
              />
              <span className={styles.senderName}>{sender?.fullName || 'Usuario'}</span>
            </div>
            <span className={styles.timestamp}>{relativeTime}</span>
          </div>
          <div className={styles.messageContainer}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p className={styles.message}>{truncateText(notification.message, 100)}</p>
              {!notification.read && <div className={styles.unreadIndicator} />}
            </div>
          </div>
        </div>
        <div className={styles.swipeActions}>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNotification(notification.id);
            }}
          >
            <Image src="/trash-2.svg" alt="Eliminar" width={16} height={16} />
          </button>
        </div>
      </div>
    );
      }, [users, formatRelativeTime, handleNotificationClick, handleDeleteNotification, truncateText]);

  // Renderizar lista de notificaciones
  const renderNotificationsList = useCallback(() => {
    if (filteredNotifications.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Image src="/EmptyNotification.svg" alt="Sin notificaciones" width={64} height={64} />
          <p>No hay notificaciones</p>
        </div>
      );
    }

    return (
      <div className={styles.notificationsList}>
        {filteredNotifications.map((notification) => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            index={0} 
          />
        ))}
        
        {/* Infinite scroll trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
            {isLoadingMore && (
              <div className={styles.loadingMore}>
                <div className={styles.spinner}></div>
                <span>Cargando más notificaciones...</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [filteredNotifications, NotificationItem, hasMore, isLoadingMore, loadMoreRef]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      scrollPositionRef.current = container.scrollTop;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [isOpen]);

  // Solo renderizar cuando es realmente visible
  if (!isVisible) return null;

  // Animaciones de Framer Motion
  const dropdownVariants = {
    hidden: isMobile 
      ? { y: '100%', opacity: 0 }
      : { opacity: 0, y: -10, scale: 0.95 },
    visible: isMobile
      ? { y: '0%', opacity: 1 }
      : { opacity: 1, y: 0, scale: 1 },
    exit: isMobile
      ? { y: '100%', opacity: 0 }
      : { opacity: 0, y: -10, scale: 0.95 }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Renderizado para móvil
  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              className={styles.dropdownOverlay} 
              onClick={onClose}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            />
            <motion.div
              ref={(el) => {
                notificationsRef.current = el;
                scrollContainerRef.current = el;
              }}
              className={styles.dropdown}
              style={{ transform: `translateY(${dragOffset}px)` }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              data-notification-dropdown
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ 
                duration: 0.3, 
                ease: "easeInOut",
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
              <motion.div 
                className={styles.header}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <div className={styles.title}>
                  <Image src="/EmptyNotification.svg" alt="Notificaciones" width={20} height={20} className={styles.titleIcon} />
                  Notificaciones
                </div>
                <div className={styles.dragBar} />
                <motion.button 
                  className={styles.closeButton} 
                  onClick={onClose} 
                  aria-label="Cerrar notificaciones"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Image src="/x.svg" alt="Cerrar" width={20} height={20} />
                </motion.button>
              </motion.div>
              <motion.div 
                className={styles.scrollContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                {isLoading ? (
                  <motion.div 
                    className={styles.loadingState}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={styles.spinner}></div>
                    <span>Cargando notificaciones...</span>
                  </motion.div>
                ) : error ? (
                  <motion.div 
                    className={styles.errorState}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Image src="/circle-x.svg" alt="Error" width={40} height={40} />
                    <span>{error}</span>
                  </motion.div>
                ) : renderNotificationsList()}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  // Renderizado para desktop (dropdown normal)
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={(el) => {
            notificationsRef.current = el;
            scrollContainerRef.current = el;
          }}
          className={styles.dropdown}
          style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
          data-notification-dropdown
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ 
            duration: 0.2, 
            ease: "easeOut",
            type: "spring",
            stiffness: 400,
            damping: 25
          }}
        >
          <motion.div 
            className={styles.header}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.2 }}
          >
            <div className={styles.title}>
              <Image src="/EmptyNotification.svg" alt="Notificaciones" width={20} height={20} className={styles.titleIcon} />
              Notificaciones
            </div>
            <motion.button 
              className={styles.closeButton} 
              onClick={onClose} 
              aria-label="Cerrar notificaciones"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Image src="/x.svg" alt="Cerrar" width={20} height={20} />
            </motion.button>
          </motion.div>
          <motion.div 
            className={styles.scrollContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            {isLoading ? (
              <motion.div 
                className={styles.loadingState}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.spinner}></div>
                <span>Cargando notificaciones...</span>
              </motion.div>
            ) : error ? (
              <motion.div 
                className={styles.errorState}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Image src="/circle-x.svg" alt="Error" width={40} height={40} />
                <span>{error}</span>
              </motion.div>
            ) : renderNotificationsList()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si las props importantes han cambiado
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.users.length === nextProps.users.length &&
    prevProps.dropdownPosition.top === nextProps.dropdownPosition.top &&
    prevProps.dropdownPosition.right === nextProps.dropdownPosition.right
  );
});
