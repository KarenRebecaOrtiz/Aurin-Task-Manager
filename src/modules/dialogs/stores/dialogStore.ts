import { create } from 'zustand';
import { DialogConfig, DialogStore } from '../types/dialog.types';

let dialogCounter = 0;

const generateId = (): string => {
  dialogCounter += 1;
  return `dialog-${dialogCounter}-${Date.now()}`;
};

export const useDialogStore = create<DialogStore>((set, get) => ({
  dialogs: [],

  open: (config) => {
    const id = generateId();
    const dialogConfig: DialogConfig = {
      id,
      type: config.type || 'custom',
      size: config.size || 'md',
      variant: config.variant || 'default',
      closeOnOverlayClick: config.closeOnOverlayClick ?? true,
      closeOnEscape: config.closeOnEscape ?? true,
      showCloseButton: config.showCloseButton ?? true,
      confirmText: config.confirmText || 'Confirmar',
      cancelText: config.cancelText || 'Cancelar',
      submitText: config.submitText || 'Enviar',
      autoCloseDelay: config.autoCloseDelay || 3000,
      ...config,
    };

    set((state) => ({
      dialogs: [...state.dialogs, dialogConfig],
    }));

    return id;
  },

  close: (id) => {
    const dialog = get().dialogs.find((d) => d.id === id);
    if (dialog?.onClose) {
      dialog.onClose();
    }
    set((state) => ({
      dialogs: state.dialogs.filter((d) => d.id !== id),
    }));
  },

  closeAll: () => {
    const { dialogs } = get();
    dialogs.forEach((dialog) => {
      if (dialog.onClose) {
        dialog.onClose();
      }
    });
    set({ dialogs: [] });
  },

  update: (id, updates) => {
    set((state) => ({
      dialogs: state.dialogs.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
  },
}));

// Selector hooks for optimized re-renders
export const useDialogs = () => useDialogStore((state) => state.dialogs);
export const useDialogActions = () =>
  useDialogStore((state) => ({
    open: state.open,
    close: state.close,
    closeAll: state.closeAll,
    update: state.update,
  }));
