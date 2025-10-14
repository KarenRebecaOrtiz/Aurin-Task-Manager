'use client';

import { useRef, useEffect, useCallback } from 'react';
import { memo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import styles from './ActionMenu.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import { useActionMenuStore } from '@/stores/actionMenuStore';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';

interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
  CreatedBy?: string;
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

interface ActionMenuProps {
  task: Task;
  userId?: string;
  onEdit: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  animateClick: (element: HTMLElement) => void;
  actionMenuRef: React.RefObject<HTMLDivElement>;
  actionButtonRef: (el: HTMLButtonElement | null) => void;
}

const ActionMenu = memo<ActionMenuProps>(({
  task,
  userId,
  onEdit,
  onDelete,
  onArchive,
  animateClick,
  actionMenuRef,
  actionButtonRef
}: ActionMenuProps) => {
  const { isAdmin } = useAuth();
  const isCreator = userId && task.CreatedBy === userId;
  const canEditOrDelete = isAdmin || isCreator;
  const tooltipText = 'Solo el creador o un administrador pueden editar este elemento';
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Selectors optimizados con shallow
  const { 
    openMenuId, 
    dropdownPositions, 
    tooltipStates,
    setOpenMenuId,
    setDropdownPosition,
    setTooltipState 
  } = useActionMenuStore(
    useShallow(state => ({
      openMenuId: state.openMenuId,
      dropdownPositions: state.dropdownPositions,
      tooltipStates: state.tooltipStates,
      setOpenMenuId: state.setOpenMenuId,
      setDropdownPosition: state.setDropdownPosition,
      setTooltipState: state.setTooltipState
    }))
  );

  const isOpen = openMenuId === task.id;
  const dropdownPosition = dropdownPositions[task.id] || { top: 0, left: 0 };
  const showTooltip = tooltipStates[task.id] || false;

  // Memoizar handlers
  const handleDropdownPosition = useCallback(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const dropdownWidth = 64;
      const buttonCenter = rect.left + (rect.width / 2);
      const dropdownLeft = buttonCenter - (dropdownWidth / 2);

      setDropdownPosition(task.id, {
        top: rect.bottom + scrollY + 8,
        left: dropdownLeft + scrollX,
      });
    }
  }, [isOpen, task.id, setDropdownPosition]);

  const handleOpen = useCallback(() => {
    setOpenMenuId(isOpen ? null : task.id);
  }, [isOpen, task.id, setOpenMenuId]);

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
      {userId && (
        <>
          <button
            ref={(el) => {
              buttonRef.current = el;
              actionButtonRef(el);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (canEditOrDelete) {
                handleOpen();
              }
            }}
            className={`${styles.actionButton} ${!canEditOrDelete ? styles.disabled : ''}`}
            aria-label="Abrir acciones"
            disabled={!canEditOrDelete}
            onMouseEnter={() => !canEditOrDelete && setTooltipState(task.id, true)}
            onMouseLeave={() => !canEditOrDelete && setTooltipState(task.id, false)}
          >
            <Image 
              src="/elipsis.svg" 
              alt="Actions" 
              width={16} 
              height={16} 
              style={{ width: 'auto', height: 'auto' }} 
            />
            {!canEditOrDelete && showTooltip && (
              <span ref={tooltipRef} className={styles.tooltip}>
                {tooltipText}
              </span>
            )}
          </button>
          {isOpen && canEditOrDelete && createPortal(
            <AnimatePresence>
              <motion.div 
              ref={actionMenuRef} 
              className={styles.dropdown}
              style={{ 
                top: dropdownPosition.top, 
                left: dropdownPosition.left 
              }}
              onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
            >
              <div
                className={styles.dropdownItem}
                onClick={(e) => {
                  e.stopPropagation();
                  animateClick(e.currentTarget);
                  onEdit();
                  setOpenMenuId(null);
                }}
                title="Editar Tarea"
              >
                <Image 
                  src="/pencil.svg" 
                  alt="Editar" 
                  width={18} 
                  height={18} 
                  style={{ width: 'auto', height: 'auto' }} 
                />
                <span className={styles.tooltip}>Editar Tarea</span>
              </div>
              {onArchive && (
                <div
                  className={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    animateClick(e.currentTarget);
                    onArchive();
                    setOpenMenuId(null);
                  }}
                  title={task.archived ? "Desarchivar Tarea" : "Archivar Tarea"}
                >
                  <Image 
                    src="/archive.svg" 
                    alt={task.archived ? "Desarchivar" : "Archivar"} 
                      width={18} 
                      height={18} 
                    style={{ 
                        width: '15px', 
                        height: '15px',
                        opacity: 0.8
                    }} 
                  />
                  <span className={styles.tooltip}>
                    {task.archived ? "Desarchivar Tarea" : "Archivar Tarea"}
                  </span>
                </div>
              )}
              <div
                className={`${styles.dropdownItem} ${styles.deleteItem}`}
                onClick={(e) => {
                  e.stopPropagation();
                  animateClick(e.currentTarget);
                  onDelete();
                  setOpenMenuId(null);
                }}
                title="Eliminar Tarea"
              >
                <Image 
                  src="/trash-2.svg" 
                  alt="Eliminar" 
                  width={18} 
                  height={18} 
                  style={{ width: 'auto', height: 'auto' }} 
                />
                <span className={styles.tooltip}>Eliminar Tarea</span>
              </div>
              </motion.div>
            </AnimatePresence>,
            document.body
          )}
        </>
      )}
    </div>
  );
}, (prevProps: ActionMenuProps, nextProps: ActionMenuProps) => {
  // Optimizar re-renders con comparación profunda
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.archived === nextProps.task.archived &&
    prevProps.userId === nextProps.userId &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onArchive === nextProps.onArchive
  );
});

ActionMenu.displayName = 'ActionMenu';

export default ActionMenu;