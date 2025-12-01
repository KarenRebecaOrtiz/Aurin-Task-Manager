'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/buttons';
import { cn } from '@/lib/utils';

export interface DialogErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function DialogErrorState({
  title = 'Error',
  message,
  onRetry,
  retryText = 'Reintentar',
  icon,
  className,
}: DialogErrorStateProps) {
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
      <div className="flex flex-col items-center gap-4 max-w-md px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-full bg-destructive/10 p-3"
        >
          {icon || <AlertCircle className="h-8 w-8 text-destructive" />}
        </motion.div>

        <div className="space-y-2">
          <motion.h3
            className="text-lg font-semibold text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {title}
          </motion.h3>
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {message}
          </motion.p>
        </div>

        {onRetry && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Button onClick={onRetry} intent="primary" size="lg">
              {retryText}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
