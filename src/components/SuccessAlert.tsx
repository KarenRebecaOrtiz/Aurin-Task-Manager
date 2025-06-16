'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import styles from './SuccessAlert.module.scss';

interface SuccessAlertProps {
  message: string;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

const SuccessAlert: React.FC<SuccessAlertProps> = ({ message, onClose, onAction, actionLabel }) => {
  const alertRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(new Audio('/Success.mp3')); // Reference to the audio file

  useEffect(() => {
    console.log('[SuccessAlert] Mounting with message:', message);
    console.log('[SuccessAlert] Applied class names:', {
      container: styles.notificationsContainer,
      success: styles.success,
    });

    // Play haptic feedback sound
    audioRef.current.play().catch((error) => {
      console.error('[SuccessAlert] Failed to play audio:', error);
    });
    console.log('[SuccessAlert] Triggered audio playback for Success.mp3');

    if (alertRef.current) {
      console.log('[SuccessAlert] DOM node present, starting GSAP animation');
      gsap.fromTo(
        alertRef.current,
        { opacity: 0, x: 50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.3,
          ease: 'power2.out',
          onStart: () => console.log('[SuccessAlert] GSAP animation started'),
          onComplete: () => console.log('[SuccessAlert] GSAP animation completed'),
        }
      );

      const computedStyles = window.getComputedStyle(alertRef.current.parentElement!);
      console.log('[SuccessAlert] Computed styles for container:', {
        display: computedStyles.display,
        position: computedStyles.position,
        bottom: computedStyles.bottom,
        right: computedStyles.right,
        zIndex: computedStyles.zIndex,
        opacity: computedStyles.opacity,
      });
    } else {
      console.warn('[SuccessAlert] No DOM node found for alertRef');
    }

    const timer = setTimeout(() => {
      console.log('[SuccessAlert] Timer triggered, initiating close');
      handleClose();
    }, 5000);

    return () => {
      console.log('[SuccessAlert] Unmounting, clearing timer');
      clearTimeout(timer);
      // Pause and reset audio on unmount
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      console.log('[SuccessAlert] Audio paused and reset');
    };
  }, [message, onClose]);

  const handleClose = () => {
    console.log('[SuccessAlert] Initiating close');
    if (alertRef.current) {
      gsap.to(alertRef.current, {
        opacity: 0,
        x: 50,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          console.log('[SuccessAlert] Close animation completed, triggering onClose');
          onClose();
        },
      });
    } else {
      console.log('[SuccessAlert] No DOM node for close animation, triggering onClose');
      onClose();
    }
  };

  return createPortal(
    <div
      className={styles.notificationsContainer}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10002,
        pointerEvents: 'auto',
      }}
    >
      <div className={styles.success} ref={alertRef}>
        <div className={styles.flex}>
          <div className={styles.flexShrink0}>
            <svg
              className={styles.succesSvg}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className={styles.profilePromptWrap}>
            <p className={styles.profilePromptHeading}>Perfil Actualizado</p>
            <div className={styles.profilePromptPrompt}>
              <p>{message}</p>
            </div>
            <div className={styles.profileButtonContainer}>
              {onAction && actionLabel && (
                <button type="button" className={styles.profileButtonMain} onClick={onAction}>
                  {actionLabel}
                </button>
              )}
              <button type="button" className={styles.profileButtonSecondary} onClick={handleClose}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SuccessAlert;