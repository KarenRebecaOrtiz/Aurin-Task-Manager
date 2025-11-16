'use client';

import { useEffect } from 'react';
import {
  Dialog as HeadlessDialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
  Description,
  CloseButton,
} from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { DialogBaseProps, DialogSize, DialogVariant } from '../types/dialog.types';
import {
  backdropVariants,
  panelVariants,
  transitions,
} from '../config/animations';
import styles from '../styles/Dialog.module.scss';

const sizeClasses: Record<DialogSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  full: styles.sizeFull,
};

const variantClasses: Record<DialogVariant, string> = {
  default: styles.variantDefault,
  danger: styles.variantDanger,
  warning: styles.variantWarning,
  success: styles.variantSuccess,
  info: styles.variantInfo,
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  variant = 'default',
  children,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
}: DialogBaseProps) {
  // Block body scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleClose = () => {
    if (closeOnEscape || closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <HeadlessDialog
          static
          open={open}
          onClose={handleClose}
          className={styles.dialogRoot}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={backdropVariants}
            transition={transitions.fast}
          >
            <DialogBackdrop
              className={styles.backdrop}
              onClick={closeOnOverlayClick ? onClose : undefined}
            />
          </motion.div>

          <div className={styles.container}>
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={panelVariants}
              transition={transitions.normal}
            >
              <DialogPanel
                className={`${styles.panel} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
              >
                {showCloseButton && (
                  <CloseButton
                    className={styles.closeButton}
                    onClick={onClose}
                  >
                    <X size={18} />
                    <span className="sr-only">Cerrar</span>
                  </CloseButton>
                )}

                {title && (
                  <DialogTitle className={styles.title}>{title}</DialogTitle>
                )}

                {description && (
                  <Description className={styles.description}>
                    {description}
                  </Description>
                )}

                {children && <div className={styles.content}>{children}</div>}
              </DialogPanel>
            </motion.div>
          </div>
        </HeadlessDialog>
      )}
    </AnimatePresence>
  );
}
