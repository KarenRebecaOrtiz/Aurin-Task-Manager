'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import styles from './PushNotificationPrompt.module.scss';

const DISMISS_KEY = 'aurin_push_prompt_dismissed';

/**
 * Mobile-only push notification opt-in prompt.
 *
 * Appears as a bottom sheet overlay when:
 * - Push is supported by the browser
 * - User hasn't subscribed yet
 * - User hasn't dismissed permanently ("Más tarde")
 * - Permission hasn't been denied
 *
 * Shows after a 2s delay to avoid interrupting initial load.
 * "Más tarde" saves to localStorage so it never shows again.
 */
export function PushNotificationPrompt() {
  const { isSupported, isSubscribed, isDenied, subscribe, isLoading } =
    usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    try {
      const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
      setDismissed(wasDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  // Show prompt after 2s delay (only if conditions met)
  useEffect(() => {
    if (!isSupported || isSubscribed || isDenied || dismissed) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, isDenied, dismissed]);

  // "Más tarde" → dismiss forever
  const handleDismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
    setDismissed(true);
  }, []);

  // "Activar" → subscribe then close
  const handleActivate = useCallback(async () => {
    await subscribe();
    setVisible(false);
  }, [subscribe]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleDismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            className={styles.sheet}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className={styles.handle} />

            {/* Close button */}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleDismiss}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            {/* Icon */}
            <div className={styles.iconContainer}>
              <div className={styles.iconRing}>
                <BellRing size={28} />
              </div>
            </div>

            {/* Text */}
            <h3 className={styles.title}>No te pierdas nada</h3>
            <p className={styles.description}>
              Recibe alertas instantaneas cuando actualicen tus tareas,
              te asignen nuevas o te envien mensajes.
            </p>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleActivate}
                disabled={isLoading}
              >
                {isLoading ? 'Activando...' : 'Activar notificaciones'}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleDismiss}
              >
                Mas tarde
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
