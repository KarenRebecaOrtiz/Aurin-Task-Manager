/**
 * @module config/stores/profileFormStore
 * @description Store para el estado del formulario de perfil
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
  /** Resetea el store a su estado inicial */
  reset: () => void;
}

/**
 * Estado inicial del store
 */
const initialState: ProfileFormState = {
  formData: null,
  errors: {},
  isSaving: false,
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

  reset: () => set(initialState),
}));
