'use client';

import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import styles from '../../styles/Dialog.module.scss';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DialogContainerProps {
  children: ReactNode;
  size?: DialogSize;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  /**
   * Si el contenido debe ser scrolleable automáticamente
   */
  scrollable?: boolean;
}

/**
 * Contenedor unificado para todos los dialogs
 * 
 * Características:
 * - Estilos centralizados sin dependencias externas
 * - Tamaños responsive predefinidos
 * - Soporte para dark mode automático
 * - Área scrolleable automática para contenido largo
 * - Compatible con DialogHeader y DialogFooter
 * 
 * @example
 * ```tsx
 * <DialogContainer size="lg" scrollable>
 *   <DialogHeader title="..." description="..." />
 *   <div className="space-y-4 p-6">
 *     {content}
 *   </div>
 *   <DialogFooter>
 *     {actions}
 *   </DialogFooter>
 * </DialogContainer>
 * ```
 */
export const DialogContainer = forwardRef<HTMLDivElement, DialogContainerProps>(
  ({ 
    children, 
    size = 'md', 
    className, 
    showCloseButton = false, 
    onClose,
    scrollable = true 
  }, ref) => {
    const sizeClass = {
      sm: styles.sizeSm,
      md: styles.sizeMd,
      lg: styles.sizeLg,
      xl: styles.sizeXl,
      full: styles.sizeFull,
    }[size];

    return (
      <>
        {/* Overlay */}
        <div className={styles.dialogOverlay} onClick={onClose} />
        
        {/* Content */}
        <div
          ref={ref}
          className={cn(
            styles.dialogContent,
            sizeClass,
            scrollable && styles.scrollable,
            className
          )}
        >
          {/* Close button opcional */}
          {showCloseButton && onClose && (
            <button
              className={styles.dialogClose}
              onClick={onClose}
              aria-label="Cerrar dialog"
            >
              ✕
            </button>
          )}
          
          {/* Contenido con scroll automático si es necesario */}
          {scrollable ? (
            <div className={styles.dialogBody}>
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </>
    );
  }
);

DialogContainer.displayName = 'DialogContainer';
