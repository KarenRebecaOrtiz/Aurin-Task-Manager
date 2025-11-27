'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
  const alignClasses = {
    left: 'text-left',
    center: 'text-center sm:text-left',
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 px-6 py-4 pt-5',
        bordered && 'border-b',
        alignClasses[align],
        className
      )}
    >
      {title && (
        <h2 className="text-lg leading-none font-semibold">
          {title}
        </h2>
      )}
      
      {description && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {children}
    </div>
  );
}
