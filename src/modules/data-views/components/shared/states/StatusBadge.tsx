'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import styles from './StatusBadge.module.scss';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Eye, 
  CheckCheck, 
  XCircle,
} from 'lucide-react';

export type StatusType = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done' | 'archived';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  showIcon?: boolean;
}

const statusConfig: Record<StatusType, { label: string; icon: React.ReactNode; styleClass: string }> = {
  backlog: {
    label: 'Backlog',
    icon: <BookOpen size={10} />,
    styleClass: styles.backlog,
  },
  todo: {
    label: 'Por Iniciar',
    icon: <CheckCircle2 size={10} />,
    styleClass: styles.todo,
  },
  'in-progress': {
    label: 'En Proceso',
    icon: <Clock size={10} />,
    styleClass: styles.inProgress,
  },
  'in-review': {
    label: 'Por Finalizar',
    icon: <Eye size={10} />,
    styleClass: styles.inReview,
  },
  done: {
    label: 'Finalizado',
    icon: <CheckCheck size={10} />,
    styleClass: styles.done,
  },
  archived: {
    label: 'Cancelado',
    icon: <XCircle size={10} />,
    styleClass: styles.archived,
  },
};

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, showIcon = true, className }, ref) => {
    const config = statusConfig[status];

    return (
      <motion.span
        ref={ref}
        className={cn(styles.badge, config.styleClass, className)}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {showIcon && (
          <motion.span 
            className={styles.icon}
            whileHover={{ rotate: 12, scale: 1.15 }}
            transition={{ duration: 0.2 }}
          >
            {config.icon}
          </motion.span>
        )}
        <span className={styles.label}>{config.label}</span>
      </motion.span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
