'use client';

/**
 * @module contexts/UserDataContext
 * @description Single Source of Truth para los datos del usuario en sesión.
 * 
 * Este contexto:
 * - Escucha cambios en Firestore con onSnapshot (reactivo)
 * - Maneja cache inteligente que se invalida solo al actualizar datos propios
 * - Expone los datos a todos los componentes que lo necesiten
 * - Se integra con AuthContext para esperar la sincronización de Firebase
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useRef,
} from 'react';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

// ============================================================================
// Types
// ============================================================================

/**
 * Enlaces a redes sociales del usuario
 */
export interface UserSocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
  dribbble?: string;
}

/**
 * Preferencias de notificaciones por email
 */
export interface UserEmailPreferences {
  messages: boolean;
  creation: boolean;
  edition: boolean;
  timers: boolean;
}

/**
 * Datos completos del usuario desde Firestore
 * Esta es la Single Source of Truth
 */
export interface UserData {
  // Identificación
  userId: string;
  email?: string;
  
  // Información personal
  fullName?: string;
  displayName?: string; // Legacy - usar fullName
  role?: string;
  description?: string;
  birthDate?: string;
  phone?: string;
  city?: string;
  gender?: string;
  portfolio?: string;
  
  // Media
  profilePhoto?: string;
  coverPhoto?: string;
  
  // Profesional
  stack?: string[];
  teams?: string[];
  
  // Estado
  status?: string;
  
  // Configuraciones
  notificationsEnabled?: boolean;
  darkMode?: boolean;
  emailAlerts?: boolean;
  taskReminders?: boolean;
  highContrast?: boolean;
  grayscale?: boolean;
  soundEnabled?: boolean;
  emailPreferences?: UserEmailPreferences;
  
  // Social
  socialLinks?: UserSocialLinks;
  
  // Metadata
  lastUpdated?: string;
  createdAt?: string;
}

/**
 * Estado del contexto de datos de usuario
 */
interface UserDataContextState {
  /** Datos del usuario actual */
  userData: UserData | null;
  /** Si está cargando los datos iniciales */
  isLoading: boolean;
  /** Error si ocurrió alguno */
  error: Error | null;
  /** Timestamp de la última actualización del cache */
  lastFetchTime: number | null;
  /** Si los datos están siendo refrescados (no es carga inicial) */
  isRefreshing: boolean;
}

/**
 * Acciones disponibles en el contexto
 */
interface UserDataContextActions {
  /** Invalida el cache y fuerza una recarga de datos */
  invalidateCache: () => void;
  /** Actualiza los datos localmente (optimistic update) */
  updateLocalData: (partialData: Partial<UserData>) => void;
  /** Obtiene el nombre para mostrar (fullName o displayName) */
  getDisplayName: () => string;
  /** Obtiene la foto de perfil con fallback */
  getProfilePhoto: () => string;
}

type UserDataContextType = UserDataContextState & UserDataContextActions;

// ============================================================================
// Context
// ============================================================================

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

// ============================================================================
// Provider Props
// ============================================================================

