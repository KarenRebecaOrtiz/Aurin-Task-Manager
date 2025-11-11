/**
 * @module config/stores/configPageStore
 * @description Store global para el estado de la página de configuración
 */

import { create } from 'zustand';

/**
 * Estado del store de la página de configuración
 */
interface ConfigPageState {
  /** Tab activo (0-5) */
  activeTab: number;
  /** Mapa de tabs con cambios pendientes */
  tabChanges: { [key: number]: boolean };
  /** Si está cargando */
  loading: boolean;
  /** Si hay cambios sin guardar */
  hasUnsavedChanges: boolean;
}

/**
 * Acciones del store de la página de configuración
 */
interface ConfigPageActions {
  /** Cambia el tab activo */
  setActiveTab: (tab: number) => void;
  /** Marca un tab como modificado */
  markTabAsChanged: (tab: number) => void;
  /** Limpia los cambios de un tab */
  clearTabChanges: (tab: number) => void;
  /** Limpia todos los cambios */
  clearAllTabChanges: () => void;
  /** Establece el estado de carga */
  setLoading: (loading: boolean) => void;
  /** Establece si hay cambios sin guardar */
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  /** Resetea el store a su estado inicial */
  reset: () => void;
}

/**
 * Estado inicial del store
 */
const initialState: ConfigPageState = {
  activeTab: 0,
  tabChanges: {},
  loading: true,
  hasUnsavedChanges: false,
};

/**
 * Store de la página de configuración
 */
export const useConfigPageStore = create<ConfigPageState & ConfigPageActions>((set) => ({
  ...initialState,

  setActiveTab: (tab) => set({ activeTab: tab }),

  markTabAsChanged: (tab) =>
    set((state) => ({
      tabChanges: { ...state.tabChanges, [tab]: true },
      hasUnsavedChanges: true,
    })),

  clearTabChanges: (tab) =>
    set((state) => {
      const newTabChanges = { ...state.tabChanges };
      delete newTabChanges[tab];
      return {
        tabChanges: newTabChanges,
        hasUnsavedChanges: Object.keys(newTabChanges).length > 0,
      };
    }),

  clearAllTabChanges: () =>
    set({
      tabChanges: {},
      hasUnsavedChanges: false,
    }),

  setLoading: (loading) => set({ loading }),

  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),

  reset: () => set(initialState),
}));
