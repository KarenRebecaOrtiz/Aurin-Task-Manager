/**
 * @module stores/userDataStore
 * @description Single Source of Truth para los datos del usuario en sesión.
 * 
 * Este store:
 * - Escucha cambios en Firestore con onSnapshot (reactivo)
 * - Maneja cache inteligente que se invalida solo al actualizar datos propios
 * - Expone los datos a todos los componentes que lo necesiten
 * - Se puede acceder desde fuera de React con getState()
 */

import { create } from 'zustand';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

// ============================================================================
// Store State & Actions
// ============================================================================

interface UserDataState {
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
  /** ID del usuario actualmente suscrito */
  currentUserId: string | null;
  /** Si la suscripción está activa */
  isSubscribed: boolean;
}

interface UserDataActions {
  /** Inicia la suscripción a Firestore para un usuario */
  subscribe: (userId: string) => void;
  /** Cancela la suscripción actual */
  unsubscribe: () => void;
  /** Invalida el cache y marca para refrescar */
  invalidateCache: () => void;
  /** Actualiza los datos localmente (optimistic update) */
  updateLocalData: (partialData: Partial<UserData>) => void;
  /** Obtiene el nombre para mostrar (fullName o displayName) */
  getDisplayName: () => string;
  /** Obtiene la foto de perfil con fallback */
  getProfilePhoto: () => string;
  /** Limpia el store completamente */
  reset: () => void;
}

type UserDataStore = UserDataState & UserDataActions;

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
// Store - Referencia para la suscripción
// ============================================================================

let unsubscribeRef: Unsubscribe | null = null;

// ============================================================================
// Store Definition
// ============================================================================

const initialState: UserDataState = {
  userData: null,
  isLoading: true,
  error: null,
  lastFetchTime: null,
  isRefreshing: false,
  currentUserId: null,
  isSubscribed: false,
};

export const useUserDataStore = create<UserDataStore>((set, get) => ({
  ...initialState,

  subscribe: (userId: string) => {
    const state = get();

    // Si ya estamos suscritos al mismo usuario, no hacer nada
    if (state.currentUserId === userId && state.isSubscribed) {
      return;
    }

    // Limpiar suscripción anterior si existe
    if (unsubscribeRef) {
      unsubscribeRef();
      unsubscribeRef = null;
    }

    // Intentar cargar desde cache primero para UI inmediata
    const cached = getCachedData(userId);
    if (cached) {
      set({
        userData: cached.data,
        lastFetchTime: cached.timestamp,
        isLoading: false,
        currentUserId: userId,
      });
    } else {
      set({ isLoading: true, currentUserId: userId });
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
          set({
            userData: fullUserData,
            lastFetchTime: Date.now(),
            error: null,
            isLoading: false,
            isRefreshing: false,
            isSubscribed: true,
          });

          // Actualizar cache
          setCachedData(userId, fullUserData);
        } else {
          // El documento no existe - usuario nuevo
          set({
            userData: {
              userId,
              status: 'Disponible',
            },
            isLoading: false,
            isRefreshing: false,
            isSubscribed: true,
          });
        }
      },
      (err) => {
        set({
          error: err as Error,
          isLoading: false,
          isRefreshing: false,
        });
      }
    );

    unsubscribeRef = unsubscribe;
  },

  unsubscribe: () => {
    if (unsubscribeRef) {
      unsubscribeRef();
      unsubscribeRef = null;
    }
    set({ isSubscribed: false });
  },

  invalidateCache: () => {
    const { currentUserId } = get();
    if (currentUserId) {
      clearCachedData(currentUserId);
      set({ isRefreshing: true });
      // El listener de onSnapshot ya está activo, los datos se actualizarán automáticamente
      setTimeout(() => set({ isRefreshing: false }), 100);
    }
  },

  updateLocalData: (partialData: Partial<UserData>) => {
    const { userData, currentUserId } = get();
    if (!userData) return;

    const updated = { ...userData, ...partialData };
    set({ userData: updated });

    // También actualizar el cache
    if (currentUserId) {
      setCachedData(currentUserId, updated);
    }
  },

  getDisplayName: () => {
    const { userData } = get();
    if (!userData) return 'Usuario';
    return userData.fullName || userData.displayName || 'Usuario';
  },

  getProfilePhoto: () => {
    const { userData } = get();
    if (!userData?.profilePhoto || userData.profilePhoto === '') return '/default-avatar.svg';
    return userData.profilePhoto;
  },

  reset: () => {
    const { currentUserId } = get();
    
    // Limpiar suscripción
    if (unsubscribeRef) {
      unsubscribeRef();
      unsubscribeRef = null;
    }

    // Limpiar cache si hay usuario
    if (currentUserId) {
      clearCachedData(currentUserId);
    }

    set(initialState);
  },
}));

// ============================================================================
// Selector Hooks (para optimizar re-renders)
// ============================================================================

/**
 * Hook que solo retorna el nombre del usuario
 * Optimizado para componentes que solo necesitan el nombre
 */
export const useUserDisplayName = (): string => {
  return useUserDataStore((state) => 
    state.userData?.fullName || state.userData?.displayName || 'Usuario'
  );
};

/**
 * Hook que solo retorna la foto de perfil
 * Optimizado para componentes que solo necesitan la imagen
 *
 * Orden de prioridad:
 * 1. profilePhoto de Firestore (si existe y no está vacío)
 * 2. /default-avatar.svg (fallback)
 *
 * Nota: La imagen de Clerk se usa como fallback en el cliente,
 * pero NO se guarda en Firestore para evitar problemas con URLs expiradas.
 */
export const useUserProfilePhoto = (): string => {
  return useUserDataStore((state) =>
    (state.userData?.profilePhoto && state.userData.profilePhoto !== '')
      ? state.userData.profilePhoto
      : '/default-avatar.svg'
  );
};

/**
 * Hook que retorna el estado de disponibilidad
 */
export const useUserStatus = (): string => {
  return useUserDataStore((state) => state.userData?.status || 'Disponible');
};

/**
 * Hook que retorna el email del usuario
 */
export const useUserEmail = (): string | undefined => {
  return useUserDataStore((state) => state.userData?.email);
};

/**
 * Hook que retorna si está cargando
 */
export const useUserDataLoading = (): boolean => {
  return useUserDataStore((state) => state.isLoading);
};

/**
 * Hook que retorna los datos completos del usuario
 */
export const useUserData = () => {
  return useUserDataStore((state) => state.userData);
};
