'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import styles from './FailAlert.module.scss';

interface FailAlertProps {
  message: string;
  error: string;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

const FailAlert: React.FC<FailAlertProps> = ({ message, error, onClose, onAction, actionLabel }) => {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('[FailAlert] Mounting with message:', message, 'error:', error);
    console.log('[FailAlert] Applied class names:', {
      container: styles.alertNotificationsContainer,
      error: styles.error,
    });

    if (alertRef.current) {
      console.log('[FailAlert] DOM node present, starting GSAP animation');
      gsap.fromTo(
        alertRef.current,
        { opacity: 0, x: 50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.3,
          ease: 'power2.out',
          onStart: () => console.log('[FailAlert] GSAP animation started'),
          onComplete: () => console.log('[FailAlert] GSAP animation completed'),
        }
      );

      const computedStyles = window.getComputedStyle(alertRef.current.parentElement!);
      console.log('[FailAlert] Computed styles for container:', {
        display: computedStyles.display,
        position: computedStyles.position,
        bottom: computedStyles.bottom,
        right: computedStyles.right,
        zIndex: computedStyles.zIndex,
        opacity: computedStyles.opacity,
      });
    } else {
      console.warn('[FailAlert] No DOM node found for alertRef');
    }

    const timer = setTimeout(() => {
      console.log('[FailAlert] Timer triggered, initiating close');
      handleClose();
    }, 5000);

    return () => {
      console.log('[FailAlert] Unmounting, clearing timer');
      clearTimeout(timer);
    };
  }, [message, error, onClose]);

  const handleClose = () => {
    console.log('[FailAlert] Initiating close');
    if (alertRef.current) {
      gsap.to(alertRef.current, {
        opacity: 0,
        x: 50,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          console.log('[FailAlert] Close animation completed, triggering onClose');
          onClose();
        },
      });
    } else {
      console.log('[FailAlert] No DOM node for close animation, triggering onClose');
      onClose();
    }
  };

  return createPortal(
    <div
      className={styles.alertNotificationsContainer}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10002,
        pointerEvents: 'auto',
      }}
    >
      <div className={styles.error} ref={alertRef}>
        <div className={styles.alertFlexContainer}>
          <div className={styles.alertFlexShrink}>
            <svg
              className={styles.errorSvg}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className={styles.errorPromptWrapper}>
            <p className={styles.errorPromptHeading}>Error al Actualizar</p>
            <div className={styles.errorPromptContent}>
              <p>
                {message} <small>({error})</small>
              </p>
            </div>
            <div className={styles.errorButtonContainer}>
              {onAction && actionLabel && (
                <button type="button" className={styles.errorActionButton} onClick={onAction}>
                  {actionLabel}
                </button>
              )}
              <button type="button" className={styles.errorDismissButton} onClick={handleClose}>
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

export default FailAlert;