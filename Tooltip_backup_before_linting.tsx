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
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipId = useRef(`tooltip-${tooltipCounter++}`);

  const handleMouseEnter = () => {
    if (triggerRef.current && content) {
      // Cerrar cualquier tooltip activo
      if (activeTooltip && activeTooltip !== tooltipId.current) {
        const event = new Event('tooltip-close');
        document.dispatchEvent(event);
      }

      activeTooltip = tooltipId.current;
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - sideOffset,
        left: rect.left + rect.width / 2 - 120, // Moved 70px to the left, then 50px more
      });
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
    if (activeTooltip === tooltipId.current) {
      activeTooltip = null;
    }
  };

  const handleTooltipClose = () => {
    if (activeTooltip !== tooltipId.current) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('tooltip-close', handleTooltipClose);
    return () => {
      document.removeEventListener('tooltip-close', handleTooltipClose);
    };
  }, []);

  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleMouseEnter,
    onBlur: handleMouseLeave,
  });

  return (
    <>
      {trigger}
      {content && typeof document !== 'undefined' && ReactDOM.createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className={styles.tooltipContent}
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: 'translateX(-50%)',
                zIndex: 1000,
                pointerEvents: 'none',
              }}
            >
              {content}
              <div 
                className={styles.tooltipArrow}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default Tooltip;