import { create } from 'zustand';

interface ActionMenuState {
  openMenuId: string | null;
  dropdownPositions: { [menuId: string]: { top: number; left: number } };
  tooltipStates: { [menuId: string]: boolean };
}

interface ActionMenuActions {
  setOpenMenuId: (menuId: string | null) => void;
  setDropdownPosition: (menuId: string, position: { top: number; left: number }) => void;
  setTooltipState: (menuId: string, isVisible: boolean) => void;
  reset: () => void;
}

const initialState: ActionMenuState = {
  openMenuId: null,
  dropdownPositions: {},
  tooltipStates: {},
};

export const useActionMenuStore = create<ActionMenuState & ActionMenuActions>()((set) => ({
  ...initialState,
  setOpenMenuId: (menuId) => set({ openMenuId: menuId }),
  setDropdownPosition: (menuId, position) =>
    set((state) => ({
      dropdownPositions: {
        ...state.dropdownPositions,
        [menuId]: position,
      },
    })),
  setTooltipState: (menuId, isVisible) =>
    set((state) => ({
      tooltipStates: {
        ...state.tooltipStates,
        [menuId]: isVisible,
      },
    })),
  reset: () => set(initialState),
}));