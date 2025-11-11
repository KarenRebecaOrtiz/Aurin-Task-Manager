/**
 * @module config/stores/securityStore
 * @description Store para el estado de seguridad y sesiones
 */

import { create } from 'zustand';
import { Session } from '../types';

/**
 * Estado del store de seguridad
 */
interface SecurityState {
  /** Sesiones activas del usuario */
  sessions: Session[];
  /** Si está cargando las sesiones */
  sessionsLoading: boolean;
  /** ID de la sesión que se está revocando */
  revokingSessionId: string | null;
  /** Si se muestra el formulario de cambio de contraseña */
  showPasswordForm: boolean;
  /** Contraseña actual */
  currentPassword: string;
  /** Nueva contraseña */
  newPassword: string;
  /** Confirmación de nueva contraseña */
  confirmPassword: string;
  /** Fuerza de la contraseña (0-5) */
  passwordStrength: number;
  /** Errores de validación de contraseña */
  passwordErrors: string[];
  /** Si hay error de coincidencia de contraseñas */
  passwordMatchError: boolean;
}

/**
 * Acciones del store de seguridad
 */
interface SecurityActions {
  /** Establece las sesiones activas */
  setSessions: (sessions: Session[]) => void;
  /** Establece el estado de carga de sesiones */
  setSessionsLoading: (loading: boolean) => void;
  /** Establece la sesión que se está revocando */
  setRevokingSessionId: (sessionId: string | null) => void;
  /** Muestra/oculta el formulario de contraseña */
  setShowPasswordForm: (show: boolean) => void;
  /** Establece la contraseña actual */
  setCurrentPassword: (password: string) => void;
  /** Establece la nueva contraseña */
  setNewPassword: (password: string) => void;
  /** Establece la confirmación de contraseña */
  setConfirmPassword: (password: string) => void;
  /** Establece la fuerza de la contraseña */
  setPasswordStrength: (strength: number) => void;
  /** Establece los errores de contraseña */
  setPasswordErrors: (errors: string[]) => void;
  /** Establece el error de coincidencia */
  setPasswordMatchError: (hasError: boolean) => void;
  /** Limpia todos los campos de contraseña */
  clearPasswordFields: () => void;
  /** Resetea el store a su estado inicial */
  reset: () => void;
}

/**
 * Estado inicial del store
 */
const initialState: SecurityState = {
  sessions: [],
  sessionsLoading: false,
  revokingSessionId: null,
  showPasswordForm: false,
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  passwordStrength: 0,
  passwordErrors: [],
  passwordMatchError: false,
};

/**
 * Store de seguridad
 */
export const useSecurityStore = create<SecurityState & SecurityActions>((set) => ({
  ...initialState,

  setSessions: (sessions) => set({ sessions }),

  setSessionsLoading: (loading) => set({ sessionsLoading: loading }),

  setRevokingSessionId: (sessionId) => set({ revokingSessionId: sessionId }),

  setShowPasswordForm: (show) => set({ showPasswordForm: show }),

  setCurrentPassword: (password) => set({ currentPassword: password }),

  setNewPassword: (password) => set({ newPassword: password }),

  setConfirmPassword: (password) => set({ confirmPassword: password }),

  setPasswordStrength: (strength) => set({ passwordStrength: strength }),

  setPasswordErrors: (errors) => set({ passwordErrors: errors }),

  setPasswordMatchError: (hasError) => set({ passwordMatchError: hasError }),

  clearPasswordFields: () =>
    set({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      passwordStrength: 0,
      passwordErrors: [],
      passwordMatchError: false,
    }),

  reset: () => set(initialState),
}));
