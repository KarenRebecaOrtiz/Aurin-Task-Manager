'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './SaveActions.module.scss';

interface SaveActionsProps {
  /** Si hay cambios sin guardar */
  hasChanges: boolean;
  /** Si está guardando */
  isSaving: boolean;
  /** Callback para guardar */
  onSave: () => void;
  /** Callback para descartar */
  onDiscard: () => void;
  /** Si está deshabilitado */
  disabled?: boolean;
}

const buttonVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};

/**
 * Componente para los botones de guardar y descartar cambios
 */
export const SaveActions: React.FC<SaveActionsProps> = ({
  hasChanges,
  isSaving,
  onSave,
  onDiscard,
  disabled = false,
}) => {
  return (
    <AnimatePresence>
      {hasChanges && (
        <motion.div
          className={styles.container}
          variants={buttonVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <button
            type="button"
            className={styles.discardButton}
            onClick={onDiscard}
            disabled={disabled || isSaving}
          >
            Descartar Cambios
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={onSave}
            disabled={disabled || isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
