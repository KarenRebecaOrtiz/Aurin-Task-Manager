import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { useDataStore } from '@/stores/dataStore';

interface FirestoreUser {
  id: string;
  profilePhoto?: string;
  displayName?: string;
  fullName?: string;
  role?: string;
  status?: string;
  lastOnlineAt?: string;
  lastManualStatus?: string;
  [key: string]: unknown; // Para otros campos que puedan existir
}

export const useUsersSync = () => {
  const setUsers = useDataStore((state) => state.setUsers);
  const updateUserPresence = useDataStore((state) => state.updateUserPresence);
  
  useEffect(() => {
    console.log('🔄 Iniciando sincronización de usuarios en tiempo real...');
    
    // Sincronización de datos de usuario desde Firestore
    const unsubscribeFirestore = onSnapshot(
      collection(db, 'users'), 
      (snapshot) => {
        const firestoreUsers: FirestoreUser[] = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        // Convertir a formato esperado por dataStore
        const users = firestoreUsers.map(user => ({
          id: user.id,
          // Usar profilePhoto de Firestore (que viene de Clerk) o imagen de Clerk por defecto
          imageUrl: user.profilePhoto || `https://img.clerk.com/${user.id}`,
          fullName: user.displayName || user.fullName || 'Usuario',
          role: user.role || 'user',
          status: user.status || 'Disponible',
          description: typeof user.description === 'string' ? user.description : undefined
        }));
        
        setUsers(users);
        console.log(`✅ ${users.length} usuarios sincronizados desde Firestore`);
      },
      (error) => {
        console.error('❌ Error sincronizando usuarios desde Firestore:', error);
      }
    );

    // Sincronización de presencia desde RTDB
    const presenceRef = ref(rtdb, 'presence');
    const unsubscribePresence = onValue(presenceRef, (snap) => {
      const presenceData = snap.val() || {};
      
      Object.entries(presenceData).forEach(([userId, data]: [string, unknown]) => {
        if (data && typeof data === 'object') {
          const presenceData = data as Record<string, unknown>;
          updateUserPresence(
            userId, 
            (presenceData.online as boolean) || false, 
            (presenceData.lastActive as string) || null,
            (presenceData.tabCount as number) || 0
          );
        }
      });
      
      console.log(`✅ Presencia sincronizada para ${Object.keys(presenceData).length} usuarios`);
    }, (error) => {
      console.error('❌ Error sincronizando presencia desde RTDB:', error);
    });

    return () => {
      console.log('🔄 Deteniendo sincronización de usuarios...');
      unsubscribeFirestore();
      unsubscribePresence();
    };
  }, [setUsers, updateUserPresence]);
}; 