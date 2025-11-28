// Components - Primitives (base dialog components)
export {
  Dialog,
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader as DialogHeaderPrimitive,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from './components/DialogPrimitives';

export type {
  DialogSize as DialogPrimitiveSize,
  DialogRootProps,
  DialogTriggerProps,
  DialogCloseProps,
  DialogPortalProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogHeaderProps as DialogHeaderPrimitiveProps,
  DialogBodyProps,
  DialogTitleProps,
  DialogDescriptionProps,
} from './components/DialogPrimitives';

// Components - Base (higher level)
export { Dialog as DialogBase } from './components/Dialog';
export { DialogProvider } from './components/DialogProvider';

// Components - Variants
export { ConfirmDialog } from './components/variants/ConfirmDialog';
export { AlertDialog } from './components/variants/AlertDialog';
export { FormDialog } from './components/variants/FormDialog';
export { TaskDialog } from './components/variants/TaskDialog';
export { ClientDialog } from './components/variants/ClientDialog';
export { AddNoteDialog } from './components/variants/AddNoteDialog';

// Components - Atoms
export {
  DialogSpinner,
  DialogLoadingState,
  DialogErrorState,
} from './components/atoms';

// Components - Molecules
export {
  ScrollableContent,
  DialogFooter,
  DialogActions,
  DialogHeader,
} from './components/molecules';

// Components - Organisms
export { CrudDialog } from './components/organisms';

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

export type {
  CrudDialogMode,
  CrudDialogProps,
} from './types/crud-dialog.types';

export type {
  DialogSpinnerProps,
  DialogLoadingStateProps,
  DialogErrorStateProps,
} from './components/atoms';

export type {
  ScrollableContentProps,
  DialogFooterProps,
  DialogActionsProps,
} from './components/molecules';
