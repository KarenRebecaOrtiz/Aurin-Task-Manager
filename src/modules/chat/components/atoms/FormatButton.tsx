/**
 * InputChat Module - Format Button Atom
 *
 * Text formatting button for rich editor toolbar
 * @module chat/components/atoms/FormatButton
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface FormatButtonProps {
  icon: string;
  alt: string;
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  title?: string;
}

/**
 * FormatButton - Text formatting button
 *
 * Features:
 * - Active state highlighting
 * - Disabled state
 * - Tooltip on hover
 * - Motion animations
 */
export const FormatButton: React.FC<FormatButtonProps> = ({
  icon,
  alt,
  onClick,
  active,
  disabled = false,
  title,
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-active={active}
      title={title}
      aria-label={alt}
      className={cn(
        'p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        active ? 'bg-gray-200' : 'hover:bg-gray-100'
      )}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <Image
        src={icon}
        alt={alt}
        width={16}
        height={16}
        draggable={false}
        className="filter-none"
      />
    </motion.button>
  );
};

FormatButton.displayName = 'FormatButton';
