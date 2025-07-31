'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './Tooltip.module.scss';

interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  sideOffset?: number;
}

// Variable global para rastrear el tooltip activo
let activeTooltip: string | null = null;
let tooltipCounter = 0;

const Tooltip: React.FC<TooltipProps> = ({ children, content, sideOffset = 38 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipId = useRef(`tooltip-${tooltipCounter++}`);

  const showTooltip = (target: HTMLElement) => {
    if (target && content) {
      // Cerrar cualquier tooltip activo
      if (activeTooltip && activeTooltip !== tooltipId.current) {
        const closeEvent = new Event('tooltip-close');
        document.dispatchEvent(closeEvent);
      }
      
      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.top - sideOffset,
        left: rect.left + rect.width / 2 - 120,
      });
      setIsOpen(true);
      activeTooltip = tooltipId.current;
    }
  };

  const hideTooltip = () => {
    setIsOpen(false);
    if (activeTooltip === tooltipId.current) {
      activeTooltip = null;
    }
  };

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    showTooltip(event.currentTarget);
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
    showTooltip(event.currentTarget);
  };

  const handleBlur = () => {
    hideTooltip();
  };

  useEffect(() => {
    const handleTooltipClose = () => {
      setIsOpen(false);
      if (activeTooltip === tooltipId.current) {
        activeTooltip = null;
      }
    };

    document.addEventListener('tooltip-close', handleTooltipClose);
    
    return () => {
      document.removeEventListener('tooltip-close', handleTooltipClose);
    };
  }, []);

  return (
    <>
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{ display: 'contents' }}
      >
        {children}
      </span>
      {typeof document !== 'undefined' && content && ReactDOM.createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className={styles.tooltipContent}
              style={{
                top: position.top,
                left: position.left,
                transform: 'translateX(-50%) translateY(-100%)',
              }}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {content}
              <div className={styles.tooltipArrow} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default Tooltip;
