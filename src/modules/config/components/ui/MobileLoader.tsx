'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from './MobileLoader.module.scss';

/**
 * Loader simple centrado para viewports móviles
 * Visible solo en pantallas < 768px
 */
export const MobileLoader: React.FC = () => {
  return (
    <div className={styles.mobileLoader}>
      <motion.div
        className={styles.spinner}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="20"
            cy="20"
            r="18"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="90 30"
            opacity="0.3"
          />
          <circle
            cx="20"
            cy="20"
            r="18"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="30 90"
          />
        </svg>
      </motion.div>
      <motion.p
        className={styles.loadingText}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Cargando configuración...
      </motion.p>
    </div>
  );
};
