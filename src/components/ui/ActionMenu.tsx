'use client';

import { useRef, useEffect, useState } from 'react';
import { memo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import styles from './ActionMenu.module.scss';
import { useAuth } from '@/contexts/AuthContext';

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
  isOpen: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  animateClick: (element: HTMLElement) => void;
  actionMenuRef: React.RefObject<HTMLDivElement>;
  actionButtonRef: (el: HTMLButtonElement | null) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = memo(
  ({ task, userId, isOpen, onOpen, onEdit, onDelete, onArchive, animateClick, actionMenuRef, actionButtonRef }) => {
    const { isAdmin } = useAuth();
    const isCreator = userId && task.CreatedBy === userId;
    const canEditOrDelete = isAdmin || isCreator;
    const tooltipText = 'Solo el creador o un administrador pueden editar este elemento';
    const tooltipRef = useRef<HTMLSpanElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [showTooltip, setShowTooltip] = useState(false);

    // Calcular posición del dropdown cuando se abre
    useEffect(() => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        console.log('[ActionMenu] Button rect:', rect);
        
        // Calcular posición absoluta en el documento, no relativa al viewport
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Calcular posición horizontal más precisa
        const dropdownWidth = 64; // Ancho del dropdown (48px + padding)
        const buttonCenter = rect.left + (rect.width / 2);
        const dropdownLeft = buttonCenter - (dropdownWidth / 2);
        
        setDropdownPosition({
          top: rect.bottom + scrollY + 8,
          left: dropdownLeft + scrollX,
        });
        
        console.log('[ActionMenu] Dropdown position set:', {
          top: rect.bottom + scrollY + 8,
          left: dropdownLeft + scrollX,
          buttonCenter,
          dropdownLeft,
          scrollX,
          scrollY,
        });
      }
    }, [isOpen]);

    console.log('[ActionMenu] Rendering for task:', {
      taskId: task.id,
      userId,
      isAdmin,
      isCreator,
      canEditOrDelete,
      isOpen,
      dropdownPosition,
    });

    return (
      <div className={styles.actionContainer}>
        {userId && (
          <>
            <button
              ref={(el) => {
                buttonRef.current = el;
                actionButtonRef(el);
                console.log('[ActionMenu] Action button ref set:', {
                  taskId: task.id,
                  hasElement: !!el,
                });
              }}
              onClick={(e) => {
                e.stopPropagation(); // Prevent event from bubbling up to parent card
                if (canEditOrDelete) {
                  onOpen();
                  console.log('[ActionMenu] Action menu toggled for task:', task.id, { isAdmin, isCreator });
                } else {
                  console.log('[ActionMenu] Action menu click ignored, insufficient permissions:', {
                    taskId: task.id,
                    isAdmin,
                    isCreator,
                  });
                }
              }}
              className={`${styles.actionButton} ${!canEditOrDelete ? styles.disabled : ''}`}
              aria-label="Abrir acciones"
              disabled={!canEditOrDelete}
              onMouseEnter={() => !canEditOrDelete && setShowTooltip(true)}
              onMouseLeave={() => !canEditOrDelete && setShowTooltip(false)}
            >
              <Image src="/elipsis.svg" alt="Actions" width={16} height={16} style={{ width: 'auto', height: 'auto' }} />
              {!canEditOrDelete && showTooltip && (
                <span ref={tooltipRef} className={styles.tooltip}>
                  {tooltipText}
                </span>
              )}
            </button>
            {isOpen && canEditOrDelete && (() => {
              console.log('[ActionMenu] Rendering dropdown items');
              return createPortal(
                <div 
                  ref={actionMenuRef} 
                  className={styles.dropdown}
                  style={{ 
                    top: dropdownPosition.top, 
                    left: dropdownPosition.left 
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent any clicks within dropdown from bubbling up
                  }}
                  onLoad={() => {
                    console.log('[ActionMenu] Dropdown portal loaded with position:', dropdownPosition);
                  }}
                >
                <div
                  className={styles.dropdownItem}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event from bubbling up to parent card
                    animateClick(e.currentTarget);
                    onEdit();
                    console.log('[ActionMenu] Edit clicked for task:', task.id, { isAdmin, isCreator });
                  }}
                    title="Editar Tarea"
                >
                    <Image src="/pencil.svg" alt="Editar" width={18} height={18} style={{ width: 'auto', height: 'auto' }} />
                    <span className={styles.tooltip}>Editar Tarea</span>
                </div>
                  {onArchive && (
                <div
                  className={styles.dropdownItem}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event from bubbling up to parent card
                        animateClick(e.currentTarget);
                        onArchive();
                        console.log('[ActionMenu] Archive clicked for task:', task.id, { isAdmin, isCreator });
                      }}
                      title={task.archived ? "Desarchivar Tarea" : "Archivar Tarea"}
                    >
                      <Image 
                        src="/archive.svg" 
                        alt={task.archived ? "Desarchivar" : "Archivar"} 
                        width={10} 
                        height={10} 
                        style={{ 
                          width: 'auto', 
                          height: 'auto',
                          transform: 'scale(0.02)',
                          opacity: 0.8 
                        }} 
                      />
                      <span className={styles.tooltip}>{task.archived ? "Desarchivar Tarea" : "Archivar Tarea"}</span>
                    </div>
                  )}
                  <div
                    className={`${styles.dropdownItem} ${styles.deleteItem}`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event from bubbling up to parent card
                    animateClick(e.currentTarget);
                    onDelete();
                    console.log('[ActionMenu] Delete clicked for task:', task.id, { isAdmin, isCreator });
                  }}
                    title="Eliminar Tarea"
                >
                    <Image src="/trash-2.svg" alt="Eliminar" width={18} height={18} style={{ width: 'auto', height: 'auto' }} />
                    <span className={styles.tooltip}>Eliminar Tarea</span>
                </div>
                </div>,
                document.body
              );
            })()}
          </>
        )}
      </div>
    );
  },
);

ActionMenu.displayName = 'ActionMenu';

export default ActionMenu;