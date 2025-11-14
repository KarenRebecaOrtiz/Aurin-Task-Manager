'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './CrystalButton.module.scss';

export type CrystalButtonVariant = 'primary' | 'secondary' | 'filter' | 'action' | 'view';
export type CrystalButtonSize = 'small' | 'medium' | 'large';

export interface CrystalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CrystalButtonVariant;
  size?: CrystalButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  loading?: boolean;
  animate?: boolean;
  children?: React.ReactNode;
}

export const CrystalButton: React.FC<CrystalButtonProps> = ({
  variant = 'secondary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  iconOnly = false,
  loading = false,
  animate = true,
  children,
  className = '',
  onClick,
  disabled,
  ...rest
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick && !disabled && !loading) {
        onClick(e);
      }
    },
    [onClick, disabled, loading]
  );

  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    iconOnly && styles.iconOnly,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const buttonContent = (
    <>
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Image
              src={icon}
              alt=""
              width={16}
              height={16}
              className={styles.icon}
              draggable="false"
            />
          )}
          {!iconOnly && children && <span className={styles.text}>{children}</span>}
          {icon && iconPosition === 'right' && (
            <Image
              src={icon}
              alt=""
              width={16}
              height={16}
              className={styles.icon}
              draggable="false"
            />
          )}
        </>
      )}
    </>
  );

  if (animate) {
    return (
      <motion.button
        className={buttonClasses}
        onClick={handleClick}
        disabled={disabled || loading}
        whileTap={{ scale: 0.95, opacity: 0.8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        {...(rest as any)} // Type assertion to fix motion.button type conflicts
      >
        {buttonContent}
      </motion.button>
    );
  }

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      {...rest}
    >
      {buttonContent}
    </button>
  );
};

export default CrystalButton;
