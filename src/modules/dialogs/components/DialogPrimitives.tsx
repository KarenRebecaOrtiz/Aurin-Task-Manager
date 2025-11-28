/**
 * Dialog Primitives - Sistema unificado de componentes de dialog
 * 
 * Componentes primitivos sin dependencias de UI libraries externas.
 * Usa Framer Motion para animaciones y createPortal nativo de React.
 * 
 * @example
 * ```tsx
 * <Dialog open={isOpen} onOpenChange={setIsOpen}>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Título</DialogTitle>
 *       <DialogDescription>Descripción</DialogDescription>
 *     </DialogHeader>
 *     <DialogBody>Contenido</DialogBody>
 *     <DialogFooter>Acciones</DialogFooter>
 *   </DialogContent>
 * </Dialog>
 * ```
 */

'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { backdropVariants, panelVariants, transitions } from '../config/animations';
import styles from '../styles/Dialog.module.scss';

// ============================================================================
// Types
// ============================================================================

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface DialogRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export interface DialogCloseProps {
  children?: ReactNode;
  asChild?: boolean;
  className?: string;
}

export interface DialogPortalProps {
  children: ReactNode;
  container?: HTMLElement;
}

export interface DialogOverlayProps {
  className?: string;
  onClick?: () => void;
}

export interface DialogContentProps {
  children: ReactNode;
  size?: DialogSize;
  className?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onPointerDownOutside?: (event: { preventDefault: () => void }) => void;
  onInteractOutside?: (event: { preventDefault: () => void }) => void;
}

export interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface DialogBodyProps {
  children: ReactNode;
  className?: string;
}

export interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

// ============================================================================
// Context
// ============================================================================

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a DialogRoot');
  }
  return context;
}

// ============================================================================
// Size classes mapping
// ============================================================================

const sizeClasses: Record<DialogSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  full: styles.sizeFull,
};

// ============================================================================
// Primitives
// ============================================================================

/**
 * DialogRoot - Provider del contexto del dialog
 */
export function DialogRoot({ open, onOpenChange, children }: DialogRootProps) {
  const contextValue = useMemo(
    () => ({ open, onOpenChange }),
    [open, onOpenChange]
  );

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
    </DialogContext.Provider>
  );
}

/**
 * DialogTrigger - Elemento que abre el dialog
 */
export function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext();

  const handleClick = useCallback(() => {
    onOpenChange(true);
  }, [onOpenChange]);

  if (asChild) {
    // Si asChild es true, clone el hijo y añade onClick
    return children;
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

/**
 * DialogClose - Elemento que cierra el dialog
 */
export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ children, asChild, className }, ref) => {
    const { onOpenChange } = useDialogContext();

    const handleClose = useCallback(() => {
      onOpenChange(false);
    }, [onOpenChange]);

    if (asChild) {
      return <>{children}</>;
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClose}
        className={className || styles.closeButton}
        aria-label="Cerrar"
      >
        {children || <X size={18} />}
      </button>
    );
  }
);

DialogClose.displayName = 'DialogClose';

/**
 * DialogPortal - Renderiza el contenido en un portal
 */
export function DialogPortal({ children, container }: DialogPortalProps) {
  if (typeof window === 'undefined') return null;

  return createPortal(children, container || document.body);
}

/**
 * DialogOverlay - Fondo oscuro del dialog
 */
export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, onClick }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={backdropVariants}
        transition={transitions.fast}
        className={className || styles.backdrop}
        onClick={onClick}
      />
    );
  }
);

DialogOverlay.displayName = 'DialogOverlay';

/**
 * DialogContent - Panel principal del dialog
 */
export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      children,
      size = 'md',
      className = '',
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      onEscapeKeyDown,
      onPointerDownOutside,
      onInteractOutside,
    },
    ref
  ) => {
    const { open, onOpenChange } = useDialogContext();

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

    // Handle ESC key
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && closeOnEscape) {
          onEscapeKeyDown?.(e);
          onOpenChange(false);
        }
      };

      if (open) {
        document.addEventListener('keydown', handleKeyDown);
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [open, closeOnEscape, onOpenChange, onEscapeKeyDown]);

    const handleBackdropClick = useCallback(() => {
      const event = { preventDefault: () => {} };
      onPointerDownOutside?.(event);
      onInteractOutside?.(event);
      
      if (closeOnOverlayClick) {
        onOpenChange(false);
      }
    }, [closeOnOverlayClick, onOpenChange, onPointerDownOutside, onInteractOutside]);

    const handlePanelClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    if (typeof window === 'undefined') return null;

    return (
      <DialogPortal>
        <AnimatePresence>
          {open && (
            <div className={styles.dialogRoot} role="dialog" aria-modal="true">
              <DialogOverlay onClick={handleBackdropClick} />

              <div className={styles.container}>
                <motion.div
                  ref={ref}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={panelVariants}
                  transition={transitions.normal}
                  className={`${styles.panel} ${sizeClasses[size]} ${className}`}
                  onClick={handlePanelClick}
                >
                  {showCloseButton && <DialogClose />}
                  {children}
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </DialogPortal>
    );
  }
);

DialogContent.displayName = 'DialogContent';

/**
 * DialogHeader - Cabecera del dialog
 */
export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ children, className = '' }, ref) => {
    return (
      <div ref={ref} className={`${styles.header} ${className}`}>
        {children}
      </div>
    );
  }
);

DialogHeader.displayName = 'DialogHeader';

/**
 * DialogBody - Cuerpo/contenido del dialog
 */
export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ children, className = '' }, ref) => {
    return (
      <div ref={ref} className={`${styles.content} ${className}`}>
        {children}
      </div>
    );
  }
);

DialogBody.displayName = 'DialogBody';

/**
 * DialogFooter - Pie del dialog (acciones)
 */
export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ children, className = '' }, ref) => {
    return (
      <div ref={ref} className={`${styles.actions} ${className}`}>
        {children}
      </div>
    );
  }
);

DialogFooter.displayName = 'DialogFooter';

/**
 * DialogTitle - Título del dialog
 */
export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ children, className = '' }, ref) => {
    return (
      <h2 ref={ref} className={`${styles.title} ${className}`}>
        {children}
      </h2>
    );
  }
);

DialogTitle.displayName = 'DialogTitle';

/**
 * DialogDescription - Descripción del dialog
 */
export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ children, className = '' }, ref) => {
    return (
      <p ref={ref} className={`${styles.description} ${className}`}>
        {children}
      </p>
    );
  }
);

DialogDescription.displayName = 'DialogDescription';

// ============================================================================
// Compound Component (alternative API)
// ============================================================================

export type DialogProps = DialogRootProps;

/**
 * Dialog - Componente compuesto que incluye el contexto
 * 
 * @example
 * ```tsx
 * <Dialog open={isOpen} onOpenChange={setIsOpen}>
 *   <DialogContent>
 *     <DialogTitle>Mi Dialog</DialogTitle>
 *     <DialogBody>Contenido aquí</DialogBody>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogRoot>
  );
}

// Attach sub-components for compound pattern
Dialog.Root = DialogRoot;
Dialog.Trigger = DialogTrigger;
Dialog.Close = DialogClose;
Dialog.Portal = DialogPortal;
Dialog.Overlay = DialogOverlay;
Dialog.Content = DialogContent;
Dialog.Header = DialogHeader;
Dialog.Body = DialogBody;
Dialog.Footer = DialogFooter;
Dialog.Title = DialogTitle;
Dialog.Description = DialogDescription;
