/**
 * Toast Store - Gestión centralizada de estado
 * Zustand store para manejar toasts globalmente
 */

import { create } from 'zustand';
import { ToastConfig } from '../types';

interface ToastState {
  toasts: ToastConfig[];
  addToast: (config: Omit<ToastConfig, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  updateToast: (id: string, config: Partial<ToastConfig>) => void;
}

export const useToastStore = create<ToastState>((set) => {
  let toastCounter = 0;

  return {
    toasts: [],

    addToast: (config) => {
      const id = `toast-${toastCounter++}-${Date.now()}`;
      const newToast: ToastConfig = {
        ...config,
        id,
        duration: config.duration ?? 5000,
        position: config.position ?? 'top-right',
        playSound: config.playSound ?? true,
      };

      set((state) => ({
        toasts: [...state.toasts, newToast],
      }));

      // Auto-remove después de la duración
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
          newToast.onClose?.();
        }, newToast.duration);
      }

      return id;
    },

    removeToast: (id) => {
      set((state) => {
        const toast = state.toasts.find((t) => t.id === id);
        if (toast) {
          toast.onClose?.();
        }
        return {
          toasts: state.toasts.filter((t) => t.id !== id),
        };
      });
    },

    clearAll: () => {
      set((state) => {
        state.toasts.forEach((t) => t.onClose?.());
        return { toasts: [] };
      });
    },

    updateToast: (id, config) => {
      set((state) => ({
        toasts: state.toasts.map((t) =>
          t.id === id ? { ...t, ...config } : t
        ),
      }));
    },
  };
});
