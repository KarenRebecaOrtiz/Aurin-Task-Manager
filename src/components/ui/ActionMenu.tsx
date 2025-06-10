'use client';

import { useRef, useEffect } from 'react';
import { memo } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import styles from './ActionMenu.module.scss';

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
    const isCreator = userId && task.CreatedBy === userId;
    const tooltipText = 'Solo el quien creó este elemento puede editarlo';
    const tooltipRef = useRef<HTMLSpanElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      const tooltip = tooltipRef.current;
      const button = buttonRef.current;

      if (!tooltip || !button || isCreator) return;

      const handleMouseEnter = () => {
        gsap.fromTo(
          tooltip,
          { opacity: 0, y: 5, visibility: 'hidden' },
          { opacity: 1, y: 0, visibility: 'visible', duration: 0.2, ease: 'power2.out' },
        );
      };

      const handleMouseLeave = () => {
        gsap.to(tooltip, {
          opacity: 0,
          y: 5,
          visibility: 'hidden',
          duration: 0.2,
          ease: 'power2.in',
        });
      };

      button.addEventListener('mouseenter', handleMouseEnter);
      button.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        button.removeEventListener('mouseenter', handleMouseEnter);
        button.removeEventListener('mouseleave', handleMouseLeave);
        gsap.killTweensOf(tooltip);
      };
    }, [isCreator]);

    return (
      <div className={styles.actionContainer}>
        {userId && (
          <>
            <button
              ref={(el) => {
                buttonRef.current = el;
                actionButtonRef(el);
              }}
              onClick={isCreator ? onOpen : undefined}
              className={`${styles.actionButton} ${!isCreator ? styles.disabled : ''}`}
              aria-label="Abrir acciones"
              disabled={!isCreator}
            >
              <Image src="/elipsis.svg" alt="Actions" width={16} height={16} />
              {!isCreator && (
                <span ref={tooltipRef} className={styles.tooltip}>
                  {tooltipText}
                </span>
              )}
            </button>
            {isOpen && isCreator && (
              <div ref={actionMenuRef} className={styles.dropdown}>
                <div
                  className={styles.dropdownItem}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    onEdit();
                  }}
                >
                  <Image src="/pencil.svg" alt="Edit" width={18} height={18} />
                  <span>Editar Tarea</span>
                </div>
                <div
                  className={styles.dropdownItem}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    onDelete();
                  }}
                >
                  <Image src="/trash-2.svg" alt="Delete" width={18} height={18} />
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