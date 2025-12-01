'use client';

import { ReactNode } from 'react';
import styles from './DialogHeader.module.scss';

export interface DialogHeaderProps {
  /**
   * Título principal del modal
   */
  title?: string;
  
  /**
   * Descripción opcional del modal
   */
  description?: string;
  
  /**
   * Contenido personalizado para el header
   */
  children?: ReactNode;
  
  /**
   * Clases CSS adicionales
   */
  className?: string;
  
  /**
   * Si debe mostrar el border inferior (patrón shadcn)
   */
  bordered?: boolean;
  
  /**
   * Alineación del contenido
   */
  align?: 'left' | 'center';
}

/**
 * Header estandarizado para dialogs - Sin dependencias externas
 */
export function DialogHeader({
  title,
  description,
  children,
  className,
  bordered = true,
  align = 'left',
}: DialogHeaderProps) {
  const alignClass = align === 'center' ? styles.alignCenter : styles.alignLeft;

  const headerClasses = [
    styles.header,
    bordered && styles.bordered,
    alignClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={headerClasses}>
      {title && (
        <h2 className={styles.title}>
          {title}
        </h2>
      )}
      
      {description && (
        <p className={styles.description}>
          {description}
        </p>
      )}
      
      {children}
    </div>
  );
}
