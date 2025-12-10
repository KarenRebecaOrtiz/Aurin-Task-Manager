/**
 * @module config/stores/profileFormStore
 * @description Store para el estado del formulario de perfil con soporte de caching
 */

import { create } from 'zustand';
import { ConfigForm, FormErrors } from '../types';

/**
 * Estado del store del formulario de perfil
 */
interface ProfileFormState {
  /** Datos del formulario */
  formData: ConfigForm | null;
  /** Errores de validación */
  errors: FormErrors;
  /** Si está guardando */
  isSaving: boolean;
  /** Si está cargando datos */
  isLoading: boolean;
  /** Timestamp de la última carga de datos */
  lastFetchTime: number | null;
  /** ID del usuario actual */
  currentUserId: string | null;
}

/**
 * Acciones del store del formulario de perfil
 */
interface ProfileFormActions {
  /** Establece los datos del formulario */
  setFormData: (data: ConfigForm | null) => void;
  /** Actualiza campos específicos del formulario */
  updateFormData: (data: Partial<ConfigForm>) => void;
  /** Establece los errores de validación */
  setErrors: (errors: FormErrors) => void;
  /** Limpia un error específico */
  clearError: (field: keyof FormErrors) => void;
  /** Limpia todos los errores */
  clearAllErrors: () => void;
  /** Establece el estado de guardado */
  setIsSaving: (isSaving: boolean) => void;
  /** Establece el estado de carga */
  setIsLoading: (isLoading: boolean) => void;
  /** Actualiza el timestamp de la última carga */
  setLastFetchTime: (time: number | null) => void;
  /** Establece el userId actual */
  setCurrentUserId: (userId: string | null) => void;
  /** Resetea el store a su estado inicial */
  reset: () => void;
  /** Fuerza la recarga de datos (invalida el estado actual) */
  forceReload: () => void;
}

/**
 * Estado inicial del store
 */
const initialState: ProfileFormState = {
  formData: null,
  errors: {},
  isSaving: false,
  isLoading: false,
  lastFetchTime: null,
  currentUserId: null,
};

/**
 * Store del formulario de perfil
 */
export const useProfileFormStore = create<ProfileFormState & ProfileFormActions>((set) => ({
  ...initialState,

  setFormData: (data) => set({ formData: data }),

  updateFormData: (data) =>
    set((state) => ({
      formData: state.formData ? { ...state.formData, ...data } : null,
    })),

  setErrors: (errors) => set({ errors }),

  clearError: (field) =>
    set((state) => {
      const newErrors = { ...state.errors };
      delete newErrors[field];
      return { errors: newErrors };
    }),

  clearAllErrors: () => set({ errors: {} }),

  setIsSaving: (isSaving) => set({ isSaving }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setLastFetchTime: (time) => set({ lastFetchTime: time }),

  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  reset: () => set(initialState),

  forceReload: () => set({ 
    formData: null, 
    currentUserId: null, 
    lastFetchTime: null 
  }),
}));
