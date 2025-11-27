// TODO: Wrapper con overlay, estados y animaciones
// TODO: Props: isOpen, onClose, children, isLoading, error
// TODO: Manejar createPortal para renderizar en document.body
// TODO: AnimatePresence para animaciones de entrada/salida
// TODO: Estados de loading y error con UI específica
// TODO: Overlay con backdrop blur
// TODO: Handlers para click outside (onClose)

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { DialogHeader } from '@/modules/shared/components/molecules';
import {
  backdropVariants,
  panelVariants,
  transitions,
} from '@/modules/dialogs';
import styles from './ProfileCardWrapper.module.scss';

interface ProfileCardWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  isLoading?: boolean;
  error?: Error;
  userId?: string;
  currentUserId?: string;
}

export const ProfileCardWrapper: React.FC<ProfileCardWrapperProps> = ({
  isOpen,
  onClose,
  children,
  isLoading,
  error,
  userId,
  currentUserId,
}) => {
  // TODO: Handler para cerrar al hacer click en overlay
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClose();
    },
    [onClose]
  );

  // TODO: Handler para prevenir propagación en el card
  const handleStopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // TODO: Estado de loading
  if (isLoading) {
    return createPortal(
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className={styles.overlay}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transitions.fast}
            onClick={handleOverlayClick}
            onMouseDown={handleStopPropagation}
          >
            <motion.div
              className={styles.card}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transitions.normal}
              onClick={handleStopPropagation}
            >
              <div className={styles.loadingContainer}>
                <p>Cargando perfil...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  // TODO: Estado de error
  if (error) {
    return createPortal(
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            className={styles.overlay}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transitions.fast}
            onClick={handleOverlayClick}
            onMouseDown={handleStopPropagation}
          >
            <motion.div
              className={styles.card}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transitions.normal}
              onClick={handleStopPropagation}
            >
              <div className={styles.errorContainer}>
                <p>{error.message || 'Perfil no disponible'}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  // TODO: Estado normal con contenido
  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={styles.overlay}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={transitions.fast}
          onClick={handleOverlayClick}
          onMouseDown={handleStopPropagation}
        >
          <motion.div
            className={styles.card}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transitions.normal}
            onClick={handleStopPropagation}
          >
            {/* TODO: DialogHeader con título dinámico según usuario */}
            <DialogHeader
              title={userId === currentUserId ? "Mi Perfil" : "Perfil Público"}
              description={userId === currentUserId ? "Vista previa de tu información compartida." : "Información de contacto y experiencia."}
            />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
