import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './NotificationDot.module.scss';

interface NotificationDotProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'pulse' | 'bounce';
  className?: string;
  showCount?: boolean;
  maxCount?: number;
}

export const NotificationDot: React.FC<NotificationDotProps> = ({
  count,
  size = 'medium',
  variant = 'default',
  className = '',
  showCount = true,
  maxCount = 99,
}) => {
  const displayCount = useMemo(() => {
    if (!showCount) return '';
    return count > maxCount ? `${maxCount}+` : count.toString();
  }, [count, showCount, maxCount]);

  const shouldShow = count > 0;

  const sizeClasses = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  const variantClasses = {
    default: styles.default,
    pulse: styles.pulse,
    bounce: styles.bounce,
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className={`${styles.notificationDot} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {showCount && (
            <motion.span
              className={styles.count}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1, delay: 0.1 }}
            >
              {displayCount}
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDot; 