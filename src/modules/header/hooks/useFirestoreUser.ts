/**
 * @module header/hooks/useFirestoreUser
 * @description Hook para obtener datos del usuario desde Firestore
 * 
 * MIGRADO: Ahora usa userDataStore (Zustand) como Single Source of Truth
 * Este hook se mantiene por compatibilidad hacia atrás con componentes existentes.
 * 
 * @deprecated Prefiere usar useUserDataStore() directamente de @/stores/userDataStore
 */

import { useMemo } from 'react';
import { useUserDataStore, type UserData } from '@/stores/userDataStore';

/**
 * Interfaz compatible con el formato anterior
 */
interface FirestoreUser {
  fullName: string;
  profilePhoto: string;
  // Añadimos campos adicionales que pueden ser útiles
  email?: string;
  role?: string;
  status?: string;
  description?: string;
  stack?: string[];
  socialLinks?: UserData['socialLinks'];
}

/**
 * Hook que retorna datos del usuario desde el userDataStore
 * Mantiene compatibilidad con la API anterior para evitar breaking changes
 * 
 * @example
 * ```tsx
 * // Uso legacy (soportado)
 * const { firestoreUser, loading } = useFirestoreUser();
 * 
 * // Uso recomendado (directo)
 * const userData = useUserDataStore((state) => state.userData);
 * ```
 */
export const useFirestoreUser = () => {
  const userData = useUserDataStore((state) => state.userData);
  const isLoading = useUserDataStore((state) => state.isLoading);

  // Transformar a formato compatible
  const firestoreUser = useMemo<FirestoreUser | null>(() => {
    if (!userData) return null;

    return {
      fullName: userData.fullName || userData.displayName || '',
      profilePhoto: userData.profilePhoto || '',
      email: userData.email,
      role: userData.role,
      status: userData.status,
      description: userData.description,
      stack: userData.stack,
      socialLinks: userData.socialLinks,
    };
  }, [userData]);

  return { 
    firestoreUser, 
    loading: isLoading,
    // Exponer también el userData completo para transición gradual
    userData,
  };
};

