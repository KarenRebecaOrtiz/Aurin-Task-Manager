/**
 * InputChat Module - Send Button Atom
 *
 * Primary send message button
 * @module chat/components/atoms/SendButton
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SendButtonProps {
  disabled?: boolean;
  isProcessing?: boolean;
  className?: string;
}

/**
 * SendButton - Primary send message button
 *
 * Features:
 * - Loading state with spinner
 * - Disabled state
 * - Motion animations
 * - Blue primary styling
 */
export const SendButton: React.FC<SendButtonProps> = ({
  disabled = false,
  isProcessing = false,
  className = '',
}) => {
  return (
    <motion.button
      type="submit"
      disabled={disabled || isProcessing}
      aria-label="Enviar mensaje"
      className={cn(
        'p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:bg-blue-800 transition-colors',
        className
      )}
      whileHover={!disabled && !isProcessing ? { scale: 1.05 } : undefined}
      whileTap={!disabled && !isProcessing ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {isProcessing ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          className="animate-spin"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            className="opacity-25"
          />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            className="opacity-75"
          />
        </svg>
      ) : (
        <Image
          src="/arrow-up.svg"
          alt="Enviar"
          width={13}
          height={13}
          draggable={false}
        />
      )}
    </motion.button>
  );
};

SendButton.displayName = 'SendButton';
