'use client';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import styles from './ClientsTable.module.scss';
import { memo } from 'react';

interface ClientPopupProps {
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
  setClientForm: React.Dispatch<React.SetStateAction<{
    id?: string;
    name: string;
    imageFile: File | null;
    imagePreview: string;
    projects: string[];
    deleteProjectIndex: number | null;
    deleteConfirm: string;
  }>>;
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

const ClientPopup: React.FC<ClientPopupProps> = memo(
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
    const popupRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      if (isOpen && popupRef.current) {
        setIsLoading(true);
        gsap.set(popupRef.current, { opacity: 0, scale: 0.8 });
        setTimeout(() => {
          setIsLoading(false);
          gsap.to(popupRef.current, {
            opacity: 1,
            scale: 1,
            duration: 0.2,
            ease: 'power2.out',
          });
        }, 100);
      }
      return () => {
        if (popupRef.current) {
          gsap.killTweensOf(popupRef.current);
        }
      };
    }, [isOpen]);

    useEffect(() => {
      const currentPopupRef = popupRef.current;
      const handleClickOutside = (event: MouseEvent) => {
        if (
          currentPopupRef &&
          !currentPopupRef.contains(event.target as Node) &&
          isOpen &&
          !isClientLoading
        ) {
          gsap.to(currentPopupRef, {
            opacity: 0,
            y: 50,
            scale: 0.95,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: onClose,
          });
        }
      };
    
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, isClientLoading, onClose, popupRef]);

    if (!isOpen) return null;

    return (
      <div className={styles.popupOverlay}>
        <div className={styles.popup} ref={popupRef}>
          {isLoading || isClientLoading ? (
            <div className={styles.loader}>
              <div className={styles.spinner}></div>
            </div>
          ) : (
            <div className={styles.popupContent}>
              <h2 className={styles.popupTitle}>
                {isEdit ? 'Editar Cliente' : '¿Cómo se llama tu cliente o empresa?'}
              </h2>
              <p className={styles.popupSubtitle}>
                Elige un nombre claro para reconocer esta cuenta fácilmente.{' '}
                <strong>Sólo tú puedes editar o eliminar esta cuenta.</strong>
              </p>
              <div
                className={styles.avatar}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <Image
                  src={clientForm.imagePreview}
                  alt="Avatar del cliente"
                  width={109}
                  height={109}
                  className={styles.previewImage}
                  onError={(e) => {
                    e.currentTarget.src = '/empty-image.png';
                  }}
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
              <form onSubmit={(e) => handleClientSubmit(e, isEdit ? clientForm.id : undefined)}>
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
                    onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))}
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
                            className={styles.trashWhite}
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
                              className={styles.trashWhite}
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
                            onChange={(e) => setClientForm((prev) => ({ ...prev, deleteConfirm: e.target.value }))}
                            className={styles.deleteConfirmInput}
                            aria-label="Confirmar eliminación escribiendo 'Eliminar'"
                            disabled={isClientLoading}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteProjectConfirm()}
                            disabled={clientForm.deleteConfirm.toLowerCase() !== 'eliminar' || isClientLoading}
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
                <button type="submit" className={styles.submitButton} disabled={isClientLoading}>
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
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ClientPopup.displayName = 'ClientPopup';

export default ClientPopup;
