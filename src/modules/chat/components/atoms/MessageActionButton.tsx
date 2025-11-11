"use client";

import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import styles from "../../styles/MessageActionButton.module.scss";

interface MessageActionButtonProps {
  onClick: (e: React.MouseEvent) => void;
  isActive?: boolean;
}

/**
 * MessageActionButton - Botón para abrir el menú de acciones
 * 
 * Botón con animación que abre el menú de acciones de un mensaje.
 * Usa forwardRef para permitir que el padre obtenga la referencia del botón.
 */
export const MessageActionButton = forwardRef<HTMLButtonElement, MessageActionButtonProps>(
  ({ onClick, isActive = false }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={`${styles.actionButton} ${isActive ? styles.active : ''}`}
        onClick={onClick}
        whileTap={{ scale: 0.95, opacity: 0.8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        aria-label="Opciones del mensaje"
      >
        <Image src="/elipsis.svg" alt="Opciones" width={16} height={16} />
      </motion.button>
    );
  }
);

MessageActionButton.displayName = "MessageActionButton";
