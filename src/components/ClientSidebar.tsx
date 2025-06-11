'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import styles from './ClientSidebar.module.scss';
import { memo } from 'react';

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
}

const ClientSidebar: React.FC<ClientSidebarProps> = memo(
  ({ isOpen, isEdit, initialForm, onFormSubmit, onClose, isClientLoading }) => {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [form, setForm] = useState({
      id: initialForm?.id,
      name: initialForm?.name || '',
      imageFile: initialForm?.imageFile || null,
      imagePreview: initialForm?.imagePreview || '/default-avatar.png',
      projects: initialForm?.projects || [''],
      deleteProjectIndex: initialForm?.deleteProjectIndex || null,
      deleteConfirm: initialForm?.deleteConfirm || '',
    });

    // Animation effect
    useEffect(() => {
      if (sidebarRef.current) {
        if (isOpen) {
          setIsLoading(true);
          gsap.fromTo(
            sidebarRef.current,
            { x: '100%', opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.3,
              ease: 'power2.out',
              onComplete: () => setIsLoading(false),
            },
          );
        } else {
          gsap.to(sidebarRef.current, {
            x: '100%',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: onClose,
          });
        }
      }
      return () => {
        if (sidebarRef.current) {
          gsap.killTweensOf(sidebarRef.current);
        }
      };
    }, [isOpen, onClose]);

    // Click outside to close
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target as Node) &&
          isOpen &&
          !isClientLoading
        ) {
          gsap.to(sidebarRef.current, {
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

    // Reset form when initialForm changes
    useEffect(() => {
      if (initialForm) {
        setForm({
          id: initialForm.id,
          name: initialForm.name || '',
          imageFile: initialForm.imageFile || null,
          imagePreview: initialForm.imagePreview || '/default-avatar.png',
          projects: initialForm.projects || [''],
          deleteProjectIndex: initialForm.deleteProjectIndex || null,
          deleteConfirm: initialForm.deleteConfirm || '',
        });
      }
    }, [initialForm]);

    const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setForm((prev) => ({ ...prev, imageFile: file }));
        const reader = new FileReader();
        reader.onload = () => setForm((prev) => ({ ...prev, imagePreview: reader.result as string }));
        reader.readAsDataURL(file);
      }
    }, []);

    const handleProjectChange = useCallback((index: number, value: string) => {
      setForm((prev) => {
        const newProjects = [...prev.projects];
        newProjects[index] = value;
        return { ...prev, projects: newProjects };
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

    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
          alert('El nombre de la cuenta es obligatorio.');
          return;
        }
        await onFormSubmit({
          id: form.id,
          name: form.name,
          imageFile: form.imageFile,
          imagePreview: form.imagePreview,
          projects: form.projects.filter((p) => p.trim()),
        });
      },
      [form, onFormSubmit],
    );

    if (!isOpen) return null;

    return (
      <div className={`${styles.container} ${isOpen ? styles.open : ''}`} ref={sidebarRef}>
        {isLoading || isClientLoading ? (
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.header}>
              <button
                className={styles.closeButton}
                onClick={() => {
                  gsap.to(sidebarRef.current, {
                    x: '100%',
                    opacity: 0,
                    duration: 0.3,
                    ease: 'power2.in',
                    onComplete: onClose,
                  });
                }}
                disabled={isClientLoading}
              >
                <Image src="/arrow-left.svg" alt="Close" width={15} height={16} />
              </button>
              <h2 className={styles.title}>
                {isEdit ? 'Editar Cliente' : '¿Cómo se llama tu cliente o empresa?'}
              </h2>
            </div>
            <p className={styles.subtitle}>
              Elige un nombre claro para reconocer esta cuenta fácilmente.{' '}
              <strong>Sólo tú puedes editar o eliminar esta cuenta.</strong>
            </p>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Imagen de Cuenta</label>
                <div
                  className={styles.avatar}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                  <Image
                    src={form.imagePreview || '/empty-image.png'}
                    alt="Avatar del cliente"
                    width={109}
                    height={109}
                    className={styles.previewImage}
                    onError={() => console.warn('Image load failed:', form.imagePreview)}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                    aria-label="Subir imagen de cliente"
                    disabled={isClientLoading}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="clientName" className={styles.label}>
                  Nombre de Cuenta <span className={styles.required}>*</span>
                </label>
                <p className={styles.fieldDescription}>
                  Este nombre aparecerá en todas las tareas, carpetas y vistas del sistema.
                </p>
                <input
                  id="clientName"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Coca-Cola, Agencia Delta, Clínica Sol"
                  className={styles.input}
                  required
                  aria-required="true"
                  disabled={isClientLoading}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Proyectos</label>
                <p className={styles.fieldDescription}>
                  Organiza las tareas de este cliente creando proyectos a tu medida.{' '}
                  <strong>Puedes añadir nuevos proyectos en cualquier momento desde el menú “Acciones” de la cuenta.</strong>
                </p>
                {form.projects.map((project, index) => (
                  <div key={index} className={styles.projectField}>
                    <div className={styles.projectInputWrapper}>
                      <input
                        type="text"
                        value={project}
                        onChange={(e) => handleProjectChange(index, e.target.value)}
                        placeholder={`Proyecto ${index + 1}`}
                        className={styles.input}
                        aria-label={`Nombre del proyecto ${index + 1}`}
                        disabled={isClientLoading}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteProjectClick(index)}
                        className={styles.deleteProjectButton}
                        aria-label={`Eliminar proyecto ${index + 1}`}
                        disabled={isClientLoading}
                      >
                        <Image
                          src="/trash-2.svg"
                          alt="Eliminar proyecto"
                          width={16}
                          height={16}
                          onError={(e) => {
                            e.currentTarget.src = '/fallback-trash.svg';
                          }}
                        />
                      </button>
                    </div>
                    {form.deleteProjectIndex === index && (
                      <div className={styles.deleteConfirm}>
                        <div className={styles.deleteConfirmHeader}>
                          <Image
                            src="/trash-2.svg"
                            alt="Confirmar eliminación"
                            width={12}
                            height={13.33}
                            onError={(e) => {
                              e.currentTarget.src = '/fallback-trash';
                            }}
                          />
                          <h3>
                            ¿Estás seguro de que quieres eliminar el proyecto “
                            {project || `Proyecto ${index + 1}`}”?
                          </h3>
                        </div>
                        <p>
                          Al eliminar este proyecto, también se eliminarán:
                          <br />
                          Todas las tareas asociadas
                          <br />
                          Historial de chats y actividad
                          <br />
                          Conocimiento generado por la IA para este proyecto
                          <br />
                          ⚠️ Esta acción es permanente y no se puede deshacer.
                        </p>
                        <input
                          type="text"
                          placeholder="Escribe ‘Eliminar’ para confirmar esta acción"
                          value={form.deleteConfirm}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              deleteConfirm: e.target.value,
                            }))
                          }
                          className={styles.deleteConfirmInput}
                          aria-label="Confirmar eliminación escribiendo 'Eliminar'"
                          disabled={isClientLoading}
                        />
                        <button
                          type="button"
                          onClick={handleDeleteProjectConfirm}
                          disabled={form.deleteConfirm.toLowerCase() !== 'eliminar' || isClientLoading}
                          className={styles.deleteConfirmButton}
                        >
                          Sí, eliminar todo
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddProject}
                  className={styles.addProjectButton}
                  aria-label="Añadir nuevo proyecto"
                  disabled={isClientLoading}
                >
                  +
                </button>
              </div>
              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isClientLoading}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={styles.cancelButton}
                  disabled={isClientLoading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  },
);

ClientSidebar.displayName = 'ClientSidebar';

export default ClientSidebar;