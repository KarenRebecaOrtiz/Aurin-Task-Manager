'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Eye, 
  CheckCheck, 
  XCircle,
  Signal,
  SignalHigh,
  SignalMedium,
} from 'lucide-react';

export type StatusType = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done' | 'archived';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  showIcon?: boolean;
}

const statusConfig: Record<StatusType, { label: string; icon: React.ReactNode; className: string }> = {
  backlog: {
    label: 'Backlog',
    icon: <BookOpen size={10} />,
    className: 'bg-slate-100 text-slate-700',
  },
  todo: {
    label: 'Por Iniciar',
    icon: <CheckCircle2 size={10} />,
    className: 'bg-blue-100 text-blue-700',
  },
  'in-progress': {
    label: 'En Proceso',
    icon: <Clock size={10} />,
    className: 'bg-amber-100 text-amber-700',
  },
  'in-review': {
    label: 'Por Finalizar',
    icon: <Eye size={10} />,
    className: 'bg-purple-100 text-purple-700',
  },
  done: {
    label: 'Finalizado',
    icon: <CheckCheck size={10} />,
    className: 'bg-emerald-100 text-emerald-700',
  },
  archived: {
    label: 'Cancelado',
    icon: <XCircle size={10} />,
    className: 'bg-red-100 text-red-700',
  },
};

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, showIcon = true, className }, ref) => {
    const config = statusConfig[status];
    const baseClasses = 'inline-flex items-center gap-2 px-5 py-3 rounded-md text-sm font-medium border border-transparent transition-colors';

    return (
      <motion.span
        ref={ref}
        className={cn(baseClasses, config.className, className)}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {showIcon && (
          <motion.span 
            className="flex items-center justify-center flex-shrink-0"
            whileHover={{ rotate: 12, scale: 1.15 }}
            transition={{ duration: 0.2 }}
          >
            {config.icon}
          </motion.span>
        )}
        <span className="leading-none">{config.label}</span>
      </motion.span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
