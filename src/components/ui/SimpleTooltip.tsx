/**
 * SimpleTooltip Component v2
 *
 * Este componente ha sido refactorizado para eliminar el div contenedor
 * y utilizar un portal de React para renderizar el tooltip, asegurando
 * que siempre aparezca sobre otros elementos sin afectar el layout.
 *
 * Características clave de la refactorización:
 * - Sin div contenedor (`tooltipContainer`) para mantener una estructura HTML limpia.
 * - Usa `React.cloneElement` para añadir handlers directamente al hijo.
 * - Renderiza el tooltip en un portal para evitar problemas de z-index y overflow.
 * - Posicionamiento calculado dinámicamente para centrarse sobre el elemento.
 */

'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './SimpleTooltip.module.scss';

interface SimpleTooltipProps {
  text: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  text,
  children,
  position = 'top',
  delay = 300,
  className = '',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipId = useMemo(() => `tooltip-${Math.random().toString(36).substr(2, 9)}`, []);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      
      let newCoords = { ...coords };

      switch (position) {
        case 'top':
          newCoords = {
            // Posicionar justo encima del elemento trigger
            top: rect.top - 32, // 32px de espacio entre el tooltip y el elemento
            // Centrar horizontalmente en el elemento trigger
            left: rect.left + rect.width / 2,
          };
          break;
        // Agregar casos para 'bottom', 'left', 'right' si es necesario
      }
      setCoords(newCoords);
    }
  }, [position, coords]);

  const showTooltip = useCallback(() => {
    if (disabled || !text) return;

    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  }, [disabled, text, delay, updatePosition]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    // Actualizar posición cuando hay scroll
    const handleScroll = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    // Actualizar posición cuando cambia el tamaño de la ventana
    const handleResize = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible, updatePosition]);

  if (disabled || !text) {
    return children;
  }

  const triggerElement = React.cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // Manejar la ref original del hijo si existe
      const childRef = (children as React.ReactElement & { ref?: unknown }).ref;
      if (typeof childRef === 'function') {
        (childRef as (node: HTMLElement | null) => void)(node);
      } else if (childRef && typeof childRef === 'object' && 'current' in childRef) {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      showTooltip();
      (children.props as { onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void })?.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      hideTooltip();
      (children.props as { onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void })?.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      showTooltip();
      (children.props as { onFocus?: (e: React.FocusEvent<HTMLElement>) => void })?.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      hideTooltip();
      (children.props as { onBlur?: (e: React.FocusEvent<HTMLElement>) => void })?.onBlur?.(e);
    },
    'aria-describedby': isVisible ? tooltipId : undefined,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <>
      {triggerElement}
      {isVisible &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            className={`${styles.tooltip} ${styles[position]} ${className}`}
            style={{
              top: `${coords.top + 40}px`,
              left: `${coords.left}px`,
            }}

          >
            <div className={styles.tooltipContent}>{text}</div>
            <div className={`${styles.tooltipArrow}`} />
          </div>,
          document.body
        )}
    </>
  );
};

export default SimpleTooltip;