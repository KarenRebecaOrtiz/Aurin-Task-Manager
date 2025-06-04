'use client';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, collection, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import Image from 'next/image';
import { gsap } from 'gsap';
import { db } from '@/lib/firebase';
import Table from './Table';
import styles from './ClientsTable.module.scss';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projectCount: number;
  projects: string[];
  createdBy: string;
  createdAt: string;
}

const ClientsTable = () => {
  const { user } = useUser();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<string | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('/empty-image.png');
  const [projects, setProjects] = useState<string[]>(['']);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteProjectIndex, setDeleteProjectIndex] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Debug state changes
  useEffect(() => {
    console.log('isCreateOpen:', isCreateOpen, 'isEditOpen:', isEditOpen);
  }, [isCreateOpen, isEditOpen]);

  const resetForm = useCallback(() => {
    console.log('Resetting form');
    setIsCreateOpen(false);
    setIsEditOpen(null);
    setName('');
    setImageFile(null);
    setImagePreview('/empty-image.png');
    setProjects(['']);
    setDeleteProjectIndex(null);
    setDeleteConfirm('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const clientsData: Client[] = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name || '',
            imageUrl: doc.data().imageUrl || '/empty-image.png',
            projectCount: doc.data().projectCount || 0,
            projects: doc.data().projects || [],
            createdBy: doc.data().createdBy || '',
            createdAt: doc.data().createdAt || new Date().toISOString(),
          } as Client))
          .filter((client) => client.name && client.createdBy);
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    fetchClients();
  }, []);

  const memoizedFilteredClients = useMemo(() => {
    return clients.filter((client) =>
      client.name && typeof client.name === 'string'
        ? client.name.toLowerCase().includes(searchQuery.toLowerCase())
        : false
    );
  }, [searchQuery, clients]);

  useEffect(() => {
    setFilteredClients(memoizedFilteredClients);
  }, [memoizedFilteredClients]);

  useEffect(() => {
    if (isActionMenuOpen && actionMenuRef.current) {
      gsap.fromTo(
        actionMenuRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, [isActionMenuOpen]);

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        (isCreateOpen || isEditOpen)
      ) {
        resetForm();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCreateOpen, isEditOpen, resetForm]);

  // Close action menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        let clickedOnActionButton = false;
        actionButtonRefs.current.forEach((buttonRef) => {
          if (buttonRef.contains(event.target as Node)) {
            clickedOnActionButton = true;
          }
        });
        if (!clickedOnActionButton) {
          setIsActionMenuOpen(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = useCallback((key: string) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey, sortDirection]);

  const handleActionClick = useCallback((clientId: string) => {
    console.log('Action menu clicked for client:', clientId);
    setIsActionMenuOpen(isActionMenuOpen === clientId ? null : clientId);
  }, [isActionMenuOpen]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAddProject = useCallback(() => {
    setProjects((prev) => [...prev, '']);
  }, []);

  const handleProjectChange = useCallback((index: number, value: string) => {
    setProjects((prev) => {
      const newProjects = [...prev];
      newProjects[index] = value;
      return newProjects;
    });
  }, []);

  const handleDeleteProjectClick = useCallback((index: number) => {
    setDeleteProjectIndex(index);
  }, []);

  const handleDeleteProjectConfirm = useCallback(() => {
    if (deleteProjectIndex !== null) {
      setProjects((prev) => prev.filter((_, i) => i !== deleteProjectIndex));
      setDeleteProjectIndex(null);
      setDeleteConfirm('');
    }
  }, [deleteProjectIndex]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent, clientId?: string) => {
      e.preventDefault();
      if (!user || !name.trim()) {
        alert('El nombre de la cuenta es obligatorio.');
        return;
      }

      try {
        let imageUrl = imagePreview;
        if (imageFile) {
          try {
            const formData = new FormData();
            formData.append('file', imageFile);
            const response = await fetch('/api/upload-image', {
              method: 'POST',
              body: formData,
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.details || 'Failed to upload image');
            }
            const data = await response.json();
            imageUrl = data.imageUrl;
            console.log('Image uploaded via API:', imageUrl);
          } catch (uploadError: any) {
            console.error('Image upload failed, using default image:', uploadError.message);
            imageUrl = '/empty-image.png';
            alert(`No se pudo subir la imagen: ${uploadError.message}. Se usará la imagen por defecto.`);
          }
        }

        const clientData: Client = {
          id: clientId || doc(collection(db, 'clients')).id,
          name: name.trim(),
          imageUrl: imageUrl || '/empty-image.png',
          projectCount: projects.filter((p) => p.trim()).length,
          projects: projects.filter((p) => p.trim()),
          createdBy: clientId
            ? clients.find((c) => c.id === clientId)?.createdBy || user.id
            : user.id,
          createdAt: clientId
            ? clients.find((c) => c.id === clientId)?.createdAt || new Date().toISOString()
            : new Date().toISOString(),
        };

        console.log('Saving client:', clientData);
        await setDoc(doc(db, 'clients', clientData.id), clientData);

        if (clientId) {
          setClients((prev) => prev.map((c) => (c.id === clientId ? clientData : c)));
        } else {
          setClients((prev) => [...prev, clientData]);
        }
        resetForm();
      } catch (error: any) {
        console.error('Error saving client:', error.message);
        alert('Error al guardar la cuenta.');
      }
    },
    [user, name, imagePreview, imageFile, projects, clients, resetForm]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!user || !isDeleteOpen || deleteConfirm.toLowerCase() !== 'eliminar') return;

    try {
      await deleteDoc(doc(db, 'clients', isDeleteOpen));
      setClients((prev) => prev.filter((c) => c.id !== isDeleteOpen));
      setIsDeleteOpen(null);
      setDeleteConfirm('');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar la cuenta');
    }
  }, [user, isDeleteOpen, deleteConfirm]);

  const handleEditClick = useCallback((client: Client) => {
    setIsEditOpen(client.id);
    setName(client.name);
    setImagePreview(client.imageUrl);
    setImageFile(null);
    setProjects(client.projects.length ? client.projects : ['']);
    setIsActionMenuOpen(null);
    setIsCreateOpen(false);
  }, []);

  const handleCreateClick = useCallback(() => {
    console.log('Create button clicked');
    setIsCreateOpen(true);
    setIsEditOpen(null);
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'imageUrl',
        label: '',
        width: '10%',
        render: (client: Client) => (
          client && client.imageUrl ? (
            <Image
              src={client.imageUrl || '/empty-image.png'}
              alt={client.name || 'Client Image'}
              width={38}
              height={38}
              className={styles.profileImage}
              onError={(e) => {
                e.currentTarget.src = '/empty-image.png';
              }}
            />
          ) : null
        ),
      },
      {
        key: 'name',
        label: 'Cuentas',
        width: 'auto',
      },
      {
        key: 'projectCount',
        label: 'Proyectos Asignados',
        width: '20%',
      },
      {
        key: 'action',
        label: 'Acciones',
        width: '10%',
        render: (client: Client) => (
          <div className={styles.actionContainer}>
            {user && client && client.createdBy === user.id && (
              <>
                <button
                  ref={(el) => {
                    if (el) actionButtonRefs.current.set(client.id, el);
                    else actionButtonRefs.current.delete(client.id);
                  }}
                  onClick={() => handleActionClick(client.id)}
                  className={styles.actionButton}
                  aria-label="Abrir acciones"
                >
                  <Image src="/elipsis.svg" alt="Actions" width={16} height={16} />
                </button>
                {isActionMenuOpen === client.id && (
                  <div ref={actionMenuRef} className={styles.dropdown}>
                    <div className={styles.dropdownItem} onClick={() => handleEditClick(client)}>
                      <Image src="/pencil.svg" alt="Edit" width={18} height={18} />
                      <span>Editar Cliente</span>
                    </div>
                    <div
                      className={styles.dropdownItem}
                      onClick={() => {
                        setIsDeleteOpen(client.id);
                        setIsActionMenuOpen(null);
                      }}
                    >
                      <Image
                        src="/trash-2.svg"
                        alt="Delete"
                        width={16}
                        height={16}
                        onError={(e) => {
                          e.currentTarget.src = '/fallback-trash.svg';
                        }}
                      />
                      <span className={styles.deleteText}>Eliminar Cuenta</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ),
      },
    ],
    [user, handleActionClick, handleEditClick]
  );

  return (
    <div className={styles.container}>
      {clients.length === 0 && !searchQuery ? (
        <div className={styles.emptyState}>
          <div className={styles.header}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Buscar Cuentas"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                aria-label="Buscar cuentas"
              />
            </div>
            <div className={styles.createButtonWrapper}>
              <button
                onClick={handleCreateClick}
                className={styles.createButton}
                aria-label="Crear nueva cuenta"
                data-testid="create-client-button"
              >
                <Image src="/wallet-cards.svg" alt="Crear" width={17} height={17} />
                Nueva Cuenta
              </button>
            </div>
          </div>
          <div className={styles.emptyContent}>
            <Image
              src="/emptyStateImage.png"
              alt="No hay clientes"
              width={289}
              height={289}
            />
            <div className={styles.emptyText}>
              <h2>¡Todo en orden por ahora!</h2>
              <p>No tienes clientes activos. ¿Por qué no comienzas creando uno nuevo?</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.header}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Buscar Cuentas"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                aria-label="Buscar cuentas"
              />
            </div>
            <div className={styles.createButtonWrapper}>
              <button
                onClick={handleCreateClick}
                className={styles.createButton}
                aria-label="Crear nueva cuenta"
                data-testid="create-client-button"
              >
                <Image src="/wallet-cards.svg" alt="Crear" width={17} height={17} />
                Nueva Cuenta
              </button>
            </div>
          </div>
          <Table
            data={filteredClients}
            columns={columns}
            itemsPerPage={10}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </>
      )}
      {(isCreateOpen || isEditOpen) && (
        <div
          className={styles.popupOverlay}
          data-testid="client-popup-overlay"
        >
          <div className={styles.popup} ref={popupRef}>
            <div className={styles.popupContent}>
              <h2 className={styles.popupTitle}>
                {isEditOpen ? 'Editar Cliente' : '¿Cómo se llama tu cliente o empresa?'}
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
                  src={imagePreview}
                  alt="Avatar del cliente"
                  width={109}
                  height={109}
                  className={styles.avatarImage}
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
                />
              </div>
              <form onSubmit={(e) => handleSubmit(e, isEditOpen || undefined)}>
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Coca-Cola, Agencia Delta, Clínica Sol"
                    className={styles.input}
                    required
                    aria-required="true"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Proyectos</label>
                  <p className={styles.fieldDescription}>
                    Organiza las tareas de este cliente creando proyectos a tu medida.{' '}
                    <strong>Puedes añadir nuevos proyectos en cualquier momento desde el menú “Acciones” de la cuenta.</strong>
                  </p>
                  {projects.map((project, index) => (
                    <div key={index} className={styles.projectField}>
                      <div className={styles.projectInputWrapper}>
                        <input
                          type="text"
                          value={project}
                          onChange={(e) => handleProjectChange(index, e.target.value)}
                          placeholder={`Proyecto ${index + 1}`}
                          className={styles.input}
                          aria-label={`Nombre del proyecto ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteProjectClick(index)}
                          className={styles.deleteProjectButton}
                          aria-label={`Eliminar proyecto ${index + 1}`}
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
                      {deleteProjectIndex === index && (
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
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            className={styles.deleteConfirmInput}
                            aria-label="Confirmar eliminación escribiendo 'Eliminar'"
                          />
                          <button
                            type="button"
                            onClick={handleDeleteProjectConfirm}
                            disabled={deleteConfirm.toLowerCase() !== 'eliminar'}
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
                  >
                    +
                  </button>
                </div>
                <button type="submit" className={styles.submitButton}>
                  Guardar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {isDeleteOpen && (
        <div className={styles.popupOverlay}>
          <div className={styles.deletePopup}>
            <div className={styles.deleteConfirmHeader}>
              <Image
                src="/trash-2.svg"
                alt="Eliminar cuenta"
                width={12}
                height={13.33}
                onError={(e) => {
                  e.currentTarget.src = '/fallback-trash.svg';
                }}
              />
              <h3>¿Estás seguro de que quieres eliminar esta cuenta?</h3>
            </div>
            <p>
              Al eliminar esta cuenta, también se eliminarán:
              <br />
              Todas las tareas asociadas
              <br />
              Todos los proyectos asociados
              <br />
              Historial de chats y actividad
              <br />
              Conocimiento generado por la IA para este cliente
              <br />
              ⚠️ Esta acción es permanente y no se puede deshacer.
            </p>
            <input
              type="text"
              placeholder="Escribe ‘Eliminar’ para confirmar esta acción"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className={styles.deleteConfirmInput}
              aria-label="Confirmar eliminación de cuenta escribiendo 'Eliminar'"
            />
            <button
              onClick={handleDeleteConfirm}
              disabled={deleteConfirm.toLowerCase() !== 'eliminar'}
              className={styles.deleteConfirmButton}
            >
              Sí, eliminar todo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ClientsTable);