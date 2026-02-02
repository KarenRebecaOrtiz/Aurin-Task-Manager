/**
 * ClientActionMenu Component
 *
 * Desktop action menu rendered as a portal.
 * Shows edit, manage projects, and delete options.
 */

'use client';

import { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, FolderPlus, Trash2 } from 'lucide-react';
import { ClientActionMenuProps } from '../types';
import clientStyles from '../ClientsDialog.module.scss';

export const ClientActionMenu = forwardRef<HTMLDivElement, ClientActionMenuProps>(
  function ClientActionMenu(
    { client, position, onEdit, onManageProjects, onDelete, onClose },
    ref
  ) {
    // Only render in browser
    if (typeof window === 'undefined') return null;

    return createPortal(
      <AnimatePresence>
        <motion.div
          ref={ref}
          className={clientStyles.actionMenu}
          style={{ top: position.top, left: position.left }}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className={clientStyles.menuItem} onClick={onEdit}>
            <Pencil size={16} />
            Editar cuenta
          </button>
          <button className={clientStyles.menuItem} onClick={onManageProjects}>
            <FolderPlus size={16} />
            Gestionar proyectos
          </button>
          <div className={clientStyles.menuSeparator} />
          <button
            className={`${clientStyles.menuItem} ${clientStyles.menuItemDanger}`}
            onClick={onDelete}
          >
            <Trash2 size={16} />
            Eliminar cuenta
          </button>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }
);
