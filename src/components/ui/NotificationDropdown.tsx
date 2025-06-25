'use client';

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { gsap } from 'gsap';
import styles from './Header.module.scss';
import React from 'react';

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
  notifications: Notification[];
  users: { id: string; fullName: string; firstName?: string; imageUrl: string }[];
  dropdownPosition: { top: number; right: number };
  time: Date | null;
  onNotificationClick: (notification: Notification) => void;
  onDeleteNotification: (notificationId: string) => void;
  onClose: () => void;
}

export default React.memo(function NotificationDropdown({
  isVisible,
  isOpen,
  notifications,
  users,
  dropdownPosition,
  time,
  onNotificationClick,
  onDeleteNotification,
  onClose,
}: NotificationDropdownProps) {
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
      onDeleteNotification(swipedNotificationId);
    }
    
    // Resetear estados
    setIsSwiping(false);
    setSwipedNotificationId(null);
    setSwipeStartX(0);
    setSwipeCurrentX(0);
  }, [isSwiping, swipedNotificationId, swipeStartX, swipeCurrentX, onDeleteNotification]);

  // Memoizar el cálculo de tiempo relativo para evitar recálculos innecesarios
  const formatRelativeTime = useCallback((timestamp: Timestamp) => {
    const now = new Date(); // Usar new Date() directamente en lugar de time prop
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
  }, []); // Sin dependencias para estabilizar la función

  // Memoizar las notificaciones procesadas para evitar recálculos
  const processedNotifications = useMemo(() => {
    if (!isVisible) return [];
    
    return notifications.slice(0, 20).map((n) => {
      const sender = users.find((u) => u.id === n.userId);
      return {
        ...n,
        senderInfo: {
          imageUrl: sender?.imageUrl || '/default-avatar.png',
          name: sender?.firstName || 'Usuario'
        },
        relativeTime: formatRelativeTime(n.timestamp)
      };
    });
  }, [notifications, users, formatRelativeTime, isVisible]);

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

  // Función para procesar el texto y hacer bold al nombre de la tarea
  const processNotificationText = useCallback((message: string) => {
    // Buscar patrones comunes de nombres de tareas
    const taskPatterns = [
      /"([^"]+)"/g, // Texto entre comillas
      /'([^']+)'/g, // Texto entre comillas simples
      /tarea\s+"([^"]+)"/gi, // "tarea" seguido de texto entre comillas
      /task\s+"([^"]+)"/gi, // "task" seguido de texto entre comillas
    ];

    let processedText = message;

    // Aplicar cada patrón
    taskPatterns.forEach(pattern => {
      processedText = processedText.replace(pattern, (match, taskName) => {
        return match.replace(taskName, `<strong>${taskName}</strong>`);
      });
    });

    return processedText;
  }, []);

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
        {/* Overlay de fondo */}
        <div 
          className={styles.mobileOverlay}
          onClick={onClose}
        />
        
        {/* Modal de notificaciones */}
        <div
          ref={(el) => {
            notificationsRef.current = el;
            scrollContainerRef.current = el;
          }}
          className={styles.mobileNotificationModal}
          style={{
            transform: `translateY(${dragOffset}px)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          data-notification-dropdown
        >
          {/* Header del modal con drag indicator */}
          <div className={styles.mobileModalHeader}>
            <div className={styles.dragIndicator} />
            <h3 className={styles.modalTitle}>Notificaciones</h3>
            <button 
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Cerrar notificaciones"
            >
              <Image
                src="/x.svg"
                alt="Cerrar"
                width={20}
                height={20}
              />
            </button>
          </div>

          {/* Contenido de notificaciones */}
          <div className={styles.mobileModalContent}>
            {processedNotifications.length === 0 ? (
              <div className={styles.emptyState}>
                <Image
                  src="/EmptyNotification.svg"
                  alt="Sin notificaciones"
                  width={60}
                  height={60}
                />
                <span>No hay notificaciones nuevas por ahora...</span>
              </div>
            ) : (
              processedNotifications.map((n) => {
                const swipeDistance = swipedNotificationId === n.id ? swipeStartX - swipeCurrentX : 0;
                const itemStyle = swipedNotificationId === n.id 
                  ? { transform: `translateX(-${Math.max(0, swipeDistance)}px)` }
                  : undefined;
                
                return (
                  <div
                    key={n.id}
                    className={`${styles.mobileNotificationItem} ${n.read ? styles.read : ''} ${isSwiping && swipedNotificationId === n.id ? styles.swiping : ''}`}
                    style={itemStyle}
                    onMouseDown={(e) => handleSwipeStart(e, n.id)}
                    onMouseMove={handleSwipeMove}
                    onMouseUp={handleSwipeEnd}
                    onMouseLeave={handleSwipeEnd}
                    onTouchStart={(e) => handleSwipeStart(e, n.id)}
                    onTouchMove={handleSwipeMove}
                    onTouchEnd={handleSwipeEnd}
                  >
                    <div className={styles.notificationContent}>
                      <div className={styles.notificationLeft}>
                        <Image
                          src={n.senderInfo.imageUrl}
                          alt={n.senderInfo.name}
                          width={40}
                          height={40}
                          className={styles.notificationAvatar}
                        />
                      </div>
                      <div className={styles.notificationRight}>
                        <div className={styles.notificationTextWrap}>
                          <span
                            className={styles.notificationTextContent}
                            onClick={() => {
                              onNotificationClick(n);
                              onClose();
                            }}
                            dangerouslySetInnerHTML={{ __html: processNotificationText(truncateText(n.message, 120)) }}
                          />
                          <span className={styles.notificationTime}>
                            {n.relativeTime}
                          </span>
                        </div>
                        <div className={styles.notificationButtonWrap}>
                          <button
                            className={styles.notificationPrimaryCta}
                            onClick={() => {
                              onNotificationClick(n);
                              onClose();
                            }}
                          >
                            Ver Evento
                          </button>
                          <button
                            className={styles.notificationSecondaryCta}
                            onClick={() => onDeleteNotification(n.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
      className={styles.notificationDropdown}
      style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
      data-notification-dropdown
    >
      {processedNotifications.length === 0 ? (
        <div className={styles.notificationItem}>
          <span>No hay notificaciones nuevas por ahora...</span>
        </div>
      ) : (
        processedNotifications.map((n) => {
          const swipeDistance = swipedNotificationId === n.id ? swipeStartX - swipeCurrentX : 0;
          const itemStyle = swipedNotificationId === n.id 
            ? { transform: `translateX(-${Math.max(0, swipeDistance)}px)` }
            : undefined;
          
          return (
            <div
              key={n.id}
              className={`${styles.notificationItem} ${n.read ? styles.read : ''} ${isSwiping && swipedNotificationId === n.id ? styles.swiping : ''}`}
              style={itemStyle}
              onMouseDown={(e) => handleSwipeStart(e, n.id)}
              onMouseMove={handleSwipeMove}
              onMouseUp={handleSwipeEnd}
              onMouseLeave={handleSwipeEnd}
              onTouchStart={(e) => handleSwipeStart(e, n.id)}
              onTouchMove={handleSwipeMove}
              onTouchEnd={handleSwipeEnd}
            >
              <div className={styles.notificationContent}>
                <div className={styles.notificationLeft}>
                  <Image
                    src={n.senderInfo.imageUrl}
                    alt={n.senderInfo.name}
                    width={40}
                    height={40}
                    className={styles.notificationAvatar}
                  />
                </div>
                <div className={styles.notificationRight}>
                  <div className={styles.notificationTextWrap}>
                    <span
                      className={styles.notificationTextContent}
                      onClick={() => {
                        onNotificationClick(n);
                        onClose();
                      }}
                      dangerouslySetInnerHTML={{ __html: processNotificationText(truncateText(n.message, 100)) }}
                    />
                    <span className={styles.notificationTime}>
                      {n.relativeTime}
                    </span>
                  </div>
                  <div className={styles.notificationButtonWrap}>
                    <button
                      className={styles.notificationPrimaryCta}
                      onClick={() => {
                        onNotificationClick(n);
                        onClose();
                      }}
                    >
                      Ver Evento
                    </button>
                    <button
                      className={styles.notificationSecondaryCta}
                      onClick={() => onDeleteNotification(n.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>,
    document.body,
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si las props importantes han cambiado
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.notifications.length === nextProps.notifications.length &&
    prevProps.users.length === nextProps.users.length &&
    prevProps.dropdownPosition.top === nextProps.dropdownPosition.top &&
    prevProps.dropdownPosition.right === nextProps.dropdownPosition.right
  );
});
