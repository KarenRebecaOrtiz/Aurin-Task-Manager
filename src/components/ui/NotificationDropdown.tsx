'use client';

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { gsap } from 'gsap';
import styles from './Header.module.scss';

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

export default function NotificationDropdown({
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

  // Memoizar el cálculo de tiempo relativo para evitar recálculos innecesarios
  const formatRelativeTime = useCallback((timestamp: Timestamp) => {
    const now = time || new Date();
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
  }, [time]);

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

  const truncateText = useCallback((txt: string, max: number) =>
    txt.length <= max ? txt : `${txt.slice(0, max - 3)}...`, []);

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
                <p>No hay notificaciones nuevas por ahora...</p>
              </div>
            ) : (
              processedNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`${styles.mobileNotificationItem} ${n.read ? styles.read : ''}`}
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
                        <p
                          className={styles.notificationTextContent}
                          onClick={() => {
                            onNotificationClick(n);
                            onClose();
                          }}
                        >
                          {truncateText(n.message, 60)}
                        </p>
                        <p className={styles.notificationTime}>
                          {n.relativeTime}
                        </p>
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
              ))
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
          No hay notificaciones nuevas por ahora...
        </div>
      ) : (
        processedNotifications.map((n) => (
          <div
            key={n.id}
            className={`${styles.notificationItem} ${n.read ? styles.read : ''}`}
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
                  <p
                    className={styles.notificationTextContent}
                    onClick={() => {
                      onNotificationClick(n);
                      onClose();
                    }}
                  >
                    {truncateText(n.message, 50)}
                  </p>
                  <p className={styles.notificationTime}>
                    {n.relativeTime}
                  </p>
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
        ))
      )}
    </div>,
    document.body,
  );
}
