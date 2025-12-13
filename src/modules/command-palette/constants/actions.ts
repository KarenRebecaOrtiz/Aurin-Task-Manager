/**
 * Command Palette - Action Constants
 *
 * Acciones rápidas disponibles sobre items seleccionados.
 * @module command-palette/constants/actions
 */

import {
  PenLine,
  Share2,
  Pencil,
  Trash2,
  Clock,
  MessageCircle,
  ExternalLink,
  Copy,
  Archive,
  Star,
  Bell,
  Users,
  Calendar,
  Activity,
  Info,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { createElement } from 'react';

// ============================================================================
// TASK ACTION TYPES
// ============================================================================

export interface TaskActionConfig {
  id: string;
  label: string;
  description: string;
  icon: typeof PenLine;
  shortcut?: string;
  variant?: 'default' | 'danger';
  /** Si true, solo visible para admins */
  adminOnly?: boolean;
  /** Si true, solo visible para usuarios involucrados en la tarea */
  involvedOnly?: boolean;
}

// ============================================================================
// TASK ACTIONS
// ============================================================================

export const TASK_ACTIONS: TaskActionConfig[] = [
  {
    id: 'add-time',
    label: 'Añadir Tiempo Manual',
    description: 'Ingresa tiempo retroactivo',
    icon: PenLine,
    shortcut: 'Alt+Shift+T',
    involvedOnly: true,
  },
  {
    id: 'start-timer',
    label: 'Iniciar Timer',
    description: 'Comienza el cronómetro en tiempo real',
    icon: Clock,
    involvedOnly: true,
  },
  {
    id: 'share',
    label: 'Compartir Tarea',
    description: 'Genera un enlace para compartir',
    icon: Share2,
    shortcut: 'Alt+Shift+S',
    adminOnly: true,
  },
  {
    id: 'edit',
    label: 'Editar Tarea',
    description: 'Modificar detalles de la tarea',
    icon: Pencil,
    shortcut: 'Alt+Shift+E',
  },
  {
    id: 'copy-link',
    label: 'Copiar Enlace',
    description: 'Copia el enlace al portapapeles',
    icon: Copy,
  },
  {
    id: 'open-chat',
    label: 'Abrir Chat',
    description: 'Ver conversación de la tarea',
    icon: MessageCircle,
  },
  {
    id: 'archive',
    label: 'Archivar Tarea',
    description: 'Mover a archivo',
    icon: Archive,
    adminOnly: true,
  },
  {
    id: 'delete',
    label: 'Eliminar Tarea',
    description: 'Eliminar permanentemente',
    icon: Trash2,
    variant: 'danger',
    adminOnly: true,
  },
];

// ============================================================================
// QUICK AI SUGGESTIONS
// ============================================================================

export interface QuickAISuggestionConfig {
  id: string;
  label: string;
  prompt: string;
  icon: typeof Info;
}

export const QUICK_AI_SUGGESTIONS: QuickAISuggestionConfig[] = [
  {
    id: 'status',
    label: '¿Cuál es el estado actual?',
    prompt: 'Dame un resumen del estado actual de esta tarea, incluyendo progreso y próximos pasos.',
    icon: Info,
  },
  {
    id: 'assignees',
    label: '¿Quiénes están asignados?',
    prompt: 'Dime quiénes están trabajando en esta tarea y cuál es su rol.',
    icon: Users,
  },
  {
    id: 'activity',
    label: 'Resumen de actividad',
    prompt: 'Resume la actividad reciente de esta tarea, incluyendo mensajes y cambios importantes.',
    icon: Activity,
  },
  {
    id: 'deadline',
    label: '¿Cuándo vence?',
    prompt: 'Cuál es la fecha límite de esta tarea y cuánto tiempo queda.',
    icon: Calendar,
  },
  {
    id: 'custom',
    label: 'Pregunta personalizada...',
    prompt: '',
    icon: Sparkles,
  },
];

// ============================================================================
// TEAM ACTIONS (visibilidad según permisos)
// ============================================================================

export interface TeamActionConfig {
  id: string;
  label: string;
  description: string;
  icon: typeof Users;
  /** Si true, solo visible para admins */
  adminOnly?: boolean;
  /** Si true, solo visible si el usuario es miembro del team */
  memberOnly?: boolean;
  variant?: 'default' | 'danger';
}

export const TEAM_ACTIONS: TeamActionConfig[] = [
  {
    id: 'open-chat',
    label: 'Abrir Chat del Equipo',
    description: 'Ver conversación grupal',
    icon: MessageCircle,
    memberOnly: true,
  },
  {
    id: 'view-members',
    label: 'Ver Miembros',
    description: 'Lista de integrantes del equipo',
    icon: Users,
  },
  {
    id: 'edit-team',
    label: 'Editar Equipo',
    description: 'Modificar nombre y configuración',
    icon: Pencil,
    adminOnly: true,
  },
  {
    id: 'delete-team',
    label: 'Eliminar Equipo',
    description: 'Eliminar permanentemente',
    icon: Trash2,
    variant: 'danger',
    adminOnly: true,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Filtra acciones de tarea según permisos del usuario
 */
export const getFilteredTaskActions = (
  isAdmin: boolean,
  isInvolved: boolean
): TaskActionConfig[] => {
  return TASK_ACTIONS.filter((action) => {
    if (action.adminOnly && !isAdmin) return false;
    if (action.involvedOnly && !isInvolved && !isAdmin) return false;
    return true;
  });
};

/**
 * Filtra acciones de team según permisos del usuario
 */
export const getFilteredTeamActions = (
  isAdmin: boolean,
  isMember: boolean
): TeamActionConfig[] => {
  return TEAM_ACTIONS.filter((action) => {
    if (action.adminOnly && !isAdmin) return false;
    if (action.memberOnly && !isMember) return false;
    return true;
  });
};

/**
 * Crear icono de acción como elemento React
 */
export const createActionIcon = (
  icon: typeof PenLine,
  props?: { size?: number; className?: string }
): ReactNode => {
  return createElement(icon, { size: props?.size ?? 18, className: props?.className });
};
