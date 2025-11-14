'use client';

import React, { useEffect, useRef } from 'react';
import { SquarePlus } from '@/components/animate-ui/icons/square-plus';
import styles from './ButtonIsland.module.scss';

interface ButtonIslandProps {
  text?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'crystal';
  animate?: boolean;
}

export const ButtonIsland: React.FC<ButtonIslandProps> = ({
  text = 'Button',
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  href,
  variant = 'primary',
  animate = false
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const uniqueId = `btn-${variant}-${Math.random().toString(36).substr(2, 9)}`;
  const wrapperClass = `${styles['button-wrapper']} ${styles[`button-wrapper--${variant}`]} ${animate ? 'animate-in' : ''} ${className}`.trim();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const textContainer = wrapper.querySelector('[data-text-container]');
    const iconContainer = wrapper.querySelector('[data-icon-container]');
    
    if (!textContainer || !iconContainer) return;
    
    // Sincronizar hover entre texto e ícono
    const handleEnter = () => wrapper.classList.add('is-hovering');
    const handleLeave = () => wrapper.classList.remove('is-hovering');
    
    textContainer.addEventListener('mouseenter', handleEnter);
    textContainer.addEventListener('mouseleave', handleLeave);
    iconContainer.addEventListener('mouseenter', handleEnter);
    iconContainer.addEventListener('mouseleave', handleLeave);

    // Cleanup
    return () => {
      textContainer.removeEventListener('mouseenter', handleEnter);
      textContainer.removeEventListener('mouseleave', handleLeave);
      iconContainer.removeEventListener('mouseenter', handleEnter);
      iconContainer.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  // Animación de fade-in con IntersectionObserver (solo si animate es true)
  useEffect(() => {
    if (!animate) return;
    
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
    
    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  }); // Removed dependency array to fix the size change error

  const buttonContent = (
    <>
      <div className={styles['button-text']} data-text-container>
        <span>{text}</span>
      </div>
      <div className={styles['button-icon']} data-icon-container>
        <SquarePlus size={22} strokeWidth={2.5} animateOnHover />
      </div>
    </>
  );

  return (
    <div 
      ref={wrapperRef}
      className={wrapperClass} 
      data-button-id={uniqueId} 
      data-button-variant={variant} 
      data-animate-button
    >
      {href ? (
        <a href={href} className={styles['button-container']}>
          {buttonContent}
        </a>
      ) : (
        <button 
          type={type} 
          onClick={onClick}
          disabled={disabled}
          className={styles['button-container']}
        >
          {buttonContent}
        </button>
      )}
    </div>
  );
};

export default ButtonIsland;
