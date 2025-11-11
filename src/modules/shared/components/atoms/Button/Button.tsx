'use client';

import React, { useCallback } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'filter' | 'action' | 'view';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  loading?: boolean;
  animate?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
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
      if (animate && e.currentTarget) {
        gsap.to(e.currentTarget, {
          scale: 0.95,
          opacity: 0.8,
          duration: 0.15,
          ease: 'power1.out',
          yoyo: true,
          repeat: 1,
        });
      }

      if (onClick && !disabled && !loading) {
        onClick(e);
      }
    },
    [onClick, disabled, loading, animate]
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

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      {...rest}
    >
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
    </button>
  );
};
