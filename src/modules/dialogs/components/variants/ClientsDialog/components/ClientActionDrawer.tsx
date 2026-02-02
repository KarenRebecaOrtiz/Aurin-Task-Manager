/**
 * ClientActionDrawer Component
 *
 * Mobile action drawer with edit, manage projects, and delete options.
 */

'use client';

import { Pencil, FolderPlus, Trash2 } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ClientActionDrawerProps } from '../types';
import clientStyles from '../ClientsDialog.module.scss';

export function ClientActionDrawer({
  isOpen,
  onOpenChange,
  client,
  onEdit,
  onManageProjects,
  onDelete,
}: ClientActionDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent compact>
        <DrawerHeader>
          <DrawerTitle>Acciones de Cuenta</DrawerTitle>
        </DrawerHeader>
        <div className={clientStyles.drawerBody}>
          <button
            className={clientStyles.drawerItem}
            onClick={onEdit}
            disabled={!client}
          >
            <Pencil size={20} />
            <span>Editar cuenta</span>
          </button>
          <button
            className={clientStyles.drawerItem}
            onClick={onManageProjects}
            disabled={!client}
          >
            <FolderPlus size={20} />
            <span>Gestionar proyectos</span>
          </button>
          <div className={clientStyles.drawerSeparator} />
          <button
            className={`${clientStyles.drawerItem} ${clientStyles.drawerItemDanger}`}
            onClick={onDelete}
            disabled={!client}
          >
            <Trash2 size={20} />
            <span>Eliminar cuenta</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
