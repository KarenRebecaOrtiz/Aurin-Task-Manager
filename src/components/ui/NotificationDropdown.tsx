"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './NotificationDropdown.module.scss';
import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';

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
}: NotificationDropdownProps) {
  const { notifications, markNotificationAsRead, deleteNotification, isLoading, error } = useNotifications();
  const { markAsViewed } = useTaskNotifications();
  
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const dragStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  // Estados para swipe
  const [swipedNotificationId, setSwipedNotificationId] = useState<string | null>(null);
  const [swipeStartX, setSwipeStartX] = useState<number>(0);
  const [swipeCurrentX, setSwipeCurrentX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (notification.taskId && ['task_deleted', 'task_archived', 'task_unarchived', 'task_status_changed', 'group_message'].includes(notification.type || '')) {
      await markAsViewed(notification.taskId);
    }
    await markNotificationAsRead(notification.id);
    onNotificationClick(notification);
    onClose();
  }, [markAsViewed, markNotificationAsRead, onNotificationClick, onClose]);

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

  // Funciones para manejar swipe
  const handleSwipeStart = useCallback((e: React.MouseEvent | React.TouchEvent, notificationId: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setSwipeStartX(clientX);
    setSwipeCurrentX(clientX);
    setIsSwiping(true);
    setSwipedNotificationId(notificationId);
  }, []);

  const handleSwipeMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isSwiping) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setSwipeCurrentX(clientX);
  }, [isSwiping]);

  const handleSwipeEnd = useCallback(() => {
    if (!isSwiping || !swipedNotificationId) return;
    
    const swipeDistance = swipeStartX - swipeCurrentX;
    const threshold = 80; // Distancia mínima para activar el swipe
    
    if (swipeDistance > threshold) {
      // Swipe completado - eliminar notificación directamente
      handleDeleteNotification(swipedNotificationId);
    }
    
    // Resetear estados
    setIsSwiping(false);
    setSwipedNotificationId(null);
    setSwipeStartX(0);
    setSwipeCurrentX(0);
  }, [isSwiping, swipedNotificationId, swipeStartX, swipeCurrentX, handleDeleteNotification]);

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

  // Filtrar y ordenar notificaciones
  const filteredNotifications = useMemo(() => {
    if (!isVisible) return [];
    
    return notifications
      .slice(0, 50)
      .filter(notification => notification.type !== 'task_archived')
      .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
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

  // Componente para renderizar item de notificación
  const NotificationItem = useCallback(({ notification, index }: { notification: Notification; index: number }) => {
    const sender = users.find((u) => u.id === notification.userId);
    const relativeTime = formatRelativeTime(notification.timestamp);
    const swipeDistance = swipedNotificationId === notification.id ? swipeStartX - swipeCurrentX : 0;
    
    return (
      <motion.div
        className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''} ${
          isSwiping && swipedNotificationId === notification.id ? styles.swiping : ''
        }`}
        style={{
          transform: `translateX(${swipeDistance}px)`,
          transition: isSwiping && swipedNotificationId === notification.id ? 'none' : 'transform 0.3s ease'
        }}
        onMouseDown={(e) => handleSwipeStart(e, notification.id)}
        onMouseMove={handleSwipeMove}
        onMouseUp={handleSwipeEnd}
        onMouseLeave={handleSwipeEnd}
        onTouchStart={(e) => handleSwipeStart(e, notification.id)}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
        onClick={() => handleNotificationClick(notification)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ 
          duration: 0.3, 
          ease: "easeOut",
          delay: index * 0.05 // Stagger effect
        }}
        whileHover={{ 
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        whileTap={{ 
          scale: 0.98,
          transition: { duration: 0.1 }
        }}
        layout
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
        <motion.div 
          className={styles.swipeActions}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNotification(notification.id);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Image src="/trash-2.svg" alt="Eliminar" width={16} height={16} />
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }, [users, formatRelativeTime, swipedNotificationId, swipeStartX, swipeCurrentX, isSwiping, handleSwipeStart, handleSwipeMove, handleSwipeEnd, handleNotificationClick, handleDeleteNotification, truncateText]);

  // Renderizar lista de notificaciones
  const renderNotificationsList = useCallback(() => {
    if (filteredNotifications.length === 0) {
      return (
        <motion.div 
          className={styles.emptyState}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Image src="/EmptyNotification.svg" alt="Sin notificaciones" width={64} height={64} />
          <p>No hay notificaciones</p>
        </motion.div>
      );
    }

    return (
      <div className={styles.notificationsList}>
        <AnimatePresence mode="popLayout">
          {filteredNotifications.map((notification, index) => (
            <NotificationItem 
              key={notification.id} 
              notification={notification} 
              index={index} 
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }, [filteredNotifications, NotificationItem]);

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