interface UserDataProviderProps {
  children: ReactNode;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_KEY_PREFIX = 'userData_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene datos del cache local (sessionStorage)
 */
function getCachedData(userId: string): { data: UserData; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    const now = Date.now();
    
    // Verificar si el cache ha expirado
    if (now - parsed.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Guarda datos en el cache local
 */
function setCachedData(userId: string, data: UserData): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch {
    // SessionStorage puede fallar si está lleno - silencioso
  }
}

/**
 * Limpia el cache local para un usuario
 */
function clearCachedData(userId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
    sessionStorage.removeItem(cacheKey);
  } catch {
    // Ignorar errores de sessionStorage
  }
}

// ============================================================================
// Provider Component
// ============================================================================

export function UserDataProvider({ children }: UserDataProviderProps) {
  const { userId, isSynced } = useAuth();
  
  // State
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  
  // Refs para evitar re-suscripciones innecesarias
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  /**
   * Limpia la suscripción actual de Firestore
   */
  const cleanupSubscription = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  /**
   * Invalida el cache y fuerza una recarga
   */
  const invalidateCache = useCallback(() => {
    if (userId) {
      clearCachedData(userId);
      setIsRefreshing(true);
      // El listener de onSnapshot ya está activo, los datos se actualizarán automáticamente
      // Pero forzamos un re-render para indicar que estamos refrescando
      setTimeout(() => setIsRefreshing(false), 100);
    }
  }, [userId]);

  /**
   * Actualización local optimista (sin ir a Firestore)
   * Útil para UI responsiva mientras se guarda en background
   */
  const updateLocalData = useCallback((partialData: Partial<UserData>) => {
    setUserData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partialData };
      
      // También actualizar el cache
      if (userId) {
        setCachedData(userId, updated);
      }
      
      return updated;
    });
  }, [userId]);

  /**
   * Obtiene el nombre para mostrar
   * Prioridad: fullName > displayName > 'Usuario'
   */
  const getDisplayName = useCallback((): string => {
    if (!userData) return 'Usuario';
    return userData.fullName || userData.displayName || 'Usuario';
  }, [userData]);

  /**
   * Obtiene la foto de perfil con fallback
   */
  const getProfilePhoto = useCallback((): string => {
    if (!userData?.profilePhoto) return '/default-avatar.png';
    return userData.profilePhoto;
  }, [userData]);

  /**
   * Efecto principal: Suscripción a Firestore
   * Se activa cuando:
   * 1. El usuario está autenticado (userId existe)
   * 2. Firebase está sincronizado (isSynced es true)
   */
  useEffect(() => {
    // No hacer nada si no hay userId o Firebase no está sincronizado
    if (!userId || !isSynced) {
      setIsLoading(false);
      return;
    }

    // Si el userId no ha cambiado y ya tenemos datos, no re-suscribir
    if (currentUserIdRef.current === userId && userData) {
      return;
    }

    // Limpiar suscripción anterior si el userId cambió
    if (currentUserIdRef.current !== userId) {
      cleanupSubscription();
      currentUserIdRef.current = userId;
    }

    // Intentar cargar desde cache primero para UI inmediata
    const cached = getCachedData(userId);
    if (cached) {
      setUserData(cached.data);
      setLastFetchTime(cached.timestamp);
      setIsLoading(false);
      // Continuar para establecer el listener y obtener datos frescos
    } else {
      setIsLoading(true);
    }

    // Establecer listener de Firestore
    const userDocRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<UserData, 'userId'>;
          const fullUserData: UserData = {
            userId,
            ...data,
          };
          
          // Actualizar estado
          setUserData(fullUserData);
          setLastFetchTime(Date.now());
          setError(null);
          
          // Actualizar cache
          setCachedData(userId, fullUserData);
        } else {
          // El documento no existe - usuario nuevo
          setUserData({
            userId,
            status: 'Disponible',
          });
        }
        
        setIsLoading(false);
        setIsRefreshing(false);
      },
      (err) => {
        setError(err as Error);
        setIsLoading(false);
        setIsRefreshing(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup al desmontar o cuando cambie el userId
    return () => {
      cleanupSubscription();
    };
  }, [userId, isSynced, cleanupSubscription, userData]);

  /**
   * Cleanup cuando el usuario se desloguea
   */
  useEffect(() => {
    if (!userId) {
      setUserData(null);
      setError(null);
      setLastFetchTime(null);
      cleanupSubscription();
      currentUserIdRef.current = null;
    }
  }, [userId, cleanupSubscription]);

  // Memoizar el valor del contexto
  const contextValue = useMemo<UserDataContextType>(
    () => ({
      // State
      userData,
      isLoading,
      error,
      lastFetchTime,
      isRefreshing,
      // Actions
      invalidateCache,
      updateLocalData,
      getDisplayName,
      getProfilePhoto,
    }),
    [
      userData,
      isLoading,
      error,
      lastFetchTime,
      isRefreshing,
      invalidateCache,
      updateLocalData,
      getDisplayName,
      getProfilePhoto,
    ]
  );

  return (
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook para acceder a los datos del usuario en sesión
 * 
 * @example
 * ```tsx
 * const { userData, isLoading, getDisplayName } = useUserData();
 * 
 * if (isLoading) return <Skeleton />;
 * 
 * return <span>{getDisplayName()}</span>;
 * ```
 */
export function useUserData() {
  const context = useContext(UserDataContext);
  
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  
  return context;
}

// ============================================================================
// Selector Hooks (para optimizar re-renders)
// ============================================================================

/**
 * Hook que solo retorna el nombre del usuario
 * Optimizado para componentes que solo necesitan el nombre
 */
export function useUserDisplayName(): string {
  const { getDisplayName } = useUserData();
  return getDisplayName();
}

/**
 * Hook que solo retorna la foto de perfil
 * Optimizado para componentes que solo necesitan la imagen
 */
export function useUserProfilePhoto(): string {
  const { getProfilePhoto } = useUserData();
  return getProfilePhoto();
}

/**
 * Hook que retorna el estado de disponibilidad
 */
export function useUserStatus(): string {
  const { userData } = useUserData();
  return userData?.status || 'Disponible';
}

/**
 * Hook que retorna solo los campos específicos necesarios
 * @param selector - Función que selecciona los campos necesarios
 */
export function useUserDataSelector<T>(selector: (userData: UserData | null) => T): T {
  const { userData } = useUserData();
  return selector(userData);
}
