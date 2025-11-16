'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropVariants,
  panelVariants,
  transitions,
} from '@/modules/dialog';
import { useAuth } from '@/contexts/AuthContext';
import styles from './ClientOverlay.module.scss';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import Loader from '@/modules/loader';
import { createPortal } from 'react-dom';
import { invalidateClientsCache } from '@/lib/cache-utils';

interface ClientOverlayProps {
  isOpen: boolean;
  isEdit: boolean;
  initialForm?: {
    id?: string;
    name: string;
    imageFile: File | null;
    imagePreview: string;
    projects: string[];
    deleteProjectIndex: number | null;
    deleteConfirm: string;
  };
  onFormSubmit: (form: {
    id?: string;
    name: string;
    imageFile: File | null;
    imagePreview: string;
    projects: string[];
  }) => Promise<void>;
  onClose: () => void;
  isClientLoading: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onAlertChange?: (alert: { type: 'success' | 'fail'; message?: string; error?: string } | null) => void;
}

const ClientOverlay: React.FC<ClientOverlayProps> = ({
  isOpen,
  isEdit,
  initialForm,
  onFormSubmit,
  onClose,
  isClientLoading,
  onLoadingChange,
  onAlertChange,
}) => {
  const { isAdmin, isLoading } = useAuth();
  const { user } = useUser();
  const { success, error } = useSonnerToast();
  const [localIsLoading, setLocalIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [failMessage, setFailMessage] = useState<{ message: string; error: string } | null>(null);
  const [form, setForm] = useState({
    id: initialForm?.id,
    name: initialForm?.name || '',
    imageFile: initialForm?.imageFile || null,
    imagePreview: initialForm?.imagePreview || 'https://storage.googleapis.com/aurin-plattform/assets/empty-image.png',
    projects: initialForm?.projects || [''],
    deleteProjectIndex: initialForm?.deleteProjectIndex || null,
    deleteConfirm: initialForm?.deleteConfirm || '',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Body scroll lock effect
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle loading state
  useEffect(() => {
    if (isOpen) {
      setLocalIsLoading(true);
      const timer = setTimeout(() => {
        if (!isClientLoading) {
          setLocalIsLoading(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isClientLoading]);

  // Update form when initialForm changes
  useEffect(() => {
    if (initialForm) {
      setForm({
        id: initialForm.id,
        name: initialForm.name || '',
        imageFile: initialForm.imageFile || null,
        imagePreview: initialForm.imagePreview || 'https://storage.googleapis.com/aurin-plattform/assets/empty-image.png',
        projects: initialForm.projects || [''],
        deleteProjectIndex: initialForm.deleteProjectIndex || null,
        deleteConfirm: initialForm.deleteConfirm || '',
      });
    }
  }, [initialForm]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validExtensions.includes(file.type)) {
        alert('Por favor, selecciona un archivo de imagen válido (jpg, jpeg, png, gif).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setForm((prev) => ({ ...prev, imageFile: file, imagePreview: reader.result as string }));
      reader.readAsDataURL(file);
    }
  }, []);

  const handleProjectChange = useCallback((index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      projects: prev.projects.map((project, i) => (i === index ? value : project)),
    }));
  }, []);

  const handleAddProject = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      projects: [...prev.projects, ''],
    }));
  }, []);

  const handleDeleteProjectClick = useCallback((index: number) => {
    const projectValue = form.projects[index];
    // Si el proyecto está vacío o solo tiene espacios, eliminar directamente
    if (!projectValue || projectValue.trim() === '') {
      const newProjects = form.projects.filter((_, i) => i !== index);
      setForm((prev) => ({
        ...prev,
        projects: newProjects,
        deleteProjectIndex: null,
        deleteConfirm: '',
      }));
      return;
    }
    
    setForm((prev) => ({
      ...prev,
      deleteProjectIndex: index,
      deleteConfirm: '',
    }));
  }, [form.projects]);

  const handleDeleteProjectConfirm = useCallback(() => {
    if (form.deleteProjectIndex === null) return;
    
    const newProjects = form.projects.filter((_, index) => index !== form.deleteProjectIndex);
    setForm((prev) => ({
      ...prev,
      projects: newProjects,
      deleteProjectIndex: null,
      deleteConfirm: '',
    }));
  }, [form.deleteProjectIndex, form.projects]);

  const handleCancelDeleteConfirm = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      deleteProjectIndex: null,
      deleteConfirm: '',
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAdmin) {
        alert('Solo los administradores pueden guardar clientes.');
        return;
      }
      if (!form.name.trim()) {
        alert('Por favor, escribe el nombre del cliente.');
        return;
      }

      setIsSaving(true);
      if (onLoadingChange) {
        onLoadingChange(true);
      }

      try {
        let imageUrl = form.imagePreview;
        if (form.imageFile) {
          if (form.imagePreview && form.imagePreview !== 'https://storage.googleapis.com/aurin-plattform/assets/empty-image.png') {
            const oldFilePathMatch = form.imagePreview.match(/aurin-plattform\/(.+)/);
            const oldFilePath = oldFilePathMatch ? oldFilePathMatch[1] : null;
            if (oldFilePath) {
              try {
                console.log('[ClientOverlay] Attempting to delete old image:', oldFilePath);
                const deleteResponse = await fetch('/api/delete-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filePath: oldFilePath }),
                });
                if (!deleteResponse.ok) {
                  const errorData = await deleteResponse.json();
                  throw new Error(errorData.error || 'Failed to delete old image');
                }
                console.log('[ClientOverlay] Successfully deleted old image:', oldFilePath);
              } catch (error) {
                console.error('[ClientOverlay] Error deleting old image:', {
                  error: error.message || 'Unknown error',
                  filePath: oldFilePath,
                });
                throw error;
              }
            }
          }

          const formData = new FormData();
          formData.append('file', form.imageFile);
          formData.append('userId', user?.id || 'currentUserId');
          formData.append('type', 'profile');

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            headers: { 'x-clerk-user-id': user?.id || 'currentUserId' },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload image');
          }

          const { url } = await response.json();
          imageUrl = url;
          console.log('[ClientOverlay] Image uploaded via API:', { url });
        }

        await onFormSubmit({
          id: form.id,
          name: form.name,
          imageFile: null,
          imagePreview: imageUrl,
          projects: form.projects.filter((p) => p.trim()),
        });

        // Invalidar cache después de guardar cliente
        invalidateClientsCache();

        // Use Sonner for success notification
        success('Cliente guardado exitosamente.');
        
        // Keep backward compatibility
        setSuccessMessage('Cliente guardado exitosamente.');
        if (onAlertChange) onAlertChange({ type: 'success', message: 'Cliente guardado exitosamente.' });
      } catch (error) {
        console.error('[ClientOverlay] Error saving client:', error);
        // Use Sonner for error notification
        error('Error al guardar el cliente.', error.message || 'Unknown error');
        
        // Keep backward compatibility
        setFailMessage({
          message: 'Error al guardar el cliente.',
          error: error.message || 'Unknown error',
        });
        if (onAlertChange) onAlertChange({ type: 'fail', message: 'Error al guardar el cliente.', error: error.message || 'Unknown error' });
      } finally {
        setIsSaving(false);
        if (onLoadingChange) {
          onLoadingChange(false);
        }
        setForm((prev) => ({ ...prev, imageFile: null }));
      }
    },
    [form, onFormSubmit, onLoadingChange, isAdmin, user?.id, onAlertChange],
  );

  // Keyboard shortcuts handler for inputs
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          e.currentTarget.select();
          break;
        case 'c':
          e.preventDefault();
          const selection = window.getSelection();
          if (selection && selection.toString().length > 0) {
            navigator.clipboard.writeText(selection.toString()).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selection.toString();
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
        case 'v':
          e.preventDefault();
          const targetV = e.currentTarget as HTMLInputElement;
          navigator.clipboard.readText().then(text => {
            if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
              const start = targetV.selectionStart;
              const end = targetV.selectionEnd;
              const currentValue = targetV.value;
              const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
              
              // Update the form state based on which input was modified
              if (targetV.id === 'clientName') {
                setForm(prev => ({ ...prev, name: newValue }));
              } else if (targetV.placeholder?.includes('Proyecto')) {
                const projectIndex = parseInt(targetV.dataset.projectIndex || '0');
                handleProjectChange(projectIndex, newValue);
              } else if (targetV.className.includes('deleteConfirmInput')) {
                setForm(prev => ({ ...prev, deleteConfirm: newValue }));
              }
              
              setTimeout(() => {
                targetV.setSelectionRange(start + text.length, start + text.length);
              }, 0);
            }
          }).catch(() => {
            document.execCommand('paste');
          });
          break;
        case 'x':
          e.preventDefault();
          const targetX = e.currentTarget as HTMLInputElement;
          if (targetX.selectionStart !== targetX.selectionEnd) {
            const selectedText = targetX.value.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).then(() => {
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const currentValue = targetX.value;
                const newValue = currentValue.substring(0, start) + currentValue.substring(end);
                
                // Update the form state based on which input was modified
                if (targetX.id === 'clientName') {
                  setForm(prev => ({ ...prev, name: newValue }));
                } else if (targetX.placeholder?.includes('Proyecto')) {
                  const projectIndex = parseInt(targetX.dataset.projectIndex || '0');
                  handleProjectChange(projectIndex, newValue);
                } else if (targetX.className.includes('deleteConfirmInput')) {
                  setForm(prev => ({ ...prev, deleteConfirm: newValue }));
                }
              }
            }).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
      }
    }
  }, [handleProjectChange]);

  // Animation variants for better performance

  // Animaciones optimizadas para velocidad
  const projectItemVariants = {
    hidden: {
      opacity: 0,
      x: -20,
      height: 0
    },
    visible: {
      opacity: 1,
      x: 0,
      height: 'auto',
      transition: transitions.fast
    },
    exit: {
      opacity: 0,
      x: 20,
      height: 0,
      transition: transitions.ultraFast
    }
  };

  const deleteConfirmVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      height: 'auto',
      scale: 1,
      transition: transitions.fast
    },
    exit: {
      opacity: 0,
      height: 0,
      scale: 0.95,
      transition: transitions.ultraFast
    }
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.02, transition: transitions.ultraFast },
    tap: { scale: 0.98, transition: transitions.ultraFast }
  };

  const handleOverlayClick = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  if (isLoading) {
    return <Loader />;
  }

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={styles.overlay}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={handleOverlayClick}
        >
          <motion.div
            className={styles.modal}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {(localIsLoading || isClientLoading) && (
              <div className={styles.loader}>
                <div className={styles.spinner}></div>
              </div>
            )}
            {!localIsLoading && !isClientLoading && (
              <div className={styles.clientOverlayContent}>
                <div className={styles.clientOverlayHeader}>
                  <h2 className={styles.clientOverlayTitle}>
                    {isEdit ? 'Edita los detalles del cliente' : 'Crea un nuevo cliente'}
                  </h2>
                  <motion.button
                    className={styles.closeButton}
                    onClick={onClose}
                    disabled={isClientLoading}
                    aria-label="Cerrar"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    transition={{ duration: 0.1 }}
                  >
                    <Image src="/x.svg" alt="Cerrar" width={16} height={16} />
                  </motion.button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.field}>
                    <motion.div
                      className={styles.avatar}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      transition={{ duration: 0.1 }}
                    >
                      <Image
                        src={form.imagePreview || '/empty-image.png'}
                        alt="Imagen de la cuenta"
                        width={109}
                        height={109}
                        className={styles.previewImage}
                      />
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleImageChange}
                        disabled={isSaving || isClientLoading}
                      />
                    </motion.div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="clientName" className={styles.label}>
                      Nombre del cliente <span className={styles.required}>*</span>
                    </label>
                    <p className={styles.fieldDescription}>
                      Este nombre aparecerá en las tareas, chats y reportes vinculados.
                    </p>
                    <input
                      id="clientName"
                      type="text"
                      placeholder="Ej. Clínica Azul, Tienda Koala, María González"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      onKeyDown={handleInputKeyDown}
                      className={styles.input}
                      required
                      disabled={isSaving || isClientLoading}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Proyectos</label>
                    <p className={styles.fieldDescription}>
                      Lista de proyectos asociados a esta cuenta.
                    </p>
                    {form.projects.map((project, index) => (
                      <motion.div
                        key={index}
                        className={styles.projectInput}
                        variants={projectItemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                      >
                        <input
                          type="text"
                          placeholder={`Proyecto ${index + 1}`}
                          value={project}
                          onChange={(e) => handleProjectChange(index, e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          data-project-index={index}
                          className={styles.input}
                          disabled={isSaving || isClientLoading}
                        />
                        {form.projects.length > 1 && (
                          <motion.button
                            type="button"
                            onClick={() => handleDeleteProjectClick(index)}
                            className={styles.deleteProjectButton}
                            disabled={isSaving || isClientLoading}
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Image src="/trash-2.svg" alt="Eliminar" width={16} height={16} />
                          </motion.button>
                        )}
                      </motion.div>
                    ))}

                    <AnimatePresence mode="wait">
                      {form.deleteProjectIndex !== null && (
                        <motion.div
                          className={styles.deleteConfirm}
                          variants={deleteConfirmVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{ duration: 0.3 }}
                        >
                          <div className={styles.deleteConfirmHeader}>
                            <Image src="/trash-2.svg" alt="Confirmar" width={12} height={13.33} />
                            <h3>¿Eliminar el proyecto &ldquo;{form.projects[form.deleteProjectIndex] || `Proyecto ${form.deleteProjectIndex + 1}`}&rdquo;?</h3>
                          </div>
                          <p>
                            Esta acción eliminará el historial, las tareas y la información generada
                            por IA para este proyecto.
                          </p>
                          <input
                            type="text"
                            placeholder="Escribe 'Eliminar' para confirmar"
                            value={form.deleteConfirm}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, deleteConfirm: e.target.value }))
                            }
                            onKeyDown={handleInputKeyDown}
                            className={`${styles.deleteConfirmInput} deleteConfirmInput`}
                            disabled={isClientLoading}
                          />
                          <div className={styles.deleteConfirmActions}>
                            <motion.button
                              type="button"
                              onClick={handleDeleteProjectConfirm}
                              className={styles.deleteConfirmButton}
                              disabled={form.deleteConfirm !== 'Eliminar'}
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              transition={{ duration: 0.1 }}
                            >
                              Confirmar
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={handleCancelDeleteConfirm}
                              className={styles.deleteCancelButton}
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              transition={{ duration: 0.1 }}
                            >
                              Cancelar
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="button"
                      onClick={handleAddProject}
                      className={styles.addProjectButton}
                      disabled={isClientLoading}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      transition={{ duration: 0.1 }}
                    >
                      Añadir otro proyecto +
                    </motion.button>
                  </div>

                  <div className={styles.actions}>
                    <motion.button
                      type="submit"
                      className={`${styles.submitButton} ${isSaving ? styles.saving : ''}`}
                      disabled={isSaving || isClientLoading || !isAdmin}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      transition={{ duration: 0.1 }}
                    >
                      {isSaving ? (
                        <>
                          <div className={styles.buttonLoader}></div>
                          Guardando...
                        </>
                      ) : (
                        'Guardar cliente'
                      )}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={onClose}
                      className={styles.cancelButton}
                      disabled={isSaving || isClientLoading}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      transition={{ duration: 0.1 }}
                    >
                      Cancelar
                    </motion.button>
                  </div>
                </form>
              </div>
            )}

            {/* Alerts now handled by Sonner - no need for inline alerts */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ClientOverlay; 