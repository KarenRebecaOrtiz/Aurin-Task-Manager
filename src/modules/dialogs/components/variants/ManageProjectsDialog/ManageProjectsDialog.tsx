/**
 * Manage Projects Dialog
 *
 * Dialog for managing projects within a client account.
 * Projects act as folders/categories for organizing tasks.
 * Uses ResponsiveDialog for automatic drawer on mobile.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Folder, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '../../DialogPrimitives';
import { DialogFooter } from '../../molecules';
import { DestructiveConfirmDialog } from '../DestructiveConfirmDialog';
import { panelVariants } from '../../../config/animations';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { clientService } from '@/modules/client-crud/services/clientService';
import { useDataStore } from '@/stores/dataStore';
import { useClientsDataStore } from '@/stores/clientsDataStore';
import { invalidateClientsCache } from '@/lib/cache-utils';
import { Client } from '@/types';
import { Button } from '@/components/ui/buttons';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import styles from './ManageProjectsDialog.module.scss';

export interface ManageProjectsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  onProjectsUpdated?: () => void;
}

type DialogMode = 'view' | 'create' | 'edit';

interface ProjectActionMenuProps {
  position: { top: number; left: number };
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ProjectActionMenu({ position, onEdit, onDelete, onClose }: ProjectActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className={styles.actionMenu}
      style={{ top: position.top, left: position.left }}
    >
      <button className={styles.menuItem} onClick={onEdit}>
        <Pencil size={16} />
        Editar nombre
      </button>
      <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={onDelete}>
        <Trash2 size={16} />
        Eliminar proyecto
      </button>
    </div>,
    document.body
  );
}

export function ManageProjectsDialog({
  isOpen,
  onOpenChange,
  client,
  onProjectsUpdated,
}: ManageProjectsDialogProps) {
  const { success: showSuccess, error: showError } = useSonnerToast();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Get clients from store for updates
  const allClients = useDataStore((state) => state.clients);
  const setClients = useDataStore((state) => state.setClients);
  const setClientsInClientsStore = useClientsDataStore((state) => state.setClients);

  // State
  const [projects, setProjects] = useState<string[]>(client.projects || []);
  const [mode, setMode] = useState<DialogMode>('view');
  const [newProjectName, setNewProjectName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ name: string; index: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mobile action drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ name: string; index: number } | null>(null);

  // Refs
  const newProjectInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Sync projects with client data when dialog opens
  // Filter out empty strings from legacy data
  useEffect(() => {
    if (isOpen) {
      const validProjects = (client.projects || []).filter(p => p && p.trim() !== '');
      setProjects(validProjects);
      setMode('view');
      setNewProjectName('');
      setEditingIndex(null);
      setActiveMenuIndex(null);
    }
  }, [isOpen, client.projects]);

  // Focus input when entering create mode
  useEffect(() => {
    if (mode === 'create' && newProjectInputRef.current) {
      newProjectInputRef.current.focus();
    }
  }, [mode]);

  // Focus input when editing
  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingIndex]);

  // Get client avatar
  const renderClientAvatar = () => {
    if (client.imageUrl && !client.imageUrl.includes('empty-image')) {
      return (
        <div className={styles.clientAvatar}>
          <Image
            src={client.imageUrl}
            alt={client.name}
            width={33}
            height={33}
            className={styles.clientAvatarImage}
          />
        </div>
      );
    }

    if (client.gradientColors && client.gradientColors.length >= 3) {
      return (
        <div
          className={styles.clientAvatar}
          style={{
            background: `linear-gradient(135deg, ${client.gradientColors[0]} 0%, ${client.gradientColors[1]} 50%, ${client.gradientColors[2]} 100%)`
          }}
        />
      );
    }

    // Default lime green (from design)
    return <div className={styles.clientAvatar} style={{ background: '#D0DF00' }} />;
  };

  // Save projects to Firestore
  const saveProjects = useCallback(async (updatedProjects: string[]) => {
    setIsSubmitting(true);
    try {
      await clientService.updateClient(client.id, {
        projects: updatedProjects
      });

      // Update both stores (projectCount is computed from projects.length)
      const updatedClients = allClients.map((c) =>
        c.id === client.id ? { ...c, projects: updatedProjects, projectCount: updatedProjects.length } : c
      );
      setClients(updatedClients);
      setClientsInClientsStore(updatedClients);
      invalidateClientsCache();

      setProjects(updatedProjects);
      if (onProjectsUpdated) onProjectsUpdated();

      return true;
    } catch (error) {
      console.error('Error saving projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error al guardar proyectos: ${errorMessage}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [client.id, allClients, setClients, setClientsInClientsStore, onProjectsUpdated, showError]);

  // Handle create new project
  const handleStartCreate = useCallback(() => {
    setMode('create');
    setNewProjectName('');
  }, []);

  const handleCancelCreate = useCallback(() => {
    setMode('view');
    setNewProjectName('');
  }, []);

  const handleCreateProject = useCallback(async () => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName) {
      showError('El nombre del proyecto no puede estar vacío');
      return;
    }

    // Check for duplicates
    if (projects.some(p => p.toLowerCase() === trimmedName.toLowerCase())) {
      showError('Ya existe un proyecto con ese nombre');
      return;
    }

    const updatedProjects = [...projects, trimmedName];
    const success = await saveProjects(updatedProjects);

    if (success) {
      showSuccess(`Proyecto "${trimmedName}" creado exitosamente`);
      setMode('view');
      setNewProjectName('');
    }
  }, [newProjectName, projects, saveProjects, showSuccess, showError]);

  // Handle action menu
  const handleOpenMenu = useCallback((index: number, event: React.MouseEvent) => {
    if (isMobile) {
      setSelectedProject({ name: projects[index], index });
      setIsDrawerOpen(true);
    } else {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.right - 160 });
      setActiveMenuIndex(index);
    }
  }, [isMobile, projects]);

  const handleCloseMenu = useCallback(() => {
    setActiveMenuIndex(null);
    setMenuPosition(null);
  }, []);

  // Handle edit project
  const handleStartEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setEditingName(projects[index]);
    setActiveMenuIndex(null);
    setIsDrawerOpen(false);
  }, [projects]);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingName('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (editingIndex === null) return;

    const trimmedName = editingName.trim();
    if (!trimmedName) {
      showError('El nombre del proyecto no puede estar vacío');
      return;
    }

    // Check for duplicates (excluding current project)
    if (projects.some((p, i) => i !== editingIndex && p.toLowerCase() === trimmedName.toLowerCase())) {
      showError('Ya existe un proyecto con ese nombre');
      return;
    }

    const updatedProjects = projects.map((p, i) => i === editingIndex ? trimmedName : p);
    const success = await saveProjects(updatedProjects);

    if (success) {
      showSuccess(`Proyecto renombrado a "${trimmedName}"`);
      setEditingIndex(null);
      setEditingName('');
    }
  }, [editingIndex, editingName, projects, saveProjects, showSuccess, showError]);

  // Handle delete project
  const handleDeleteClick = useCallback((index: number) => {
    const project = projects[index];
    setProjectToDelete({ name: project, index });
    setShowDeleteConfirm(true);
    setActiveMenuIndex(null);
    setIsDrawerOpen(false);
  }, [projects]);

  const handleConfirmDelete = useCallback(async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      const updatedProjects = projects.filter((_, i) => i !== projectToDelete.index);
      const success = await saveProjects(updatedProjects);

      if (success) {
        showSuccess(`Proyecto "${projectToDelete.name}" eliminado`);
        setShowDeleteConfirm(false);
        setProjectToDelete(null);
      }
    } finally {
      setIsDeleting(false);
    }
  }, [projectToDelete, projects, saveProjects, showSuccess]);

  // Key handlers
  const handleNewProjectKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newProjectName.trim()) {
      e.preventDefault();
      handleCreateProject();
    } else if (e.key === 'Escape') {
      handleCancelCreate();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingName.trim()) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Render project item
  const renderProjectItem = (project: string, index: number) => {
    const isEditing = editingIndex === index;

    return (
      <motion.div
        key={`project-${index}`}
        className={styles.projectItem}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ delay: index * 0.05 }}
      >
        <div className={styles.projectContent}>
          <div className={styles.folderIcon}>
            <Folder size={18} />
          </div>

          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              className={styles.projectInput}
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={handleSaveEdit}
              disabled={isSubmitting}
            />
          ) : (
            <span className={styles.projectName}>{project}</span>
          )}
        </div>

        {!isEditing && (
          <button
            className={styles.actionButton}
            onClick={(e) => handleOpenMenu(index, e)}
            aria-label="Más opciones"
          >
            <MoreVertical size={16} />
          </button>
        )}

        {isEditing && (
          <div className={styles.editActions}>
            <button
              className={styles.editCancelButton}
              onClick={handleCancelEdit}
            >
              Cancelar
            </button>
            <button
              className={styles.editSaveButton}
              onClick={handleSaveEdit}
              disabled={!editingName.trim() || isSubmitting}
            >
              Guardar
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  // Render new project input (when in create mode)
  const renderNewProjectInput = () => (
    <motion.div
      className={`${styles.projectItem} ${styles.newProject}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={styles.projectContent}>
        <div className={`${styles.folderIcon} ${styles.folderIconNew}`}>
          <Folder size={18} />
        </div>
        <input
          ref={newProjectInputRef}
          type="text"
          className={styles.projectInput}
          placeholder="Escribe aquí el nombre de tu proyecto"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          onKeyDown={handleNewProjectKeyDown}
          disabled={isSubmitting}
        />
      </div>
    </motion.div>
  );

  // Render content
  const renderContent = () => (
    <div className={styles.projectsList}>
      <AnimatePresence mode="popLayout">
        {projects.map((project, index) => renderProjectItem(project, index))}
        {mode === 'create' && renderNewProjectInput()}
      </AnimatePresence>

      {projects.length === 0 && mode !== 'create' && (
        <div className={styles.emptyState}>
          <Folder size={32} className={styles.emptyIcon} />
          <p>No hay proyectos creados</p>
          <p className={styles.emptyHint}>Los proyectos te ayudan a organizar las tareas de este cliente</p>
        </div>
      )}
    </div>
  );

  // Render footer
  const renderFooter = () => {
    if (mode === 'create') {
      return (
        <div className={styles.footerActions}>
          <Button
            intent="secondary"
            onClick={handleCancelCreate}
            disabled={isSubmitting}
          >
            Descartar
          </Button>
          <Button
            intent="primary"
            onClick={handleCreateProject}
            disabled={!newProjectName.trim() || isSubmitting}
            isLoading={isSubmitting}
            loadingText="Creando..."
          >
            + Crear Nuevo Proyecto
          </Button>
        </div>
      );
    }

    return (
      <Button
        intent="primary"
        onClick={handleStartCreate}
        disabled={isSubmitting}
        className={styles.createButton}
      >
        + Crear Nuevo Proyecto
      </Button>
    );
  };

  return (
    <>
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent
          size="sm"
          closeOnOverlayClick={mode === 'view'}
          showCloseButton={true}
        >
          {isMobile ? (
            <>
              <ResponsiveDialogHeader>
                <div className={styles.header}>
                  {renderClientAvatar()}
                  <ResponsiveDialogTitle className={styles.headerTitle}>
                    Gestionar Proyectos de {client.name}
                  </ResponsiveDialogTitle>
                </div>
              </ResponsiveDialogHeader>

              <ResponsiveDialogBody className={styles.body}>
                {renderContent()}
              </ResponsiveDialogBody>

              <ResponsiveDialogFooter className={styles.footer}>
                {renderFooter()}
              </ResponsiveDialogFooter>
            </>
          ) : (
            <AnimatePresence mode="wait">
              {isOpen && (
                <motion.div
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={styles.dialogInner}
                >
                  {/* Accessible title for screen readers */}
                  <ResponsiveDialogTitle className="sr-only">
                    Gestionar Proyectos de {client.name}
                  </ResponsiveDialogTitle>

                  <div className={styles.header}>
                    {renderClientAvatar()}
                    <h2 className={styles.headerTitle} aria-hidden="true">
                      Gestionar Proyectos de {client.name}
                    </h2>
                  </div>

                  <div className={styles.divider} />

                  <div className={styles.body}>
                    {renderContent()}
                  </div>

                  <DialogFooter className={styles.footer}>
                    {renderFooter()}
                  </DialogFooter>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Action Menu Portal (Desktop) */}
      {activeMenuIndex !== null && menuPosition && (
        <ProjectActionMenu
          position={menuPosition}
          onEdit={() => handleStartEdit(activeMenuIndex)}
          onDelete={() => handleDeleteClick(activeMenuIndex)}
          onClose={handleCloseMenu}
        />
      )}

      {/* Mobile Action Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent compact>
          <DrawerHeader>
            <DrawerTitle>Acciones de Proyecto</DrawerTitle>
          </DrawerHeader>
          <div className={styles.drawerBody}>
            <button
              className={styles.drawerItem}
              onClick={() => selectedProject && handleStartEdit(selectedProject.index)}
            >
              <Pencil size={20} />
              Editar nombre
            </button>
            <button
              className={`${styles.drawerItem} ${styles.drawerItemDanger}`}
              onClick={() => selectedProject && handleDeleteClick(selectedProject.index)}
            >
              <Trash2 size={20} />
              Eliminar proyecto
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <DestructiveConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Eliminar Proyecto"
        itemName={projectToDelete?.name}
        warningMessage="Las tareas asociadas a este proyecto perderán su referencia y deberán ser reasignadas manualmente."
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
