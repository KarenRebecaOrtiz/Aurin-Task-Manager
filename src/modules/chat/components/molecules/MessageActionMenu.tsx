"use client";

import React, { useRef, useState, useCallback, useLayoutEffect, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Image from "next/image";
import styles from "../../styles/MessageActionMenu.module.scss";
import type { Message } from "../../types";

interface MessageActionMenuProps {
  message: Message;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  userId: string;
  onCopy: (text: string) => void;
  onEdit: (message: Message) => void;
  onEditTime?: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onDownload?: (message: Message) => void;
}

/**
 * MessageActionMenu - Menú de acciones para mensajes
 * 
 * Implementación basada en el ChatSidebar original con:
 * - Portal rendering para evitar clipping
 * - Posicionamiento dinámico relativo al botón trigger
 * - Animaciones con framer-motion
 * - Click outside para cerrar
 * - Acciones condicionales según tipo de mensaje y propiedad
 */
export const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
  message,
  isOpen,
  onClose,
  triggerRef,
  userId,
  onCopy,
  onEdit,
  onEditTime,
  onDelete,
  onDownload,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isMenuPositioned, setIsMenuPositioned] = useState(false);

  // Actualizar posición del menú relativo al botón trigger
  const updateMenuPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const position = {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      };
      setMenuPosition(position);
    }
  }, [triggerRef]);

  // Posicionar el menú cuando se abre
  useLayoutEffect(() => {
    if (isOpen) {
      updateMenuPosition();
      setIsMenuPositioned(true);
    } else {
      setIsMenuPositioned(false);
    }
  }, [isOpen, updateMenuPosition]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handlers
  const handleCopyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.text) {
      onCopy(message.text);
    }
    onClose();
  }, [message.text, onCopy, onClose]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(message);
    onClose();
  }, [message, onEdit, onClose]);

  const handleEditTimeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditTime) {
      onEditTime(message);
    }
    onClose();
  }, [message, onEditTime, onClose]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(message.id);
    onClose();
  }, [message.id, onDelete, onClose]);

  const handleDownloadClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(message);
    } else {
      // Fallback: descargar directamente
      const url = message.imageUrl || message.fileUrl;
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = message.fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    onClose();
  }, [message, onDownload, onClose]);

  if (!isOpen || !isMenuPositioned) return null;

  const isOwnMessage = message.senderId === userId;
  const hasDownloadable = !!(message.imageUrl || message.fileUrl);

  const menuContent = (
    <motion.div
      className={styles.actionDropdown}
      ref={menuRef}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: menuPosition.top,
        left: menuPosition.left,
        zIndex: 100002,
      }}
    >
      <div className={styles.actionDropdownContent}>
        {/* Copy - Siempre disponible si hay texto */}
        {message.text && (
          <motion.div
            className={`${styles.actionDropdownItem} ${styles.copy}`}
            onClick={handleCopyClick}
            whileTap={{ scale: 0.95, opacity: 0.8 }}
            title="Copiar mensaje"
          >
            <Image src="/copy.svg" alt="Copiar" width={16} height={16} />
          </motion.div>
        )}

        {/* Acciones solo para mensajes propios */}
        {isOwnMessage && (
          <>
            {/* Edit - Solo para mensajes de texto (no time entries) */}
            {!message.hours && (
              <motion.div
                className={`${styles.actionDropdownItem} ${styles.edit}`}
                onClick={handleEditClick}
                whileTap={{ scale: 0.95, opacity: 0.8 }}
                title="Editar mensaje"
              >
                <Image src="/pencil.svg" alt="Editar" width={16} height={16} />
              </motion.div>
            )}

            {/* Edit Time - Solo para time entries */}
            {message.hours && onEditTime && (
              <motion.div
                className={`${styles.actionDropdownItem} ${styles.edit}`}
                onClick={handleEditTimeClick}
                whileTap={{ scale: 0.95, opacity: 0.8 }}
                title="Editar tiempo"
              >
                <Image src="/Clock.svg" alt="Editar tiempo" width={16} height={16} />
              </motion.div>
            )}

            {/* Delete - Siempre disponible para mensajes propios */}
            <motion.div
              className={`${styles.actionDropdownItem} ${styles.delete}`}
              onClick={handleDeleteClick}
              whileTap={{ scale: 0.95, opacity: 0.8 }}
              title="Eliminar mensaje"
            >
              <Image src="/trash-2.svg" alt="Eliminar" width={16} height={16} />
            </motion.div>
          </>
        )}

        {/* Download - Disponible si hay archivos */}
        {hasDownloadable && (
          <motion.div
            className={`${styles.actionDropdownItem} ${styles.copy}`}
            onClick={handleDownloadClick}
            whileTap={{ scale: 0.95, opacity: 0.8 }}
            title="Descargar archivo"
          >
            <Image src="/download.svg" alt="Descargar" width={16} height={16} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  return createPortal(menuContent, document.body);
};
