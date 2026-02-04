'use client';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTitle,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter
} from '../DialogPrimitives';
import { VisuallyHidden } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { DialogHeader } from '../molecules';
import { DialogLoadingState, DialogErrorState } from '../atoms';
import { ScrollableContent, DialogFooter, DialogActions } from '../molecules';
import { panelVariants } from '../../config/animations';
import { CrudDialogProps } from '../../types/crud-dialog.types';
import { cn } from '@/lib/utils';
import styles from '../../styles/Dialog.module.scss';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export function CrudDialog({
  isOpen,
  onOpenChange,
  mode,
  title,
  description,
  children,
  isLoading = false,
  isSubmitting = false,
  error,
  loadingMessage,
  onSubmit,
  onCancel,
  onEdit,
  onClose,
  size = 'xl',
  submitText,
  cancelText = 'Cancelar',
  editText = 'Editar',
  submitVariant = 'primary',
  header,
  footer,
  actions,
  loadingState,
  errorState,
  closeOnOverlayClick = false,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}: CrudDialogProps) {
  // IMPORTANTE: Todos los hooks deben estar ANTES de cualquier return condicional
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Determine default submit text based on mode
  const defaultSubmitText = mode === 'create' ? 'Crear' : mode === 'edit' ? 'Actualizar' : 'Guardar';
  const finalSubmitText = submitText || defaultSubmitText;

  // Determine if readonly
  const isReadOnly = mode === 'view';

  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    onOpenChange(false);
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      handleClose();
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent
          className={cn(styles.dialogContent, className)}
          onPointerDownOutside={(e) => !closeOnOverlayClick && e.preventDefault()}
          onInteractOutside={(e) => !closeOnOverlayClick && e.preventDefault()}
        >
          <VisuallyHidden>
            <ResponsiveDialogTitle>{title || 'Cargando'}</ResponsiveDialogTitle>
          </VisuallyHidden>
          {loadingState || <DialogLoadingState message={loadingMessage} />}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  // Render error state
  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    return (
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent
          className={cn(styles.dialogContent, className)}
          onPointerDownOutside={(e) => !closeOnOverlayClick && e.preventDefault()}
          onInteractOutside={(e) => !closeOnOverlayClick && e.preventDefault()}
        >
          <VisuallyHidden>
            <ResponsiveDialogTitle>Error</ResponsiveDialogTitle>
          </VisuallyHidden>
          {errorState || <DialogErrorState message={errorMessage} onRetry={handleClose} retryText="Cerrar" />}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  // Render main dialog
  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className={cn(
          !isMobile && styles.dialogContent,
          !isMobile && size && styles[`size${size.charAt(0).toUpperCase()}${size.slice(1)}`],
          className
        )}
        showCloseButton={showCloseButton}
        onPointerDownOutside={(e) => !closeOnOverlayClick && e.preventDefault()}
        onInteractOutside={(e) => !closeOnOverlayClick && e.preventDefault()}
      >
        <VisuallyHidden>
          <ResponsiveDialogTitle>{title || 'Dialog'}</ResponsiveDialogTitle>
        </VisuallyHidden>

        {isMobile ? (
          // Mobile: Use Drawer structure without motion.div
          <>
            {/* Header */}
            {header || (title && (
              <ResponsiveDialogHeader>
                <DialogHeader
                  title={title}
                  description={description}
                />
              </ResponsiveDialogHeader>
            ))}

            {/* Body */}
            <ResponsiveDialogBody>
              <ScrollableContent className={styles.content}>
                {children}
              </ScrollableContent>
            </ResponsiveDialogBody>

            {/* Footer */}
            {(footer || actions || onSubmit || onCancel || (isReadOnly && onEdit)) && (
              <ResponsiveDialogFooter>
                {footer || actions || (
                  <>
                    {!isReadOnly && (
                      <DialogActions
                        onCancel={handleCancel}
                        onSubmit={onSubmit}
                        cancelText={cancelText}
                        submitText={finalSubmitText}
                        isLoading={isSubmitting}
                        submitVariant={submitVariant}
                      />
                    )}

                    {isReadOnly && onEdit && (
                      <DialogActions
                        onSubmit={onEdit}
                        submitText={editText}
                        submitVariant="primary"
                      />
                    )}
                  </>
                )}
              </ResponsiveDialogFooter>
            )}
          </>
        ) : (
          // Desktop: Use Dialog structure with motion.div
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={styles.dialogInner}
              >
                {/* Header */}
                {header || (title && (
                  <DialogHeader
                    title={title}
                    description={description}
                  />
                ))}

                {/* Scrollable Content */}
                <ScrollableContent className={styles.content}>
                  {children}
                </ScrollableContent>

                {/* Footer */}
                {(footer || actions || onSubmit || onCancel || (isReadOnly && onEdit)) && (
                  <DialogFooter>
                    {footer || actions || (
                      <>
                        {!isReadOnly && (
                          <DialogActions
                            onCancel={handleCancel}
                            onSubmit={onSubmit}
                            cancelText={cancelText}
                            submitText={finalSubmitText}
                            isLoading={isSubmitting}
                            submitVariant={submitVariant}
                          />
                        )}

                        {isReadOnly && onEdit && (
                          <DialogActions
                            onSubmit={onEdit}
                            submitText={editText}
                            submitVariant="primary"
                          />
                        )}
                      </>
                    )}
                  </DialogFooter>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
