/**
 * Toast Component - Componente individual de toast
 * Renderiza un toast con animaciones y audio
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ToastConfig } from '../types';
import styles from './Toast.module.scss';

interface ToastProps {
  config: ToastConfig;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ config, onClose }) => {
  const toastRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determinar el audio según el variant
  const getAudioFile = useCallback(() => {
    switch (config.variant) {
      case 'success':
  return '/NotificationSound.mp3';
      case 'error':
        return '/Error.mp3';
      case 'warning':
        return '/Warning.mp3';
      default:
        return '/Info.mp3';
    }
  }, [config.variant]);

  // Reproducir audio
  const playAudio = useCallback(async () => {
    if (!config.playSound || !audioRef.current) return;

    try {
      await audioRef.current.play();
    } catch {
      // Audio playback failed silently (browser autoplay policy)
    }
  }, [config.playSound]);

  // Inicializar audio
  useEffect(() => {
    const audioFile = getAudioFile();
    audioRef.current = new Audio(audioFile);
    audioRef.current.preload = 'auto';

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [getAudioFile]);

  // Animación de entrada
  useEffect(() => {
    if (toastRef.current) {
      gsap.fromTo(
        toastRef.current,
        { opacity: 0, y: -20, x: 20 },
        {
          opacity: 1,
          y: 0,
          x: 0,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            playAudio();
          },
        }
      );
    }
  }, [playAudio]);

  // Obtener icono según variant
  const getIcon = () => {
    switch (config.variant) {
      case 'success':
        return (
          <svg viewBox="0 0 512 512" className={styles.icon}>
            <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z" />
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 512 512" className={styles.icon}>
            <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z" />
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 512 512" className={styles.icon}>
            <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 64V320h64V96H256zm32 384H224v64h64v-64z" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 512 512" className={styles.icon}>
            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216v64zm24-120H224V168h16v48z" />
          </svg>
        );
    }
  };

  // Obtener label según variant
  const getLabel = () => {
    switch (config.variant) {
      case 'success':
        return 'Éxito';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      default:
        return 'Información';
    }
  };

  const handleActionClick = useCallback(() => {
    config.onAction?.();
    onClose(config.id);
  }, [config, onClose]);

  const handleCloseClick = useCallback(() => {
    onClose(config.id);
  }, [config.id, onClose]);

  return (
    <div
      ref={toastRef}
      className={`${styles.toast} ${styles[`toast-${config.variant}`]}`}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.iconContainer}>{getIcon()}</div>

      <div className={styles.content}>
        <p className={styles.label}>{getLabel()}</p>
        <p className={styles.message}>{config.message}</p>
        {config.error && <p className={styles.errorDetails}>{config.error}</p>}
      </div>

      {config.onAction && config.actionLabel && (
        <button
          className={styles.actionButton}
          onClick={handleActionClick}
        >
          {config.actionLabel}
        </button>
      )}

      <button
        className={styles.closeButton}
        onClick={handleCloseClick}
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );
};
