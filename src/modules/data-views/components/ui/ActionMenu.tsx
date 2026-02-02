'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { memo } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import styles from './ActionMenu.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import { useActionMenuStore } from '@/stores/actionMenuStore';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/modules/dialogs/hooks/useMediaQuery';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Pencil, Archive, Trash2, Pin, PinOff } from 'lucide-react';
import { usePinnedTasksStore, MAX_PINNED } from '@/modules/data-views/tasks/stores/pinnedTasksStore';
import { useSonnerToast } from '@/modules/sonner';

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

/**
 * Verifica si un usuario está involucrado en una tarea
 * (es creator, está asignado, o es líder)
 */
function isUserInvolvedInTask(task: Task, userId: string | undefined): boolean {
  if (!userId) return false;

  const isCreator = task.CreatedBy === userId;
  const isAssigned = task.AssignedTo?.includes(userId) ?? false;
  const isLeader = task.LeadedBy?.includes(userId) ?? false;

  return isCreator || isAssigned || isLeader;
}

interface ActionMenuProps {
  task: Task;
  userId?: string;
  onEdit: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onPin?: (taskId: string) => void;
  showPinOption?: boolean;
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
  onPin,
  showPinOption = false,
  animateClick,
  actionMenuRef,
  actionButtonRef
}: ActionMenuProps) => {
  const { isAdmin } = useAuth();

  // Permisos granulares
  const isCreator = Boolean(userId && task.CreatedBy === userId);
  const isInvolved = isUserInvolvedInTask(task, userId);

  // canEditOrDelete: Solo admin o creator pueden editar/eliminar/archivar
  const canEditOrDelete = isAdmin || isCreator;

  // canInteract: Cualquier usuario involucrado puede interactuar (al menos para pin)
  const canInteract = isInvolved || isAdmin;

  const tooltipText = 'Solo el creador o un administrador pueden editar este elemento';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Pin functionality
  const { isPinned, togglePin, canPin } = usePinnedTasksStore();
  const taskIsPinned = isPinned(task.id);
  const { success: toastSuccess, warning: toastWarning } = useSonnerToast();

  // Selectors optimizados con shallow
  const {
    openMenuId,
    dropdownPositions,
    setOpenMenuId,
    setDropdownPosition,
  } = useActionMenuStore(
    useShallow(state => ({
      openMenuId: state.openMenuId,
      dropdownPositions: state.dropdownPositions,
      setOpenMenuId: state.setOpenMenuId,
      setDropdownPosition: state.setDropdownPosition,
    }))
  );

  const isOpen = openMenuId === task.id;
  const dropdownPosition = dropdownPositions[task.id] || { top: 0, left: 0 };

  // Memoizar handlers
  const handleDropdownPosition = useCallback(() => {
    if (isOpen && buttonRef.current && !isMobile) {
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
  }, [isOpen, task.id, setDropdownPosition, isMobile]);

  const handleOpen = useCallback(() => {
    if (isMobile) {
      setIsDrawerOpen(true);
    } else {
      setOpenMenuId(isOpen ? null : task.id);
    }
  }, [isOpen, task.id, setOpenMenuId, isMobile]);

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    if (!open) setIsDrawerOpen(false);
  }, []);

  // Drawer action handlers
  const handleDrawerEdit = useCallback(() => {
    onEdit();
    setIsDrawerOpen(false);
  }, [onEdit]);

  const handleDrawerArchive = useCallback(() => {
    if (onArchive) {
      onArchive();
      setIsDrawerOpen(false);
    }
  }, [onArchive]);

  const handleDrawerDelete = useCallback(() => {
    onDelete();
    setIsDrawerOpen(false);
  }, [onDelete]);

  // Pin handler (async for Firestore sync)
  const handlePinToggle = useCallback(async () => {
    const result = await togglePin(task.id);

    if (result.success) {
      if (result.action === 'pinned') {
        toastSuccess('Tarea fijada arriba de la tabla', { playSound: false });
      } else {
        toastSuccess('Tarea desfijada', { playSound: false });
      }
      onPin?.(task.id);
    } else if (result.reason === 'limit_reached') {
      toastWarning(`Máximo ${MAX_PINNED} tareas fijadas permitidas`, { playSound: false });
    }

    setOpenMenuId(null);
  }, [task.id, togglePin, toastSuccess, toastWarning, onPin, setOpenMenuId]);

  const handleDrawerPin = useCallback(async () => {
    await handlePinToggle();
    setIsDrawerOpen(false);
  }, [handlePinToggle]);

  // Efectos optimizados
  useEffect(() => {
    handleDropdownPosition();
  }, [handleDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        !isMobile &&
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
  }, [isOpen, setOpenMenuId, actionMenuRef, isMobile]);

  // No renderizar si el usuario no está involucrado en la tarea
  if (!canInteract) {
    return null;
  }

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

      {/* Desktop: Dropdown */}
      {!isMobile && isOpen && createPortal(
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
            {/* PIN: Disponible para TODOS los usuarios involucrados */}
            {showPinOption && (
              <div
                className={`${styles.dropdownItem} ${taskIsPinned ? styles.pinnedItem : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  animateClick(e.currentTarget);
                  handlePinToggle();
                }}
                title={taskIsPinned ? "Desfijar Tarea" : "Fijar Tarea"}
              >
                {taskIsPinned ? (
                  <PinOff size={18} className={styles.pinIcon} />
                ) : (
                  <Pin size={18} className={styles.pinIcon} />
                )}
                <span className={styles.tooltip}>
                  {taskIsPinned ? "Desfijar Tarea" : "Fijar Tarea"}
                </span>
              </div>
            )}

            {/* EDIT/ARCHIVE/DELETE: Solo para Admin o Creator */}
            {canEditOrDelete && (
              <>
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
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await onArchive();
                      } catch (error) {
                        console.error('[ActionMenu] Archive/Unarchive error:', error);
                      }
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
              </>
            )}

            {/* Mensaje informativo si solo puede fijar */}
            {!canEditOrDelete && !showPinOption && (
              <div className={styles.dropdownItem} style={{ opacity: 0.6, cursor: 'default' }}>
                <span className={styles.tooltip}>{tooltipText}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Mobile: Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent className={styles.drawerContent} compact>
          <DrawerHeader className={styles.drawerHeader}>
            <DrawerTitle className={styles.drawerTitle}>Acciones de Tarea</DrawerTitle>
          </DrawerHeader>

          <div className={styles.drawerBody}>
            {/* PIN: Disponible para TODOS los usuarios involucrados */}
            {showPinOption && (
              <button
                className={`${styles.drawerItem} ${taskIsPinned ? styles.drawerPinnedItem : ''}`}
                onClick={handleDrawerPin}
              >
                {taskIsPinned ? (
                  <PinOff size={20} className={styles.drawerIcon} />
                ) : (
                  <Pin size={20} className={styles.drawerIcon} />
                )}
                <span className={styles.drawerText}>
                  {taskIsPinned ? "Desfijar Tarea" : "Fijar Tarea"}
                </span>
              </button>
            )}

            {/* EDIT/ARCHIVE/DELETE: Solo para Admin o Creator */}
            {canEditOrDelete && (
              <>
                <button
                  className={styles.drawerItem}
                  onClick={handleDrawerEdit}
                >
                  <Pencil size={20} className={styles.drawerIcon} />
                  <span className={styles.drawerText}>Editar Tarea</span>
                </button>

                {onArchive && (
                  <button
                    className={styles.drawerItem}
                    onClick={handleDrawerArchive}
                  >
                    <Archive size={20} className={styles.drawerIcon} />
                    <span className={styles.drawerText}>
                      {task.archived ? "Desarchivar Tarea" : "Archivar Tarea"}
                    </span>
                  </button>
                )}

                <div className={styles.drawerSeparator} />

                <button
                  className={`${styles.drawerItem} ${styles.drawerDeleteItem}`}
                  onClick={handleDrawerDelete}
                >
                  <Trash2 size={20} className={styles.drawerIcon} />
                  <span className={styles.drawerText}>Eliminar Tarea</span>
                </button>
              </>
            )}

            {/* Mensaje informativo si solo puede fijar */}
            {!canEditOrDelete && (
              <div className={styles.drawerItem} style={{ opacity: 0.6, cursor: 'default', justifyContent: 'center' }}>
                <span className={styles.drawerText} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {tooltipText}
                </span>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
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
    prevProps.onArchive === nextProps.onArchive &&
    prevProps.onPin === nextProps.onPin &&
    prevProps.showPinOption === nextProps.showPinOption
  );
});

ActionMenu.displayName = 'ActionMenu';

export default ActionMenu;