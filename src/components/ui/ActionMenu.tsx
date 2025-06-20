'use client';

import { useRef, useEffect } from 'react';
import { memo } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
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
}

interface ActionMenuProps {
  task: Task;
  userId?: string;
  isOpen: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  animateClick: (element: HTMLElement) => void;
  actionMenuRef: React.RefObject<HTMLDivElement>;
  actionButtonRef: (el: HTMLButtonElement | null) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = memo(
  ({ task, userId, isOpen, onOpen, onEdit, onDelete, animateClick, actionMenuRef, actionButtonRef }) => {
    const { isAdmin } = useAuth();
    const isCreator = userId && task.CreatedBy === userId;
    const canEditOrDelete = isAdmin || isCreator;
    const tooltipText = 'Solo el creador o un administrador pueden editar este elemento';
    const tooltipRef = useRef<HTMLSpanElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      const tooltip = tooltipRef.current;
      const button = buttonRef.current;

      if (!tooltip || !button || canEditOrDelete) return;

      const handleMouseEnter = () => {
        gsap.fromTo(
          tooltip,
          { opacity: 0, y: 5, visibility: 'hidden' },
          { opacity: 1, y: 0, visibility: 'visible', duration: 0.2, ease: 'power2.out' },
        );
        console.log('[ActionMenu] Tooltip shown for task:', task.id);
      };

      const handleMouseLeave = () => {
        gsap.to(tooltip, {
          opacity: 0,
          y: 5,
          visibility: 'hidden',
          duration: 0.2,
          ease: 'power2.in',
        });
        console.log('[ActionMenu] Tooltip hidden for task:', task.id);
      };

      button.addEventListener('mouseenter', handleMouseEnter);
      button.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        button.removeEventListener('mouseenter', handleMouseEnter);
        button.removeEventListener('mouseleave', handleMouseLeave);
        gsap.killTweensOf(tooltip);
      };
    }, [canEditOrDelete, task.id]);

    console.log('[ActionMenu] Rendering for task:', {
      taskId: task.id,
      userId,
      isAdmin,
      isCreator,
      canEditOrDelete,
      isOpen,
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
              onClick={() => {
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
            >
              <Image src="/elipsis.svg" alt="Actions" width={16} height={16} style={{ width: 'auto', height: 'auto' }} />
              {!canEditOrDelete && (
                <span ref={tooltipRef} className={styles.tooltip}>
                  {tooltipText}
                </span>
              )}
            </button>
            {isOpen && canEditOrDelete && (
              <div ref={actionMenuRef} className={styles.dropdown}>
                <div
                  className={styles.dropdownItem}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    onEdit();
                    console.log('[ActionMenu] Edit clicked for task:', task.id, { isAdmin, isCreator });
                  }}
                >
                  <Image src="/pencil.svg" alt="Edit" width={18} height={18} style={{ width: 'auto', height: 'auto' }} />
                  <span>Editar Tarea</span>
                </div>
                <div
                  className={styles.dropdownItem}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    onDelete();
                    console.log('[ActionMenu] Delete clicked for task:', task.id, { isAdmin, isCreator });
                  }}
                >
                  <Image src="/trash-2.svg" alt="Delete" width={18} height={18} style={{ width: 'auto', height: 'auto' }} />
                  <span>Eliminar Tarea</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

ActionMenu.displayName = 'ActionMenu';

export default ActionMenu;