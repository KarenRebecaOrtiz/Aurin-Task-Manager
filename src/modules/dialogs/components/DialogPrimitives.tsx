'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { backdropVariants, panelVariants, transitions } from '../config/animations';
import styles from '../styles/Dialog.module.scss';

// ===== TYPES =====
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size: DialogSize;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a DialogRoot');
  }
  return context;
}

// ===== SIZE CLASSES =====
const sizeClasses: Record<DialogSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  full: styles.sizeFull,
};

// ===== DIALOG ROOT =====
interface DialogRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function DialogRoot({ open: controlledOpen, onOpenChange, children, defaultOpen = false }: DialogRootProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [isControlled, onOpenChange]);

  const contextValue = React.useMemo(() => ({
    open,
    onOpenChange: handleOpenChange,
    size: 'md' as DialogSize,
  }), [open, handleOpenChange]);

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
    </DialogContext.Provider>
  );
}

// ===== DIALOG TRIGGER =====
interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext();
  
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onOpenChange(true);
  }, [onOpenChange]);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

// ===== DIALOG CLOSE =====
interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  asChild?: boolean;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const { onOpenChange } = useDialogContext();
    
    const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        onOpenChange(false);
      }
    }, [onOpenChange, onClick]);

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
        onClick: handleClick,
      });
    }

    return (
      <button type="button" ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
DialogClose.displayName = 'DialogClose';

// ===== DIALOG PORTAL =====
interface DialogPortalProps {
  children: React.ReactNode;
  container?: HTMLElement;
}

function DialogPortal({ children, container }: DialogPortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof window === 'undefined') return null;

  return createPortal(children, container || document.body);
}

// ===== DIALOG OVERLAY =====
interface DialogOverlayProps {
  className?: string;
  closeOnClick?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  ({ className, closeOnClick = true, onClick }, ref) => {
    const { onOpenChange } = useDialogContext();

    const handleClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      if (closeOnClick && !e.defaultPrevented) {
        onOpenChange(false);
      }
    }, [closeOnClick, onOpenChange, onClick]);

    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={backdropVariants}
        transition={transitions.fast}
        className={cn(styles.backdrop, className)}
        onClick={handleClick}
      />
    );
  }
);
DialogOverlay.displayName = 'DialogOverlay';

// ===== DIALOG CONTENT =====
interface DialogContentProps {
  children?: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  size?: DialogSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  onPointerDownOutside?: (e: React.PointerEvent) => void;
  onInteractOutside?: (e: React.MouseEvent) => void;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ 
    className, 
    children, 
    showCloseButton = true, 
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    onPointerDownOutside: _onPointerDownOutside,
    onInteractOutside,
  }, ref) => {
    const { open, onOpenChange } = useDialogContext();
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Handle ESC key
    React.useEffect(() => {
      if (!closeOnEscape) return;
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false);
        }
      };

      if (open) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [open, closeOnEscape, onOpenChange]);

    // Handle click outside
    const handleOverlayClick = React.useCallback((e: React.MouseEvent) => {
      if (onInteractOutside) {
        onInteractOutside(e);
      }
      if (closeOnOverlayClick && !e.defaultPrevented) {
        onOpenChange(false);
      }
    }, [closeOnOverlayClick, onInteractOutside, onOpenChange]);

    const handleContentClick = React.useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    const handleCloseClick = React.useCallback(() => {
      onOpenChange(false);
    }, [onOpenChange]);

    if (!open) return null;

    return (
      <DialogPortal>
        <AnimatePresence>
          {open && (
            <div className={styles.dialogRoot} role="presentation">
              {/* Overlay */}
              <DialogOverlay closeOnClick={closeOnOverlayClick} onClick={handleOverlayClick} />
              
              {/* Container */}
              <div className={styles.container}>
                <motion.div
                  ref={ref || contentRef}
                  role="dialog"
                  aria-modal="true"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={panelVariants}
                  transition={transitions.normal}
                  className={cn(styles.panel, sizeClasses[size], className)}
                  onClick={handleContentClick}
                >
                  {children}
                  {showCloseButton && (
                    <button 
                      type="button"
                      className={styles.closeButton}
                      onClick={handleCloseClick}
                      aria-label="Cerrar"
                    >
                      <X size={18} />
                    </button>
                  )}
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

// ===== DIALOG HEADER =====
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, bordered, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        styles.header,
        bordered && styles.headerBordered,
        className
      )}
      {...props}
    />
  )
);
DialogHeader.displayName = 'DialogHeader';

// ===== DIALOG BODY =====
type DialogBodyProps = React.HTMLAttributes<HTMLDivElement>;

const DialogBody = React.forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(styles.content, className)}
      {...props}
    />
  )
);
DialogBody.displayName = 'DialogBody';

// ===== DIALOG FOOTER =====
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, bordered, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        styles.footer,
        bordered && styles.footerBordered,
        className
      )}
      {...props}
    />
  )
);
DialogFooter.displayName = 'DialogFooter';

// ===== DIALOG TITLE =====
type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(styles.title, className)}
      {...props}
    />
  )
);
DialogTitle.displayName = 'DialogTitle';

// ===== DIALOG DESCRIPTION =====
type DialogDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(styles.description, className)}
      {...props}
    />
  )
);
DialogDescription.displayName = 'DialogDescription';

export {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  // Re-export as Dialog for convenience
  DialogRoot as Dialog,
};

export type {
  DialogRootProps,
  DialogTriggerProps,
  DialogCloseProps,
  DialogPortalProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogBodyProps,
  DialogFooterProps,
  DialogTitleProps,
  DialogDescriptionProps,
};
