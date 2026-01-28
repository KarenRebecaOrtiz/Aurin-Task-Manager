'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Client } from '@/types';
import {
  backdropVariants,
  panelVariants,
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/modules/dialogs';
import { DialogHeader } from '@/modules/shared/components/molecules';
import { CrystalButton } from '@/modules/shared/components/atoms/CrystalButton';
import { Label } from '@/components/ui/label';
import { SwitchToggle } from '@/components/ui/switch-toggle';
import { Briefcase, Calendar, User, Mail, Phone, MapPin, Building2, Tag, FileText, Trash2, AlertTriangle } from 'lucide-react';
import styles from './AccountDetailsCard.module.scss';
import { invalidateClientsCache } from '@/lib/cache-utils';
import { clientService } from '@/modules/client-crud/services/clientService';
import { useClientsDataStore } from '@/stores/clientsDataStore';
import { useDataStore } from '@/stores/dataStore';

interface AccountDetailsCardProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client | null;
  mode?: 'view' | 'edit' | 'create';
  onSave?: (client: Client) => Promise<void>;
  onDelete?: (clientId: string) => Promise<void>;
}

type AccountDetailsCardComponentProps = AccountDetailsCardProps;

export const AccountDetailsCard: React.FC<AccountDetailsCardComponentProps> = ({
  isOpen,
  onClose,
  client,
  mode: initialMode = 'view',
  onSave,
  onDelete,
}) => {
  const { isAdmin } = useAuth();
  const { user } = useUser();
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode === 'create' ? 'edit' : initialMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removeClient = useClientsDataStore((state) => state.removeClient);
  const setClients = useDataStore((state) => state.setClients);
  const clients = useDataStore((state) => state.clients);

  // Form state
  const [formData, setFormData] = useState<Client>({
    id: client?.id,
    name: client?.name || '',
    imageUrl: client?.imageUrl || 'https://storage.googleapis.com/aurin-plattform/assets/empty-image.png',
    projects: client?.projects || [''],
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    industry: client?.industry || '',
    website: client?.website || '',
    taxId: client?.taxId || '',
    notes: client?.notes || '',
    isActive: client?.isActive ?? true,
    createdAt: client?.createdAt,
    createdBy: client?.createdBy,
    lastModified: client?.lastModified,
    lastModifiedBy: client?.lastModifiedBy,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(formData.imageUrl);

  // Update form when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        id: client.id,
        name: client.name || '',
        imageUrl: client.imageUrl || 'https://storage.googleapis.com/aurin-plattform/assets/empty-image.png',
        projects: client.projects || [''],
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        industry: client.industry || '',
        website: client.website || '',
        taxId: client.taxId || '',
        notes: client.notes || '',
        isActive: client.isActive ?? true,
        createdAt: client.createdAt,
        createdBy: client.createdBy,
        lastModified: client.lastModified,
        lastModifiedBy: client.lastModifiedBy,
      });
      setImagePreview(client.imageUrl || 'https://storage.googleapis.com/aurin-plattform/assets/empty-image.png');
    }
  }, [client]);

  // Reset mode when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode === 'create' ? 'edit' : initialMode);
    }
  }, [isOpen, initialMode]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validExtensions.includes(file.type)) {
        alert('Por favor, selecciona un archivo de imagen válido (jpg, jpeg, png, gif).');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleProjectChange = useCallback((index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.map((project, i) => (i === index ? value : project)),
    }));
  }, []);

  const handleAddProject = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      projects: [...prev.projects, ''],
    }));
  }, []);

  const handleRemoveProject = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!isAdmin) {
      alert('Solo los administradores pueden guardar clientes.');
      return;
    }

    if (!formData.name.trim()) {
      alert('Por favor, escribe el nombre del cliente.');
      return;
    }

    setIsSaving(true);

    try {
      let finalImageUrl = formData.imageUrl;

      // Upload new image if selected
      if (imageFile) {
        // Delete old image if exists
        if (formData.imageUrl && formData.imageUrl !== 'https://storage.googleapis.com/aurin-plattform/assets/empty-image.png') {
          const oldFilePathMatch = formData.imageUrl.match(/aurin-plattform\/(.+)/);
          const oldFilePath = oldFilePathMatch ? oldFilePathMatch[1] : null;
          if (oldFilePath) {
            try {
              await fetch('/api/delete-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: oldFilePath }),
              });
            } catch (error) {
              console.error('Error deleting old image:', error);
            }
          }
        }

        // Upload new image
        const formDataUpload = new FormData();
        formDataUpload.append('file', imageFile);
        formDataUpload.append('userId', user?.id || 'currentUserId');
        formDataUpload.append('type', 'profile');

        const response = await fetch('/api/upload-blob', {
          method: 'POST',
          body: formDataUpload,
          headers: { 'x-clerk-user-id': user?.id || 'currentUserId' },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload image');
        }

        const { url } = await response.json();
        finalImageUrl = url;
      }

      const clientData: Client = {
        ...formData,
        imageUrl: finalImageUrl,
        projects: formData.projects.filter((p) => p.trim()),
        lastModified: new Date().toISOString(),
        lastModifiedBy: user?.id,
      };

      if (onSave) {
        await onSave(clientData);
      }

      // Invalidate cache
      invalidateClientsCache();

      // Switch back to view mode
      setMode('view');
      setImageFile(null);
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error al guardar el cliente.');
    } finally {
      setIsSaving(false);
    }
  }, [formData, imageFile, isAdmin, user?.id, onSave]);

  const handleCancel = useCallback(() => {
    if (mode === 'edit' && initialMode !== 'create') {
      // Revert changes
      if (client) {
        setFormData({
          id: client.id,
          name: client.name || '',
          imageUrl: client.imageUrl || 'https://storage.googleapis.com/aurin-plattform/assets/empty-image.png',
          projects: client.projects || [''],
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          industry: client.industry || '',
          website: client.website || '',
          taxId: client.taxId || '',
          notes: client.notes || '',
          isActive: client.isActive ?? true,
          createdAt: client.createdAt,
          createdBy: client.createdBy,
          lastModified: client.lastModified,
          lastModifiedBy: client.lastModifiedBy,
        });
        setImagePreview(client.imageUrl || 'https://storage.googleapis.com/aurin-plattform/assets/empty-image.png');
      }
      setImageFile(null);
      setMode('view');
    } else {
      onClose();
    }
  }, [mode, initialMode, client, onClose]);

  // Handle delete confirmation
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  }, []);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!isAdmin || !client?.id) {
      alert('Solo los administradores pueden eliminar cuentas.');
      return;
    }

    if (deleteConfirmText !== 'Eliminar') {
      alert('Por favor, escribe "Eliminar" para confirmar.');
      return;
    }

    setIsDeleting(true);

    try {
      // Call API to delete from Firestore
      await clientService.deleteClient(client.id);

      // Update clientsDataStore
      removeClient(client.id);

      // Update dataStore (legacy store)
      const updatedClients = clients.filter((c) => c.id !== client.id);
      setClients(updatedClients);

      // Invalidate cache
      invalidateClientsCache();

      // Call onDelete callback if provided
      if (onDelete) {
        await onDelete(client.id);
      }

      // Close dialogs
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar la cuenta. Por favor, intenta de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  }, [isAdmin, client?.id, deleteConfirmText, removeClient, clients, setClients, onDelete, onClose]);

  const isViewMode = mode === 'view';
  const isCreateMode = initialMode === 'create';

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <motion.div
            className={styles.overlay}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className={styles.card}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <DialogContent className={styles.accountDialog}>
                <DialogHeader
                  title={isCreateMode ? 'Crear Nueva Cuenta' : isViewMode ? 'Detalles de la Cuenta' : 'Editar Cuenta'}
                  description="Gestiona la información de tu cuenta"
                />

                <div className={`${styles.dialogBody} overflow-y-auto flex flex-col`}>
                  <div className={styles.contentGrid}>
                    {/* Avatar and Basic Info */}
                    <div className={styles.avatarSection}>
                      <div
                        className={`${styles.avatarWrapper} ${!isViewMode ? styles.editable : ''}`}
                        onClick={() => !isViewMode && fileInputRef.current?.click()}
                        role={!isViewMode ? 'button' : undefined}
                        tabIndex={!isViewMode ? 0 : undefined}
                      >
                        <Image
                          src={imagePreview}
                          alt={formData.name || 'Client avatar'}
                          width={120}
                          height={120}
                          className={styles.avatar}
                        />
                        {!isViewMode && (
                          <div className={styles.avatarOverlay}>
                            <span>Cambiar imagen</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif"
                          ref={fileInputRef}
                          style={{ display: 'none' }}
                          onChange={handleImageChange}
                          disabled={isViewMode}
                        />
                      </div>

                      <div className={styles.basicInfo}>
                        <div className={styles.field}>
                          <Label htmlFor="clientName">Nombre del Cliente *</Label>
                          {isViewMode ? (
                            <p className={styles.value}>{formData.name || 'N/A'}</p>
                          ) : (
                            <input
                              id="clientName"
                              type="text"
                              placeholder="Ej. Clínica Azul, Tienda Koala"
                              value={formData.name}
                              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                              className={styles.input}
                              required
                            />
                          )}
                        </div>

                        <div className={styles.field}>
                          <Label htmlFor="clientStatus">Estado</Label>
                          <div className={styles.switchField}>
                            {isViewMode ? (
                              <span className={`${styles.statusBadge} ${formData.isActive ? styles.active : styles.inactive}`}>
                                {formData.isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            ) : (
                              <SwitchToggle
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>
                        <User className={styles.sectionIcon} />
                        Información de Contacto
                      </h3>
                      <div className={styles.fieldGrid}>
                        <div className={styles.field}>
                          <Label htmlFor="clientEmail">
                            <Mail className={styles.fieldIcon} />
                            Email
                          </Label>
                          {isViewMode ? (
                            <p className={styles.value}>{formData.email || 'N/A'}</p>
                          ) : (
                            <input
                              id="clientEmail"
                              type="email"
                              placeholder="correo@ejemplo.com"
                              value={formData.email}
                              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                              className={styles.input}
                            />
                          )}
                        </div>

                        <div className={styles.field}>
                          <Label htmlFor="clientPhone">
                            <Phone className={styles.fieldIcon} />
                            Teléfono
                          </Label>
                          {isViewMode ? (
                            <p className={styles.value}>{formData.phone || 'N/A'}</p>
                          ) : (
                            <input
                              id="clientPhone"
                              type="tel"
                              placeholder="+1 234 567 890"
                              value={formData.phone}
                              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                              className={styles.input}
                            />
                          )}
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                          <Label htmlFor="clientAddress">
                            <MapPin className={styles.fieldIcon} />
                            Dirección
                          </Label>
                          {isViewMode ? (
                            <p className={styles.value}>{formData.address || 'N/A'}</p>
                          ) : (
                            <input
                              id="clientAddress"
                              type="text"
                              placeholder="Calle Principal 123, Ciudad"
                              value={formData.address}
                              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                              className={styles.input}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Business Information */}
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>
                        <Building2 className={styles.sectionIcon} />
                        Información del Negocio
                      </h3>
                      <div className={styles.fieldGrid}>
                        <div className={styles.field}>
                          <Label htmlFor="clientIndustry">
                            <Tag className={styles.fieldIcon} />
                            Industria
                          </Label>
                          {isViewMode ? (
                            <p className={styles.value}>{formData.industry || 'N/A'}</p>
                          ) : (
                            <input
                              id="clientIndustry"
                              type="text"
                              placeholder="Ej. Salud, Retail, Tecnología"
                              value={formData.industry}
                              onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                              className={styles.input}
                            />
                          )}
                        </div>

                        <div className={styles.field}>
                          <Label htmlFor="clientWebsite">Sitio Web</Label>
                          {isViewMode ? (
                            <p className={styles.value}>
                              {formData.website ? (
                                <a href={formData.website} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                  {formData.website}
                                </a>
                              ) : (
                                'N/A'
                              )}
                            </p>
                          ) : (
                            <input
                              id="clientWebsite"
                              type="url"
                              placeholder="https://ejemplo.com"
                              value={formData.website}
                              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                              className={styles.input}
                            />
                          )}
                        </div>

                        <div className={styles.field}>
                          <Label htmlFor="clientTaxId">RFC / Tax ID</Label>
                          {isViewMode ? (
                            <p className={styles.value}>{formData.taxId || 'N/A'}</p>
                          ) : (
                            <input
                              id="clientTaxId"
                              type="text"
                              placeholder="ABC123456XYZ"
                              value={formData.taxId}
                              onChange={(e) => setFormData((prev) => ({ ...prev, taxId: e.target.value }))}
                              className={styles.input}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Projects */}
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>
                        <Briefcase className={styles.sectionIcon} />
                        Proyectos
                      </h3>
                      <div className={styles.projectsList}>
                        <AnimatePresence mode="popLayout">
                          {formData.projects.map((project, index) => (
                            <motion.div
                              key={index}
                              className={styles.projectItem}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                            >
                              {isViewMode ? (
                                <p className={styles.projectValue}>{project || `Proyecto ${index + 1}`}</p>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    placeholder={`Proyecto ${index + 1}`}
                                    value={project}
                                    onChange={(e) => handleProjectChange(index, e.target.value)}
                                    className={styles.input}
                                  />
                                  {formData.projects.length > 1 && (
                                    <CrystalButton
                                      variant="secondary"
                                      size="small"
                                      onClick={() => handleRemoveProject(index)}
                                      className={styles.removeButton}
                                    >
                                      ✕
                                    </CrystalButton>
                                  )}
                                </>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {!isViewMode && (
                          <CrystalButton variant="secondary" size="small" onClick={handleAddProject} className={styles.addProjectButton}>
                            + Añadir Proyecto
                          </CrystalButton>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div className={`${styles.section} ${styles.fullWidth}`}>
                      <h3 className={styles.sectionTitle}>
                        <FileText className={styles.sectionIcon} />
                        Notas
                      </h3>
                      {isViewMode ? (
                        <p className={styles.value}>{formData.notes || 'Sin notas'}</p>
                      ) : (
                        <textarea
                          placeholder="Agrega notas adicionales sobre este cliente..."
                          value={formData.notes}
                          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                          className={styles.textarea}
                          rows={4}
                        />
                      )}
                    </div>

                    {/* Metadata */}
                    {!isCreateMode && (
                      <div className={`${styles.section} ${styles.metadata}`}>
                        <div className={styles.metadataGrid}>
                          {formData.createdAt && (
                            <div className={styles.metadataItem}>
                              <Calendar className={styles.metadataIcon} />
                              <span className={styles.metadataLabel}>Creado:</span>
                              <span className={styles.metadataValue}>
                                {new Date(formData.createdAt).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}
                          {formData.lastModified && (
                            <div className={styles.metadataItem}>
                              <Calendar className={styles.metadataIcon} />
                              <span className={styles.metadataLabel}>Última modificación:</span>
                              <span className={styles.metadataValue}>
                                {new Date(formData.lastModified).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className={styles.dialogFooter}>
                  {/* Delete button - only for admins in edit mode, not create mode */}
                  {!isViewMode && isAdmin && !isCreateMode && client?.id && (
                    <CrystalButton
                      variant="secondary"
                      onClick={handleDeleteClick}
                      disabled={isSaving || isDeleting}
                      className={styles.deleteButton}
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </CrystalButton>
                  )}

                  <div className={styles.footerActions}>
                    <CrystalButton variant="secondary" onClick={handleCancel} disabled={isSaving || isDeleting}>
                      {isViewMode ? 'Cerrar' : 'Cancelar'}
                    </CrystalButton>

                    {isViewMode && isAdmin && (
                      <CrystalButton variant="primary" onClick={() => setMode('edit')}>
                        Editar
                      </CrystalButton>
                    )}

                    {!isViewMode && (
                      <CrystalButton variant="primary" onClick={handleSave} loading={isSaving} disabled={isSaving || isDeleting}>
                        {isSaving ? 'Guardando...' : 'Guardar'}
                      </CrystalButton>
                    )}
                  </div>
                </DialogFooter>

                {/* Delete Confirmation Dialog */}
                <AnimatePresence>
                  {showDeleteConfirm && (
                    <motion.div
                      className={styles.deleteConfirmOverlay}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleCancelDelete}
                    >
                      <motion.div
                        className={styles.deleteConfirmDialog}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={styles.deleteConfirmHeader}>
                          <AlertTriangle className={styles.warningIcon} size={24} />
                          <h3>Eliminar Cuenta</h3>
                        </div>

                        <div className={styles.deleteConfirmContent}>
                          <p className={styles.deleteWarning}>
                            <strong>Esta acción no se puede deshacer.</strong>
                          </p>
                          <p>
                            Al eliminar la cuenta <strong>&ldquo;{client?.name}&rdquo;</strong>, las tareas asociadas
                            no serán eliminadas, pero deberán ser reasignadas manualmente a otra cuenta.
                          </p>
                          <p className={styles.deleteNote}>
                            <AlertTriangle size={14} />
                            Las tareas sin cuenta asignada no aparecerán en los filtros del sistema ni podrán
                            ser relacionadas con otras tareas hasta ser reasignadas.
                          </p>

                          <div className={styles.deleteConfirmInput}>
                            <label htmlFor="deleteConfirm">
                              Escribe <strong>&ldquo;Eliminar&rdquo;</strong> para confirmar:
                            </label>
                            <input
                              id="deleteConfirm"
                              type="text"
                              value={deleteConfirmText}
                              onChange={(e) => setDeleteConfirmText(e.target.value)}
                              placeholder="Eliminar"
                              autoFocus
                              disabled={isDeleting}
                            />
                          </div>
                        </div>

                        <div className={styles.deleteConfirmActions}>
                          <CrystalButton
                            variant="secondary"
                            onClick={handleCancelDelete}
                            disabled={isDeleting}
                          >
                            Cancelar
                          </CrystalButton>
                          <CrystalButton
                            variant="primary"
                            onClick={handleConfirmDelete}
                            loading={isDeleting}
                            disabled={deleteConfirmText !== 'Eliminar' || isDeleting}
                            className={styles.deleteConfirmButton}
                          >
                            {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                          </CrystalButton>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </DialogContent>
            </motion.div>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default AccountDetailsCard;
