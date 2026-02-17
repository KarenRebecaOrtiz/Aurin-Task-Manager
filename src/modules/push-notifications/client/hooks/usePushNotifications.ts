'use client';

import { useState, useCallback, useEffect } from 'react';
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

/**
 * Hook for managing push notification subscription state.
 *
 * Provides:
 * - `permission`: Current notification permission state
 * - `isSubscribed`: Whether the user has an active push subscription
 * - `isLoading`: Whether an async operation is in progress
 * - `isSupported`: Whether the browser supports push notifications
 * - `isDenied`: Whether the user has denied notification permission
 * - `subscribe()`: Request permission and subscribe to push
 * - `unsubscribe()`: Remove push subscription
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check current state on mount
  useEffect(() => {
    async function checkState() {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setPermission('unsupported');
        setIsLoading(false);
        return;
      }

      setPermission(Notification.permission as PermissionState);

      if (Notification.permission === 'granted') {
        const registration = await getExistingRegistration();
        const sub = await registration?.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }

      setIsLoading(false);
    }

    checkState();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Request permission (requires user gesture on iOS Safari)
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);

      if (perm !== 'granted') {
        setIsLoading(false);
        return false;
      }

      // Register SW if not already registered
      const registration = await registerServiceWorker();
      if (!registration) {
        setIsLoading(false);
        return false;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('[Push] VAPID public key not configured');
        setIsLoading(false);
        return false;
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        setIsLoading(false);
        return true;
      }

      console.error('[Push] Server rejected subscription:', response.status);
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('[Push] Subscribe error:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      const registration = await getExistingRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Notify server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe error:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported: permission !== 'unsupported',
    isDenied: permission === 'denied',
    subscribe,
    unsubscribe,
  };
}
