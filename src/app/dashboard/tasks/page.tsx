'use client';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, collection, setDoc, deleteDoc } from 'firebase/firestore';
import { gsap } from 'gsap';
import Header from '@/components/ui/Header';
import SyncUserToFirestore from '@/components/SyncUserToFirestore';
import OnboardingStepper from '@/components/OnboardingStepper';
import Selector from '@/components/Selector';
import MembersTable from '@/components/MembersTable';
import ClientsTable from '@/components/ClientsTable';
import TasksTable from '@/components/TasksTable';
import AISidebar from '@/components/AISidebar';
import ChatSidebar from '@/components/ChatSidebar';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import styles from '@/components/TasksPage.module.scss';
import clientStyles from '@/components/ClientsTable.module.scss';
import memberStyles from '@/components/MembersTable.module.scss';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projectCount: number;
  projects: string[];
  createdBy: string;
  createdAt: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
}

interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: Date | null;
  endDate: Date | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
}

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
    }, [isOpen]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          popupRef.current &&
          !popupRef.current.contains(event.target as Node) &&
          isOpen &&
          !isClientLoading
        ) {
          gsap.to(popupRef.current, {
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
    }, [isOpen, isClientLoading, onClose]);

    if (!isOpen) return null;

    return (
      <div className={clientStyles.popupOverlay}>
        <div className={clientStyles.popup} ref={popupRef}>
          {isLoading || isClientLoading ? (
            <div className={clientStyles.loader}>
              <div className={clientStyles.spinner}></div>
            </div>
          ) : (
            <div className={clientStyles.popupContent}>
              <h2 className={clientStyles.popupTitle}>
                {isEdit ? 'Editar Cliente' : '¿Cómo se llama tu cliente o empresa?'}
              </h2>
              <p className={clientStyles.popupSubtitle}>
                Elige un nombre claro para reconocer esta cuenta fácilmente.{' '}
                <strong>Sólo tú puedes editar o eliminar esta cuenta.</strong>
              </p>
              <div
                className={clientStyles.avatar}
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
                  className={clientStyles.avatarImage}
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
                <div className={clientStyles.field}>
                  <label htmlFor="clientName" className={clientStyles.label}>
                    Nombre de Cuenta <span className={clientStyles.required}>*</span>
                  </label>
                  <p className={clientStyles.fieldDescription}>
                    Este nombre aparecerá en todas las tareas, carpetas y vistas del sistema.
                  </p>
                  <input
                    id="clientName"
                    type="text"
                    value={clientForm.name}
                    onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej. Coca-Cola, Agencia Delta, Clínica Sol"
                    className={clientStyles.input}
                    required
                    aria-required="true"
                    disabled={isClientLoading}
                  />
                </div>
                <div className={clientStyles.field}>
                  <label className={clientStyles.label}>Proyectos</label>
                  <p className={clientStyles.fieldDescription}>
                    Organiza las tareas de este cliente creando proyectos a tu medida.{' '}
                    <strong>Puedes añadir nuevos proyectos en cualquier momento desde el menú “Acciones” de la cuenta.</strong>
                  </p>
                  {clientForm.projects.map((project, index) => (
                    <div key={index} className={clientStyles.projectField}>
                      <div className={clientStyles.projectInputWrapper}>
                        <input
                          type="text"
                          value={project}
                          onChange={(e) => handleProjectChange(index, e.target.value)}
                          placeholder={`Proyecto ${index + 1}`}
                          className={clientStyles.input}
                          aria-label={`Nombre del proyecto ${index + 1}`}
                          disabled={isClientLoading}
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteProjectClick(index)}
                          className={clientStyles.deleteProjectButton}
                          aria-label={`Eliminar proyecto ${index + 1}`}
                          disabled={isClientLoading}
                        >
                          <Image
                            src="/trash-2.svg"
                            alt="Eliminar proyecto"
                            width={16}
                            height={16}
                            className={clientStyles.trashWhite}
                            onError={(e) => {
                              e.currentTarget.src = '/fallback-trash.svg';
                            }}
                          />
                        </button>
                      </div>
                      {clientForm.deleteProjectIndex === index && (
                        <div className={clientStyles.deleteConfirm}>
                          <div className={clientStyles.deleteConfirmHeader}>
                            <Image
                              src="/trash-2.svg"
                              alt="Confirmar eliminación"
                              width={12}
                              height={13.33}
                              className={clientStyles.trashWhite}
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
                            className={clientStyles.deleteConfirmInput}
                            aria-label="Confirmar eliminación escribiendo 'Eliminar'"
                            disabled={isClientLoading}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteProjectConfirm()}
                            disabled={clientForm.deleteConfirm.toLowerCase() !== 'eliminar' || isClientLoading}
                            className={clientStyles.deleteConfirmButton}
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
                    className={clientStyles.addProjectButton}
                    aria-label="Añadir nuevo proyecto"
                    disabled={isClientLoading}
                  >
                    +
                  </button>
                </div>
                <button type="submit" className={clientStyles.submitButton} disabled={isClientLoading}>
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={clientStyles.cancelButton}
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

export default function TasksPage() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedContainer, setSelectedContainer] = useState<'tareas' | 'cuentas' | 'miembros'>('tareas');
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState<string | null>(null);
  const [isDeleteClientOpen, setIsDeleteClientOpen] = useState<string | null>(null);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState<string | null>(null);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [clientForm, setClientForm] = useState<{
    id?: string;
    name: string;
    imageFile: File | null;
    imagePreview: string;
    projects: string[];
    deleteProjectIndex: number | null;
    deleteConfirm: string;
  }>({
    name: '',
    imageFile: null,
    imagePreview: '/empty-image.png',
    projects: [''],
    deleteProjectIndex: null,
    deleteConfirm: '',
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const createEditPopupRef = useRef<HTMLDivElement>(null);
  const deletePopupRef = useRef<HTMLDivElement>(null);
  const invitePopupRef = useRef<HTMLDivElement>(null);
  const profilePopupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const clerkUsers: { id: string; imageUrl?: string; firstName?: string; lastName?: string; publicMetadata: { role?: string; description?: string } }[] = await response.json();
        const usersData: User[] = clerkUsers.map((user) => ({
          id: user.id,
          imageUrl: user.imageUrl || '/default-avatar.png',
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre',
          role: user.publicMetadata.role || 'Sin rol',
          description: user.publicMetadata.description || 'Sin descripción',
        }));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  // Handlers
  const handleCreateClientOpen = useCallback(() => {
    setClientForm({
      name: '',
      imageFile: null,
      imagePreview: '/empty-image.png',
      projects: [''],
      deleteProjectIndex: null,
      deleteConfirm: '',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsCreateClientOpen(true);
    setIsEditClientOpen(null);
  }, []);

  const handleEditClientOpen = useCallback((client: Client) => {
    setClientForm({
      id: client.id,
      name: client.name,
      imageFile: null,
      imagePreview: client.imageUrl,
      projects: client.projects.length ? client.projects : [''],
      deleteProjectIndex: null,
      deleteConfirm: '',
    });
    setIsEditClientOpen(client.id);
    setIsCreateClientOpen(false);
  }, []);

  const handleDeleteClientOpen = useCallback((clientId: string) => {
    setIsDeleteClientOpen(clientId);
    setDeleteConfirm('');
  }, []);

  const handleInviteOpen = useCallback(() => {
    setIsInviteMemberOpen(true);
  }, []);

  const handleProfileOpen = useCallback((userId: string) => {
    setIsProfileOpen(userId);
  }, []);

  const handleNewTaskOpen = useCallback(() => {
    router.push('/dashboard/new-task');
  }, [router]);

  const handleAISidebarOpen = useCallback(() => {
    setIsAISidebarOpen(true);
  }, []);

  const handleChatSidebarOpen = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsChatSidebarOpen(true);
  }, []);

  // Animations
  useEffect(() => {
    const header = headerRef.current;
    const selector = selectorRef.current;
    const content = contentRef.current;
    if (header && selector && content) {
      gsap.fromTo(
        [header, selector, content],
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    }
    return () => {
      if (header && selector && content) {
        gsap.killTweensOf([header, selector, content]);
      }
    };
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (content) {
      gsap.fromTo(
        content,
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [selectedContainer]);

  // Form handlers
  const handleClientSubmit = useCallback(async (e: React.FormEvent, clientId?: string) => {
    e.preventDefault();
    if (!user || !clientForm.name.trim()) {
      alert('El nombre de la cuenta es obligatorio.');
      return;
    }

    setIsClientLoading(true);
    try {
      let imageUrl = clientForm.imagePreview;
      if (clientForm.imageFile) {
        const formData = new FormData();
        formData.append('file', clientForm.imageFile);
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload image');
        const data = await response.json();
        imageUrl = data.imageUrl;
      }

      const clientData: Client = {
        id: clientId || doc(collection(db, 'clients')).id,
        name: clientForm.name.trim(),
        imageUrl: imageUrl || '/empty-image.png',
        projectCount: clientForm.projects.filter((p) => p.trim()).length,
        projects: clientForm.projects.filter((p) => p.trim()),
        createdBy: clientId
          ? clients.find((c) => c.id === clientId)?.createdBy || user.id
          : user.id,
        createdAt: clientId
          ? clients.find((c) => c.id === clientId)?.createdAt || new Date().toISOString()
          : new Date().toISOString(),
      };

      await setDoc(doc(db, 'clients', clientData.id), clientData);
      setClients((prev) =>
        clientId
          ? prev.map((c) => (c.id === clientId ? clientData : c))
          : [...prev, clientData]
      );
      gsap.to(createEditPopupRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          setIsCreateClientOpen(false);
          setIsEditClientOpen(null);
          setIsClientLoading(false);
        },
      });
      setClientForm({
        name: '',
        imageFile: null,
        imagePreview: '/empty-image.png',
        projects: [''],
        deleteProjectIndex: null,
        deleteConfirm: '',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error al guardar la cuenta.');
      setIsClientLoading(false);
    }
  }, [user, clientForm, clients]);

  const handleDeleteClientConfirm = useCallback(async () => {
    if (!user || !isDeleteClientOpen || deleteConfirm.toLowerCase() !== 'eliminar') return;

    setIsDeleteLoading(true);
    try {
      await deleteDoc(doc(db, 'clients', isDeleteClientOpen));
      setClients((prev) => prev.filter((c) => c.id !== isDeleteClientOpen));
      gsap.to(deletePopupRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          setIsDeleteClientOpen(null);
          setIsDeleteLoading(false);
        },
      });
      setDeleteConfirm('');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar la cuenta');
      setIsDeleteLoading(false);
    }
  }, [user, isDeleteClientOpen, deleteConfirm]);

  const handleInviteSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviteLoading(true);
    try {
      console.log('Invite email:', inviteEmail);
      alert(`Invitación enviada a ${inviteEmail}`);
      gsap.to(invitePopupRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          setIsInviteMemberOpen(false);
          setIsInviteLoading(false);
        },
      });
      setInviteEmail('');
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Error al enviar la invitación');
      setIsInviteLoading(false);
    }
  }, [inviteEmail]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setClientForm((prev) => ({ ...prev, imageFile: file }));
      const reader = new FileReader();
      reader.onload = () => setClientForm((prev) => ({ ...prev, imagePreview: reader.result as string }));
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAddProject = useCallback(() => {
    setClientForm((prev) => ({ ...prev, projects: [...prev.projects, ''] }));
  }, []);

  const handleProjectChange = useCallback((index: number, value: string) => {
    setClientForm((prev) => {
      const newProjects = [...prev.projects];
      newProjects[index] = value;
      return { ...prev, projects: newProjects };
    });
  }, []);

  const handleDeleteProjectClick = useCallback((index: number) => {
    setClientForm((prev) => ({ ...prev, deleteProjectIndex: index }));
  }, []);

  const handleDeleteProjectConfirm = useCallback(() => {
    if (clientForm.deleteProjectIndex !== null) {
      setClientForm((prev) => ({
        ...prev,
        projects: prev.projects.filter((_, i) => i !== prev.deleteProjectIndex),
        deleteProjectIndex: null,
        deleteConfirm: '',
      }));
    }
  }, [clientForm.deleteProjectIndex]);

  const handleClientPopupClose = useCallback(() => {
    gsap.to(createEditPopupRef.current, {
      opacity: 0,
      y: 50,
      scale: 0.95,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        setIsCreateClientOpen(false);
        setIsEditClientOpen(null);
      },
    });
  }, []);

  const handleInvitePopupClose = useCallback(() => {
    gsap.to(invitePopupRef.current, {
      opacity: 0,
      y: 50,
      scale: 0.95,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        setIsInviteMemberOpen(false);
        setInviteEmail('');
      },
    });
  }, []);

  return (
    <div className={styles.container}>
      <SyncUserToFirestore />
      <div ref={headerRef}>
        <Header selectedContainer={selectedContainer} />
      </div>
      <OnboardingStepper />
      <div ref={selectorRef} className={styles.selector}>
        <Selector selectedContainer={selectedContainer} setSelectedContainer={setSelectedContainer} />
      </div>
      <div ref={contentRef} className={styles.content}>
        {selectedContainer === 'tareas' && (
          <TasksTable
            tasks={tasks}
            clients={clients}
            users={users}
            onCreateClientOpen={handleCreateClientOpen}
            onInviteMemberOpen={handleInviteOpen}
            onNewTaskOpen={handleNewTaskOpen}
            onAISidebarOpen={handleAISidebarOpen}
            onChatSidebarOpen={handleChatSidebarOpen}
            setTasks={setTasks}
          />
        )}
        {selectedContainer === 'cuentas' && (
          <ClientsTable
            clients={clients}
            onCreateOpen={handleCreateClientOpen}
            onEditOpen={handleEditClientOpen}
            onDeleteOpen={handleDeleteClientOpen}
            setClients={setClients}
          />
        )}
        {selectedContainer === 'miembros' && (
          <MembersTable
            users={users}
            onInviteOpen={handleInviteOpen}
            onProfileOpen={handleProfileOpen}
            setUsers={setUsers}
          />
        )}
      </div>
      <ClientPopup
        isOpen={isCreateClientOpen || !!isEditClientOpen}
        isEdit={!!isEditClientOpen}
        clientForm={clientForm}
        setClientForm={setClientForm}
        fileInputRef={fileInputRef}
        handleImageChange={handleImageChange}
        handleProjectChange={handleProjectChange}
        handleAddProject={handleAddProject}
        handleDeleteProjectClick={handleDeleteProjectClick}
        handleDeleteProjectConfirm={handleDeleteProjectConfirm}
        handleClientSubmit={handleClientSubmit}
        onClose={handleClientPopupClose}
        isClientLoading={isClientLoading}
      />
      {isDeleteClientOpen && (
        <div className={clientStyles.popupOverlay}>
          <div className={clientStyles.deletePopup} ref={deletePopupRef}>
            {isDeleteLoading ? (
              <div className={clientStyles.loader}>
                <div className={clientStyles.spinner}></div>
              </div>
            ) : (
              <>
                <div className={clientStyles.deleteConfirmHeader}>
                  <Image
                    src="/trash-2.svg"
                    alt="Eliminar cuenta"
                    width={12}
                    height={13.33}
                    className={clientStyles.trashWhite}
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
                  className={clientStyles.deleteConfirmInput}
                  aria-label="Confirmar eliminación de cuenta escribiendo 'Eliminar'"
                  disabled={isDeleteLoading}
                />
                <button
                  onClick={handleDeleteClientConfirm}
                  disabled={deleteConfirm.toLowerCase() !== 'eliminar' || isDeleteLoading}
                  className={clientStyles.deleteConfirmButton}
                >
                  Sí, eliminar todo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    gsap.to(deletePopupRef.current, {
                      opacity: 0,
                      y: 50,
                      scale: 0.95,
                      duration: 0.3,
                      ease: 'power2.in',
                      onComplete: () => setIsDeleteClientOpen(null),
                    });
                  }}
                  className={clientStyles.cancelButton}
                  disabled={isDeleteLoading}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {isInviteMemberOpen && (
        <div className={memberStyles.invitePopupOverlay}>
          <div className={memberStyles.invitePopup} ref={invitePopupRef}>
            {isInviteLoading ? (
              <div className={memberStyles.loader}>
                <div className={memberStyles.spinner}></div>
              </div>
            ) : (
              <div className={memberStyles.inviteContent}>
                <h2 className={memberStyles.inviteTitle}>Invita a un nuevo miembro</h2>
                <p className={memberStyles.inviteSubtitle}>
                  Escribe el correo electrónico de la persona que quieres invitar a esta cuenta.
                </p>
                <form style={{ minWidth: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }} onSubmit={handleInviteSubmit}>
                  <div className={memberStyles.inviteField}>
                    <label htmlFor="inviteEmail" className={memberStyles.inviteLabel}>
                      Correo electrónico:
                    </label>
                    <input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="mail@example.com"
                      className={memberStyles.inviteInput}
                      required
                      aria-required="true"
                      disabled={isInviteLoading}
                    />
                  </div>
                  <button type="submit" className={memberStyles.inviteSubmitButton} disabled={isInviteLoading}>
                    Enviar Invitación
                  </button>
                  <button
                    type="button"
                    onClick={handleInvitePopupClose}
                    className={memberStyles.cancelButton}
                    disabled={isInviteLoading}
                  >
                    Cancelar
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
      {isProfileOpen && (
        <div className={memberStyles.profilePopupOverlay}>
          <div className={memberStyles.profilePopup} ref={profilePopupRef}>
            <button className={memberStyles.closeButton} onClick={() => setIsProfileOpen(null)}>
              <Image src="/arrow-left.svg" alt="Close" width={16} height={16} />
            </button>
            <div className={memberStyles.profileContent}>
              <h2 className={memberStyles.profileTitle}>Información de Perfil</h2>
              <Image
                src={users.find((u) => u.id === isProfileOpen)?.imageUrl || '/default-avatar.png'}
                alt={users.find((u) => u.id === isProfileOpen)?.fullName || 'Profile'}
                width={109}
                height={109}
                className={memberStyles.profileAvatar}
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png';
                }}
              />
              <div className={memberStyles.profileUsername}>
                {users.find((u) => u.id === isProfileOpen)?.fullName}
              </div>
              <div className={memberStyles.profileField}>
                <span className={memberStyles.profileLabel}>Nombre completo:</span>
                <span className={memberStyles.profileValue}>
                  {users.find((u) => u.id === isProfileOpen)?.fullName}
                </span>
              </div>
              <div className={memberStyles.profileField}>
                <span className={memberStyles.profileLabel}>Descripción breve:</span>
                <span className={memberStyles.profileValue}>
                  {users.find((u) => u.id === isProfileOpen)?.description}
                </span>
              </div>
              <div className={memberStyles.profileField}>
                <span className={memberStyles.profileLabel}>Rol o área de trabajo:</span>
                <span className={memberStyles.profileValue}>
                  {users.find((u) => u.id === isProfileOpen)?.role}
                </span>
              </div>
              <button className={memberStyles.confirmButton} onClick={() => setIsProfileOpen(null)}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      <AISidebar
        isOpen={isAISidebarOpen}
        onClose={() => setIsAISidebarOpen(false)}
      />
      {selectedTask && (
        <ChatSidebar
          isOpen={isChatSidebarOpen}
          onClose={() => setIsChatSidebarOpen(false)}
          task={selectedTask}
          clientName={clients.find((c) => c.id === selectedTask.clientId)?.name || 'Sin cuenta'}
          users={users}
        />
      )}
    </div>
  );
}