import { create } from 'zustand';

interface SimpleDeletePopupState {
  deleteConfirm: string;
  isDeleting: boolean;
  
  // Actions
  setDeleteConfirm: (confirm: string) => void;
  setIsDeleting: (isDeleting: boolean) => void;
  resetState: () => void;
}

export const useSimpleDeletePopupStore = create<SimpleDeletePopupState>((set) => ({
  // Initial state
  deleteConfirm: '',
  isDeleting: false,
  
  // Actions
  setDeleteConfirm: (confirm: string) => set({ deleteConfirm: confirm }),
  setIsDeleting: (isDeleting: boolean) => set({ isDeleting }),
  resetState: () => set({ deleteConfirm: '', isDeleting: false }),
})); 