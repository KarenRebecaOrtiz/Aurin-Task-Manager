// Components
export { Dialog } from './components/Dialog';
export { DialogProvider } from './components/DialogProvider';
export { ConfirmDialog } from './components/variants/ConfirmDialog';
export { AlertDialog } from './components/variants/AlertDialog';
export { FormDialog } from './components/variants/FormDialog';

// Hooks
export { useDialog } from './hooks/useDialog';

// Store
export { useDialogStore, useDialogs, useDialogActions } from './stores/dialogStore';

// Animations
export {
  transitions,
  backdropVariants,
  panelVariants,
  contentVariants,
  itemVariants,
  buttonVariants,
} from './config/animations';

// Types
export type {
  DialogSize,
  DialogVariant,
  DialogConfig,
  DialogStore,
  UseDialogReturn,
  ConfirmDialogOptions,
  AlertDialogOptions,
  FormDialogOptions,
  CustomDialogOptions,
  DialogBaseProps,
} from './types/dialog.types';
