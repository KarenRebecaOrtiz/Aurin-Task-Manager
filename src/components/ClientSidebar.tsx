'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import styles from './ClientSidebar.module.scss';
import { memo } from 'react';
import SuccessAlert from './SuccessAlert';
import FailAlert from './FailAlert';

interface ClientSidebarProps {
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
  onAlertChange?: (alert: { type: 'success' | 'fail'; message?: string; error?: string } | null) => void; // Add this line
}

const ClientSidebar: React.FC<ClientSidebarProps> = memo(
  ({ isOpen, isEdit, initialForm, onFormSubmit, onClose, isClientLoading, onLoadingChange }) => {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(true); // Local loading state
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

    useEffect(() => {
      const currentSidebar = sidebarRef.current;
      if (currentSidebar) {
        if (isOpen) {
          setIsLoading(true);
          gsap.fromTo(
            currentSidebar,
            { x: '100%', opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.3,
              ease: 'power2.out',
              onComplete: () => !isClientLoading && setIsLoading(false),
            },
          );
        } else {
          gsap.to(currentSidebar, {
            x: '100%',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: onClose,
          });
        }
      }
      return () => {
        if (currentSidebar) {
          gsap.killTweensOf(currentSidebar);
        }
      };
    }, [isOpen, onClose, isClientLoading]);

    useEffect(() => {
      const currentSidebar = sidebarRef.current;
      const handleClickOutside = (event: MouseEvent) => {
        if (
          currentSidebar &&
          !currentSidebar.contains(event.target as Node) &&
          isOpen &&
          !isClientLoading
        ) {
          gsap.to(currentSidebar, {
            x: '100%',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: onClose,
          });
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, isClientLoading, onClose]);

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
    
    // Update the input in the JSX
    <input
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/gif" // Restrict file types
      ref={fileInputRef}
      style={{ display: 'none' }}
      onChange={handleImageChange}
      disabled={isClientLoading}
    />
    const handleProjectChange = useCallback((index: number, value: string) => {
      setForm((prev) => {
        const updated = [...prev.projects];
        updated[index] = value;
        return { ...prev, projects: updated };
      });
    }, []);

    const handleAddProject = useCallback(() => {
      setForm((prev) => ({ ...prev, projects: [...prev.projects, ''] }));
    }, []);

    const handleDeleteProjectClick = useCallback((index: number) => {
      setForm((prev) => ({ ...prev, deleteProjectIndex: index }));
    }, []);

    const handleDeleteProjectConfirm = useCallback(() => {
      if (form.deleteConfirm.toLowerCase() === 'eliminar') {
        setForm((prev) => ({
          ...prev,
          projects: prev.projects.filter((_, i) => i !== prev.deleteProjectIndex),
          deleteProjectIndex: null,
          deleteConfirm: '',
        }));
      }
    }, [form.deleteConfirm]);

    const handleCancelDeleteConfirm = useCallback(() => {
      setForm((prev) => ({ ...prev, deleteProjectIndex: null, deleteConfirm: '' }));
    }, []);

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
          alert('Por favor, escribe el nombre del cliente.');
          return;
        }
    
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
                  console.log('[ClientSidebar] Attempting to delete old image:', oldFilePath);
                  const deleteResponse = await fetch('/api/delete-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePath: oldFilePath }),
                  });
                  if (!deleteResponse.ok) {
                    const errorData = await deleteResponse.json();
                    throw new Error(errorData.error || 'Failed to delete old image');
                  }
                  console.log('[ClientSidebar] Successfully deleted old image:', oldFilePath);
                } catch (error) {
                  console.error('[ClientSidebar] Error deleting old image:', {
                    error: error.message || 'Unknown error',
                    filePath: oldFilePath,
                  });
                  throw error;
                }
              }
            }
    
            const formData = new FormData();
            formData.append('file', form.imageFile);
            formData.append('userId', 'currentUserId'); // Replace with useUser().id
            formData.append('type', 'profile');
    
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
              headers: { 'x-clerk-user-id': 'currentUserId' }, // Replace with useUser().id
            });
    
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to upload image');
            }
    
            const { url } = await response.json();
            imageUrl = url;
            console.log('[ClientSidebar] Image uploaded via API:', { url });
          }
    
          await onFormSubmit({
            id: form.id,
            name: form.name,
            imageFile: null,
            imagePreview: imageUrl,
            projects: form.projects.filter((p) => p.trim()),
          });
    
          setSuccessMessage('Cliente guardado exitosamente.');
        } catch (error) {
          console.error('[ClientSidebar] Error saving client:', error);
          setFailMessage({
            message: 'Error al guardar el cliente.',
            error: error.message || 'Unknown error',
          });
        } finally {
          if (onLoadingChange) {
            onLoadingChange(false);
          }
          setForm((prev) => ({ ...prev, imageFile: null }));
        }
      },
      [form, onFormSubmit, onLoadingChange],
    );

    if (!isOpen) return null;

    return (
      <div ref={sidebarRef} className={`${styles.container} ${styles.open}`}>
        {(isLoading || isClientLoading) && (
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
          </div>
        )}
        {!isLoading && !isClientLoading && (
          <div className={styles.content}>
            <div className={styles.header} style={{ alignItems: 'start' }}>
              <button
                className={styles.closeButton}
                onClick={() =>
                  gsap.to(sidebarRef.current, {
                    x: '100%',
                    opacity: 0,
                    duration: 0.3,
                    ease: 'power2.in',
                    onComplete: onClose,
                  })
                }
                disabled={isClientLoading}
                aria-label="Cerrar"
              >
                <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
              </button>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 className={styles.title}>
                  {isEdit ? 'Edita los detalles del cliente' : 'Crea un nuevo cliente'}
                </h2>
                <p className={styles.subtitle}>
                  Este será el nombre de referencia para la cuenta. Solo tú puedes modificarla más
                  adelante.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <div
                  className={styles.avatar}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
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
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                    disabled={isClientLoading}
                  />
                </div>
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
                  className={styles.input}
                  required
                  disabled={isClientLoading}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Proyectos activos</label>
                <p className={styles.fieldDescription}>
                  Asocia este cliente con uno o más proyectos para organizarlos por separado.
                </p>
                {form.projects.map((project, index) => (
                  <div key={index} className={styles.projectField} style={{ width: '100%' }}>
                    <div className={styles.projectInputWrapper} style={{ width: '100%' }}>
                      <input
                        type="text"
                        value={project}
                        onChange={(e) => handleProjectChange(index, e.target.value)}
                        placeholder={`Proyecto ${index + 1}`}
                        className={styles.input}
                        disabled={isClientLoading}
                        style={{ width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteProjectClick(index)}
                        className={styles.deleteProjectButton}
                        disabled={isClientLoading}
                      >
                        <Image src="/trash-2.svg" alt="Eliminar" width={16} height={16} />
                      </button>
                    </div>

                    {form.deleteProjectIndex === index && (
                      <div className={styles.deleteConfirm}>
                        <div className={styles.deleteConfirmHeader}>
                          <Image src="/trash-2.svg" alt="Confirmar" width={12} height={13.33} />
                          <h3>¿Eliminar el proyecto “{project || `Proyecto ${index + 1}`}”?</h3>
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
                          className={styles.deleteConfirmInput}
                          disabled={isClientLoading}
                        />

                        <button
                          type="button"
                          className={styles.deleteConfirmButton}
                          onClick={handleDeleteProjectConfirm}
                          disabled={
                            form.deleteConfirm.toLowerCase() !== 'eliminar' || isClientLoading
                          }
                          style={{ width: '100%' }}
                        >
                          Confirmar eliminación
                        </button>

                        <button
                          type="button"
                          className={`${styles.cancelDeleteConfirmButton} ${!styles.cancelDeleteConfirmButton ? styles.cancelButton : ''}`}
                          onClick={handleCancelDeleteConfirm}
                          disabled={isClientLoading}
                          style={{ width: '100%' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddProject}
                  className={styles.addProjectButton}
                  disabled={isClientLoading}
                  style={{ width: '100%' }}
                >
                  Añadir otro proyecto +
                </button>
              </div>

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isClientLoading}
                  style={{ width: '100%' }}
                >
                  Guardar cliente
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={styles.cancelButton}
                  disabled={isClientLoading}
                  style={{ width: '100%' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
        {successMessage && (
          <SuccessAlert
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        )}
        {failMessage && (
          <FailAlert
            message={failMessage.message}
            error={failMessage.error}
            onClose={() => setFailMessage(null)}
          />
        )}
      </div>
    );
  },
);

ClientSidebar.displayName = 'ClientSidebar';
export default ClientSidebar;