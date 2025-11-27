'use client';

import { motion } from 'framer-motion';
import { DialogSpinner } from './DialogSpinner';
import { cn } from '@/lib/utils';

export interface DialogLoadingStateProps {
  message?: string;
  spinnerSize?: 'sm' | 'md' | 'lg';
  variant?: 'blue' | 'gray' | 'primary';
  className?: string;
}

export function DialogLoadingState({
  message = 'Cargando...',
  spinnerSize = 'md',
  variant = 'blue',
  className,
}: DialogLoadingStateProps) {
  return (
    <motion.div
      className={cn(
        'flex items-center justify-center h-full min-h-[300px]',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col items-center gap-4">
        <DialogSpinner size={spinnerSize} variant={variant} />
        {message && (
          <motion.p
            className="text-sm text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {message}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
