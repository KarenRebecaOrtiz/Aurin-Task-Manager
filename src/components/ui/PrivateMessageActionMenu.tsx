'use client';

import { useRef, useEffect, useCallback } from 'react';
import { memo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import styles from '@/modules/tasks/components/ui/ActionMenu.module.scss';
import { useActionMenuStore } from '@/stores/actionMenuStore';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/types';

interface PrivateMessageActionMenuProps {
  message: Message;
  userId?: string;
  onEdit?: () => void;
  onDelete: () => void;
  onResend?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  animateClick: (element: HTMLElement) => void;
  actionMenuRef: React.RefObject<HTMLDivElement>;
  actionButtonRef: (el: HTMLButtonElement | null) => void;
}

const PrivateMessageActionMenu = memo<PrivateMessageActionMenuProps>(({
  message,
  userId,
  onEdit,
  onDelete,
  onResend,
  onCopy,
  onDownload,
  animateClick,
  actionMenuRef,
  actionButtonRef
}: PrivateMessageActionMenuProps) => {
  const isOwner = userId && message.senderId === userId;
  const canEditOrDelete = isOwner;
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Selectors optimizados con shallow
  const { 
    openMenuId, 
    dropdownPositions, 
    setOpenMenuId,
    setDropdownPosition
  } = useActionMenuStore(
    useShallow(state => ({
      openMenuId: state.openMenuId,
      dropdownPositions: state.dropdownPositions,
      setOpenMenuId: state.setOpenMenuId,
      setDropdownPosition: state.setDropdownPosition
    }))
  );

  const isOpen = openMenuId === message.id;
  const dropdownPosition = dropdownPositions[message.id] || { top: 0, left: 0 };

  // Memoizar handlers
  const handleDropdownPosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const dropdownWidth = 64;
      const buttonCenter = rect.left + (rect.width / 2);
      const dropdownLeft = buttonCenter - (dropdownWidth / 2);

      setDropdownPosition(message.id, {
        top: rect.bottom + scrollY + 8,
        left: dropdownLeft + scrollX,
      });
    }
  }, [isOpen, message.id, setDropdownPosition]);

  const handleOpen = useCallback(() => {
    setOpenMenuId(isOpen ? null : message.id);
  }, [isOpen, message.id, setOpenMenuId]);

  // Efectos optimizados
  useEffect(() => {
    handleDropdownPosition();
  }, [handleDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node)
      ) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setOpenMenuId, actionMenuRef]);

  return (
    <div className={styles.actionContainer}>
      <button
        ref={(el) => {
          buttonRef.current = el;
          actionButtonRef(el);
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        className={styles.actionButton}
        aria-label="Abrir acciones"
      >
        <Image 
          src="/elipsis.svg" 
          alt="Actions" 
          width={16} 
          height={16} 
          style={{ width: 'auto', height: 'auto' }} 
        />
      </button>
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div 
            ref={actionMenuRef} 
            className={styles.dropdown}
            style={{ 
              top: dropdownPosition.top, 
              left: dropdownPosition.left,
              width: '80px'
            }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {!message.hasError && onEdit && canEditOrDelete && (
              <div
                className={`${styles.dropdownItem} ${styles.edit}`}
                onClick={(e) => {
                  e.stopPropagation();
                  animateClick(e.currentTarget);
                  onEdit();
                  setOpenMenuId(null);
                }}
                title="Editar Mensaje"
              >
                <Image 
                  src="/pencil.svg" 
                  alt="Editar" 
                  width={16} 
                  height={16} 
                />
              </div>
            )}
            
            {message.hasError && onResend && (
              <div
                className={`${styles.dropdownItem} ${styles.copy}`}
                onClick={(e) => {
                  e.stopPropagation();
                  animateClick(e.currentTarget);
                  onResend();
                  setOpenMenuId(null);
                }}
                title="Reintentar Envío"
              >
                <Image 
                  src="/refresh-cw.svg" 
                  alt="Reintentar" 
                  width={16} 
                  height={16} 
                />
              </div>
            )}
            
            {message.text && message.text.trim() && onCopy && (
              <div
                className={`${styles.dropdownItem} ${styles.copy}`}
                onClick={(e) => {
                  e.stopPropagation();
                  animateClick(e.currentTarget);
                  onCopy();
                  setOpenMenuId(null);
                }}
                title="Copiar Mensaje"
              >
                <Image 
                  src="/copy.svg" 
                  alt="Copiar" 
                  width={16} 
                  height={16} 
                />
              </div>
            )}
            
            {(message.imageUrl || message.fileUrl) && onDownload && (
              <div
                className={`${styles.dropdownItem} ${styles.copy}`}
                onClick={(e) => {
                  e.stopPropagation();
                  animateClick(e.currentTarget);
                  onDownload();
                  setOpenMenuId(null);
                }}
                title="Descargar Archivo"
              >
                <Image 
                  src="/download.svg" 
                  alt="Descargar" 
                  width={16} 
                  height={16} 
                />
              </div>
            )}
            
            {canEditOrDelete && (
              <div
                className={`${styles.dropdownItem} ${styles.deleteItem}`}
                onClick={(e) => {
                  e.stopPropagation();
                  animateClick(e.currentTarget);
                  onDelete();
                  setOpenMenuId(null);
                }}
                title="Eliminar Mensaje"
              >
                <Image 
                  src="/trash-2.svg" 
                  alt="Eliminar" 
                  width={16} 
                  height={16} 
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}, (prevProps: PrivateMessageActionMenuProps, nextProps: PrivateMessageActionMenuProps) => {
  // Optimizar re-renders con comparación profunda
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.hasError === nextProps.message.hasError &&
    prevProps.userId === nextProps.userId &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onResend === nextProps.onResend &&
    prevProps.onCopy === nextProps.onCopy &&
    prevProps.onDownload === nextProps.onDownload
  );
});

PrivateMessageActionMenu.displayName = 'PrivateMessageActionMenu';

export default PrivateMessageActionMenu; 