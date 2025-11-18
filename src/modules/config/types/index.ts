/**
 * @module config/types
 * @description Exportaciones centralizadas de todos los tipos del módulo de configuración
 */

// Tipos de perfil
export type {
  SocialLinks,
  EmailPreferences,
  Config,
  ConfigForm,
  FormErrors,
  ProfileSectionProps,
  StackSelectorProps,
  SocialLinksFormProps,
} from './profile.types';

// Tipos de equipos
export type {
  User,
  Team,
  TeamMembersMap,
  TeamsSectionProps,
  TeamsTableProps,
  TeamCardProps,
  TeamOption,
} from './teams.types';

// Tipos de seguridad
export type {
  Session,
  PasswordErrors,
  PasswordChangeData,
  PasswordValidationResult,
  SecuritySectionProps,
  PasswordFormProps,
  SessionsTableProps,
  SecuritySettings,
  SecurityEvent,
} from './security.types';
