'use client';
import { useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './Button.module.scss';

const ThemeToggler = memo(() => {
  const { isDarkMode, toggleTheme } = useTheme();

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <div
      data-layer="sun-moon"
      className={styles.sunMoon}
    >
      <motion.label
        className="label"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          cursor: 'pointer',
          color: isDarkMode ? '#ffffff' : '#394a56',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          perspective: 1000,
        }}
        whileHover={{ 
          scale: 1.02,
          transition: { duration: 0.12, ease: "easeOut" }
        }}
        whileTap={{ 
          scale: 0.98,
          transition: { duration: 0.08, ease: "easeOut" }
        }}
        transition={{ duration: 0.12, ease: "easeOut" }}
      >
        <motion.div
          className="toggle"
          style={{
            isolation: 'isolate',
            position: 'relative',
            height: '30px',
            width: '60px',
            borderRadius: '15px',
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
            duration: 0.3, 
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
              borderRadius: '15px',
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
              duration: 0.3, 
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