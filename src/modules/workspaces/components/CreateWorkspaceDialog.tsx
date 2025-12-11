'use client';

import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { CrudDialog } from '@/modules/dialogs/components/organisms/CrudDialog';
import { DialogActions } from '@/modules/dialogs/components/molecules';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { getUsers } from '@/services/userService';
import { useWorkspacesStore, type Workspace } from '@/stores/workspacesStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, Search, Users } from 'lucide-react';
import type { User } from '@/types';
import styles from './CreateWorkspaceDialog.module.scss';

// ============================================================================
// TYPES
// ============================================================================

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkspaceCreated?: (workspace: Workspace) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateWorkspaceDialog({
  isOpen,
  onOpenChange,
  onWorkspaceCreated,
}: CreateWorkspaceDialogProps) {
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useSonnerToast();
  const addWorkspace = useWorkspacesStore((state) => state.addWorkspace);

  // State
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Load users when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const result = await getUsers();
        setUsers(result.data);

        // Auto-select current user
        if (user?.id && !selectedUserIds.includes(user.id)) {
          setSelectedUserIds([user.id]);
        }
      } catch (error) {
        console.error('Error loading users:', error);
        showError('Error al cargar usuarios', 'No se pudieron cargar los usuarios del sistema.');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user?.id]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setWorkspaceName('');
      setSelectedUserIds([]);
      setSearchQuery('');
      setNameError(null);
    }
  }, [isOpen]);

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query)
    );
  });

  // Handle user selection toggle
  const handleUserToggle = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allUserIds = filteredUsers.map((u) => u.id);
    const allSelected = allUserIds.every((id) => selectedUserIds.includes(id));

    if (allSelected) {
      // Deselect all filtered users (but keep current user selected)
      setSelectedUserIds((prev) =>
        prev.filter((id) => !allUserIds.includes(id) || id === user?.id)
      );
    } else {
      // Select all filtered users
      setSelectedUserIds((prev) => {
        const newIds = new Set([...prev, ...allUserIds]);
        return Array.from(newIds);
      });
    }
  }, [filteredUsers, selectedUserIds, user?.id]);

  // Validate form
  const validate = useCallback(() => {
    if (!workspaceName.trim()) {
      setNameError('El nombre del workspace es requerido');
      return false;
    }
    if (workspaceName.trim().length < 3) {
      setNameError('El nombre debe tener al menos 3 caracteres');
      return false;
    }
    setNameError(null);
    return true;
  }, [workspaceName]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!user?.id) {
      showError('Error', 'Debes iniciar sesión para crear un workspace.');
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create workspace object (in real implementation, this would go to Firestore)
      const newWorkspace: Workspace = {
        id: `ws-${Date.now()}`, // Temporary ID - replace with Firestore ID
        name: workspaceName.trim(),
        logo: `https://avatar.vercel.sh/${encodeURIComponent(workspaceName.trim())}`,
        memberIds: selectedUserIds.length > 0 ? selectedUserIds : [user.id],
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      };

      // Add to store
      addWorkspace(newWorkspace);

      showSuccess(`Workspace "${workspaceName}" creado exitosamente.`);

      // Call callback
      onWorkspaceCreated?.(newWorkspace);

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating workspace:', error);
      showError('Error al crear workspace', 'No se pudo crear el workspace. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    workspaceName,
    selectedUserIds,
    validate,
    addWorkspace,
    showSuccess,
    showError,
    onWorkspaceCreated,
    onOpenChange,
  ]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Check if all filtered users are selected
  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedUserIds.includes(u.id));

  // Custom footer
  const customFooter = (
    <DialogActions
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      cancelText="Cancelar"
      submitText="Crear Workspace"
      isLoading={isSubmitting}
      submitVariant="primary"
    />
  );

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      mode="create"
      title="Crear Nuevo Workspace"
      description="Un workspace agrupa clientes, tareas y proyectos. Selecciona los usuarios que tendrán acceso."
      isLoading={isLoadingUsers}
      isSubmitting={isSubmitting}
      loadingMessage="Cargando usuarios..."
      footer={customFooter}
      size="xl"
      closeOnOverlayClick={false}
    >
      <div className={styles.form}>
        {/* Workspace Name Input */}
        <div className={styles.inputGroup}>
          <label htmlFor="workspace-name" className={styles.label}>
            Nombre del Workspace
          </label>
          <input
            id="workspace-name"
            type="text"
            value={workspaceName}
            onChange={(e) => {
              setWorkspaceName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Ej: Marketing Team, Proyecto Alpha..."
            className={`${styles.input} ${nameError ? styles.inputError : ''}`}
            autoFocus
          />
          {nameError && (
            <span className={styles.errorText}>{nameError}</span>
          )}
        </div>

        {/* Users Selection Section */}
        <div className={styles.usersSection}>
          <div className={styles.usersSectionHeader}>
            <div className={styles.usersSectionTitle}>
              <Users size={18} />
              <span>Miembros del Workspace</span>
            </div>
            <span className={styles.selectedCount}>
              {selectedUserIds.length} seleccionado{selectedUserIds.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuarios..."
              className={styles.searchInput}
            />
          </div>

          {/* Select All */}
          <button
            type="button"
            onClick={handleSelectAll}
            className={styles.selectAllButton}
          >
            <div
              className={`${styles.checkbox} ${allFilteredSelected ? styles.checked : ''}`}
            >
              {allFilteredSelected && <Check size={12} />}
            </div>
            <span>Seleccionar todos</span>
          </button>

          {/* Users Table */}
          <div className={styles.usersTable}>
            {filteredUsers.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery
                  ? 'No se encontraron usuarios con ese criterio'
                  : 'No hay usuarios disponibles'}
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                const isCurrentUser = u.id === user?.id;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleUserToggle(u.id)}
                    className={`${styles.userRow} ${isSelected ? styles.selected : ''}`}
                    disabled={isCurrentUser} // Current user is always selected
                  >
                    <div
                      className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                    <Avatar className={styles.userAvatar}>
                      <AvatarImage src={u.imageUrl} alt={u.fullName || ''} />
                      <AvatarFallback className={styles.avatarFallback}>
                        {(u.fullName || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>
                        {u.fullName || 'Sin nombre'}
                        {isCurrentUser && (
                          <span className={styles.youBadge}>(Tú)</span>
                        )}
                      </span>
                      <span className={styles.userRole}>{u.role || 'Sin rol'}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </CrudDialog>
  );
}

export default CreateWorkspaceDialog;
