'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, collection, setDoc, getDocs, addDoc } from 'firebase/firestore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ThemeToggler from '@/components/ui/ThemeToggler';
import { db } from '@/lib/firebase';
import styles from '@/components/NewTaskStyles.module.scss';
import clientStyles from '@/components/ClientsTable.module.scss';
import memberStyles from '@/components/MembersTable.module.scss';
import { Timestamp } from 'firebase/firestore';

// Cargar UserButton dinámicamente solo en el cliente
const UserButton = dynamic(() => import('@clerk/nextjs').then((mod) => mod.UserButton), {
  ssr: false,
});

gsap.registerPlugin(ScrollTrigger);

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projects: string[];
  createdBy: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface Task {
  clientId: string;
  project: string;
  name: string;
  description: string;
  objectives: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  priority: string;
  budget: string;
  hours: string;
  methodology: string;
  risks: string;
  mitigation: string;
  stakeholders: string;
  CreatedBy: string;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: Date;
}

export default function NewTaskPage() {
  const { user } = useUser();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [task, setTask] = useState<Task>({
    clientId: '',
    project: '',
    name: '',
    description: '',
    objectives: '',
    startDate: null,
    endDate: null,
    status: 'Seleccionar',
    priority: 'Seleccionar',
    budget: '',
    hours: '',
    methodology: '',
    risks: '',
    mitigation: '',
    stakeholders: '',
    CreatedBy: user?.id || '',
    LeadedBy: [],
    AssignedTo: [],
    createdAt: new Date(),
  });
  const [clientSlideIndex, setClientSlideIndex] = useState(0);
  const [pmSlideIndex, setPmSlideIndex] = useState(0);
  const [searchCollaborator, setSearchCollaborator] = useState('');
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState<string | null>(null);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    imageFile: null as File | null,
    imagePreview: '/default-avatar.png',
    projects: [''],
    deleteProjectIndex: null as number | null,
    deleteConfirm: '',
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const clientSlidesRef = useRef<HTMLDivElement>(null);
  const pmSlidesRef = useRef<HTMLDivElement>(null);
  const createEditPopupRef = useRef<HTMLDivElement>(null);
  const invitePopupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch clients and users
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const clientsData: Client[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || '',
          imageUrl: doc.data().imageUrl || '/default-avatar.png',
          projects: doc.data().projects || [],
          createdBy: doc.data().createdBy || '',
        }));
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const clerkUsers: { id: string; imageUrl?: string; firstName?: string; lastName?: string; publicMetadata: { role?: string } }[] = await response.json();
        const usersData: User[] = clerkUsers.map((user) => ({
          id: user.id,
          imageUrl: user.imageUrl || '/default-avatar.png',
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre',
          role: user.publicMetadata.role || 'Sin rol',
        }));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchClients();
    fetchUsers();
  }, []);

  // GSAP scroll animations for sections
  useEffect(() => {
    sectionsRef.current.forEach((section) => {
      if (section) {
        gsap.fromTo(
          section,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  // GSAP slideshow animations
  useEffect(() => {
    if (clientSlidesRef.current) {
      gsap.to(clientSlidesRef.current, {
        xPercent: -clientSlideIndex * 100,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [clientSlideIndex]);

  useEffect(() => {
    if (pmSlidesRef.current) {
      gsap.to(pmSlidesRef.current, {
        xPercent: -pmSlideIndex * 100,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [pmSlideIndex]);

  // GSAP popup animations for create/edit client
  useEffect(() => {
    const popup = createEditPopupRef.current;
    if (popup && (isCreateClientOpen || isEditClientOpen)) {
      gsap.fromTo(
        popup,
        { opacity: 0, y: 50, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    } else if (popup) {
      gsap.to(popup, {
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
    }
  }, [isCreateClientOpen, isEditClientOpen]);

  // GSAP popup animations for invite member
  useEffect(() => {
    const popup = invitePopupRef.current;
    if (popup && isInviteMemberOpen) {
      gsap.fromTo(
        popup,
        { opacity: 0, y: 50, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    } else if (popup) {
      gsap.to(popup, {
        opacity: 0,
        y: 50,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => setIsInviteMemberOpen(false),
      });
    }
  }, [isInviteMemberOpen]);

  // Close popups on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        createEditPopupRef.current &&
        !createEditPopupRef.current.contains(event.target as Node) &&
        (isCreateClientOpen || isEditClientOpen)
      ) {
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
      }
      if (
        invitePopupRef.current &&
        !invitePopupRef.current.contains(event.target as Node) &&
        isInviteMemberOpen
      ) {
        gsap.to(invitePopupRef.current, {
          opacity: 0,
          y: 50,
          scale: 0.95,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => setIsInviteMemberOpen(false),
        });
      }
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node) &&
        isProjectDropdownOpen
      ) {
        setIsProjectDropdownOpen(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node) &&
        isStatusDropdownOpen
      ) {
        setIsStatusDropdownOpen(false);
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node) &&
        isPriorityDropdownOpen
      ) {
        setIsPriorityDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [
    isCreateClientOpen,
    isEditClientOpen,
    isInviteMemberOpen,
    isProjectDropdownOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
  ]);

  // GSAP date picker animations
  useEffect(() => {
    datePickerRefs.current.forEach((picker) => {
      if (picker) {
        gsap.fromTo(
          picker,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
        );
      }
    });
  }, []);

  // GSAP dropdown animations
  useEffect(() => {
    if (isProjectDropdownOpen && projectDropdownRef.current) {
      const dropdownItems = projectDropdownRef.current.querySelector(`.${styles.dropdownItems}`);
      if (dropdownItems) {
        gsap.fromTo(
          dropdownItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
        );
      }
    }
    if (isStatusDropdownOpen && statusDropdownRef.current) {
      const dropdownItems = statusDropdownRef.current.querySelector(`.${styles.dropdownItems}`);
      if (dropdownItems) {
        gsap.fromTo(
          dropdownItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
        );
      }
    }
    if (isPriorityDropdownOpen && priorityDropdownRef.current) {
      const dropdownItems = priorityDropdownRef.current.querySelector(`.${styles.dropdownItems}`);
      if (dropdownItems) {
        gsap.fromTo(
          dropdownItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
        );
      }
    }
  }, [isProjectDropdownOpen, isStatusDropdownOpen, isPriorityDropdownOpen]);

  // GSAP click animation handler
  const animateClick = (element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.95,
      opacity: 0.8,
      duration: 0.15,
      ease: 'power1.out',
      yoyo: true,
      repeat: 1,
    });
  };

  // Slideshow navigation
  const handleClientSlideNext = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setClientSlideIndex((prev) => (prev + 1) % Math.ceil(clients.length / 6));
    },
    [clients.length]
  );

  const handleClientSlidePrev = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setClientSlideIndex((prev) => (prev - 1 + Math.ceil(clients.length / 6)) % Math.ceil(clients.length / 6));
    },
    [clients.length]
  );

  const handlePmSlideNext = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setPmSlideIndex((prev) => (prev + 1) % Math.ceil(users.length / 6));
    },
    [users.length]
  );

  const handlePmSlidePrev = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setPmSlideIndex((prev) => (prev - 1 + Math.ceil(users.length / 6)) % Math.ceil(users.length / 6));
    },
    [users.length]
  );

  // Form handlers
  const handleClientSelect = useCallback(
    (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev, clientId, project: '' }));
    },
    []
  );

  const handlePmSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({
        ...prev,
        LeadedBy: prev.LeadedBy.includes(userId) ? prev.LeadedBy : [...prev.LeadedBy, userId],
        AssignedTo: prev.AssignedTo.filter((id) => id !== userId),
      }));
    },
    []
  );

  const handlePmUnselect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({
        ...prev,
        LeadedBy: prev.LeadedBy.filter((id) => id !== userId),
      }));
    },
    []
  );

  const handleCollaboratorSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      if (!task.LeadedBy.includes(userId)) {
        setTask((prev) => ({
          ...prev,
          AssignedTo: prev.AssignedTo.includes(userId) ? prev.AssignedTo : [...prev.AssignedTo, userId],
        }));
        setSearchCollaborator('');
      }
    },
    [task.LeadedBy]
  );

  const handleCollaboratorRemove = useCallback(
    (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({
        ...prev,
        AssignedTo: prev.AssignedTo.filter((id) => id !== userId),
      }));
    },
    []
  );

  const handleClientFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !clientForm.name.trim()) {
        alert('El nombre de la cuenta es obligatorio.');
        return;
      }

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
          id: isEditClientOpen || doc(collection(db, 'clients')).id,
          name: clientForm.name.trim(),
          imageUrl: imageUrl || '/default-avatar.png',
          projects: clientForm.projects.filter((p) => p.trim()),
          createdBy: user.id,
        };

        await setDoc(doc(db, 'clients', clientData.id), clientData);
        setClients((prev) =>
          isEditClientOpen
            ? prev.map((c) => (c.id === isEditClientOpen ? clientData : c))
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
          },
        });
        setClientForm({
          name: '',
          imageFile: null,
          imagePreview: '/default-avatar.png',
          projects: [''],
          deleteProjectIndex: null,
          deleteConfirm: '',
        });
      } catch (error) {
        console.error('Error saving client:', error);
        alert('Error al guardar la cuenta.');
      }
    },
    [user, clientForm, isEditClientOpen]
  );

  const handleInviteSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      animateClick(e.currentTarget as HTMLElement);
      try {
        console.log('Invite email:', inviteEmail);
        alert(`Invitación enviada a ${inviteEmail}`);
        gsap.to(invitePopupRef.current, {
          opacity: 0,
          y: 50,
          scale: 0.95,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => setIsInviteMemberOpen(false),
        });
        setInviteEmail('');
      } catch (error) {
        console.error('Error sending invite:', error);
        alert('Error al enviar la invitación');
      }
    },
    [inviteEmail]
  );

  const handleTaskSubmit = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      e.preventDefault();
      if (
        !user ||
        !task.name.trim() ||
        !task.description.trim() ||
        !task.clientId ||
        !task.project ||
        !task.startDate ||
        !task.endDate ||
        !task.budget ||
        !task.hours ||
        !task.LeadedBy.length
      ) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
      }
  
      if (task.startDate > task.endDate) {
        alert('La fecha de inicio debe ser anterior a la fecha de finalización.');
        return;
      }
  
      try {
        const taskDocRef = doc(collection(db, 'tasks'));
        const taskId = taskDocRef.id;
        const taskData = {
          ...task,
          budget: parseFloat(task.budget.replace('$', '')) || 0,
          hours: parseInt(task.hours) || 0,
          CreatedBy: user.id,
          createdAt: Timestamp.fromDate(new Date()),
          id: taskId,
        };
        await setDoc(taskDocRef, taskData);
  
        const recipients = new Set<string>([...task.LeadedBy, ...task.AssignedTo]);
        recipients.delete(user.id);
        for (const recipientId of Array.from(recipients)) {
          await addDoc(collection(db, 'notifications'), {
            userId: user.id,
            taskId,
            message: `${user.firstName || 'Usuario'} te asignó la tarea ${task.name}`,
            timestamp: Timestamp.now(),
            read: false,
            recipientId,
          });
        }
  
        router.push('/dashboard/tasks');
      } catch (error) {
        console.error('Error saving task:', error);
        alert('Error al guardar la tarea.');
      }
    },
    [user, task, router]
  );

  const filteredCollaborators = useMemo(() => {
    return users.filter(
      (u) =>
        !task.LeadedBy.includes(u.id) &&
        (u.fullName.toLowerCase().includes(searchCollaborator.toLowerCase()) ||
         u.role.toLowerCase().includes(searchCollaborator.toLowerCase()))
    );
  }, [users, task.LeadedBy, searchCollaborator]);

  const handleProjectSelect = useCallback(
    (project: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev, project }));
      setIsProjectDropdownOpen(false);
    },
    []
  );

  const handleStatusSelect = useCallback(
    (status: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev, status }));
      setIsStatusDropdownOpen(false);
    },
    []
  );

  const handlePrioritySelect = useCallback(
    (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev, priority }));
      setIsPriorityDropdownOpen(false);
    },
    []
  );

  return (
    <div className={styles.container}>
      <div className={styles.header} ref={(el) => { sectionsRef.current[0] = el; }}>
        <Link href="/dashboard/tasks">
          <div className={styles.backArrow} onClick={(e) => animateClick(e.currentTarget)}>
            <Image src="/arrow-left.svg" alt="Back" width={24} height={24} />
          </div>
        </Link>
        <div className={styles.headerContent}>
          <div className={styles.title}>Crear Tarea</div>
          <div className={styles.subtitle}>
            Crea un proyecto nuevo. Al crearlo, se dará de alta y será visible para todas las personas involucradas al mismo.
          </div>
        </div>
        <div className={styles.userSection}>
          <ThemeToggler />
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: {
                  width: '60px',
                  height: '60px',
                },
              },
            }}
          />
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.section} ref={(el) => { sectionsRef.current[1] = el; }}>
          <div className={styles.sectionTitle}>Cuenta Asignada:</div>
          <div className={styles.sectionSubtitle}>
            Selecciona la cuenta a la que se asignará esta tarea (por ejemplo, Pinaccle).
          </div>
          <div className={styles.slideshow}>
            <button className={styles.slideButton} onClick={handleClientSlidePrev}>
              <Image src="/chevron-left.svg" alt="Previous" width={6} height={13} />
            </button>
            <div className={styles.slidesContainer}>
              <div className={styles.slides} ref={clientSlidesRef}>
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className={`${styles.slideCard} ${task.clientId === client.id ? styles.selected : ''}`}
                    onClick={(e) => handleClientSelect(client.id, e)}
                  >
                    <Image
                      src={client.imageUrl}
                      alt={client.name}
                      width={36}
                      height={36}
                      className={styles.clientImage}
                    />
                    <div className={styles.clientName}>{client.name}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className={styles.slideButton} onClick={handleClientSlideNext}>
              <Image src="/chevron-right.svg" alt="Next" width={6} height={13} />
            </button>
          </div>
          <div className={styles.addButtonWrapper}>
            <div className={styles.addButtonText}>
              ¿No encuentras alguna cuenta? <strong>Agrega una nueva.</strong>
            </div>
            <button
              className={styles.addButton}
              onClick={(e) => {
                animateClick(e.currentTarget);
                setIsCreateClientOpen(true);
              }}
            >
              + Agregar Cuenta
            </button>
          </div>
        </div>
        <div className={styles.section} ref={(el) => { sectionsRef.current[2] = el; }}>
          <div className={styles.projectSection}>
            <div className={styles.sectionTitle}>Seleccionar Proyecto *</div>
            <div className={styles.sectionSubtitle}>Selecciona la carpeta a la que se asignará esta tarea.</div>
            <div className={styles.dropdownContainer} ref={projectDropdownRef}>
              <div
                className={styles.dropdownTrigger}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  setIsProjectDropdownOpen(!isProjectDropdownOpen);
                }}
              >
                <span>{task.project || 'Selecciona la carpeta'}</span>
                <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
              </div>
              {isProjectDropdownOpen && (
                <div className={styles.dropdownItems}>
                  {clients
                    .find((c) => c.id === task.clientId)
                    ?.projects.map((project) => (
                      <div
                        key={project}
                        className={styles.dropdownItem}
                        onClick={(e) => handleProjectSelect(project, e)}
                      >
                        {project}
                      </div>
                    ))}
                </div>
              )}
            </div>
            {task.clientId && clients.find((c) => c.id === task.clientId)?.createdBy === user?.id && (
              <button
                className={styles.addButton}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  setIsEditClientOpen(task.clientId);
                }}
              >
                + Nueva Carpeta
              </button>
            )}
          </div>
        </div>
        <div className={styles.section} ref={(el) => { sectionsRef.current[3] = el; }}>
          <div className={styles.sectionTitle}>1: Información Básica:</div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nombre de la tarea *</label>
            <input
              type="text"
              className={styles.input}
              value={task.name}
              onChange={(e) => setTask((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Crear wireframe"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Descripción *</label>
            <input
              type="text"
              className={styles.input}
              value={task.description}
              onChange={(e) => setTask((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ej: Diseñar wireframes para la nueva app móvil"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Objetivos</label>
            <input
              type="text"
              className={styles.input}
              value={task.objectives}
              onChange={(e) => setTask((prev) => ({ ...prev, objectives: e.target.value }))}
              placeholder="Ej: Aumentar la usabilidad del producto en un 20%"
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Fecha de Inicio Prevista *</label>
              <div className={styles.datePickerContainer}>
                <DatePicker
                  selected={task.startDate}
                  onChange={(date: Date) => setTask((prev) => ({ ...prev, startDate: date }))}
                  className={styles.input}
                  placeholderText="Selecciona una fecha"
                  dateFormat="dd/MM/yyyy"
                  popperContainer={({ children }) => (
                    <div className={styles.datePickerPopper} ref={(el) => { datePickerRefs.current[0] = el; }}>
                      {children}
                    </div>
                  )}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Fecha de Finalización Prevista *</label>
              <div className={styles.datePickerContainer}>
                <DatePicker
                  selected={task.endDate}
                  onChange={(date: Date) => setTask((prev) => ({ ...prev, endDate: date }))}
                  className={styles.input}
                  placeholderText="Selecciona una fecha"
                  dateFormat="dd/MM/yyyy"
                  popperContainer={({ children }) => (
                    <div className={styles.datePickerPopper} ref={(el) => { datePickerRefs.current[1] = el; }}>
                      {children}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Estado Inicial del Proyecto *</label>
              <div className={styles.dropdownContainer} ref={statusDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  }}
                >
                  <span>{task.status}</span>
                  <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
                </div>
                {isStatusDropdownOpen && (
                  <div className={styles.dropdownItems}>
                    {['Por comenzar', 'En Proceso', 'Finalizado', 'Backlog', 'Cancelada'].map((status) => (
                      <div
                        key={status}
                        className={styles.dropdownItem}
                        onClick={(e) => handleStatusSelect(status, e)}
                      >
                        {status}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Prioridad del Proyecto *</label>
              <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsPriorityDropdownOpen(!isPriorityDropdownOpen);
                  }}
                >
                  <span>{task.priority}</span>
                  <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
                </div>
                {isPriorityDropdownOpen && (
                  <div className={styles.dropdownItems}>
                    {['Baja', 'Media', 'Alta'].map((priority) => (
                      <div
                        key={priority}
                        className={styles.dropdownItem}
                        onClick={(e) => handlePrioritySelect(priority, e)}
                      >
                        {priority}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.section} ref={(el) => { sectionsRef.current[4] = el; }}>
          <div className={styles.sectionTitle}>2: Agregar información de equipo</div>
          <div className={styles.sectionTitle}>Persona Encargada de la tarea:</div>
          <div className={styles.sectionSubtitle}>
            Selecciona la persona principal responsable de la tarea. Esta persona será el punto de contacto y supervisará
            el progreso.
          </div>
          <div className={styles.slideshow}>
            <button className={styles.slideButton} onClick={handlePmSlidePrev}>
              <Image src="/chevron-left.svg" alt="Previous" width={6} height={13} />
            </button>
            <div className={styles.slidesContainer}>
              <div className={styles.slides} ref={pmSlidesRef}>
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`${styles.slideCard} ${task.LeadedBy.includes(user.id) ? styles.selected : ''}`}
                    onClick={(e) => handlePmSelect(user.id, e)}
                  >
                    <Image
                      src={user.imageUrl}
                      alt={user.fullName}
                      width={36}
                      height={36}
                      className={styles.userImage}
                    />
                    <div className={styles.userName}>{user.fullName}</div>
                    <div className={styles.userRole}>{user.role}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className={styles.slideButton} onClick={handlePmSlideNext}>
              <Image src="/chevron-right.svg" alt="Next" width={6} height={13} />
            </button>
          </div>
          <div className={styles.selectedPms}>
            {task.LeadedBy.map((userId) => {
              const pm = users.find((u) => u.id === userId);
              return pm ? (
                <div key={userId} className={styles.tag}>
                  {pm.fullName}
                  <button onClick={(e) => handlePmUnselect(userId, e)}>X</button>
                </div>
              ) : null;
            })}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Colaboradores:</label>
            <div className={styles.sectionSubtitle}>
              Agrega a los miembros del equipo que trabajarán en la tarea. Puedes incluir varios colaboradores según sea
              necesario.
            </div>
            <input
              type="text"
              className={styles.input}
              value={searchCollaborator}
              onChange={(e) => setSearchCollaborator(e.target.value)}
              placeholder="Ej: John Doe"
            />
            {searchCollaborator && (
              <div className={styles.dropdown}>
                {filteredCollaborators.length ? (
                  filteredCollaborators.map((u) => (
                    <div
                      key={u.id}
                      className={`${styles.dropdownItem} ${task.LeadedBy.includes(u.id) ? styles.disabled : ''}`}
                      onClick={(e) => !task.LeadedBy.includes(u.id) && handleCollaboratorSelect(u.id, e)}
                    >
                      {u.fullName} ({u.role})
                    </div>
                  ))
                ) : (
                  <div className={styles.dropdownItem}>No hay coincidencias</div>
                )}
              </div>
            )}
            <div className={styles.tags}>
              {task.AssignedTo.map((userId) => {
                const collaborator = users.find((u) => u.id === userId);
                return collaborator ? (
                  <div key={userId} className={styles.tag}>
                    {collaborator.fullName}
                    <button onClick={(e) => handleCollaboratorRemove(userId, e)}>X</button>
                  </div>
                ) : null;
              })}
            </div>
            <div className={styles.addButtonWrapper}>
              <div className={styles.addButtonText}>
                ¿No encuentras algún colaborador? <strong>Agrega una nueva.</strong>
              </div>
              <button
                className={styles.addButton}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  setIsInviteMemberOpen(true);
                }}
              >
                + Invitar Colaborador
              </button>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Stakeholders</label>
            <input
              type="text"
              className={styles.input}
              value={task.stakeholders}
              onChange={(e) => setTask((prev) => ({ ...prev, stakeholders: e.target.value }))}
              placeholder="Ej: Cliente: Juan Pérez (juan@empresa.com)"
            />
          </div>
        </div>
        <div className={styles.section} ref={(el) => { sectionsRef.current[5] = el; }}>
          <div className={styles.sectionTitle}>3: Recursos</div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Presupuesto Asignado *</label>
            <div className={styles.currencyInput}>
              <span className={styles.currencySymbol}>$</span>
              <input
                type="text"
                className={styles.input}
                value={task.budget}
                onChange={(e) => setTask((prev) => ({ ...prev, budget: e.target.value.replace('$', '') }))}
                placeholder="1000.00"
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Horas Asignadas *</label>
            <input
              type="text"
              className={styles.input}
              value={task.hours}
              onChange={(e) => setTask((prev) => ({ ...prev, hours: e.target.value }))}
              placeholder="120"
            />
          </div>
        </div>
        <div className={styles.section} ref={(el) => { sectionsRef.current[6] = el; }}>
          <div className={styles.sectionTitle}>4: Gestión Avanzada</div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Metodología del Proyecto *</label>
            <input
              type="text"
              className={styles.input}
              value={task.methodology}
              onChange={(e) => setTask((prev) => ({ ...prev, methodology: e.target.value }))}
              placeholder="Selecciona una metodología"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Riesgos Potenciales</label>
            <input
              type="text"
              className={styles.input}
              value={task.risks}
              onChange={(e) => setTask((prev) => ({ ...prev, risks: e.target.value }))}
              placeholder="Ej: Retrasos en entregas, Falta de recursos"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Estrategias de Mitigación</label>
            <input
              type="text"
              className={styles.input}
              value={task.mitigation}
              onChange={(e) => setTask((prev) => ({ ...prev, mitigation: e.target.value }))}
              placeholder="Ej: Contratar freelancers como respaldo"
            />
          </div>
        </div>
        <div className={styles.submitSection} ref={(el) => { sectionsRef.current[7] = el; }}>
          <div className={styles.submitText}>
            Has seleccionado {task.AssignedTo.length} personas asignadas a este proyecto.
            <br />
            Al presionar “Registrar Progreso” se notificarán a las personas involucradas en la tarea a través de mail. Si
            cometieras un error, tendrás que comunicarlo y solicitar una corrección.
          </div>
          <button className={styles.submitButton} onClick={handleTaskSubmit}>
            Registrar Tarea
          </button>
        </div>
      </div>
      {(isCreateClientOpen || isEditClientOpen) && (
        <div className={clientStyles.popupOverlay}>
          <div className={clientStyles.popup} ref={createEditPopupRef}>
            <div className={clientStyles.popupContent}>
              <h2 className={clientStyles.popupTitle}>
                {isEditClientOpen ? 'Editar Cliente' : '¿Cómo se llama tu cliente o empresa?'}
              </h2>
              <p className={clientStyles.popupSubtitle}>
                Elige un nombre claro para reconocer esta cuenta fácilmente.{' '}
                <strong>Sólo tú puedes editar o eliminar esta cuenta.</strong>
              </p>
              <div
                className={clientStyles.avatar}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <Image
                  src={clientForm.imagePreview}
                  alt="Avatar del cliente"
                  width={109}
                  height={109}
                  className={clientStyles.modalImage}
                  onError={(e) => {
                    e.currentTarget.src = '/default-avatar.png';
                  }}
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setClientForm((prev) => ({ ...prev, imageFile: file }));
                      const reader = new FileReader();
                      reader.onload = () => setClientForm((prev) => ({ ...prev, imagePreview: reader.result as string }));
                      reader.readAsDataURL(file);
                    }
                  }}
                  aria-label="Subir imagen de cliente"
                />
              </div>
              <form onSubmit={handleClientFormSubmit}>
                <div className={clientStyles.formField}>
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
                  />
                </div>
                <div className={clientStyles.formField}>
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
                          onChange={(e) => {
                            const newProjects = [...clientForm.projects];
                            newProjects[index] = e.target.value;
                            setClientForm((prev) => ({ ...prev, projects: newProjects }));
                          }}
                          placeholder={`Proyecto ${index + 1}`}
                          className={clientStyles.input}
                          aria-label={`Nombre del proyecto ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            animateClick(e.currentTarget);
                            setClientForm((prev) => ({ ...prev, deleteProjectIndex: index }));
                          }}
                          className={clientStyles.deleteProjectButton}
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
                      {clientForm.deleteProjectIndex === index && (
                        <div className={clientStyles.deleteConfirm}>
                          <div className={clientStyles.deleteConfirmHeader}>
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
                              ¿Estás seguro de que quieres eliminar el proyecto “{project || `Proyecto ${index + 1}`}”?
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
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              animateClick(e.currentTarget);
                              if (clientForm.deleteConfirm.toLowerCase() === 'eliminar') {
                                setClientForm((prev) => ({
                                  ...prev,
                                  projects: prev.projects.filter((_, i) => i !== prev.deleteProjectIndex),
                                  deleteProjectIndex: null,
                                  deleteConfirm: '',
                                }));
                              }
                            }}
                            disabled={clientForm.deleteConfirm.toLowerCase() !== 'eliminar'}
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
                    onClick={(e) => {
                      animateClick(e.currentTarget);
                      setClientForm((prev) => ({ ...prev, projects: [...prev.projects, ''] }));
                    }}
                    className={clientStyles.addProjectButton}
                    aria-label="Añadir nuevo proyecto"
                  >
                    +
                  </button>
                </div>
                <button
                  type="submit"
                  className={clientStyles.submitButton}
                  onClick={(e) => animateClick(e.currentTarget)}
                >
                  Guardar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {isInviteMemberOpen && (
        <div className={memberStyles.invitePopupOverlay}>
          <div className={memberStyles.inviteModal} ref={invitePopupRef}>
            <div className={memberStyles.inviteContent}>
              <h2 className={memberStyles.inviteTitle}>Invita a un nuevo miembro</h2>
              <p className={memberStyles.inviteSubtitle}>
                Escribe el correo electrónico de la persona que quieres invitar a esta cuenta.
              </p>
              <form
                style={{ minWidth: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}
                onSubmit={handleInviteSubmit}
              >
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
                  />
                </div>
                <button
                  type="submit"
                  className={memberStyles.inviteSubmitButton}
                  onClick={(e) => animateClick(e.currentTarget)}
                >
                  Enviar Invitación
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    gsap.to(invitePopupRef.current, {
                      opacity: 0,
                      y: 50,
                      scale: 0.95,
                      duration: 0.3,
                      ease: 'power2.in',
                      onComplete: () => setIsInviteMemberOpen(false),
                    });
                  }}
                  className={memberStyles.cancelButton}
                >
                  Cancelar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
