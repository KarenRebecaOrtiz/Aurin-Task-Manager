/**
 * @module config/types/security
 * @description Tipos relacionados con seguridad y sesiones
 */

/**
 * Sesión de usuario activa
 */
export interface Session {
  /** ID único de la sesión */
  id: string;
  /** Fecha de última actividad */
  lastActiveAt: Date;
  /** Fecha de creación */
  createdAt: Date;
  /** Fecha de expiración */
  expireAt?: Date;
  /** Información del dispositivo */
  device?: string;
  /** Navegador utilizado */
  browser?: string;
  /** Sistema operativo */
  os?: string;
  /** Dirección IP */
  ipAddress?: string;
  /** Ciudad desde donde se conectó */
  city?: string;
  /** País desde donde se conectó */
  country?: string;
  /** Si es la sesión actual */
  isCurrent?: boolean;
}

/**
 * Errores de validación de contraseña
 */
export interface PasswordErrors {
  /** Lista de errores de validación */
  errors: string[];
  /** Fuerza de la contraseña (0-100) */
  strength: number;
}

/**
 * Datos para cambio de contraseña
 */
export interface PasswordChangeData {
  /** Contraseña actual */
  currentPassword: string;
  /** Nueva contraseña */
  newPassword: string;
  /** Confirmación de nueva contraseña */
  confirmPassword: string;
}

/**
 * Resultado de validación de contraseña
 */
export interface PasswordValidationResult {
  /** Si la contraseña es válida */
  isValid: boolean;
  /** Fuerza de la contraseña (0-100) */
  strength: number;
  /** Errores de validación */
  errors: string[];
  /** Si las contraseñas coinciden */
  passwordsMatch?: boolean;
}

/**
 * Props para la sección de seguridad
 */
export interface SecuritySectionProps {
  /** ID del usuario */
  userId: string;
  /** Callback cuando se cambia la contraseña exitosamente */
  onPasswordChanged?: () => void;
  /** Callback cuando hay un error */
  onError?: (message: string) => void;
}

/**
 * Props para el formulario de contraseña
 */
export interface PasswordFormProps {
  /** Callback cuando se envía el formulario */
  onSubmit: (data: PasswordChangeData) => Promise<void>;
  /** Si está procesando */
  loading?: boolean;
  /** Errores de validación */
  errors?: PasswordErrors;
}

/**
 * Props para la tabla de sesiones
 */
export interface SessionsTableProps {
  /** Sesiones activas */
  sessions: Session[];
  /** Si está cargando */
  loading?: boolean;
  /** ID de la sesión que se está revocando */
  revokingSessionId?: string | null;
  /** Callback cuando se revoca una sesión */
  onRevokeSession: (sessionId: string) => Promise<void>;
}

/**
 * Configuración de seguridad del usuario
 */
export interface SecuritySettings {
  /** Autenticación de dos factores habilitada */
  twoFactorEnabled: boolean;
  /** Notificaciones de inicio de sesión */
  loginNotifications: boolean;
  /** Notificaciones de dispositivos nuevos */
  newDeviceNotifications: boolean;
  /** Sesiones activas máximas permitidas */
  maxActiveSessions?: number;
  /** Tiempo de expiración de sesión (en minutos) */
  sessionTimeout?: number;
}

/**
 * Evento de seguridad
 */
export interface SecurityEvent {
  /** ID del evento */
  id: string;
  /** Tipo de evento */
  type: 'login' | 'logout' | 'password_change' | 'session_revoked' | 'failed_login';
  /** Fecha del evento */
  timestamp: Date;
  /** Información del dispositivo */
  device?: string;
  /** Dirección IP */
  ipAddress?: string;
  /** Ubicación */
  location?: string;
  /** Detalles adicionales */
  details?: string;
}
