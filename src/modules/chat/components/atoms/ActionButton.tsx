/**
 * InputChat Module - Action Button Atom
 *
 * Generic action button for toolbar and input actions
 * @module chat/components/atoms/ActionButton
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ActionButtonProps {
  icon: string;
  alt: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  className?: string;
  type?: 'button' | 'submit';
  variant?: 'default' | 'primary' | 'danger';
}

const variantStyles = {
  default: 'hover:bg-gray-100 active:bg-gray-200',
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  danger: 'hover:bg-red-50 active:bg-red-100',
};

/**
 * ActionButton - Reusable button for actions
 *
 * Features:
 * - Icon display
 * - Active state styling
 * - Disabled state
 * - Motion animations
 * - Multiple variants
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  alt,
  onClick,
  disabled = false,
  active = false,
  title,
  className = '',
  type = 'button',
  variant = 'default',
}) => {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={alt}
      data-active={active}
      className={cn(
        'p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        active && variant === 'default' && 'bg-gray-200',
        className
      )}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <Image
        src={icon}
        alt={alt}
        width={16}
        height={16}
        draggable={false}
        className={variant === 'primary' ? 'filter brightness-0 invert' : ''}
      />
    </motion.button>
  );
};

ActionButton.displayName = 'ActionButton';
