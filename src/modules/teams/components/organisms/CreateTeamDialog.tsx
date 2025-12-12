'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { CrudDialog } from '@/modules/dialogs/components/organisms';
import { DialogActions } from '@/modules/dialogs/components/molecules';
import { CrystalInput, CrystalTextarea } from '@/components/ui/inputs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GradientAvatarSelector } from '../atoms';
import { useTeamForm } from '../../hooks';
import { teamService } from '../../services';
import { useTeamsStore, useTeamById } from '../../stores';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import type { CreateTeamDialogProps } from '../../types';
import { Lock, Globe, Users, Search, Check, Trash2, AlertTriangle } from 'lucide-react';
import { useDialog } from '@/modules/dialogs/hooks/useDialog';
import styles from './CreateTeamDialog.module.scss';

export function CreateTeamDialog({
  isOpen,
  onOpenChange,
  mode = 'create',
  teamId,
  clientId,
  onTeamCreated,
  onTeamUpdated,
  onTeamDeleted,
}: CreateTeamDialogProps & { onTeamDeleted?: () => void }) {
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useSonnerToast();
  const { openConfirm } = useDialog();

  // Get existing team if editing
  const existingTeam = useTeamById(teamId || null);
  const { updateTeam: updateTeamInStore, removeTeam } = useTeamsStore();

  // Get users from data store
  const users = useDataStore(useShallow((state) => state.users));

  // Form hook
  const {
    formData,
    errors,
    updateField,
    validate,
    reset: resetForm,
    setInitialData,
    getTeamInitials,
  } = useTeamForm();

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load team data when editing
  useEffect(() => {
    if (isOpen && mode === 'edit' && existingTeam) {
      setInitialData({
        name: existingTeam.name,
        description: existingTeam.description || '',
        memberIds: existingTeam.memberIds,
        isPublic: existingTeam.isPublic,
        gradientId: existingTeam.gradientId,
        avatarUrl: existingTeam.avatarUrl,
      });
    }
  }, [isOpen, mode, existingTeam, setInitialData]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setSearchQuery('');
    }
  }, [isOpen, resetForm]);

  // Auto-select current user on create
  useEffect(() => {
    if (isOpen && mode === 'create' && user?.id && !formData.memberIds.includes(user.id)) {
      updateField('memberIds', [user.id]);
    }
  }, [isOpen, mode, user?.id, formData.memberIds, updateField]);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(query) ||
        u.role?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Handle user selection toggle
  const handleUserToggle = useCallback(
    (userId: string) => {
      const currentIds = formData.memberIds;
      if (currentIds.includes(userId)) {
        // Don't allow deselecting current user
        if (userId === user?.id) return;
        updateField(
          'memberIds',
          currentIds.filter((id) => id !== userId)
        );
      } else {
        updateField('memberIds', [...currentIds, userId]);
      }
    },
    [formData.memberIds, updateField, user?.id]
  );

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allUserIds = filteredUsers.map((u) => u.id);
    const allSelected = allUserIds.every((id) => formData.memberIds.includes(id));

    if (allSelected) {
      // Deselect all filtered users (but keep current user selected)
      updateField(
        'memberIds',
        formData.memberIds.filter((id) => !allUserIds.includes(id) || id === user?.id)
      );
    } else {
      // Select all filtered users
      const newIds = new Set([...formData.memberIds, ...allUserIds]);
      updateField('memberIds', Array.from(newIds));
    }
  }, [filteredUsers, formData.memberIds, updateField, user?.id]);

  // Check if all filtered users are selected
  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => formData.memberIds.includes(u.id));

  // Handle avatar image upload
  const handleImageUpload = useCallback((url: string) => {
    console.log('[CreateTeamDialog] handleImageUpload called with:', url);
    updateField('avatarUrl', url);
  }, [updateField]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    if (!user) {
      showError('Debes iniciar sesión para crear un equipo');
      return;
    }

    if (!clientId) {
      showError('Debes seleccionar una cuenta primero');
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        // Debug: log formData before creating team
        console.log('[CreateTeamDialog] Creating team with formData:', {
          ...formData,
          avatarUrl: formData.avatarUrl,
          gradientId: formData.gradientId,
        });

        // No llamamos addTeam() porque la suscripción en tiempo real
        // de TeamsView detectará el nuevo equipo automáticamente
        await teamService.createTeam({
          ...formData,
          clientId,
          createdBy: user.id,
        });
        showSuccess(`El equipo "${formData.name}" se ha creado exitosamente.`);
        onTeamCreated?.();
      } else if (mode === 'edit' && teamId) {
        await teamService.updateTeam(teamId, formData);
        updateTeamInStore(teamId, formData);
        showSuccess(`El equipo "${formData.name}" se ha actualizado exitosamente.`);
        onTeamUpdated?.();
      }

      resetForm();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    user,
    clientId,
    validate,
    mode,
    teamId,
    formData,
    updateTeamInStore,
    showSuccess,
    showError,
    onTeamCreated,
    onTeamUpdated,
    resetForm,
    onOpenChange,
  ]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  // Handle delete team
  const handleDeleteTeam = useCallback(() => {
    if (!teamId || !existingTeam) return;

    openConfirm({
      title: `¿Eliminar "${existingTeam.name}"?`,
      description: 'Esta acción eliminará permanentemente el equipo y toda su conversación. Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmText: 'Eliminar equipo',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          await teamService.deleteTeam(teamId);
          removeTeam(teamId);
          showSuccess(`El equipo "${existingTeam.name}" ha sido eliminado.`);
          onTeamDeleted?.();
          resetForm();
          onOpenChange(false);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el equipo';
          showError(errorMessage);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  }, [teamId, existingTeam, openConfirm, removeTeam, showSuccess, showError, onTeamDeleted, resetForm, onOpenChange]);

  // Dialog title/description
  const title = mode === 'create' ? 'Crear nuevo equipo' : 'Editar equipo';
  const description =
    mode === 'create'
      ? 'Configura los detalles del grupo y define quiénes tendrán acceso.'
      : 'Actualiza la información del equipo.';

  // Custom footer
  const customFooter = (
    <div className={styles.footerContainer}>
      {mode === 'edit' && (
        <button
          type="button"
          onClick={handleDeleteTeam}
          disabled={isSubmitting}
          className={styles.deleteButton}
          aria-label="Eliminar equipo"
        >
          <Trash2 size={16} />
          <span>Eliminar</span>
        </button>
      )}
      <DialogActions
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        cancelText="Cancelar"
        submitText={mode === 'create' ? 'Crear Equipo' : 'Guardar Cambios'}
        isLoading={isSubmitting}
        submitVariant="primary"
      />
    </div>
  );

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      mode={mode}
      size="xl"
      isSubmitting={isSubmitting}
      closeOnOverlayClick={false}
      closeOnEscape={true}
      showCloseButton={true}
      footer={customFooter}
    >
      <div className={styles.form}>
        {/* Team Name */}
        <CrystalInput
          id="team-name"
          name="team-name"
          label="Nombre del equipo"
          value={formData.name}
          onChange={(value) => updateField('name', value)}
          placeholder="Nombre del proyecto o área (ej. Desarrollo, Ventas)…"
          error={errors.name}
          disabled={isSubmitting}
          autoFocus
        />

        {/* Team Description */}
        <CrystalTextarea
          id="team-description"
          label="Descripción"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="¿Cuál es el objetivo de este equipo?…"
          rows={3}
          disabled={isSubmitting}
        />

        {/* Gradient Avatar Selector with Upload */}
        <GradientAvatarSelector
          selectedGradientId={formData.gradientId}
          onSelect={(id) => updateField('gradientId', id)}
          teamInitials={getTeamInitials()}
          customImageUrl={formData.avatarUrl}
          onImageUpload={handleImageUpload}
        />

        {/* Team Visibility Switch */}
        <div className={styles.shareOption}>
          <div className={styles.shareOptionHeader}>
            {!formData.isPublic ? (
              <Lock size={18} className={styles.shareOptionIcon} />
            ) : (
              <Globe size={18} className={styles.shareOptionIconMuted} />
            )}
            <div className={styles.shareOptionText}>
              <label htmlFor="team-visibility" className={styles.shareLabel}>
                {!formData.isPublic ? 'Equipo Privado' : 'Equipo Público'}
              </label>
              <p className={styles.shareDescription}>
                {!formData.isPublic
                  ? 'Solo los miembros seleccionados pueden ver este equipo'
                  : 'Este equipo es visible para todos'
                }
              </p>
            </div>
          </div>
          <div className={styles.switchContainer}>
            <button
              type="button"
              role="switch"
              id="team-visibility"
              aria-checked={!formData.isPublic}
              onClick={() => updateField('isPublic', !formData.isPublic)}
              disabled={isSubmitting}
              className={cn(styles.switch, !formData.isPublic && styles.switchActive)}
            >
              <span className={styles.switchThumb} />
            </button>
          </div>
        </div>

        {/* Users Selection Section - Only visible when private */}
        <div className={`${styles.usersSection} ${formData.isPublic ? styles.hidden : ''}`}>
          <div className={styles.usersSectionHeader}>
            <div className={styles.usersSectionTitle}>
              <Users size={18} />
              <span>Miembros del Equipo</span>
            </div>
            <span className={styles.selectedCount}>
              {formData.memberIds.length} seleccionado
              {formData.memberIds.length !== 1 ? 's' : ''}
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
                const isSelected = formData.memberIds.includes(u.id);
                const isCurrentUser = u.id === user?.id;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleUserToggle(u.id)}
                    className={`${styles.userRow} ${isSelected ? styles.selected : ''}`}
                    disabled={isCurrentUser}
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

          {errors.memberIds && (
            <span className={styles.errorText}>{errors.memberIds}</span>
          )}
        </div>

   

     
      </div>
    </CrudDialog>
  );
}

export default CreateTeamDialog;
