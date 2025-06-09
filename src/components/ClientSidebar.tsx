'use client';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import styles from './ClientSidebar.module.scss';
import { memo } from 'react';

interface ClientSidebarProps {
  isOpen: boolean;
  isEdit: boolean;
  clientForm: {
    id?: string;
    name: string;
    imageFile: File | null;
    imagePreview: string;
    projects: string[];
    deleteProjectIndex: number | null;
    deleteConfirm: string;
  };
  setClientForm: React.Dispatch<
    React.SetStateAction<{
      id?: string;
      name: string;
      imageFile: File | null;
      imagePreview: string;
      projects: string[];
      deleteProjectIndex: number | null;
      deleteConfirm: string;
    }>
  >;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProjectChange: (index: number, value: string) => void;
  handleAddProject: () => void;
  handleDeleteProjectClick: (index: number) => void;
  handleDeleteProjectConfirm: () => void;
  handleClientSubmit: (e: React.FormEvent, clientId?: string) => Promise<void>;
  onClose: () => void;
  isClientLoading: boolean;
}

const ClientSidebar: React.FC<ClientSidebarProps> = memo(
  ({
    isOpen,
    isEdit,
    clientForm,
    setClientForm,
    fileInputRef,
    handleImageChange,
    handleProjectChange,
    handleAddProject,
    handleDeleteProjectClick,
    handleDeleteProjectConfirm,
    handleClientSubmit,
    onClose,
    isClientLoading,
  }) => {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Log para rastrear renderizados
    useEffect(() => {
      console.log('ClientSidebar rendered', { isOpen, imagePreview: clientForm.imagePreview });
    }, [isOpen, clientForm.imagePreview]);

    // Animación de entrada/salida como ChatSidebar
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
          console.log('ClientSidebar opened');
        } else {
          gsap.to(sidebarRef.current, {
            x: '100%',
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: onClose,
          });
          console.log('ClientSidebar closed');
        }
      }
      return () => {
        if (sidebarRef.current) {
          gsap.killTweensOf(sidebarRef.current);
        }
      };
    }, [isOpen, onClose]);

    // Cierre por clic fuera
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
          console.log('Closed ClientSidebar via outside click');
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, isClientLoading, onClose]);

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
            <form
              onSubmit={(e) => handleClientSubmit(e, isEdit ? clientForm.id : undefined)}
              className={styles.form}
            >
              <div className={styles.field}>
                <label className={styles.label}>Imagen de Cuenta</label>
                <div
                  className={styles.avatar}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && fileInputRef.current?.click()
                  }
                >
                  <Image
                    src={clientForm.imagePreview || '/empty-image.png'}
                    alt="Avatar del cliente"
                    width={109}
                    height={109}
                    className={styles.previewImage}
                    onError={() => console.warn('Image load failed:', clientForm.imagePreview)}
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
                  value={clientForm.name}
                  onChange={(e) =>
                    setClientForm((prev) => ({ ...prev, name: e.target.value }))
                  }
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
                  <strong>
                    Puedes añadir nuevos proyectos en cualquier momento desde el menú
                    “Acciones” de la cuenta.
                  </strong>
                </p>
                {clientForm.projects.map((project, index) => (
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
                    {clientForm.deleteProjectIndex === index && (
                      <div className={styles.deleteConfirm}>
                        <div className={styles.deleteConfirmHeader}>
                          <Image
                            src="/trash-2.svg"
                            alt="Confirmar eliminación"
                            width={12}
                            height={13.33}
                            onError={(e) => {
                              e.currentTarget.src = '/fallback-trash.svg';
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
                          value={clientForm.deleteConfirm}
                          onChange={(e) =>
                            setClientForm((prev) => ({
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
                          onClick={() => handleDeleteProjectConfirm()}
                          disabled={
                            clientForm.deleteConfirm.toLowerCase() !== 'eliminar' ||
                            isClientLoading
                          }
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