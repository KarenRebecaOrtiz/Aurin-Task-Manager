/**
 * Users Management Dialog
 *
 * Admin-only dialog for viewing, creating, and deleting users.
 * Uses Clerk SDK for user management.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '../../DialogPrimitives';
import { DialogFooter } from '../../molecules';
import { DialogLoadingState } from '../../atoms';
import { panelVariants } from '../../../config/animations';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { useDialog } from '../../../hooks/useDialog';
import { CreateUserDialog } from './CreateUserDialog';
import styles from './UsersDialog.module.scss';
import { Plus, Pencil, Trash2, X, Users, Mail, Shield, ShieldCheck } from 'lucide-react';

interface User {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
  imageUrl: string;
  publicMetadata?: {
    access?: string;
  };
}

interface UsersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsersDialog({ isOpen, onOpenChange }: UsersDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const { success: showSuccess, error: showError } = useSonnerToast();
  const { openConfirm } = useDialog();
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Fetch users from Clerk via API
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users');
      const result = await response.json();

      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        throw new Error(result.error || 'Error al obtener usuarios');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Error al cargar usuarios', 'No se pudieron obtener los usuarios del sistema');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load users when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setIsEditMode(false);
    }
  }, [isOpen, fetchUsers]);

  // Handle user deletion
  const handleDeleteUser = useCallback(async (user: User) => {
    const userName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || 'Usuario';
    const userEmail = user.emailAddresses[0]?.emailAddress || '';

    openConfirm({
      title: 'Eliminar Usuario',
      description: `¿Estás seguro de eliminar a "${userName}"${userEmail ? ` (${userEmail})` : ''}? Esta acción es irreversible y eliminará todos los datos asociados al usuario.`,
      variant: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          setDeletingUserId(user.id);

          const response = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIdToDelete: user.id }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Error al eliminar usuario');
          }

          // Remove user from local state
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
          showSuccess(`Usuario "${userName}" eliminado exitosamente`);
        } catch (error) {
          console.error('Error deleting user:', error);
          showError(
            'Error al eliminar usuario',
            error instanceof Error ? error.message : 'No se pudo eliminar el usuario'
          );
        } finally {
          setDeletingUserId(null);
        }
      },
    });
  }, [openConfirm, showSuccess, showError]);

  // Handle user creation success
  const handleUserCreated = useCallback(() => {
    setIsCreateDialogOpen(false);
    fetchUsers();
  }, [fetchUsers]);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  // Close dialog
  const handleClose = useCallback(() => {
    setIsEditMode(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // Render user list
  const renderUserList = () => {
    if (users.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Users size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No hay usuarios en el sistema</p>
          <p className={styles.emptySubtext}>Crea un nuevo usuario para comenzar</p>
        </div>
      );
    }

    return (
      <div className={styles.userList}>
        {users.map((user) => {
          const isAdmin = user.publicMetadata?.access === 'admin';
          const displayName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.username || 'Usuario';
          const email = user.emailAddresses[0]?.emailAddress || '';
          const isDeleting = deletingUserId === user.id;

          return (
            <motion.div
              key={user.id}
              className={styles.userItem}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isDeleting ? 0.5 : 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.userAvatar}>
                {user.imageUrl ? (
                  <Image
                    src={user.imageUrl}
                    alt={displayName}
                    width={40}
                    height={40}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {displayName}
                  {isAdmin && (
                    <span className={styles.adminBadge}>
                      <ShieldCheck size={12} />
                      Admin
                    </span>
                  )}
                </div>
                <div className={styles.userEmail}>
                  <Mail size={12} />
                  {email}
                </div>
              </div>

              <AnimatePresence>
                {isEditMode && !isAdmin && (
                  <motion.button
                    className={styles.deleteButton}
                    onClick={() => handleDeleteUser(user)}
                    disabled={isDeleting}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    aria-label={`Eliminar ${displayName}`}
                  >
                    {isDeleting ? (
                      <span className={styles.spinner} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Loading state
  if (isLoading && isOpen) {
    return (
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent size="lg">
          <DialogLoadingState message="Cargando usuarios..." />
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  return (
    <>
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent
          size="lg"
          closeOnOverlayClick={false}
          showCloseButton={true}
        >
          {isMobile ? (
            // Mobile layout
            <>
              <ResponsiveDialogHeader>
                <div className={styles.header}>
                  <ResponsiveDialogTitle>Gestión de Usuarios</ResponsiveDialogTitle>
                  <div className={styles.headerActions}>
                    <button
                      className={`${styles.headerButton} ${isEditMode ? styles.active : ''}`}
                      onClick={toggleEditMode}
                      aria-label={isEditMode ? 'Salir de modo edición' : 'Modo edición'}
                    >
                      {isEditMode ? <X size={18} /> : <Pencil size={18} />}
                    </button>
                  </div>
                </div>
                <p className={styles.userCount}>
                  <Users size={14} />
                  {users.length} usuario{users.length !== 1 ? 's' : ''} en el sistema
                </p>
              </ResponsiveDialogHeader>

              <ResponsiveDialogBody>
                {renderUserList()}
              </ResponsiveDialogBody>

              <ResponsiveDialogFooter>
                <button
                  className={styles.createButton}
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus size={18} />
                  Crear nuevo usuario
                </button>
              </ResponsiveDialogFooter>
            </>
          ) : (
            // Desktop layout
            <AnimatePresence mode="wait">
              {isOpen && (
                <motion.div
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={styles.dialogInner}
                >
                  <div className={styles.header}>
                    <div className={styles.headerTitle}>
                      <Shield size={24} className={styles.headerIcon} />
                      <div>
                        <h2 className={styles.title}>Gestión de Usuarios</h2>
                        <p className={styles.userCount}>
                          <Users size={14} />
                          {users.length} usuario{users.length !== 1 ? 's' : ''} en el sistema
                        </p>
                      </div>
                    </div>
                    <div className={styles.headerActions}>
                      <button
                        className={`${styles.headerButton} ${isEditMode ? styles.active : ''}`}
                        onClick={toggleEditMode}
                        title={isEditMode ? 'Salir de modo edición' : 'Modo edición'}
                      >
                        {isEditMode ? <X size={18} /> : <Pencil size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.content}>
                    {renderUserList()}
                  </div>

                  <DialogFooter>
                    <button
                      className={styles.createButton}
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus size={18} />
                      Crear nuevo usuario
                    </button>
                  </DialogFooter>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Create User Dialog */}
      <CreateUserDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onUserCreated={handleUserCreated}
      />
    </>
  );
}
