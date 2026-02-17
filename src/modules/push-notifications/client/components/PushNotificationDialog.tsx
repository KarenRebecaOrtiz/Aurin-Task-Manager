'use client';

import { useState, useEffect, useCallback } from 'react';
import { BellRing } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '@/modules/dialogs';
import { usePushNotifications } from '../hooks/usePushNotifications';

const DISMISS_KEY = 'aurin_push_prompt_dismissed';
const SESSION_DISMISS_KEY = 'aurin_push_prompt_session_dismissed';

/**
 * Desktop push notification opt-in dialog.
 *
 * Persistent behavior:
 * - "Ahora no" → sessionStorage (comes back next session)
 * - "No volver a mostrar" → localStorage (permanent, shared with mobile)
 * - Activating push → closes and never shows again (subscribed)
 *
 * Shows after 3s delay when:
 * - Push is supported
 * - User hasn't subscribed
 * - User hasn't dismissed permanently
 * - User hasn't dismissed this session
 * - Permission hasn't been denied
 */
export function PushNotificationDialog() {
  const { isSupported, isSubscribed, isDenied, subscribe, isLoading } =
    usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isSupported || isSubscribed || isDenied) return;

    try {
      if (localStorage.getItem(DISMISS_KEY) === 'true') return;
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true') return;
    } catch {
      // Storage unavailable
    }

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, isDenied]);

  // Close if user subscribes externally (e.g. via SettingsDrawer)
  useEffect(() => {
    if (isSubscribed) setVisible(false);
  }, [isSubscribed]);

  const handleActivate = useCallback(async () => {
    await subscribe();
    setVisible(false);
  }, [subscribe]);

  const handleDismissSession = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
    } catch {
      // Ignore
    }
  }, []);

  const handleDismissPermanent = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Ignore
    }
  }, []);

  return (
    <ResponsiveDialog open={visible} onOpenChange={(open) => !open && handleDismissSession()}>
      <ResponsiveDialogContent size="sm" closeOnOverlayClick>
        <ResponsiveDialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.5rem',
                background: 'rgba(208, 223, 0, 0.12)',
                color: '#d0df00',
                flexShrink: 0,
              }}
            >
              <BellRing size={18} />
            </div>
            <ResponsiveDialogTitle>Mantente al tanto de tu equipo</ResponsiveDialogTitle>
          </div>
          <ResponsiveDialogDescription>
            Recibe alertas en tu escritorio cuando actualicen tus tareas, te asignen nuevas o te envien mensajes.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogFooter>
          <button
            type="button"
            onClick={handleDismissPermanent}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#a1a1aa',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '0.5rem',
            }}
          >
            No volver a mostrar
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleDismissSession}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#71717a',
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '0.5rem',
              }}
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={handleActivate}
              disabled={isLoading}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#000',
                background: '#d0df00',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                borderRadius: '0.5rem',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Activando...' : 'Activar notificaciones'}
            </button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
