'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import styles from './NoteBubble.module.scss';

interface NoteBubbleProps {
  content: string;
  className?: string;
}

export function NoteBubble({ content, className }: NoteBubbleProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cn('relative', className)}
    >
      {/* Main bubble */}
      <div className={cn('relative', styles.bubble)}>
        <p className={styles.text}>
          {content}
        </p>
      </div>

      {/* Tail/arrow pointing down */}
      <div className={styles.tail}>
        <div className={styles.tailArrow} />
      </div>
    </motion.div>
  );
}
