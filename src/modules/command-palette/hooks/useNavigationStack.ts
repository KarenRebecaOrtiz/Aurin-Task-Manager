/**
 * useNavigationStack Hook
 *
 * Maneja el stack de navegación drill-down para el Command Palette.
 * Permite navegar hacia adelante y hacia atrás en la jerarquía.
 *
 * @module command-palette/hooks/useNavigationStack
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  NavigationLevel,
  NavigationState,
  NavigationStackItem,
  UseNavigationStackReturn,
} from '../types/commandPalette.types';

// ============================================================================
// INITIAL STATE
// ============================================================================

const INITIAL_STATE: NavigationState = {
  level: 'root',
};

const INITIAL_STACK_ITEM: NavigationStackItem = {
  level: 'root',
  state: INITIAL_STATE,
  title: 'Inicio',
};

// ============================================================================
// TYPES
// ============================================================================

export interface UseNavigationStackOptions {
  /** Estado inicial para cuando hay un workspace seleccionado */
  initialWorkspace?: {
    id: string;
    name: string;
  } | null;
}

// ============================================================================
// HELPER: Generar título para nivel
// ============================================================================

const getTitleForLevel = (level: NavigationLevel, state: NavigationState): string => {
  switch (level) {
    case 'root':
      return 'Inicio';
    case 'workspace':
      return state.workspaceName || 'Cuenta';
    case 'project':
      return state.projectName || 'Proyecto';
    case 'member':
      return state.memberName || 'Miembro';
    case 'task':
      return state.taskName || 'Tarea';
    case 'team':
      return state.teamName || 'Equipo';
    default:
      return 'Navegación';
  }
};

// ============================================================================
// HELPER: Crear stack inicial basado en workspace seleccionado
// ============================================================================

const createInitialStack = (workspace?: { id: string; name: string } | null): NavigationStackItem[] => {
  // Si no hay workspace seleccionado, empezar en root
  if (!workspace) {
    return [INITIAL_STACK_ITEM];
  }

  // Si hay workspace seleccionado, crear stack con root + workspace
  const workspaceState: NavigationState = {
    level: 'workspace',
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  };

  return [
    INITIAL_STACK_ITEM,
    {
      level: 'workspace',
      state: workspaceState,
      title: workspace.name,
    },
  ];
};

// ============================================================================
// HOOK
// ============================================================================

export function useNavigationStack(options: UseNavigationStackOptions = {}): UseNavigationStackReturn {
  const { initialWorkspace } = options;
  const [stack, setStack] = useState<NavigationStackItem[]>(() => createInitialStack(initialWorkspace));

  /**
   * Item actual (último del stack)
   */
  const current = useMemo(() => {
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }, [stack]);

  /**
   * Verifica si se puede volver atrás
   */
  const canGoBack = useMemo(() => {
    return stack.length > 1;
  }, [stack]);

  /**
   * Push: Navegar a un nuevo nivel
   */
  const push = useCallback((item: NavigationStackItem) => {
    setStack((prev) => [...prev, item]);
  }, []);

  /**
   * Pop: Volver al nivel anterior
   */
  const pop = useCallback((): NavigationStackItem | undefined => {
    let popped: NavigationStackItem | undefined;

    setStack((prev) => {
      if (prev.length <= 1) {
        // No podemos hacer pop del root
        return prev;
      }
      popped = prev[prev.length - 1];
      return prev.slice(0, -1);
    });

    return popped;
  }, []);

  /**
   * Reset: Volver al estado inicial (root)
   */
  const reset = useCallback(() => {
    setStack([INITIAL_STACK_ITEM]);
  }, []);

  /**
   * Reset con workspace: Reinicia al nivel del workspace indicado
   * Si no se pasa workspace, va a root
   */
  const resetToWorkspace = useCallback((workspace?: { id: string; name: string } | null) => {
    setStack(createInitialStack(workspace));
  }, []);

  /**
   * Navegar a un nivel específico con datos
   */
  const navigateTo = useCallback((
    level: NavigationLevel,
    data?: Partial<NavigationState>
  ) => {
    const newState: NavigationState = {
      ...current?.state,
      level,
      ...data,
    };

    const newItem: NavigationStackItem = {
      level,
      state: newState,
      title: getTitleForLevel(level, newState),
    };

    push(newItem);
  }, [current?.state, push]);

  /**
   * Obtener breadcrumb (array de títulos)
   */
  const getBreadcrumb = useCallback((): string[] => {
    return stack.map((item) => item.title);
  }, [stack]);

  /**
   * Navegar a un índice específico del stack (para breadcrumb clickeable)
   */
  const navigateToIndex = useCallback((index: number) => {
    if (index < 0 || index >= stack.length) return;
    setStack((prev) => prev.slice(0, index + 1));
  }, [stack.length]);

  return {
    stack,
    current,
    push,
    pop,
    reset,
    resetToWorkspace,
    canGoBack,
    // Funciones adicionales de utilidad
    navigateTo,
    getBreadcrumb,
    navigateToIndex,
  } as UseNavigationStackReturn & {
    navigateTo: typeof navigateTo;
    getBreadcrumb: typeof getBreadcrumb;
    navigateToIndex: typeof navigateToIndex;
    resetToWorkspace: typeof resetToWorkspace;
  };
}

export default useNavigationStack;
