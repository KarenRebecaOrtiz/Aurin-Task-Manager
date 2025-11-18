'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PopupLoader.module.scss';

interface PopupLoaderProps {
  isOpen: boolean;
  title: string;
  description: string;
  onComplete?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const PopupLoader: React.FC<PopupLoaderProps> = ({
  isOpen,
  title,
  description,
  onComplete,
  autoClose = true,
  autoCloseDelay = 2000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setProgress(0);
      
      // Simular progreso del loader
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 15 + 5; // Incremento aleatorio entre 5-20
        });
      }, 200);

      // Auto-cerrar después del delay
      if (autoClose) {
        const closeTimer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => {
            onComplete?.();
          }, 300); // Esperar a que termine la animación de salida
        }, autoCloseDelay);

        return () => {
          clearTimeout(closeTimer);
          clearInterval(progressInterval);
        };
      }

      return () => clearInterval(progressInterval);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, autoClose, autoCloseDelay, onComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.popupLoaderOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className={styles.popupLoader}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className={styles.popupLoaderContent}>
              <div className={styles.popupLoaderText}>
                <motion.h2
                  className={styles.popupLoaderTitle}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  {title}
                </motion.h2>
                <motion.p
                  className={styles.popupLoaderDescription}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  {description}
                </motion.p>
              </div>
              
              <div className={styles.popupLoaderActions}>
                <motion.div
                  className={styles.loaderContainer}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <div className={styles.spinner}>
                    <div className={styles.spinnerInner} />
                  </div>
                  
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                      <motion.div
                        className={styles.progressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    </div>
                    <span className={styles.progressText}>{Math.round(progress)}%</span>
                  </div>
                  
                  <p className={styles.processingText}>
                    Procesando...
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PopupLoader;
