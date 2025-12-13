/**
 * useCommandPalette Hook
 *
 * Hook principal que orquesta el estado del Command Palette.
 * Combina navegación, búsqueda, filtros y datos.
 *
 * @module command-palette/hooks/useCommandPalette
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigationStack } from './useNavigationStack';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { useCommandPaletteData } from './useCommandPaletteData';
import { useSelectedWorkspace, ALL_WORKSPACES_ID } from '@/stores/workspacesStore';
import type {
  NavigationLevel,
  NavigationState,
  SearchCategory,
  PriorityLevel,
  StatusLevel,
  ActiveFilters,
  CommandItem,
  UseCommandPaletteReturn,
} from '../types/commandPalette.types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCommandPaletteProps {
  /** Callback cuando cambia la búsqueda */
  onSearch?: (keywords: string[], category: SearchCategory | null) => void;
  /** Callback cuando cambian los filtros de prioridad */
  onPriorityFiltersChange?: (priorities: PriorityLevel[]) => void;
  /** Callback cuando cambian los filtros de estado */
  onStatusFiltersChange?: (statuses: StatusLevel[]) => void;
  /** Callback cuando se selecciona un workspace */
  onWorkspaceSelect?: (workspaceId: string | null) => void;
  /** Callback cuando se selecciona un proyecto */
  onProjectSelect?: (projectName: string | null) => void;
  /** Callback cuando se selecciona un miembro */
  onMemberSelect?: (memberId: string | null) => void;
  /** Callback cuando se selecciona una tarea */
  onTaskSelect?: (taskId: string) => void;
  /** Callback cuando se selecciona un team */
  onTeamSelect?: (teamId: string) => void;
  /** Callback para añadir tiempo manual a una tarea */
  onAddManualTime?: (taskId: string) => void;
  /** Callback para editar una tarea */
  onEditTask?: (taskId: string) => void;
  /** Callback para eliminar una tarea */
  onDeleteTask?: (taskId: string) => void;
  /** Callback para compartir una tarea */
  onShareTask?: (taskId: string) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCommandPalette(props: UseCommandPaletteProps = {}) {
  const {
    onSearch,
    onPriorityFiltersChange,
    onStatusFiltersChange,
    onWorkspaceSelect,
    onProjectSelect,
    onMemberSelect,
    onTaskSelect,
    onTeamSelect,
  } = props;

  // ============================================================================
  // STATE
  // ============================================================================

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAIPrompt, setShowAIPrompt] = useState(false);

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    category: null,
    priorities: [],
    statuses: [],
    searchQuery: '',
  });

  // Obtener el workspace seleccionado globalmente
  const selectedWorkspace = useSelectedWorkspace();

  // Navigation stack
  const navigationStack = useNavigationStack();
  const {
    current: currentNavigation,
    canGoBack,
    navigateToIndex: stackNavigateToIndex,
    resetToWorkspace,
  } = navigationStack;

  // Obtener estado de navegación actual
  const navigationState: NavigationState = useMemo(() => {
    return currentNavigation?.state || { level: 'root' };
  }, [currentNavigation]);

  // Obtener datos según navegación
  const { workspaces, projects, members, tasks, teams, isLoading } = useCommandPaletteData({
    navigationState,
    searchQuery,
  });

  // ============================================================================
  // COMPUTED: Items actuales según nivel
  // ============================================================================

  const currentItems = useMemo((): CommandItem[] => {
    const level = navigationState.level;

    switch (level) {
      case 'root':
        // En root mostramos workspaces y teams
        return [...workspaces, ...teams];

      case 'workspace':
        // En workspace mostramos proyectos y miembros
        return [...projects, ...members];

      case 'project':
        // En proyecto mostramos tareas y miembros del proyecto
        return [...tasks, ...members];

      case 'member':
        // En miembro mostramos sus tareas
        return tasks;

      case 'task':
        // En tarea mostramos acciones (manejado por el componente)
        return [];

      case 'team':
        // En team mostramos miembros del team (manejado por componente)
        return [];

      default:
        return [];
    }
  }, [navigationState.level, workspaces, projects, members, tasks, teams]);

  // ============================================================================
  // ACTIONS: Open/Close
  // ============================================================================

  const open = useCallback(() => {
    // Si hay un workspace seleccionado, navegar automáticamente a ese nivel
    // Si no hay workspace (está en "Todas las cuentas"), empezar en root
    if (selectedWorkspace) {
      resetToWorkspace({
        id: selectedWorkspace.id,
        name: selectedWorkspace.name,
      });
    } else {
      resetToWorkspace(null);
    }

    setIsOpen(true);
    setSelectedIndex(0);
  }, [selectedWorkspace, resetToWorkspace]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(0);
    setShowAIPrompt(false);
    // Opcional: resetear navegación al cerrar
    // navigationStack.reset();
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // ============================================================================
  // ACTIONS: Navigation
  // ============================================================================

  const navigateTo = useCallback(
    (level: NavigationLevel, data?: Partial<NavigationState>) => {
      const newState: NavigationState = {
        ...navigationState,
        level,
        ...data,
      };

      navigationStack.push({
        level,
        state: newState,
        title: data?.workspaceName || data?.projectName || data?.memberName || data?.taskName || data?.teamName || 'Navegación',
      });

      setSearchQuery('');
      setSelectedIndex(0);
    },
    [navigationState, navigationStack]
  );

  const navigateBack = useCallback(() => {
    if (canGoBack) {
      navigationStack.pop();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [canGoBack, navigationStack]);

  const navigateToRoot = useCallback(() => {
    navigationStack.reset();
    setSearchQuery('');
    setSelectedIndex(0);
  }, [navigationStack]);

  const navigateToStackIndex = useCallback((index: number) => {
    stackNavigateToIndex(index);
    setSearchQuery('');
    setSelectedIndex(0);
  }, [stackNavigateToIndex]);

  // ============================================================================
  // ACTIONS: Selection
  // ============================================================================

  const selectItem = useCallback((item: CommandItem) => {
    if (!item) return;

    switch (item.type) {
      case 'workspace':
        // Solo navegar al nivel de workspace, NO cambiar el workspace global
        navigateTo('workspace', {
          workspaceId: item.id,
          workspaceName: item.title,
        });
        break;

      case 'project':
        onProjectSelect?.(item.title);
        navigateTo('project', {
          projectName: item.title,
        });
        break;

      case 'member':
        // Solo navegar al nivel de miembro para ver sus tareas
        navigateTo('member', {
          memberId: item.userId,
          memberName: item.title,
        });
        break;

      case 'task':
        // Solo navegar al nivel de acciones de tarea, NO abrir el editor
        navigateTo('task', {
          taskId: item.taskId,
          taskName: item.title,
        });
        break;

      case 'team':
        // Abrir chat de equipo y cerrar el command palette
        onTeamSelect?.(item.teamId);
        close();
        break;

      case 'action':
        item.action();
        break;
    }
  }, [
    navigateTo,
    close,
    onProjectSelect,
    onTeamSelect,
  ]);

  const selectCurrentItem = useCallback(() => {
    const item = currentItems[selectedIndex];
    selectItem(item);
  }, [currentItems, selectedIndex, selectItem]);

  // ============================================================================
  // ACTIONS: Index Navigation
  // ============================================================================

  const navigateUp = useCallback(() => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const navigateDown = useCallback(() => {
    setSelectedIndex((prev) => Math.min(currentItems.length - 1, prev + 1));
  }, [currentItems.length]);

  // ============================================================================
  // ACTIONS: Filters
  // ============================================================================

  const setFilter = useCallback(
    (filter: Partial<ActiveFilters>) => {
      setActiveFilters((prev) => {
        const newFilters = { ...prev, ...filter };

        // Notificar cambios
        if (filter.category !== undefined) {
          onSearch?.(searchQuery.split(' ').filter(Boolean), filter.category);
        }
        if (filter.priorities !== undefined) {
          onPriorityFiltersChange?.(filter.priorities);
        }
        if (filter.statuses !== undefined) {
          onStatusFiltersChange?.(filter.statuses);
        }

        return newFilters;
      });
    },
    [searchQuery, onSearch, onPriorityFiltersChange, onStatusFiltersChange]
  );

  const toggleCategory = useCallback(
    (category: SearchCategory) => {
      setActiveFilters((prev) => ({
        ...prev,
        category: prev.category === category ? null : category,
      }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setActiveFilters({
      category: null,
      priorities: [],
      statuses: [],
      searchQuery: '',
    });
    setSearchQuery('');
    onSearch?.([], null);
    onPriorityFiltersChange?.([]);
    onStatusFiltersChange?.([]);
  }, [onSearch, onPriorityFiltersChange, onStatusFiltersChange]);

  // ============================================================================
  // ACTIONS: Search
  // ============================================================================

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setSelectedIndex(0);

      // Notificar búsqueda
      const keywords = query.split(' ').filter(Boolean);
      onSearch?.(keywords, activeFilters.category);
    },
    [activeFilters.category, onSearch]
  );

  // ============================================================================
  // ACTIONS: AI Prompt
  // ============================================================================

  const toggleAIPrompt = useCallback(() => {
    setShowAIPrompt((prev) => !prev);
  }, []);

  // ============================================================================
  // KEYBOARD NAVIGATION SETUP
  // ============================================================================

  const { containerRef } = useKeyboardNavigation({
    isOpen,
    selectedIndex,
    itemCount: currentItems.length,
    hasSearchQuery: searchQuery.length > 0,
    onOpen: open,
    onClose: close,
    onNavigateUp: navigateUp,
    onNavigateDown: navigateDown,
    onSelect: selectCurrentItem,
    onBack: navigateBack,
    onCategoryFilter: toggleCategory,
    onClearFilters: clearFilters,
    onAIPrompt: toggleAIPrompt,
  });

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    isOpen,
    isLoading,
    navigationState,
    navigationStack: navigationStack.stack,
    activeFilters,
    selectedIndex,
    searchQuery,
    showAIPrompt,
    canGoBack,

    // Data
    currentItems,
    workspaces,
    projects,
    members,
    tasks,
    teams,

    // Actions
    open,
    close,
    toggle,
    setSearchQuery: handleSearchChange,
    navigateTo,
    navigateBack,
    navigateToRoot,
    navigateToStackIndex,
    setSelectedIndex,
    selectItem,
    selectCurrentItem,
    navigateUp,
    navigateDown,
    setFilter,
    toggleCategory,
    clearFilters,
    toggleAIPrompt,

    // Refs
    containerRef,
  };
}

export default useCommandPalette;
