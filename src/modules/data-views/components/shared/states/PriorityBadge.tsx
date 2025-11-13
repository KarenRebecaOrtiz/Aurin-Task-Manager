'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Signal, SignalHigh, SignalMedium } from 'lucide-react';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { cn } from '@/lib/utils';

export type PriorityType = 'Baja' | 'Media' | 'Alta';

interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: PriorityType;
  showIcon?: boolean;
}

const priorityConfig: Record<PriorityType, { label: string; icon: React.ReactNode; className: string }> = {
  Alta: {
    label: 'Alta',
    icon: <Signal size={14} />,
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
  Media: {
    label: 'Media',
    icon: <SignalHigh size={14} />,
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  Baja: {
    label: 'Baja',
    icon: <SignalMedium size={14} />,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
};

export const PriorityBadge = React.forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ priority, showIcon = true, className }, ref) => {
    const config = priorityConfig[priority];
    const baseClasses = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-transparent transition-colors';

    return (
      <motion.span
        ref={ref}
        className={cn(baseClasses, config.className, className)}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {showIcon && (
          <AnimateIcon animateOnHover>
            <span className="flex items-center justify-center flex-shrink-0">
              {config.icon}
            </span>
          </AnimateIcon>
        )}
        <span className="leading-none">{config.label}</span>
      </motion.span>
    );
  }
);

PriorityBadge.displayName = 'PriorityBadge';
