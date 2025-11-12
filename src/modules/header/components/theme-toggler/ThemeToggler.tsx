'use client';
import { useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useThemeToggler } from './hooks';
import { THEME_TOGGLER_ANIMATIONS, THEME_TOGGLER_DIMENSIONS } from './constants';
import { ThemeTogglerProps } from './types';
import styles from './ThemeToggler.module.scss';

const ThemeToggler = memo<ThemeTogglerProps>(({ 
  variant = 'default',
  size = 'md',
  className,
  onThemeChange,
  disabled = false,
}) => {
  const { isDarkMode, toggleTheme } = useThemeToggler(onThemeChange);

  const handleToggleTheme = useCallback(() => {
    if (!disabled) {
      toggleTheme();
    }
  }, [toggleTheme, disabled]);

  const dimensions = THEME_TOGGLER_DIMENSIONS[variant.toUpperCase() as keyof typeof THEME_TOGGLER_DIMENSIONS] || THEME_TOGGLER_DIMENSIONS.DEFAULT;
  
  const sizeScale = size === 'sm' ? 0.8 : size === 'lg' ? 1.2 : 1;

  return (
    <div
      data-layer="sun-moon"
      className={cn(
        styles.sunMoon,
        variant === 'dropdown' && styles.dropdownThemeToggler,
        className
      )}
      style={{ transform: `scale(${sizeScale})` }}
    >
      <motion.label
        className="label"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: isDarkMode ? '#ffffff' : '#394a56',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          perspective: 1000,
          opacity: disabled ? 0.5 : 1,
        }}
        whileHover={!disabled ? { 
          scale: THEME_TOGGLER_ANIMATIONS.HOVER_SCALE,
          transition: { duration: THEME_TOGGLER_ANIMATIONS.HOVER_DURATION, ease: "easeOut" }
        } : {}}
        whileTap={!disabled ? { 
          scale: THEME_TOGGLER_ANIMATIONS.TAP_SCALE,
          transition: { duration: THEME_TOGGLER_ANIMATIONS.TAP_DURATION, ease: "easeOut" }
        } : {}}
        transition={{ duration: THEME_TOGGLER_ANIMATIONS.HOVER_DURATION, ease: "easeOut" }}
      >
        <motion.div
          className="toggle"
          style={{
            isolation: 'isolate',
            position: 'relative',
            height: `${dimensions.HEIGHT}px`,
            width: `${dimensions.WIDTH}px`,
            borderRadius: `${dimensions.BORDER_RADIUS}px`,
            overflow: 'hidden',
            willChange: 'box-shadow',
            backfaceVisibility: 'hidden',
            boxShadow: isDarkMode
              ? '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.05), inset -4px -4px 8px rgba(0, 0, 0, 0.4), inset 4px 4px 8px rgba(255, 255, 255, 0.03)'
              : '-8px -4px 8px 0px #ffffff, 8px 4px 12px 0px #d1d9e6, 4px 4px 4px 0px #d1d9e6 inset, -4px -4px 4px 0px #ffffff inset',
          }}
          animate={{
            boxShadow: isDarkMode
              ? '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.05), inset -4px -4px 8px rgba(0, 0, 0, 0.4), inset 4px 4px 8px rgba(255, 255, 255, 0.03)'
              : '-8px -4px 8px 0px #ffffff, 8px 4px 12px 0px #d1d9e6, 4px 4px 4px 0px #d1d9e6 inset, -4px -4px 4px 0px #ffffff inset',
          }}
          transition={{ 
            duration: THEME_TOGGLER_ANIMATIONS.TRANSITION_DURATION, 
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <input
            className="toggle-state"
            type="checkbox"
            name="check"
            value="check"
            checked={isDarkMode}
            onChange={handleToggleTheme}
            style={{ display: 'none' }}
          />
          <motion.div
            className="indicator"
            style={{
              height: '100%',
              width: '200%',
              background: isDarkMode ? '#1a1a1a' : '#ecf0f3',
              borderRadius: `${dimensions.BORDER_RADIUS}px`,
              willChange: 'transform, background-color',
              transform: 'translate3d(-75%, 0, 0)',
              backfaceVisibility: 'hidden',
              perspective: 1000,
              boxShadow: isDarkMode
                ? '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.05)'
                : '-8px -4px 8px 0px #ffffff, 8px 4px 12px 0px #d1d9e6',
            }}
            animate={{
              x: isDarkMode ? '25%' : '-75%',
              background: isDarkMode ? '#1a1a1a' : '#ecf0f3',
              boxShadow: isDarkMode
                ? '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.05)'
                : '-8px -4px 8px 0px #ffffff, 8px 4px 12px 0px #d1d9e6',
            }}
            transition={{ 
              duration: THEME_TOGGLER_ANIMATIONS.TRANSITION_DURATION, 
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          />
        </motion.div>
      </motion.label>
    </div>
  );
});

ThemeToggler.displayName = 'ThemeToggler';

export default ThemeToggler;
