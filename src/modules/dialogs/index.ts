// Components - Primitives (replaces @/components/ui/dialog)
export {
  Dialog,
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter as DialogFooterPrimitive,
  DialogTitle,
  DialogDescription,
} from './components/DialogPrimitives';

// Components - Base (full dialog with animations)
export { Dialog as AnimatedDialog } from './components/Dialog';
export { DialogProvider } from './components/DialogProvider';
export { ConfirmDialog } from './components/variants/ConfirmDialog';
export { AlertDialog } from './components/variants/AlertDialog';
export { FormDialog } from './components/variants/FormDialog';

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
  DialogHeader as DialogHeaderMolecule,
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

// Types from primitives
export type {
  DialogRootProps,
  DialogTriggerProps,
  DialogCloseProps,
  DialogPortalProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogBodyProps,
  DialogFooterProps as DialogFooterPrimitiveProps,
  DialogTitleProps,
  DialogDescriptionProps,
} from './components/DialogPrimitives';