/**
 * @module hooks/useOtherUserData
 * @description Hooks optimizados para consumir datos de OTROS usuarios.
 *
 * Estos hooks:
 * - Automáticamente se suscriben al usuario cuando el componente monta
 * - Solo re-renderizan cuando el dato específico cambia
 * - Manejan cleanup automático al desmontar (opcional)
 * - Retornan valores por defecto si el usuario no existe
 *
 * Hooks disponibles:
 * - useOtherUserData: Datos completos del usuario
 * - useOtherUserDisplayName: Solo el nombre (optimizado)
 * - useOtherUserProfilePhoto: Solo la foto de perfil (optimizado)
 * - useOtherUserStatus: Solo el estado (optimizado)
 * - useOtherUserRole: Solo el rol (optimizado)
 * - useOtherUserEmail: Solo el email (optimizado)
 * - useIsOtherUserLoading: Estado de carga
 * - useOtherUserError: Error si ocurrió
 * - useSubscribeToUser: Hook de bajo nivel para control manual
 *
 * @example
 * // En un componente que muestra info de otro usuario
 * function UserCard({ userId }: { userId: string }) {
 *   const displayName = useOtherUserDisplayName(userId);
 *   const profilePhoto = useOtherUserProfilePhoto(userId);
 *   const isLoading = useIsOtherUserLoading(userId);
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <div>
 *       <img src={profilePhoto} alt={displayName} />
 *       <h2>{displayName}</h2>
 *     </div>
 *   );
 * }
 */

import { useEffect } from 'react';
import { useUsersDataStore } from '@/stores/usersDataStore';
import type { UserData } from '@/stores/userDataStore';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/**
 * Opciones para los hooks
 */
interface UseOtherUserOptions {
  /**
   * Si debe desuscribirse automáticamente al desmontar el componente
   * Por defecto: false (el cache se mantiene para otros componentes)
   */
  unsubscribeOnUnmount?: boolean;

  /**
   * Si debe suscribirse automáticamente
   * Por defecto: true
   */
  autoSubscribe?: boolean;
}

// ============================================================================
// HOOK DE BAJO NIVEL: Suscripción manual
// ============================================================================

/**
 * Hook de bajo nivel para control manual de suscripciones.
 * La mayoría de componentes deberían usar los hooks de alto nivel en su lugar.
 *
 * @param userId - ID del usuario al que suscribirse
 * @param options - Opciones de suscripción
 *
 * @example
 * function MyComponent({ userId }: { userId: string }) {
 *   useSubscribeToUser(userId);
 *   const userData = useUsersDataStore((state) => state.getUserData(userId));
 *   // ...
 * }
 */
export function useSubscribeToUser(
  userId: string | undefined,
  options: UseOtherUserOptions = {}
) {
  const { unsubscribeOnUnmount = false, autoSubscribe = true } = options;
  const subscribeToUser = useUsersDataStore((state) => state.subscribeToUser);
  const unsubscribeFromUser = useUsersDataStore((state) => state.unsubscribeFromUser);

  useEffect(() => {
    if (!userId || !autoSubscribe) return;

    // Suscribirse automáticamente
    subscribeToUser(userId);

    // Cleanup opcional
    if (unsubscribeOnUnmount) {
      return () => {
        unsubscribeFromUser(userId);
      };
    }
  }, [userId, subscribeToUser, unsubscribeFromUser, unsubscribeOnUnmount, autoSubscribe]);
}

// ============================================================================
// HOOKS DE ALTO NIVEL: Selectores optimizados
// ============================================================================

/**
 * Hook para obtener los datos completos de otro usuario.
 * Se suscribe automáticamente al usuario.
 *
 * @param userId - ID del usuario
 * @param options - Opciones de suscripción
 * @returns Datos del usuario o null si no está cargado
 *
 * @example
 * function UserProfile({ userId }: { userId: string }) {
 *   const userData = useOtherUserData(userId);
 *
 *   if (!userData) return <Skeleton />;
 *
 *   return (
 *     <div>
 *       <h1>{userData.fullName}</h1>
 *       <p>{userData.role}</p>
 *       <p>{userData.description}</p>
 *     </div>
 *   );
 * }
 */
export function useOtherUserData(
  userId: string | undefined,
  options: UseOtherUserOptions = {}
): UserData | null {
  useSubscribeToUser(userId, options);

  return useUsersDataStore((state) => (userId ? state.getUserData(userId) : null));
}

