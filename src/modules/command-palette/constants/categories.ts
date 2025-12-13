/**
 * Command Palette - Category Constants
 *
 * Categorías de búsqueda y filtros disponibles.
 * @module command-palette/constants/categories
 */

import { ClipboardCheck, FolderKanban, Users, UsersRound } from 'lucide-react';
import type { SearchCategory, PriorityLevel, StatusLevel } from '../types/commandPalette.types';
import { createElement } from 'react';

// ============================================================================
// SEARCH CATEGORIES
// ============================================================================

export interface CategoryConfig {
  id: SearchCategory;
  label: string;
  labelPlural: string;
  icon: typeof ClipboardCheck;
  shortcut: string;
  placeholder: string;
}

export const SEARCH_CATEGORIES: CategoryConfig[] = [
  {
    id: 'project',
    label: 'Proyecto',
    labelPlural: 'Proyectos',
    icon: FolderKanban,
    shortcut: 'Alt+P',
    placeholder: 'Buscar proyectos...',
  },
  {
    id: 'task',
    label: 'Tarea',
    labelPlural: 'Tareas',
    icon: ClipboardCheck,
    shortcut: 'Alt+T',
    placeholder: 'Buscar tareas...',
  },
  {
    id: 'member',
    label: 'Miembro',
    labelPlural: 'Miembros',
    icon: Users,
    shortcut: 'Alt+M',
    placeholder: 'Buscar miembros...',
  },
  {
    id: 'team',
    label: 'Equipo',
    labelPlural: 'Equipos',
    icon: UsersRound,
    shortcut: 'Alt+E',
    placeholder: 'Buscar equipos...',
  },
];

// ============================================================================
// PRIORITY FILTERS
// ============================================================================

export interface PriorityConfig {
  id: string;
  label: string;
  value: PriorityLevel;
  variant: 'priority-high' | 'priority-medium' | 'priority-low';
  color: string;
}

export const PRIORITY_FILTERS: PriorityConfig[] = [
  {
    id: 'alta',
    label: 'Alta',
    value: 'Alta',
    variant: 'priority-high',
    color: '#ef4444',
  },
  {
    id: 'media',
    label: 'Media',
    value: 'Media',
    variant: 'priority-medium',
    color: '#f59e0b',
  },
  {
    id: 'baja',
    label: 'Baja',
    value: 'Baja',
    variant: 'priority-low',
    color: '#22c55e',
  },
];

// ============================================================================
// STATUS FILTERS
// ============================================================================

export interface StatusConfig {
  id: string;
  label: string;
  value: StatusLevel;
  variant: 'status-backlog' | 'status-todo' | 'status-in-progress' | 'status-in-review' | 'status-done' | 'status-archived';
  color: string;
}

export const STATUS_FILTERS: StatusConfig[] = [
  {
    id: 'por-iniciar',
    label: 'Por Iniciar',
    value: 'por-iniciar',
    variant: 'status-todo',
    color: '#64748b',
  },
  {
    id: 'en-proceso',
    label: 'En Proceso',
    value: 'en-proceso',
    variant: 'status-in-progress',
    color: '#3b82f6',
  },
  {
    id: 'por-finalizar',
    label: 'Por Finalizar',
    value: 'por-finalizar',
    variant: 'status-in-review',
    color: '#f59e0b',
  },
  {
    id: 'finalizado',
    label: 'Finalizado',
    value: 'finalizado',
    variant: 'status-done',
    color: '#22c55e',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtener configuración de categoría por ID
 */
export const getCategoryConfig = (id: SearchCategory): CategoryConfig | undefined => {
  return SEARCH_CATEGORIES.find((cat) => cat.id === id);
};

/**
 * Obtener configuración de prioridad por valor
 */
export const getPriorityConfig = (value: PriorityLevel): PriorityConfig | undefined => {
  return PRIORITY_FILTERS.find((p) => p.value === value);
};

/**
 * Obtener configuración de estado por valor
 */
export const getStatusConfig = (value: StatusLevel): StatusConfig | undefined => {
  return STATUS_FILTERS.find((s) => s.value === value);
};

/**
 * Crear icono de categoría como elemento React
 */
export const createCategoryIcon = (id: SearchCategory, props?: { size?: number; className?: string }) => {
  const config = getCategoryConfig(id);
  if (!config) return null;
  return createElement(config.icon, { size: props?.size ?? 16, className: props?.className });
};
