'use client';

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { gsap } from 'gsap';
import { FixedSizeList as List } from 'react-window';
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

interface GroupedNotifications {
  type: string;
  title: string;
  notifications: Notification[];
  count: number;
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

  // Función para obtener título del grupo (mover antes del useMemo)
  const getGroupTitle = useCallback((type: string): string => {
    switch (type) {
      case 'task_deleted':
        return '🗑️ Tareas Eliminadas';
      case 'task_archived':
        return '📁 Tareas Archivadas';
      case 'task_unarchived':
        return '📂 Tareas Desarchivadas';
      case 'task_status_changed':
        return '🔄 Cambios de Estado';
      case 'group_message':
        return '💬 Mensajes de Grupo';
      case 'private_message':
        return '💭 Mensajes Privados';
      default:
        return '📢 Otras Notificaciones';
    }
  }, []);

  // Agrupar notificaciones por tipo
  const groupedNotifications = useMemo(() => {
    if (!isVisible) return [];
    
    const groups: { [key: string]: Notification[] } = {};
    
    notifications.slice(0, 50).forEach((notification) => {
      const type = notification.type || 'other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(notification);
    });
    
    // Convertir a array y ordenar por timestamp más reciente
    return Object.entries(groups).map(([type, notifications]) => {
      const sortedNotifications = notifications.sort((a, b) => 
        b.timestamp.toMillis() - a.timestamp.toMillis()
      );
      
      const title = getGroupTitle(type);
      
      return {
        type,
        title,
        notifications: sortedNotifications,
        count: sortedNotifications.length
      };
    }).sort((a, b) => {
      // Ordenar por la notificación más reciente del grupo
      const aLatest = a.notifications[0]?.timestamp.toMillis() || 0;
      const bLatest = b.notifications[0]?.timestamp.toMillis() || 0;
      return bLatest - aLatest;
    });
  }, [notifications, isVisible, getGroupTitle]);

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
  const NotificationItem = useCallback(({ notification }: { notification: Notification; index?: number }) => {
    const sender = users.find((u) => u.id === notification.userId);
    const relativeTime = formatRelativeTime(notification.timestamp);
    const swipeDistance = swipedNotificationId === notification.id ? swipeStartX - swipeCurrentX : 0;
    
    return (
      <div
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
      >
        <div className={styles.notificationContent}>
          <div className={styles.notificationHeader}>
            <div className={styles.senderInfo}>
              <Image
                src={sender?.imageUrl || '/default-avatar.png'}
                alt={sender?.firstName || 'Usuario'}
                width={32}
                height={32}
                className={styles.senderAvatar}
              />
              <span className={styles.senderName}>{sender?.firstName || 'Usuario'}</span>
            </div>
            <span className={styles.timestamp}>{relativeTime}</span>
          </div>
          <div className={styles.messageContainer}>
            <p className={styles.message}>{truncateText(notification.message, 100)}</p>
            {!notification.read && <div className={styles.unreadIndicator} />}
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
            🗑️
          </button>
        </div>
      </div>
    );
  }, [users, formatRelativeTime, swipedNotificationId, swipeStartX, swipeCurrentX, isSwiping, handleSwipeStart, handleSwipeMove, handleSwipeEnd, handleNotificationClick, handleDeleteNotification, truncateText]);

  // Componente para renderizar grupo de notificaciones
  const GroupHeader = useCallback(({ group }: { group: GroupedNotifications }) => (
    <div className={styles.groupHeader}>
      <h3 className={styles.groupTitle}>{group.title}</h3>
      <span className={styles.groupCount}>{group.count} notificación{group.count !== 1 ? 'es' : ''}</span>
    </div>
  ), []);

  // Renderizar lista virtualizada
  const renderVirtualizedList = useCallback(() => {
    if (groupedNotifications.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Image src="/EmptyNotification.svg" alt="Sin notificaciones" width={64} height={64} />
          <p>No hay notificaciones</p>
        </div>
      );
    }

    const itemCount = groupedNotifications.reduce((total, group) => total + group.notifications.length + 1, 0);
    const itemSize = 80; // Altura de cada item
    const listHeight = Math.min(400, itemCount * itemSize);

    return (
      <List
        height={listHeight}
        itemCount={itemCount}
        itemSize={itemSize}
        width="100%"
        className={styles.virtualizedList}
      >
        {({ index, style }) => {
          let currentIndex = 0;
          
          for (const group of groupedNotifications) {
            // Renderizar header del grupo
            if (index === currentIndex) {
              return (
                <div style={style}>
                  <GroupHeader group={group} />
                </div>
              );
            }
            currentIndex++;
            
            // Renderizar notificaciones del grupo
            for (const notification of group.notifications) {
              if (index === currentIndex) {
                return (
                  <div style={style}>
                    <NotificationItem notification={notification} index={index} />
                  </div>
                );
              }
              currentIndex++;
            }
          }
          
          return null;
        }}
      </List>
    );
  }, [groupedNotifications, GroupHeader, NotificationItem]);

  useEffect(() => {
    if (isOpen && notificationsRef.current) {
      if (isMobile) {
        // Animación desde abajo para móvil
        gsap.fromTo(
          notificationsRef.current,
          { y: '100%', opacity: 0 },
          { y: '0%', opacity: 1, duration: 0.3, ease: 'power2.out' },
        );
      } else {
        // Animación normal para desktop
        gsap.fromTo(
          notificationsRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    } else if (isVisible && notificationsRef.current) {
      if (isMobile) {
        // Animación hacia abajo para móvil
        gsap.to(notificationsRef.current, {
          y: '100%',
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => onClose(),
        });
      } else {
        // Animación normal para desktop
        gsap.to(notificationsRef.current, {
          opacity: 0,
          y: -10,
          scale: 0.95,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => onClose(),
        });
      }
    }
  }, [isOpen, isVisible, onClose, isMobile]);

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

  // Renderizado para móvil
  if (isMobile) {
    return createPortal(
      <>
        <div className={styles.dropdownOverlay} onClick={onClose} />
        <div
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
        >
          <div className={styles.header}>
            <div className={styles.dragBar} />
            <div className={styles.title}>Notificaciones</div>
            <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar notificaciones">
              <Image src="/x.svg" alt="Cerrar" width={20} height={20} />
            </button>
          </div>
          <div className={styles.scrollContainer}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <span>Cargando notificaciones...</span>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <Image src="/circle-x.svg" alt="Error" width={40} height={40} />
                <span>{error}</span>
              </div>
            ) : renderVirtualizedList()}
          </div>
        </div>
      </>,
      document.body,
    );
  }

  // Renderizado para desktop (dropdown normal)
  return createPortal(
    <div
      ref={(el) => {
        notificationsRef.current = el;
        scrollContainerRef.current = el;
      }}
      className={styles.dropdown}
      style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
      data-notification-dropdown
    >
      <div className={styles.header}>
        <div className={styles.title}>Notificaciones</div>
        <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar notificaciones">
          <Image src="/x.svg" alt="Cerrar" width={20} height={20} />
        </button>
      </div>
      <div className={styles.scrollContainer}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <span>Cargando notificaciones...</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <Image src="/circle-x.svg" alt="Error" width={40} height={40} />
            <span>{error}</span>
          </div>
        ) : renderVirtualizedList()}
      </div>
    </div>,
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
