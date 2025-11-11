"use client";

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import styles from "../../styles/ActionDropdown.module.scss";
import type { Message } from "../../types";

interface ActionDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  message: Message;
  userId: string;
  onCopy: (text: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: Message) => void;
  onDownload: (message: Message) => void;
}

/**
 * ActionDropdown - Menú contextual de acciones para mensajes
 * Renderizado en portal para evitar clipping
 */
export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  message,
  userId,
  onCopy,
  onEdit,
  onDelete,
  onReply,
  onDownload,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Posicionar el menú relativo al botón trigger
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen, triggerRef]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      const clickedOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);

      if (clickedOutsideMenu && clickedOutsideTrigger) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const isOwnMessage = message.senderId === userId;
  const hasDownloadable = !!(message.imageUrl || message.fileUrl);

  const dropdownContent = (
    <div
      ref={menuRef}
      className={styles.dropdown}
      style={{ top: menuPosition.top, left: menuPosition.left }}
    >
      {/* Reply */}
      <button
        onClick={() => {
          onReply(message);
          onClose();
        }}
        className={styles.menuItem}
      >
        <Image src="/Reply.svg" alt="Reply" width={16} height={16} />
        <span>Responder</span>
      </button>

      {/* Copy */}
      {message.text && (
        <button
          onClick={() => {
            onCopy(message.text!);
            onClose();
          }}
          className={styles.menuItem}
        >
          <Image src="/Copy.svg" alt="Copy" width={16} height={16} />
          <span>Copiar</span>
        </button>
      )}

      {/* Edit (solo mensajes propios) */}
      {isOwnMessage && (
        <button
          onClick={() => {
            onEdit(message);
            onClose();
          }}
          className={styles.menuItem}
        >
          <Image src="/Edit.svg" alt="Edit" width={16} height={16} />
          <span>Editar</span>
        </button>
      )}

      {/* Download (si tiene archivos) */}
      {hasDownloadable && (
        <button
          onClick={() => {
            onDownload(message);
            onClose();
          }}
          className={styles.menuItem}
        >
          <Image src="/Download.svg" alt="Download" width={16} height={16} />
          <span>Descargar</span>
        </button>
      )}

      {/* Delete (solo mensajes propios) */}
      {isOwnMessage && (
        <button
          onClick={() => {
            onDelete(message.id);
            onClose();
          }}
          className={`${styles.menuItem} ${styles.danger}`}
        >
          <Image src="/Trash.svg" alt="Delete" width={16} height={16} />
          <span>Eliminar</span>
        </button>
      )}
    </div>
  );

  return createPortal(dropdownContent, document.body);
};
