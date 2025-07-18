import { create } from 'zustand';

interface DeletePopupState {
  deleteConfirm: string;
  isDeleting: boolean;
  
  // Actions
  setDeleteConfirm: (confirm: string) => void;
  setIsDeleting: (isDeleting: boolean) => void;
  resetState: () => void;
}

export const useDeleteConfirm = () => useDeletePopupStore((state) => state.deleteConfirm);
export const useIsDeleting = () => useDeletePopupStore((state) => state.isDeleting);
export const useDeletePopupActions = () => useDeletePopupStore((state) => ({
  setDeleteConfirm: state.setDeleteConfirm,
  setIsDeleting: state.setIsDeleting,
  resetState: state.resetState,
}));

export const useDeletePopupStore = create<DeletePopupState>((set) => ({
  // Initial state
  deleteConfirm: '',
  isDeleting: false,
  
  // Actions
  setDeleteConfirm: (confirm: string) => set({ deleteConfirm: confirm }),
  setIsDeleting: (isDeleting: boolean) => set({ isDeleting }),
  resetState: () => set({ deleteConfirm: '', isDeleting: false }),
})); 