'use client';

/**
 * Service Worker registration utilities for push notifications.
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[PushNotifications] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[PushNotifications] SW registered, scope:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[PushNotifications] SW registration failed:', error);
    return null;
  }
}

export async function getExistingRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    return registration ?? null;
  } catch {
    return null;
  }
}
