import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  
  useEffect(() => {
    console.log('🔄 Iniciando sincronización de usuarios en tiempo real...');
    
    const unsubscribe = onSnapshot(
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
        console.log(`✅ ${users.length} usuarios sincronizados`);
      },
      (error) => {
        console.error('❌ Error sincronizando usuarios:', error);
      }
    );

    return () => {
      console.log('🔄 Deteniendo sincronización de usuarios...');
      unsubscribe();
    };
  }, [setUsers]);
}; 