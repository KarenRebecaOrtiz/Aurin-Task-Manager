// src/stores/createTaskStore.ts
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// Tipos para los estados de CreateTask
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

interface CreateTaskState {
  // Estados de UI
  dropdownStates: DropdownStates;
  searchStates: SearchStates;
  dropdownPositions: DropdownPositions;
  alertStates: AlertStates;
  isSaving: boolean;
  isMounted: boolean;
  includeMembers: boolean;
  
  // Acciones para dropdowns
  toggleDropdown: (dropdown: keyof DropdownStates) => void;
  closeAllDropdowns: () => void;
  
  // Acciones para búsquedas
  setSearchState: (field: keyof SearchStates, value: string) => void;
  resetSearchStates: () => void;
  
  // Acciones para posiciones
  updatePosition: (dropdown: keyof DropdownPositions, position: DropdownPosition | null) => void;
  resetPositions: () => void;
  
  // Acciones para alertas
  setAlertState: (type: keyof AlertStates, value: boolean | string) => void;
  resetAlertStates: () => void;
  
  // Acciones generales
  setSaving: (saving: boolean) => void;
  setMounted: (mounted: boolean) => void;
  setIncludeMembers: (include: boolean) => void;
  
  // Acciones batch optimizadas para evitar re-renders múltiples
  selectDropdownItem: (dropdown: keyof DropdownStates, searchField?: keyof SearchStates) => void;
  
  // Reset completo
  resetFormState: () => void;
}

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

export const useCreateTaskStore = create<CreateTaskState>()((set) => ({
  // Estados iniciales
  dropdownStates: initialDropdownStates,
  searchStates: initialSearchStates,
  dropdownPositions: initialDropdownPositions,
  alertStates: initialAlertStates,
  isSaving: false,
  isMounted: false,
  includeMembers: false,
  
  // Acciones para dropdowns
  toggleDropdown: (dropdown) => {
    set((state) => ({
      dropdownStates: {
        ...state.dropdownStates,
        [dropdown]: !state.dropdownStates[dropdown],
      },
    }));
  },
  
  closeAllDropdowns: () => {
    set({
      dropdownStates: initialDropdownStates,
    });
  },
  
  // Acciones para búsquedas
  setSearchState: (field, value) => {
    set((state) => ({
      searchStates: {
        ...state.searchStates,
        [field]: value,
      },
    }));
  },
  
  resetSearchStates: () => {
    set({
      searchStates: initialSearchStates,
    });
  },
  
  // Acciones para posiciones
  updatePosition: (dropdown, position) => {
    set((state) => ({
      dropdownPositions: {
        ...state.dropdownPositions,
        [dropdown]: position,
      },
    }));
  },
  
  resetPositions: () => {
    set({
      dropdownPositions: initialDropdownPositions,
    });
  },
  
  // Acciones para alertas
  setAlertState: (type, value) => {
    set((state) => ({
      alertStates: {
        ...state.alertStates,
        [type]: value,
      },
    }));
  },
  
  resetAlertStates: () => {
    set({
      alertStates: initialAlertStates,
    });
  },
  
  // Acciones generales
  setSaving: (saving) => {
    set({ isSaving: saving });
  },
  
  setMounted: (mounted) => {
    set({ isMounted: mounted });
  },
  
  setIncludeMembers: (include) => {
    set({ includeMembers: include });
  },
  
  // Acción batch optimizada para selección de elementos
  selectDropdownItem: (dropdown, searchField) => {
    set((state) => {
      const updates: Partial<CreateTaskState> = {
        dropdownStates: {
          ...state.dropdownStates,
          [dropdown]: false, // Cerrar el dropdown
        },
      };
      
      // Si se especifica un campo de búsqueda, limpiarlo también
      if (searchField) {
        updates.searchStates = {
          ...state.searchStates,
          [searchField]: '',
        };
      }
      
      return updates;
    });
  },
  
  // Reset completo
  resetFormState: () => {
    set({
      dropdownStates: initialDropdownStates,
      searchStates: initialSearchStates,
      dropdownPositions: initialDropdownPositions,
      alertStates: initialAlertStates,
      isSaving: false,
      includeMembers: false,
    });
  },
}));

// Hooks optimizados para consumir el store
export const useCreateTaskDropdowns = () => {
  return useCreateTaskStore(
    useShallow((state) => ({
      dropdownStates: state.dropdownStates,
      toggleDropdown: state.toggleDropdown,
      closeAllDropdowns: state.closeAllDropdowns,
      selectDropdownItem: state.selectDropdownItem,
    }))
  );
};

export const useCreateTaskSearch = () => {
  return useCreateTaskStore(
    useShallow((state) => ({
      searchStates: state.searchStates,
      setSearchState: state.setSearchState,
      resetSearchStates: state.resetSearchStates,
    }))
  );
};

export const useCreateTaskPositions = () => {
  return useCreateTaskStore(
    useShallow((state) => ({
      dropdownPositions: state.dropdownPositions,
      updatePosition: state.updatePosition,
      resetPositions: state.resetPositions,
    }))
  );
};

export const useCreateTaskAlerts = () => {
  return useCreateTaskStore(
    useShallow((state) => ({
      alertStates: state.alertStates,
      setAlertState: state.setAlertState,
      resetAlertStates: state.resetAlertStates,
    }))
  );
};

export const useCreateTaskGeneral = () => {
  return useCreateTaskStore(
    useShallow((state) => ({
      isSaving: state.isSaving,
      isMounted: state.isMounted,
      includeMembers: state.includeMembers,
      setSaving: state.setSaving,
      setMounted: state.setMounted,
      setIncludeMembers: state.setIncludeMembers,
      resetFormState: state.resetFormState,
    }))
  );
}; 