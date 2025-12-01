'use client';

import React from 'react';
import { BGPattern } from './BGPattern';
import styles from './InteractiveBackground.module.scss';

interface InteractiveBackgroundProps {
  variant?: 'dots' | 'diagonal-stripes' | 'grid' | 'horizontal-lines' | 'vertical-lines' | 'checkerboard';
  mask?: 'fade-center' | 'fade-edges' | 'fade-top' | 'fade-bottom' | 'fade-left' | 'fade-right' | 'fade-x' | 'fade-y' | 'none';
  size?: number;
  className?: string;
}

export const InteractiveBackground: React.FC<InteractiveBackgroundProps> = ({
  variant = 'vertical-lines',
  mask = 'none',
  size = 32,
  className = '',
}) => {
  return (
    <div className={`${styles.bgContainer} ${className}`}>
      <BGPattern
        variant={variant}
        mask={mask}
        size={size}
      />
    </div>
  );
};

InteractiveBackground.displayName = 'InteractiveBackground';
