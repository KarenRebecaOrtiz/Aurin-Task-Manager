'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface DialogSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'blue' | 'gray' | 'primary';
}

const sizeClasses = {
  sm: 'h-8 w-8 border-2',
  md: 'h-12 w-12 border-2',
  lg: 'h-16 w-16 border-3',
};

const variantClasses = {
  blue: 'border-blue-600 border-t-transparent',
  gray: 'border-gray-400 border-t-transparent',
  primary: 'border-primary border-t-transparent',
};

export function DialogSpinner({
  size = 'md',
  className,
  variant = 'blue',
}: DialogSpinnerProps) {
  return (
    <motion.div
      className={cn(
        'rounded-full animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      aria-label="Cargando"
      role="status"
    />
  );
}
