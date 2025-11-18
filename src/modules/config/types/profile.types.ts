/**
 * @module config/types/profile
 * @description Tipos relacionados con el perfil de usuario
 */

/**
 * Enlaces a redes sociales del usuario
 */
export interface SocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

/**
 * Preferencias de notificaciones por email
 */
export interface EmailPreferences {
  /** Notificaciones de mensajes */
  messages: boolean;
  /** Notificaciones de creación de tareas */
  creation: boolean;
  /** Notificaciones de edición de tareas */
  edition: boolean;
  /** Notificaciones de timers */
  timers: boolean;
}

/**
 * Configuración completa del usuario
 */
export interface Config {
  /** ID del documento en Firestore */
  id: string;
  /** Notificaciones habilitadas */
  notificationsEnabled: boolean;
  /** Modo oscuro */
  darkMode: boolean;
  /** Alertas por email */
  emailAlerts: boolean;
  /** Recordatorios de tareas */
  taskReminders: boolean;
  /** Alto contraste */
  highContrast: boolean;
  /** Escala de grises */
  grayscale: boolean;
  /** Sonido habilitado */
  soundEnabled: boolean;
  /** Nombre completo */
  fullName?: string;
  /** Rol o título profesional */
  role?: string;
  /** Descripción o biografía */
  description?: string;
  /** Fecha de nacimiento (formato ISO) */
  birthDate?: string;
  /** Número de teléfono */
  phone?: string;
  /** Ciudad de residencia */
  city?: string;
  /** Género */
  gender?: string;
  /** URL del portfolio */
  portfolio?: string;
  /** Stack tecnológico (máximo 40) */
  stack?: string[];
  /** Equipos a los que pertenece (máximo 3) */
  teams?: string[];
  /** URL de la foto de perfil */
  profilePhoto?: string;
  /** URL de la foto de portada */
  coverPhoto?: string;
  /** Estado de disponibilidad */
  status?: string;
  /** Preferencias de email para notificaciones */
  emailPreferences?: EmailPreferences;
  /** Redes sociales */
  socialLinks?: SocialLinks;
}

/**
 * Formulario de configuración (extiende Config con campos adicionales)
 */
export interface ConfigForm extends Omit<Config, 'id'> {
  /** ID del usuario */
  userId: string;
  /** Archivo de foto de perfil (para subida) */
  profilePhotoFile?: File | null;
  /** Archivo de foto de portada (para subida) */
  coverPhotoFile?: File | null;
  /** Código de país para teléfono */
  phoneLada?: string;
  /** Contraseña actual (para cambio de contraseña) */
  currentPassword?: string;
  /** Nueva contraseña */
  newPassword?: string;
  /** Confirmación de nueva contraseña */
  confirmPassword?: string;
  /** GitHub (campo individual para formulario) */
  github?: string;
  /** LinkedIn (campo individual para formulario) */
  linkedin?: string;
  /** Twitter (campo individual para formulario) */
  twitter?: string;
  /** Instagram (campo individual para formulario) */
  instagram?: string;
  /** Facebook (campo individual para formulario) */
  facebook?: string;
  /** TikTok (campo individual para formulario) */
  tiktok?: string;
}

/**
 * Errores de validación del formulario
 */
export interface FormErrors {
  fullName?: string;
  role?: string;
  phone?: string;
  birthDate?: string;
  portfolio?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  description?: string;
}

/**
 * Props para el componente de perfil
 */
export interface ProfileSectionProps {
  /** Datos del formulario */
  formData: ConfigForm;
  /** Callback cuando cambian los datos */
  onChange: (data: Partial<ConfigForm>) => void;
  /** Errores de validación */
  errors?: FormErrors;
  /** Si el formulario está en modo de solo lectura */
  readOnly?: boolean;
}

/**
 * Props para el selector de stack tecnológico
 */
export interface StackSelectorProps {
  /** Stack seleccionado */
  selectedStack: string[];
  /** Callback cuando cambia el stack */
  onChange: (stack: string[]) => void;
  /** Máximo de tecnologías permitidas */
  maxItems?: number;
  /** Si está deshabilitado */
  disabled?: boolean;
}

/**
 * Props para el formulario de redes sociales
 */
export interface SocialLinksFormProps {
  /** Enlaces sociales actuales */
  socialLinks: SocialLinks;
  /** Callback cuando cambian los enlaces */
  onChange: (links: SocialLinks) => void;
  /** Si está deshabilitado */
  disabled?: boolean;
}
