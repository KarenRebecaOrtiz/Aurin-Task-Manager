'use client';

import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

export default function SafariFirebaseAuthFix() {
  const { getToken, userId } = useClerkAuth();
  const { user, isLoaded } = useUser();
  const [attempts, setAttempts] = useState(0);
  const [isFixed, setIsFixed] = useState(false);
  const maxAttempts = 5;

  useEffect(() => {
    // Solo ejecutar en Safari
    if (typeof window === "undefined" || !/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      return;
    }

    // Solo ejecutar si Clerk está cargado pero Firebase Auth no
    if (!isLoaded || !user || !userId) {
      return;
    }

    const checkAndFixAuth = async () => {
      // Verificar si Firebase Auth ya está funcionando
      if (auth.currentUser) {
        console.log('[SafariFirebaseAuthFix] Firebase Auth already working');
        setIsFixed(true);
        return;
      }

      // Si ya intentamos muchas veces, parar
      if (attempts >= maxAttempts) {
        console.error('[SafariFirebaseAuthFix] Max attempts reached');
        return;
      }

      try {
        console.log(`[SafariFirebaseAuthFix] Attempt ${attempts + 1}/${maxAttempts} - Fixing Firebase Auth for Safari`);
        
        // Obtener token de Clerk
        const token = await getToken({ template: 'integration_firebase' });
        if (!token) {
          throw new Error('No Firebase token received from Clerk');
        }

        console.log('[SafariFirebaseAuthFix] Token received, signing in...');
        
        // Intentar autenticar con Firebase
        await signInWithCustomToken(auth, token);
        
        console.log('[SafariFirebaseAuthFix] ✅ SUCCESS - Firebase Auth fixed for Safari!');
        setIsFixed(true);
        
        // 🔄 Disparar evento para que otros componentes se reinicien
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent('safariFirebaseAuthFixed', {
            detail: { userId, timestamp: new Date().toISOString() }
          }));
          console.log('[SafariFirebaseAuthFix] 🔄 Notified other components to restart');
        }
        
      } catch (error) {
        console.error(`[SafariFirebaseAuthFix] Attempt ${attempts + 1} failed:`, error);
        setAttempts(prev => prev + 1);
        
        // Retry con backoff exponencial
        const retryDelay = Math.min(1000 * Math.pow(2, attempts), 8000);
        setTimeout(() => {
          setAttempts(prev => prev + 1);
        }, retryDelay);
      }
    };

    // Verificar cada 2 segundos si Firebase Auth está funcionando
    const interval = setInterval(() => {
      if (!isFixed && !auth.currentUser && attempts < maxAttempts) {
        checkAndFixAuth();
      } else if (auth.currentUser) {
        setIsFixed(true);
        clearInterval(interval);
      }
    }, 2000);

    // Cleanup
    return () => clearInterval(interval);
  }, [isLoaded, user, userId, getToken, attempts, isFixed]);

  // No renderizar nada - es solo un fixer invisible
  return null;
} 