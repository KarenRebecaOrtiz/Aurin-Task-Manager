// src/stores/formStore.ts
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// Tipos para los estados de formularios
interface DropdownPosition {
  top: number;
  left: number;
}

interface DropdownStates {
  project: boolean;
  status: boolean;
  priority: boolean;
  collaborator: boolean;
  leader: boolean;
  client: boolean;
  startDate: boolean;
  endDate: boolean;
}

interface SearchStates {
  collaborator: string;
  leader: string;
  client: string;
}

interface DropdownPositions {
  project: DropdownPosition | null;
  status: DropdownPosition | null;
  priority: DropdownPosition | null;
  collaborator: DropdownPosition | null;
  leader: DropdownPosition | null;
  client: DropdownPosition | null;
  startDate: DropdownPosition | null;
  endDate: DropdownPosition | null;
}

interface AlertStates {
  showSuccess: boolean;
  showFail: boolean;
  failMessage: string;
}

interface FormState {
  // Estados de dropdowns
  dropdownStates: DropdownStates;
  
  // Estados de búsqueda
  searchStates: SearchStates;
  
  // Estados de posición (memoizados)
  dropdownPositions: DropdownPositions;
  
  // Estados de alertas
  alertStates: AlertStates;
  
  // Estados adicionales
  isSaving: boolean;
  isMounted: boolean;
  includeMembers: boolean;
  
  // Acciones
  toggleDropdown: (dropdown: keyof DropdownStates) => void;
  setSearchState: (field: keyof SearchStates, value: string) => void;
  updatePosition: (dropdown: keyof DropdownPositions, position: DropdownPosition | null) => void;
  setAlertState: (type: 'success' | 'fail', show: boolean, message?: string) => void;
  setIsSaving: (saving: boolean) => void;
  setIsMounted: (mounted: boolean) => void;
  setIncludeMembers: (include: boolean) => void;
  resetFormState: () => void;
  
  // Acciones optimizadas para múltiples cambios
  closeAllDropdowns: () => void;
  resetSearchStates: () => void;
  resetPositions: () => void;
}

// Estado inicial
const initialDropdownStates: DropdownStates = {
  project: false,
  status: false,
  priority: false,
  collaborator: false,
  leader: false,
  client: false,
  startDate: false,
  endDate: false,
};

const initialSearchStates: SearchStates = {
  collaborator: '',
  leader: '',
  client: '',
};

const initialDropdownPositions: DropdownPositions = {
  project: null,
  status: null,
  priority: null,
  collaborator: null,
  leader: null,
  client: null,
  startDate: null,
  endDate: null,
};

const initialAlertStates: AlertStates = {
  showSuccess: false,
  showFail: false,
  failMessage: '',
};

export const useFormStore = create<FormState>()((set) => ({
  // Estados iniciales
  dropdownStates: initialDropdownStates,
  searchStates: initialSearchStates,
  dropdownPositions: initialDropdownPositions,
  alertStates: initialAlertStates,
  isSaving: false,
  isMounted: false,
  includeMembers: false,
  
  // Acciones
  toggleDropdown: (dropdown) =>
    set((state) => ({
      dropdownStates: {
        ...state.dropdownStates,
        [dropdown]: !state.dropdownStates[dropdown],
      },
    })),
    
  setSearchState: (field, value) =>
    set((state) => ({
      searchStates: {
        ...state.searchStates,
        [field]: value,
      },
    })),
    
  updatePosition: (dropdown, position) =>
    set((state) => ({
      dropdownPositions: {
        ...state.dropdownPositions,
        [dropdown]: position,
      },
    })),
    
  setAlertState: (type, show, message = '') =>
    set((state) => ({
      alertStates: {
        ...state.alertStates,
        showSuccess: type === 'success' ? show : false,
        showFail: type === 'fail' ? show : false,
        failMessage: type === 'fail' ? message : '',
      },
    })),
    
  setIsSaving: (saving) => set({ isSaving: saving }),
  setIsMounted: (mounted) => set({ isMounted: mounted }),
  setIncludeMembers: (include) => set({ includeMembers: include }),
  
  resetFormState: () =>
    set({
      dropdownStates: initialDropdownStates,
      searchStates: initialSearchStates,
      dropdownPositions: initialDropdownPositions,
      alertStates: initialAlertStates,
      isSaving: false,
      includeMembers: false,
    }),
    
  closeAllDropdowns: () =>
    set((state) => ({
      dropdownStates: {
        ...state.dropdownStates,
        project: false,
        status: false,
        priority: false,
        collaborator: false,
        leader: false,
        client: false,
        startDate: false,
        endDate: false,
      },
    })),
    
  resetSearchStates: () =>
    set({
      searchStates: initialSearchStates,
    }),
    
  resetPositions: () =>
    set({
      dropdownPositions: initialDropdownPositions,
    }),
}));

// Hooks optimizados para selectores específicos
export const useFormDropdownStates = () =>
  useFormStore(useShallow((state) => state.dropdownStates));

export const useFormSearchStates = () =>
  useFormStore(useShallow((state) => state.searchStates));

export const useFormDropdownPositions = () =>
  useFormStore(useShallow((state) => state.dropdownPositions));

export const useFormAlertStates = () =>
  useFormStore(useShallow((state) => state.alertStates));

export const useFormActions = () =>
  useFormStore(useShallow((state) => ({
    toggleDropdown: state.toggleDropdown,
    setSearchState: state.setSearchState,
    updatePosition: state.updatePosition,
    setAlertState: state.setAlertState,
    setIsSaving: state.setIsSaving,
    setIsMounted: state.setIsMounted,
    setIncludeMembers: state.setIncludeMembers,
    resetFormState: state.resetFormState,
    closeAllDropdowns: state.closeAllDropdowns,
    resetSearchStates: state.resetSearchStates,
    resetPositions: state.resetPositions,
  })));

export const useFormState = () =>
  useFormStore(useShallow((state) => ({
    isSaving: state.isSaving,
    isMounted: state.isMounted,
    includeMembers: state.includeMembers,
  })));

// Hook combinado para componentes que necesitan estado y acciones
export const useFormOptimized = () =>
  useFormStore(useShallow((state) => ({
    // Estados
    dropdownStates: state.dropdownStates,
    searchStates: state.searchStates,
    dropdownPositions: state.dropdownPositions,
    alertStates: state.alertStates,
    isSaving: state.isSaving,
    isMounted: state.isMounted,
    includeMembers: state.includeMembers,
    
    // Acciones
    toggleDropdown: state.toggleDropdown,
    setSearchState: state.setSearchState,
    updatePosition: state.updatePosition,
    setAlertState: state.setAlertState,
    setIsSaving: state.setIsSaving,
    setIsMounted: state.setIsMounted,
    setIncludeMembers: state.setIncludeMembers,
    resetFormState: state.resetFormState,
    closeAllDropdowns: state.closeAllDropdowns,
    resetSearchStates: state.resetSearchStates,
    resetPositions: state.resetPositions,
  }))); 