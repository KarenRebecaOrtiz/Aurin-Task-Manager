'use client';

import { motion } from 'framer-motion';
import { DialogSpinner } from './DialogSpinner';
import { TextShimmer } from '@/modules/header';
import styles from './DialogLoadingState.module.scss';

export interface DialogLoadingStateProps {
  /** Legacy single message (backward compatible) */
  message?: string;
  /** Bold heading above the shimmer text */
  heading?: string;
  /** Shimmer-animated subheading below the heading */
  subheading?: string;
  /** Helpful note/tip shown at the bottom */
  note?: string;
  spinnerSize?: 'sm' | 'md' | 'lg';
  variant?: 'blue' | 'gray' | 'primary';
  className?: string;
}

export function DialogLoadingState({
  message,
  heading,
  subheading,
  note,
  spinnerSize = 'md',
  variant = 'blue',
  className,
}: DialogLoadingStateProps) {
  const hasRichContent = heading || subheading;

  return (
    <motion.div
      className={`${styles.container} ${className || ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.inner}>
        <DialogSpinner size={spinnerSize} variant={variant} />

        {hasRichContent ? (
          <motion.div
            className={styles.textGroup}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {heading && (
              <h3 className={styles.heading}>{heading}</h3>
            )}
            {subheading && (
              <TextShimmer
                as="p"
                className={styles.subheading}
                duration={1.8}
                spread={1.5}
              >
                {subheading}
              </TextShimmer>
            )}
          </motion.div>
        ) : message ? (
          <motion.p
            className={styles.legacyMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {message}
          </motion.p>
        ) : null}

        {note && (
          <motion.p
            className={styles.note}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {note}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
