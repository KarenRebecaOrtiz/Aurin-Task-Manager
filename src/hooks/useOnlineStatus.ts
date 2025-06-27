import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const useOnlineStatus = () => {
  const { user, isLoaded } = useUser();
  const [currentStatus, setCurrentStatus] = useState('Disponible');
  const tabCountRef = useRef(0);
  const isInitializedRef = useRef(false);

  // Incrementar contador de pestañas
  useEffect(() => {
    tabCountRef.current += 1;
    
    // Marcar como online cuando se abre la pestaña
    if (user?.id && tabCountRef.current === 1) {
      updateDoc(doc(db, 'users', user.id), { 
        lastOnlineAt: new Date().toISOString()
      }).catch(console.error);
    }
    
    const handleBeforeUnload = () => {
      tabCountRef.current -= 1;
      if (tabCountRef.current <= 0) {
        // Última pestaña cerrada, marcar como offline
        if (user?.id) {
          updateDoc(doc(db, 'users', user.id), { 
            status: 'Fuera',
            lastOnlineAt: new Date().toISOString()
          }).catch(console.error);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Pestaña en segundo plano, mantener online
        return;
      }
    };

    // Actualizar lastOnlineAt periódicamente mientras está activo
    const activityInterval = setInterval(() => {
      if (user?.id && tabCountRef.current > 0) {
        updateDoc(doc(db, 'users', user.id), { 
          lastOnlineAt: new Date().toISOString()
        }).catch(console.error);
      }
    }, 120000); // Cada 2 minutos (en lugar de 30 segundos)

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(activityInterval);
      tabCountRef.current -= 1;
    };
  }, [user?.id]);

  // Escuchar cambios en Firestore
  useEffect(() => {
    if (!user?.id || !isLoaded) return;

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const status = data.status || 'Disponible';
        setCurrentStatus(status);
        
        // Si es la primera vez que se carga y hay pestañas abiertas
        if (!isInitializedRef.current && tabCountRef.current > 0) {
          isInitializedRef.current = true;
          
          // Si el estado es "Fuera" y es después de las 12am, resetear a "Disponible"
          const now = new Date();
          const lastReset = data.lastStatusReset ? new Date(data.lastStatusReset) : null;
          
          if (status === 'Fuera' && lastReset) {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastResetDate = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
            
            if (today > lastResetDate) {
              // Ha pasado un día, resetear a "Disponible"
              updateDoc(userDocRef, { 
                status: 'Disponible',
                lastStatusReset: now.toISOString()
              }).catch(console.error);
            }
          }
        }
      }
    }, (error) => {
      console.error('Error listening to user status:', error);
    });

    return () => unsubscribe();
  }, [user?.id, isLoaded]);

  // Función para actualizar estado manualmente
  const updateStatus = async (newStatus: string) => {
    if (!user?.id) return;
    
    try {
      await updateDoc(doc(db, 'users', user.id), { 
        status: newStatus,
        lastOnlineAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return {
    isOnline: tabCountRef.current > 0,
    currentStatus,
    updateStatus
  };
}; 