/**
 * Hook para obtener solo el nombre de visualización de otro usuario.
 * Optimizado: solo re-renderiza cuando el nombre cambia.
 *
 * @param userId - ID del usuario
 * @param options - Opciones de suscripción
 * @returns Nombre del usuario o "Usuario" por defecto
 *
 * @example
 * function TaskAssignee({ userId }: { userId: string }) {
 *   const displayName = useOtherUserDisplayName(userId);
 *   return <span>Asignado a: {displayName}</span>;
 * }
 */
export function useOtherUserDisplayName(
  userId: string | undefined,
  options: UseOtherUserOptions = {}
): string {
  useSubscribeToUser(userId, options);

  return useUsersDataStore((state) => {
    if (!userId) return 'Usuario';
    const userData = state.getUserData(userId);
    return userData?.fullName || userData?.displayName || 'Usuario';
  });
}

/**
 * Hook para obtener solo la foto de perfil de otro usuario.
 * Optimizado: solo re-renderiza cuando la foto cambia.
 *
 * @param userId - ID del usuario
 * @param options - Opciones de suscripción
 * @returns URL de la foto de perfil o avatar por defecto
 *
 * @example
 * function UserAvatar({ userId }: { userId: string }) {
 *   const profilePhoto = useOtherUserProfilePhoto(userId);
 *   return <img src={profilePhoto} alt="Avatar" className="w-10 h-10 rounded-full" />;
 * }
 */
export function useOtherUserProfilePhoto(
  userId: string | undefined,
  options: UseOtherUserOptions = {}
): string {
  useSubscribeToUser(userId, options);

  return useUsersDataStore((state) => {
    if (!userId) return '/default-avatar.svg';
    const userData = state.getUserData(userId);
    return userData?.profilePhoto || '/default-avatar.svg';
  });
}

/**
 * Hook para obtener solo el estado de otro usuario.
 * Optimizado: solo re-renderiza cuando el estado cambia.
 *
 * @param userId - ID del usuario
 * @param options - Opciones de suscripción
 * @returns Estado del usuario o "Disponible" por defecto
 *
 * @example
 * function UserStatusBadge({ userId }: { userId: string }) {
 *   const status = useOtherUserStatus(userId);
 *   return <Badge>{status}</Badge>;
 * }
 */
export function useOtherUserStatus(
  userId: string | undefined,
  options: UseOtherUserOptions = {}
): string {
  useSubscribeToUser(userId, options);

  return useUsersDataStore((state) => {
    if (!userId) return 'Disponible';
    const userData = state.getUserData(userId);
    return userData?.status || 'Disponible';
  });
}

/**
 * Hook para obtener solo el rol de otro usuario.
 * Optimizado: solo re-renderiza cuando el rol cambia.
 *
 * @param userId - ID del usuario
 * @param options - Opciones de suscripción
 * @returns Rol del usuario o string vacío por defecto
 *
 * @example
 * function UserRoleBadge({ userId }: { userId: string }) {
 *   const role = useOtherUserRole(userId);
 *   return <span className="text-sm text-gray-500">{role}</span>;
 * }
 */
export function useOtherUserRole(
  userId: string | undefined,
  options: UseOtherUserOptions = {}
): string {
  useSubscribeToUser(userId, options);

  return useUsersDataStore((state) => {
    if (!userId) return '';
    const userData = state.getUserData(userId);
    return userData?.role || '';
  });
}

/**
 * Hook para obtener solo el email de otro usuario.
 * Optimizado: solo re-renderiza cuando el email cambia.
 *
 * @param userId - ID del usuario
 * @param options - Opciones de suscripción
 * @returns Email del usuario o string vacío por defecto
 *
 * @example
 * function ContactInfo({ userId }: { userId: string }) {
 *   const email = useOtherUserEmail(userId);
 *   return <a href={`mailto:${email}`}>{email}</a>;
 * }
 */
export function useOtherUserEmail(
  userId: string | undefined,
  options: UseOtherUserOptions = {}
): string {
  useSubscribeToUser(userId, options);

  return useUsersDataStore((state) => {
    if (!userId) return '';
    const userData = state.getUserData(userId);
    return userData?.email || '';
  });
}

/**
 * Hook para verificar si un usuario está cargando.
 *
 * @param userId - ID del usuario
 * @returns true si está cargando, false si no
 *
 * @example
 * function UserCard({ userId }: { userId: string }) {
 *   const isLoading = useIsOtherUserLoading(userId);
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return <UserDetails userId={userId} />;
 * }
 */
