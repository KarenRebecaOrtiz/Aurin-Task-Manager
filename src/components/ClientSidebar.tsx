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

    /* ---------- Animaciones de apertura / cierre ---------- */
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
      return () => gsap.killTweensOf(sidebarRef.current);
    }, [isOpen, onClose]);

    /* ---------- Cierre al hacer clic fuera ---------- */
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

    /* ---------- Sincronizar formulario con props ---------- */
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

    /* ---------- Handlers de imagen y proyectos ---------- */
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

    /* ---------- NEW ⟵ cancelar confirmación ---------- */
    const handleCancelDeleteConfirm = useCallback(() => {
      setForm((prev) => ({ ...prev, deleteProjectIndex: null, deleteConfirm: '' }));
    }, []);

    /* ---------- Submit ---------- */
    const handleSubmit = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
          alert('Por favor, escribe el nombre del cliente.');
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
      <div ref={sidebarRef} className={`${styles.container} ${styles.open}`}>
        {isLoading || isClientLoading ? (
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
          </div>
        ) : (
          <div className={styles.content}>
            {/* ---------- Header ---------- */}
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

            {/* ---------- Form ---------- */}
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Avatar */}
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

              {/* Nombre del cliente */}
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

              {/* Proyectos */}
              <div className={styles.field}>
                <label className={styles.label}>Proyectos activos</label>
                <p className={styles.fieldDescription}>
                  Asocia este cliente con uno o más proyectos para organizarlos por separado.
                </p>
                {form.projects.map((project, index) => (
                  <div key={index} className={styles.projectField} style={{ width: '100%' }}>
                    <div
                      className={styles.projectInputWrapper}
                      style={{ width: '100%' }}
                    >
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

                    {/* Confirmación para eliminar proyecto */}
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

                        {/* Botón confirmar */}
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

                        {/* ---------- NEW ⟵ botón cancelar ---------- */}
                        <button
                          type="button"
                          className={
                            styles.cancelDeleteConfirmButton || styles.cancelButton /* fallback */
                          }
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

                {/* Añadir proyecto */}
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

              {/* Acciones finales */}
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
      </div>
    );
  },
);

ClientSidebar.displayName = 'ClientSidebar';
export default ClientSidebar;
