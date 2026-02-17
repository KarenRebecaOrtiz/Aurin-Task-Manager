'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { getExistingRegistration, registerServiceWorker } from '../register-sw';

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

/**
 * Convert a URL-safe base64 VAPID key to Uint8Array for PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ─── Shared Zustand store (singleton state across all components) ───

interface PushNotificationsState {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  _initialized: boolean;

  // Actions
  _init: () => Promise<void>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

const usePushStore = create<PushNotificationsState>((set, get) => ({
  permission: 'prompt',
  isSubscribed: false,
  isLoading: true,
  _initialized: false,

  _init: async () => {
    if (get()._initialized) return;
    set({ _initialized: true });

    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      set({ permission: 'unsupported', isLoading: false });
      return;
    }

    const perm = Notification.permission as PermissionState;
    let subscribed = false;

    if (perm === 'granted') {
      try {
        const registration = await getExistingRegistration();
        const sub = await registration?.pushManager.getSubscription();
        subscribed = !!sub;
      } catch {
        // Ignore
      }
    }

    set({ permission: perm, isSubscribed: subscribed, isLoading: false });
  },

  subscribe: async () => {
    try {
      set({ isLoading: true });

      const perm = await Notification.requestPermission();
      set({ permission: perm as PermissionState });

      if (perm !== 'granted') {
        set({ isLoading: false });
        return false;
      }

      const registration = await registerServiceWorker();
      if (!registration) {
        set({ isLoading: false });
        return false;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('[Push] VAPID public key not configured');
        set({ isLoading: false });
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        set({ isSubscribed: true, isLoading: false });
        return true;
      }

      console.error('[Push] Server rejected subscription:', response.status);
      set({ isLoading: false });
      return false;
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      set({ isLoading: false });
      return false;
    }
  },

  unsubscribe: async () => {
    try {
      set({ isLoading: true });

      const registration = await getExistingRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }

      set({ isSubscribed: false, isLoading: false });
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      set({ isLoading: false });
      return false;
    }
  },
}));

/**
 * Hook for managing push notification subscription state.
 *
 * Uses a shared Zustand store so ALL components see the same state.
 * When one component subscribes, all others update instantly.
 */
export function usePushNotifications() {
  const store = usePushStore();

  // Initialize on first mount (singleton — runs once)
  useEffect(() => {
    store._init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    permission: store.permission,
    isSubscribed: store.isSubscribed,
    isLoading: store.isLoading,
    isSupported: store.permission !== 'unsupported',
    isDenied: store.permission === 'denied',
    subscribe: store.subscribe,
    unsubscribe: store.unsubscribe,
  };
}
