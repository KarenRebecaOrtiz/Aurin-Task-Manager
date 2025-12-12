'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronsUpDown, Check, Plus, Building2, Pencil } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { dropdownAnimations } from '@/modules/shared/components/molecules/Dropdown/animations';
import { type Workspace, ALL_WORKSPACES_ID } from '@/stores/workspacesStore';
import styles from './WorkspacesDropdown.module.scss';

// ============================================================================
// CONSTANTS
// ============================================================================

const VIEW_ALL_OPTION: Workspace = {
  id: ALL_WORKSPACES_ID,
  name: 'Todas las Cuentas',
  logo: undefined,
  memberIds: [],
  createdBy: '',
  createdAt: '',
};

// ============================================================================
// TYPES
// ============================================================================

interface WorkspacesDropdownProps {
  workspaces: Workspace[];
  selectedWorkspaceId?: string | null;
  onWorkspaceChange: (workspace: Workspace | null) => void;
  onCreateWorkspace?: () => void;
  onEditWorkspace?: (workspaceId: string) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WorkspacesDropdown({
  workspaces,
  selectedWorkspaceId,
  onWorkspaceChange,
  onCreateWorkspace,
  onEditWorkspace,
  disabled = false,
  className = '',
}: WorkspacesDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const { isAdmin } = useAuth();

  // Check if "View All" is selected
  const isViewAllSelected = selectedWorkspaceId === ALL_WORKSPACES_ID || !selectedWorkspaceId;

  // Get selected workspace (or VIEW_ALL_OPTION)
  const selectedWorkspace = React.useMemo(() => {
    if (isViewAllSelected) return VIEW_ALL_OPTION;
    return workspaces.find((ws) => ws.id === selectedWorkspaceId) || VIEW_ALL_OPTION;
  }, [workspaces, selectedWorkspaceId, isViewAllSelected]);

  // Handle workspace selection
  const handleSelect = React.useCallback(
    (workspace: Workspace) => {
      // Si estamos en modo edición y es una cuenta (no "Ver Todos"), abrir diálogo de edición
      if (editMode && workspace.id !== ALL_WORKSPACES_ID) {
        onEditWorkspace?.(workspace.id);
        setEditMode(false);
        setOpen(false);
        return;
      }

      if (workspace.id === ALL_WORKSPACES_ID) {
        onWorkspaceChange(null); // null significa "Ver Todos"
      } else {
        onWorkspaceChange(workspace);
      }
      setOpen(false);
    },
    [onWorkspaceChange, editMode, onEditWorkspace]
  );

  // Toggle edit mode
  const handleToggleEditMode = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditMode((prev) => !prev);
  }, []);

  // Handle create workspace (cuenta) click
  const handleCreateClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(false);
      onCreateWorkspace?.();
    },
    [onCreateWorkspace]
  );

  // Reset edit mode when dropdown closes
  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditMode(false);
    }
  }, []);

  return (
    <div className={`${styles.container} ${className}`}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <motion.button
            type="button"
            disabled={disabled}
            className={styles.trigger}
            aria-expanded={open}
            aria-haspopup="listbox"
            {...dropdownAnimations.trigger}
          >
            <div className={styles.triggerContent}>
              {isViewAllSelected ? (
                <div className={styles.viewAllIcon}>
                  <Building2 size={18} />
                </div>
              ) : (
                <Avatar className={styles.avatar}>
                  <AvatarImage
                    src={selectedWorkspace.logo}
                    alt={selectedWorkspace.name}
                  />
                  <AvatarFallback className={styles.avatarFallback}>
                    {selectedWorkspace.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className={styles.workspaceName}>
                {selectedWorkspace.name}
              </span>
            </div>
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronsUpDown className={styles.chevron} />
            </motion.div>
          </motion.button>
        </PopoverTrigger>

        <PopoverContent className={styles.content} align="start" sideOffset={8}>
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                {...dropdownAnimations.menu}
              >
                {/* Header */}
                <div className={styles.header}>
                  <span className={styles.headerTitle}>Cuentas</span>
                  {isAdmin && onEditWorkspace && (
                    <button
                      type="button"
                      onClick={handleToggleEditMode}
                      className={`${styles.editButton} ${editMode ? styles.editButtonActive : ''}`}
                      title={editMode ? 'Cancelar edición' : 'Editar cuentas'}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>

                {/* Edit mode indicator */}
                {editMode && (
                  <div className={styles.editModeIndicator}>
                    <span>Selecciona una cuenta para editar</span>
                  </div>
                )}

                {/* "View All" Option - Always first */}
                <div className={styles.list} role="listbox">
                  <motion.button
                    type="button"
                    onClick={() => handleSelect(VIEW_ALL_OPTION)}
                    className={`${styles.item} ${isViewAllSelected ? styles.selected : ''}`}
                    role="option"
                    aria-selected={isViewAllSelected}
                    {...dropdownAnimations.item(0)}
                  >
                    <div className={styles.itemContent}>
                      <div className={styles.viewAllItemIcon}>
                        <Building2 size={16} />
                      </div>
                      <div className={styles.itemText}>
                        <span className={styles.itemName}>Todas las Cuentas</span>
                        <span className={styles.itemMembers}>
                          Ver todas las tareas
                        </span>
                      </div>
                    </div>
                    {isViewAllSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.15, delay: 0.05 }}
                      >
                        <Check className={styles.checkIcon} />
                      </motion.div>
                    )}
                  </motion.button>

                  {/* Divider after "View All" */}
                  {workspaces.length > 0 && <div className={styles.listDivider} />}

                  {/* Client Workspaces List */}
                  {workspaces.length === 0 ? (
                    <div className={styles.emptyState}>
                      No hay cuentas disponibles
                    </div>
                  ) : (
                    workspaces.map((workspace, index) => {
                      const isSelected = !isViewAllSelected && selectedWorkspace?.id === workspace.id;
                      return (
                        <motion.button
                          key={workspace.id}
                          type="button"
                          onClick={() => handleSelect(workspace)}
                          className={`${styles.item} ${isSelected ? styles.selected : ''}`}
                          role="option"
                          aria-selected={isSelected}
                          {...dropdownAnimations.item(index + 1)}
                        >
                          <div className={styles.itemContent}>
                            <Avatar className={styles.itemAvatar}>
                              <AvatarImage
                                src={workspace.logo}
                                alt={workspace.name}
                              />
                              <AvatarFallback className={styles.avatarFallback}>
                                {workspace.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className={styles.itemText}>
                              <span className={styles.itemName}>{workspace.name}</span>
                              {workspace.taskCount !== undefined && (
                                <span className={styles.itemMembers}>
                                  {workspace.taskCount} tarea{workspace.taskCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.15, delay: 0.05 }}
                            >
                              <Check className={styles.checkIcon} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })
                  )}
                </div>

                {/* Create Account Button - Only for Admins */}
                {isAdmin && onCreateWorkspace && (
                  <>
                    <div className={styles.divider} />
                    <motion.button
                      type="button"
                      onClick={handleCreateClick}
                      className={styles.createButton}
                      {...dropdownAnimations.item(workspaces.length + 1)}
                    >
                      <div className={styles.createIcon}>
                        <Plus size={16} />
                      </div>
                      <span className={styles.createText}>Crear cuenta</span>
                    </motion.button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default WorkspacesDropdown;