export function useIsOtherUserLoading(userId: string | undefined): boolean {
  return useUsersDataStore((state) => (userId ? state.loadingUsers.has(userId) : false));
}

/**
 * Hook para obtener el error de un usuario (si ocurrió).
 *
 * @param userId - ID del usuario
 * @returns Error si ocurrió, null si no hay error
 *
 * @example
 * function UserCard({ userId }: { userId: string }) {
 *   const error = useOtherUserError(userId);
 *
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <UserDetails userId={userId} />;
 * }
 */
export function useOtherUserError(userId: string | undefined): Error | null {
  return useUsersDataStore((state) => (userId ? state.errors.get(userId) || null : null));
}

// ============================================================================
// HOOK COMPUESTO: Estado completo
// ============================================================================

/**
 * Hook compuesto que retorna datos + estados de carga/error.
 * Útil cuando necesitas manejar todos los estados de una vez.
 *
 * @param userId - ID del usuario
 * @param options - Opciones de suscripción
 * @returns Objeto con userData, isLoading, error
 *
 * @example
 * function UserCard({ userId }: { userId: string }) {
 *   const { userData, isLoading, error } = useOtherUserState(userId);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!userData) return null;
 *
 *   return (
 *     <div>
 *       <h1>{userData.fullName}</h1>
 *       <p>{userData.role}</p>
 *     </div>
 *   );
 * }
 */
export function useOtherUserState(
  userId: string | undefined,
  options: UseOtherUserOptions = {}
): {
  userData: UserData | null;
  isLoading: boolean;
  error: Error | null;
} {
  useSubscribeToUser(userId, options);

  const userData = useUsersDataStore((state) => (userId ? state.getUserData(userId) : null));
  const isLoading = useUsersDataStore((state) => (userId ? state.loadingUsers.has(userId) : false));
  const error = useUsersDataStore((state) => (userId ? state.errors.get(userId) || null : null));

  return { userData, isLoading, error };
}

// ============================================================================
// HOOK DE MÚLTIPLES USUARIOS
// ============================================================================

/**
 * Hook para suscribirse a múltiples usuarios a la vez.
 * Útil para listas de usuarios (ej: equipo de una tarea).
 *
 * @param userIds - Array de IDs de usuarios
 * @param options - Opciones de suscripción
 *
 * @example
 * function TeamMembers({ userIds }: { userIds: string[] }) {
 *   useSubscribeToMultipleUsers(userIds);
 *
 *   return (
 *     <div>
 *       {userIds.map((userId) => (
 *         <UserAvatar key={userId} userId={userId} />
 *       ))}
 *     </div>
 *   );
 * }
 */
export function useSubscribeToMultipleUsers(
  userIds: string[] | undefined,
  options: UseOtherUserOptions = {}
) {
  const { unsubscribeOnUnmount = false, autoSubscribe = true } = options;
  const subscribeToUser = useUsersDataStore((state) => state.subscribeToUser);
  const unsubscribeFromUser = useUsersDataStore((state) => state.unsubscribeFromUser);

  useEffect(() => {
    if (!userIds || userIds.length === 0 || !autoSubscribe) return;

    // Suscribirse a todos los usuarios
    userIds.forEach((userId) => {
      if (userId) {
        subscribeToUser(userId);
      }
    });

    // Cleanup opcional
    if (unsubscribeOnUnmount) {
      return () => {
        userIds.forEach((userId) => {
          if (userId) {
            unsubscribeFromUser(userId);
          }
        });
      };
    }
  }, [userIds?.join(','), subscribeToUser, unsubscribeFromUser, unsubscribeOnUnmount, autoSubscribe]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook para obtener datos de múltiples usuarios.
 *
 * @param userIds - Array de IDs de usuarios
 * @param options - Opciones de suscripción
 * @returns Array de UserData (null para usuarios no cargados)
 *
 * @example
 * function TeamList({ userIds }: { userIds: string[] }) {
 *   const usersData = useMultipleUsersData(userIds);
 *
 *   return (
 *     <ul>
 *       {usersData.map((userData, index) => (
 *         <li key={userIds[index]}>
 *           {userData?.fullName || 'Cargando...'}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 */
export function useMultipleUsersData(
  userIds: string[] | undefined,
  options: UseOtherUserOptions = {}
): (UserData | null)[] {
  useSubscribeToMultipleUsers(userIds, options);

  return useUsersDataStore((state) => {
    if (!userIds || userIds.length === 0) return [];
    return userIds.map((userId) => state.getUserData(userId));
  });
}
