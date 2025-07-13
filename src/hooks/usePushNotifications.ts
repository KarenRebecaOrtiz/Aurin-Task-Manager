import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Configuración de FCM
const FCM_CONFIG = {
  VAPID_KEY: 'YOUR_VAPID_KEY_HERE', // Reemplazar con tu VAPID key
  TOPIC_PREFIX: 'user_',
};

export const usePushNotifications = () => {
  const { user } = useUser();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Verificar soporte de push notifications
  useEffect(() => {
    const checkSupport = async () => {
      if (!messaging) {
        console.log('[PushNotifications] Messaging not available');
        return;
      }

      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        console.log('[PushNotifications] Push notifications supported');
      } else {
        console.log('[PushNotifications] Push notifications not supported');
      }
    };

    checkSupport();
  }, []);

  // Solicitar permisos y obtener token
  const requestPermission = useCallback(async () => {
    if (!messaging || !user?.id) return false;

    try {
      // Solicitar permiso de notificaciones
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        console.log('[PushNotifications] Permission granted');

        // Registrar service worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[PushNotifications] Service worker registered:', registration);
          } catch (error) {
            console.error('[PushNotifications] Service worker registration failed:', error);
          }
        }

        // Obtener token FCM
        const currentToken = await getToken(messaging, {
          vapidKey: FCM_CONFIG.VAPID_KEY,
        });

        if (currentToken) {
          setToken(currentToken);
          console.log('[PushNotifications] FCM token obtained:', currentToken);

          // Guardar token en Firestore
          await updateDoc(doc(db, 'users', user.id), {
            fcmToken: currentToken,
            pushNotificationsEnabled: true,
            lastTokenUpdate: new Date().toISOString(),
          });

          // Suscribirse a topic del usuario
          // Nota: Esto requiere Firebase Admin SDK en el servidor
          // await subscribeToTopic(currentToken, `${FCM_CONFIG.TOPIC_PREFIX}${user.id}`);

          setIsSubscribed(true);
          return true;
        } else {
          console.log('[PushNotifications] No registration token available');
          return false;
        }
      } else {
        console.log('[PushNotifications] Permission denied');
        return false;
      }
    } catch (error) {
      console.error('[PushNotifications] Error requesting permission:', error);
      return false;
    }
  }, [user?.id]);

  // Escuchar mensajes en foreground
  useEffect(() => {
    if (!messaging || !isSubscribed) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[PushNotifications] Message received in foreground:', payload);
      
      // Mostrar notificación local
      if (payload.notification) {
        const { title, body, icon } = payload.notification;
        
        // Crear notificación nativa
        if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then((registration) => {
                         registration.showNotification(title || 'Nueva Notificación', {
               body: body || '',
               icon: icon || '/favicon.ico',
               badge: '/favicon.ico',
               tag: 'task-app-notification',
               requireInteraction: false,
             });
          });
        }
      }
    });

    return () => unsubscribe();
  }, [isSubscribed]);

  // Limpiar token al desuscribirse
  const unsubscribe = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Remover token de Firestore
      await updateDoc(doc(db, 'users', user.id), {
        fcmToken: null,
        pushNotificationsEnabled: false,
      });

      setToken(null);
      setIsSubscribed(false);
      console.log('[PushNotifications] Unsubscribed successfully');
    } catch (error) {
      console.error('[PushNotifications] Error unsubscribing:', error);
    }
  }, [user?.id]);

  // Verificar estado de suscripción
  const checkSubscriptionStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const userDoc = await fetch(`/api/users/${user.id}`);
      const userData = await userDoc.json();
      
      if (userData.fcmToken && userData.pushNotificationsEnabled) {
        setIsSubscribed(true);
        setToken(userData.fcmToken);
      }
    } catch (error) {
      console.error('[PushNotifications] Error checking subscription status:', error);
    }
  }, [user?.id]);

  // Verificar estado al cargar
  useEffect(() => {
    if (isSupported && user?.id) {
      checkSubscriptionStatus();
    }
  }, [isSupported, user?.id, checkSubscriptionStatus]);

  return {
    isSupported,
    isSubscribed,
    permission,
    token,
    requestPermission,
    unsubscribe,
    checkSubscriptionStatus,
  };
}; 