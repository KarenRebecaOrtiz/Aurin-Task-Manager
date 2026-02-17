'use client';

import { usePushNotifications } from '../hooks/usePushNotifications';
import styles from './PushNotificationPrompt.module.scss';

/**
 * Contextual banner to prompt the user to enable push notifications.
 *
 * - Only renders when push is supported AND the user hasn't subscribed yet
 * - Hides if permission was denied (can't re-prompt)
 * - Button satisfies the "user gesture" requirement for iOS Safari
 */
export function PushNotificationPrompt() {
  const { isSupported, isSubscribed, isDenied, subscribe, isLoading } =
    usePushNotifications();

  // Don't render if not supported, already subscribed, or permission denied
  if (!isSupported || isSubscribed || isDenied) return null;

  return (
    <div className={styles.promptBanner}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div className={styles.text}>
          <span className={styles.title}>Activa notificaciones push</span>
          <span className={styles.description}>
            Recibe alertas instantaneas sobre tus tareas y equipos
          </span>
        </div>
      </div>
      <div className={styles.actions}>
        <button
          onClick={subscribe}
          disabled={isLoading}
          className={styles.enableButton}
        >
          {isLoading ? 'Activando...' : 'Activar'}
        </button>
      </div>
    </div>
  );
}
