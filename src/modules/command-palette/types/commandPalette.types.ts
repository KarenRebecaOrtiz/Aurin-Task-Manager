/**
 * Command Palette Types
 *
 * Tipos e interfaces para el Command Palette mejorado con navegación drill-down.
 * @module command-palette/types
 */

import type { ReactNode } from 'react';

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/**
 * Niveles de navegación drill-down
 */
export type NavigationLevel =
  | 'root'       // Nivel raíz: mostrar workspaces/cuentas
  | 'workspace'  // Nivel workspace: mostrar proyectos + miembros
  | 'project'    // Nivel proyecto: mostrar tareas + miembros del proyecto
  | 'member'     // Nivel miembro: mostrar tareas del miembro
  | 'task'       // Nivel tarea: mostrar acciones sobre la tarea
  | 'team';      // Nivel team: mostrar miembros del team

/**
 * Estado de navegación actual
 */
export interface NavigationState {
  level: NavigationLevel;
  workspaceId?: string;
  workspaceName?: string;
  projectName?: string;      // Es string, no ID (así está en Firestore)
  memberId?: string;
  memberName?: string;
  taskId?: string;
  taskName?: string;
  teamId?: string;
  teamName?: string;
}

/**
 * Item del stack de navegación para breadcrumb y "volver"
 */
export interface NavigationStackItem {
  level: NavigationLevel;
  state: NavigationState;
  title: string;
}

// ============================================================================
// SEARCH & FILTER TYPES
// ============================================================================

/**
 * Categorías de búsqueda disponibles
 */
export type SearchCategory = 'task' | 'project' | 'member' | 'team';

/**
 * Niveles de prioridad
 */
export type PriorityLevel = 'Alta' | 'Media' | 'Baja';

/**
 * Estados de tarea
 */
export type StatusLevel = 'por-iniciar' | 'en-proceso' | 'por-finalizar' | 'finalizado';

/**
 * Filtros activos
 */
export interface ActiveFilters {
  category: SearchCategory | null;
  priorities: PriorityLevel[];
  statuses: StatusLevel[];
  searchQuery: string;
}

// ============================================================================
// ITEM TYPES
// ============================================================================

/**
 * Tipo base para items del command palette
 */
export interface BaseCommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

/**
 * Item de workspace/cuenta
 */
export interface WorkspaceCommandItem extends BaseCommandItem {
  type: 'workspace';
  logo?: string;
  taskCount: number;
  projectCount: number;
}

/**
 * Item de proyecto
 */
export interface ProjectCommandItem extends BaseCommandItem {
  type: 'project';
  workspaceId: string;
  taskCount: number;
}

/**
 * Item de miembro/usuario
 */
export interface MemberCommandItem extends BaseCommandItem {
  type: 'member';
  userId: string;
  avatar?: string;
  taskCount: number;
  email?: string;
}

/**
 * Item de tarea
 */
export interface TaskCommandItem extends BaseCommandItem {
  type: 'task';
  taskId: string;
  priority: PriorityLevel;
  status: string;
  projectName: string;
  clientName: string;
}

/**
 * Item de team
 */
export interface TeamCommandItem extends BaseCommandItem {
  type: 'team';
  teamId: string;
  memberCount: number;
  isPublic: boolean;
}

/**
 * Item de acción rápida
 */
export interface ActionCommandItem extends BaseCommandItem {
  type: 'action';
  action: () => void;
  shortcut?: string;
  variant?: 'default' | 'danger' | 'ai';
}

/**
 * Unión de todos los tipos de items
 */
export type CommandItem =
  | WorkspaceCommandItem
  | ProjectCommandItem
  | MemberCommandItem
  | TaskCommandItem
  | TeamCommandItem
  | ActionCommandItem;

// ============================================================================
// SECTION TYPES
// ============================================================================

/**
 * Sección del command palette (grupo de items)
 */
export interface CommandSection {
  id: string;
  title: string;
  items: CommandItem[];
  icon?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// ============================================================================
// QUICK AI TYPES
// ============================================================================

/**
 * Sugerencia de pregunta rápida para IA
 */
export interface QuickAISuggestion {
  id: string;
  label: string;
  prompt: string;
  icon?: ReactNode;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

/**
 * Props del componente principal CommandPalette
 */
export interface CommandPaletteProps {
  // Estado controlado (opcional)
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Callbacks de filtrado
  onSearch?: (keywords: string[], category: SearchCategory | null) => void;
  onPriorityFiltersChange?: (priorities: PriorityLevel[]) => void;
  onStatusFiltersChange?: (statuses: StatusLevel[]) => void;

  // Callbacks de navegación/selección
  onWorkspaceSelect?: (workspaceId: string | null) => void;
  onProjectSelect?: (projectName: string | null) => void;
  onMemberSelect?: (memberId: string | null) => void;
  onTaskSelect?: (taskId: string) => void;
  onTeamSelect?: (teamId: string) => void;

  // Callbacks de acciones sobre tarea
  onEditTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onShareTask?: (taskId: string) => void;
  onAddManualTime?: (taskId: string) => void;

  // Personalización
  placeholder?: string;
  className?: string;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Retorno del hook useCommandPalette
 */
export interface UseCommandPaletteReturn {
  // Estado
  isOpen: boolean;
  navigationState: NavigationState;
  navigationStack: NavigationStackItem[];
  activeFilters: ActiveFilters;
  selectedIndex: number;
  searchQuery: string;

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSearchQuery: (query: string) => void;
  navigateTo: (level: NavigationLevel, data?: Partial<NavigationState>) => void;
  navigateBack: () => void;
  navigateToRoot: () => void;
  setSelectedIndex: (index: number) => void;
  selectCurrentItem: () => void;
  setFilter: (filter: Partial<ActiveFilters>) => void;
  clearFilters: () => void;
}

/**
 * Retorno del hook useNavigationStack
 */
export interface UseNavigationStackReturn {
  stack: NavigationStackItem[];
  current: NavigationStackItem | null;
  push: (item: NavigationStackItem) => void;
  pop: () => NavigationStackItem | undefined;
  reset: () => void;
  resetToWorkspace: (workspace?: { id: string; name: string } | null) => void;
  canGoBack: boolean;
  navigateToIndex: (index: number) => void;
}
