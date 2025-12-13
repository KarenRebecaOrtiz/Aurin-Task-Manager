/**
 * Command Palette Module - Public Exports
 *
 * Enhanced search bar with drill-down navigation for
 * workspaces, projects, members, tasks, and teams.
 *
 * @module command-palette
 */

// Main component
export { CommandPalette } from './components/CommandPalette';
export type { CommandPaletteProps } from './components/CommandPalette';

// Hooks
export {
  useCommandPalette,
  useNavigationStack,
  useKeyboardNavigation,
  useCommandPaletteData,
} from './hooks';
export type { UseCommandPaletteProps } from './hooks';

// Types
export type {
  NavigationLevel,
  NavigationState,
  NavigationStackItem,
  SearchCategory,
  PriorityLevel,
  StatusLevel,
  ActiveFilters,
  CommandItem,
  WorkspaceCommandItem,
  ProjectCommandItem,
  MemberCommandItem,
  TaskCommandItem,
  TeamCommandItem,
  ActionCommandItem,
  CommandSection,
  CommandPaletteProps as CommandPaletteTypes,
} from './types/commandPalette.types';

// Constants
export {
  SEARCH_CATEGORIES,
  PRIORITY_FILTERS,
  STATUS_FILTERS,
  KEYBOARD_SHORTCUTS,
  TASK_ACTIONS,
  TEAM_ACTIONS,
  QUICK_AI_SUGGESTIONS,
} from './constants';
