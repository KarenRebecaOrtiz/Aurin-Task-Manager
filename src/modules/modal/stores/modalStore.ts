import { create } from 'zustand';
import { ReactNode } from 'react';

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success';
export type ModalType = 'confirm' | 'alert' | 'loader' | 'custom';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
export type ModalPosition = 'center' | 'top' | 'bottom';

export interface ModalConfig {
  id: string;
  type: ModalType;
  variant?: ModalVariant;
  title?: string;
  description?: string;
  content?: ReactNode;
  
  // Callbacks
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  
  // Confirmation settings
  requiresConfirmation?: boolean;
  confirmationKeyword?: string;
  
  // Button texts
  confirmText?: string;
  cancelText?: string;
  
  // Appearance
  size?: ModalSize;
  position?: ModalPosition;
  showCloseButton?: boolean;
  
  // Behavior
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  isLoading?: boolean;
  
  // Loader specific
  autoClose?: boolean;
  autoCloseDelay?: number;
  progress?: number;
}

interface ModalStore {
  modals: ModalConfig[];
  openModal: (config: Omit<ModalConfig, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  updateModal: (id: string, updates: Partial<ModalConfig>) => void;
  getModal: (id: string) => ModalConfig | undefined;
}

let modalIdCounter = 0;

export const useModalStore = create<ModalStore>((set, get) => ({
  modals: [],
  
  openModal: (config) => {
    const id = `modal-${++modalIdCounter}-${Date.now()}`;
    const newModal: ModalConfig = {
      id,
      type: 'custom',
      variant: 'info',
      size: 'md',
      position: 'center',
      showCloseButton: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
      isLoading: false,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      ...config,
    };
    
    set((state) => ({
      modals: [...state.modals, newModal],
    }));
    
    return id;
  },
  
  closeModal: (id) => {
    set((state) => ({
      modals: state.modals.filter((modal) => modal.id !== id),
    }));
  },
  
  closeAllModals: () => {
    set({ modals: [] });
  },
  
  updateModal: (id, updates) => {
    set((state) => ({
      modals: state.modals.map((modal) =>
        modal.id === id ? { ...modal, ...updates } : modal
      ),
    }));
  },
  
  getModal: (id) => {
    return get().modals.find((modal) => modal.id === id);
  },
}));
