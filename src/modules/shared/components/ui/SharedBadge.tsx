import React from 'react';
import { Globe } from 'lucide-react';
import styles from './SharedBadge.module.scss';

interface SharedBadgeProps {
  /**
   * Si es true, muestra solo el icono sin texto
   * Útil para espacios reducidos como cards de Kanban
   */
  iconOnly?: boolean;

  /**
   * Texto personalizado para el badge
   * Por defecto: "Compartida"
   */
  text?: string;

  /**
   * Título tooltip que aparece al hacer hover
   * Por defecto: "Esta tarea está compartida públicamente"
   */
  title?: string;

  /**
   * Tamaño del icono en píxeles
   * Por defecto: 12
   */
  iconSize?: number;

  /**
   * Clase CSS adicional para personalización
   */
  className?: string;
}

/**
 * Badge reutilizable que indica que una tarea está compartida públicamente
 *
 * Uso:
 * ```tsx
 * <SharedBadge /> // Badge completo con texto
 * <SharedBadge iconOnly /> // Solo icono, sin texto
 * <SharedBadge text="Público" iconSize={14} /> // Personalizado
 * ```
 */
export const SharedBadge: React.FC<SharedBadgeProps> = ({
  iconOnly = false,
  text = 'Compartida',
  title = 'Esta tarea está compartida públicamente',
  iconSize = 12,
  className = '',
}) => {
  return (
    <span
      className={`${styles.sharedBadge} ${iconOnly ? styles.iconOnly : ''} ${className}`}
      title={title}
    >
      <Globe size={iconSize} />
      {!iconOnly && <span>{text}</span>}
    </span>
  );
};
