import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, collection, setDoc, getDocs, addDoc } from 'firebase/firestore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import styles from '@/components/NewTaskStyles.module.scss';
import clientStyles from '@/components/ClientsTable.module.scss';
import memberStyles from '@/components/MembersTable.module.scss';
import { Timestamp } from 'firebase/firestore';

gsap.registerPlugin(ScrollTrigger);

const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timer: NodeJS.Timeout | null = null;
    return (...args: any[]) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        func(...args);
        timer = null;
      }, delay);
    };
  };

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

interface CreateTaskProps {
  isOpen: boolean;
  onToggle: () => void;
  onHasUnsavedChanges: (hasChanges: boolean) => void;
}

const CreateTask: React.FC<CreateTaskProps> = ({ isOpen, onToggle, onHasUnsavedChanges }) => {
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initialTaskState = useRef<Task>({ ...task });
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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [startDatePosition, setStartDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [endDatePosition, setEndDatePosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clientSlidesRef = useRef<HTMLDivElement>(null);
  const pmSlidesRef = useRef<HTMLDivElement>(null);
  const createEditPopupRef = useRef<HTMLDivElement>(null);
  const invitePopupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);
  const startDatePopperRef = useRef<HTMLDivElement>(null);
  const endDatePopperRef = useRef<HTMLDivElement>(null);
  const advancedSectionRef = useRef<HTMLDivElement>(null);
  const clientDragRef = useRef<HTMLDivElement>(null);
  const pmDragRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Task, string>>>({});

  // Track unsaved changes
  useEffect(() => {
    const isChanged = Object.keys(task).some((key) => {
      if (key === 'createdAt') return false;
      if (Array.isArray(task[key as keyof Task])) {
        return (task[key as keyof Task] as string[]).join() !== (initialTaskState.current[key as keyof Task] as string[]).join();
      }
      return task[key as keyof Task] !== initialTaskState.current[key as keyof Task];
    });
    setHasUnsavedChanges(isChanged);
    onHasUnsavedChanges(isChanged);
  }, [task, onHasUnsavedChanges]);

  // Reset form when closing
  useEffect(() => {
    if (!isOpen) {
      setTask({ ...initialTaskState.current });
      setHasUnsavedChanges(false);
      onHasUnsavedChanges(false);
      setIsAdvancedOpen(false);
      setErrors({});
    }
  }, [isOpen, onHasUnsavedChanges]);

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
        const clerkUsers: {
          id: string;
          imageUrl?: string;
          firstName?: string;
          lastName?: string;
          publicMetadata: { role?: string };
        }[] = await response.json();
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

  // GSAP animations for container
  useEffect(() => {
    if (containerRef.current) {
      if (isOpen) {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, height: 0 },
          { opacity: 1, height: 'auto', duration: 0.3, ease: 'power2.out' },
        );
      } else {
        gsap.to(containerRef.current, {
          opacity: 0,
          height: 0,
          duration: 0.3,
          ease: 'power2.in',
        });
      }
    }
  }, [isOpen]);

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
          },
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
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' },
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
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' },
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

  // GSAP animation for advanced section
  useEffect(() => {
    if (advancedSectionRef.current) {
      gsap.to(advancedSectionRef.current, {
        height: isAdvancedOpen ? 'auto' : 0,
        opacity: isAdvancedOpen ? 1 : 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }, [isAdvancedOpen]);

  // Close DatePickers on scroll
  useEffect(() => {
    const handleScroll = debounce(() => {
      if (isStartDateOpen || isEndDateOpen) {
        console.log('Closing date pickers due to scroll');
        setIsStartDateOpen(false);
        setIsEndDateOpen(false);
      }
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isStartDateOpen, isEndDateOpen]);

  // Close popups and dropdowns on outside click
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
      if (
        startDatePopperRef.current &&
        !startDatePopperRef.current.contains(event.target as Node) &&
        isStartDateOpen &&
        !startDateInputRef.current?.contains(event.target as Node)
      ) {
        setIsStartDateOpen(false);
      }
      if (
        endDatePopperRef.current &&
        !endDatePopperRef.current.contains(event.target as Node) &&
        isEndDateOpen &&
        !endDateInputRef.current?.contains(event.target as Node)
      ) {
        setIsEndDateOpen(false);
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
    isStartDateOpen,
    isEndDateOpen,
  ]);

  // GSAP dropdown animations
  useEffect(() => {
    if (isProjectDropdownOpen && projectDropdownRef.current) {
      const dropdownItems = projectDropdownRef.current.querySelector(`.${styles.dropdownItems}`);
      if (dropdownItems) {
        gsap.fromTo(
          dropdownItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }
    if (isStatusDropdownOpen && statusDropdownRef.current) {
      const dropdownItems = statusDropdownRef.current.querySelector(`.${styles.dropdownItems}`);
      if (dropdownItems) {
        gsap.fromTo(
          dropdownItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }
    if (isPriorityDropdownOpen && priorityDropdownRef.current) {
      const dropdownItems = priorityDropdownRef.current.querySelector(`.${styles.dropdownItems}`);
      if (dropdownItems) {
        gsap.fromTo(
          dropdownItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }
  }, [isProjectDropdownOpen, isStatusDropdownOpen, isPriorityDropdownOpen]);

  // Position DatePicker poppers
  useEffect(() => {
    if (isStartDateOpen && startDateInputRef.current) {
      const rect = startDateInputRef.current.getBoundingClientRect();
      setStartDatePosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    if (isEndDateOpen && endDateInputRef.current) {
      const rect = endDateInputRef.current.getBoundingClientRect();
      setEndDatePosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [isStartDateOpen, isEndDateOpen]);

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
    [clients.length],
  );

  const handleClientSlidePrev = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setClientSlideIndex((prev) => (prev - 1 + Math.ceil(clients.length / 6)) % Math.ceil(clients.length / 6));
    },
    [clients.length],
  );

  const handlePmSlideNext = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setPmSlideIndex((prev) => (prev + 1) % Math.ceil(users.length / 6));
    },
    [users.length],
  );

  const handlePmSlidePrev = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setPmSlideIndex((prev) => (prev - 1 + Math.ceil(users.length / 6)) % Math.ceil(users.length / 6));
    },
    [users.length],
  );

  // Form handlers
  const handleClientSelect = useCallback(
    (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev, clientId, project: '' }));
      setErrors((prev) => ({ ...prev, clientId: undefined }));
    },
    [],
  );

  const handlePmSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => {
        const isSelected = prev.LeadedBy.includes(userId);
        const newLeadedBy = isSelected
          ? prev.LeadedBy.filter((id) => id !== userId)
          : [...prev.LeadedBy, userId];
        return {
          ...prev,
          LeadedBy: newLeadedBy,
          AssignedTo: prev.AssignedTo.filter((id) => id !== userId),
        };
      });
      setErrors((prev) => ({ ...prev, LeadedBy: undefined }));
    },
    [],
  );

  const handleCollaboratorSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      if (!task.LeadedBy.includes(userId)) {
        setTask((prev) => ({
          ...prev,
          AssignedTo: prev.AssignedTo.includes(userId) ? prev.AssignedTo.filter((id) => id !== userId) : [...prev.AssignedTo, userId],
        }));
        setSearchCollaborator('');
        setErrors((prev) => ({ ...prev, AssignedTo: undefined }));
      }
    },
    [task.LeadedBy],
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
            : [...prev, clientData],
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
    [user, clientForm, isEditClientOpen],
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
    [inviteEmail],
  );

  const validateTask = () => {
    const newErrors: Partial<Record<keyof Task, string>> = {};
    if (!task.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!task.description.trim()) newErrors.description = 'La descripción es obligatoria';
    if (!task.clientId) newErrors.clientId = 'Selecciona una cuenta';
    if (!task.project) newErrors.project = 'Selecciona un proyecto';
    if (!task.startDate) newErrors.startDate = 'La fecha de inicio es obligatoria';
    if (!task.endDate) newErrors.endDate = 'La fecha de finalización es obligatoria';
    if (task.status === 'Seleccionar') newErrors.status = 'Selecciona un estado';
    if (task.priority === 'Seleccionar') newErrors.priority = 'Selecciona una prioridad';
    if (!task.LeadedBy.length) newErrors.LeadedBy = 'Selecciona al menos un encargado';
    if (!task.AssignedTo.length) newErrors.AssignedTo = 'Selecciona al menos un colaborador';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTaskSubmit = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      e.preventDefault();
      if (!user || !validateTask()) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
      }

      if (task.startDate && task.endDate && task.startDate > task.endDate) {
        alert('La fecha de inicio debe ser anterior a la fecha de finalización.');
        return;
      }

      setIsSaving(true);
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

        setTask({
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
        setHasUnsavedChanges(false);
        onHasUnsavedChanges(false);
        setIsSaving(false);
        router.push('/');
      } catch (error) {
        console.error('Error saving task:', error);
        alert('Error al guardar la tarea.');
        setIsSaving(false);
      }
    },
    [user, task, router, onHasUnsavedChanges],
  );

  const filteredCollaborators = useMemo(() => {
    return users.filter(
      (u) =>
        !task.LeadedBy.includes(u.id) &&
        (u.fullName.toLowerCase().includes(searchCollaborator.toLowerCase()) ||
         u.role.toLowerCase().includes(searchCollaborator.toLowerCase())),
    );
  }, [users, task.LeadedBy, searchCollaborator]);

  const handleProjectSelect = useCallback(
    (project: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev, project }));
      setIsProjectDropdownOpen(false);
      setErrors((prev) => ({ ...prev, project: undefined }));
    },
    [],
  );

  const handleStatusSelect = useCallback(
    (status: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev, status }));
      setIsStatusDropdownOpen(false);
      setErrors((prev) => ({ ...prev, status: undefined }));
    },
    [],
  );

  const handlePrioritySelect = useCallback(
    (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev, priority }));
      setIsPriorityDropdownOpen(false);
      setErrors((prev) => ({ ...prev, priority: undefined }));
    },
    [],
  );

  const toggleAdvancedSection = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setIsAdvancedOpen((prev) => !prev);
    },
    [],
  );

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ''} ${isSaving ? styles.saving : ''}`} ref={containerRef}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Crear Tarea</div>
        <button className={styles.toggleButton} onClick={onToggle}>
          <Image
            src={isOpen ? '/chevron-up.svg' : '/chevron-down.svg'}
            alt={isOpen ? 'Cerrar' : 'Abrir'}
            width={16}
            height={16}
          />
        </button>
      </div>
      {isOpen && (
        <div className={styles.content}>
          {/* Container 0: Account and Project */}
          <div className={styles.section} ref={(el) => { sectionsRef.current[0] = el; }}>
            <div className={styles.sectionTitle}>Cuenta Asignada:</div>
            <div className={styles.sectionSubtitle}>
              Selecciona la cuenta a la que se asignará esta tarea (por ejemplo, Pinaccle).
            </div>
            <div className={styles.slideshow}>
              <button className={styles.slideButton} onClick={handleClientSlidePrev} disabled={clientSlideIndex === 0}>
                <Image src="/chevron-left.svg" alt="Previous" width={24} height={52} />
              </button>
              <div className={styles.slidesContainer}>
                <Draggable
                  axis="x"
                  bounds={{ left: -(clients.length - 6) * 150, right: 0 }}
                  nodeRef={clientDragRef}
                  onDrag={(e, data) => {
                    const slideWidth = 150; // Approximate card width + gap
                    const newIndex = Math.round(-data.x / slideWidth);
                    setClientSlideIndex(newIndex);
                  }}
                >
                  <div className={styles.slides} ref={clientDragRef}>
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
                </Draggable>
              </div>
              <button
                className={styles.slideButton}
                onClick={handleClientSlideNext}
                disabled={clientSlideIndex >= Math.ceil(clients.length / 6) - 1}
              >
                <Image src="/chevron-right.svg" alt="Next" width={24} height={52} />
              </button>
            </div>
            {errors.clientId && <div className={styles.error}>{errors.clientId}</div>}
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
          <div className={styles.section} ref={(el) => { sectionsRef.current[1] = el; }}>
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
              {errors.project && <div className={styles.error}>{errors.project}</div>}
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
          {/* Container 1: Basic Information */}
          <div className={styles.section} ref={(el) => { sectionsRef.current[2] = el; }}>
            <div className={styles.sectionTitle}>1: Información Básica:</div>
            <div className={styles.level1Grid}>
              <div className={styles.level1Column}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nombre de la tarea *{errors.name && <span className={styles.error}>{errors.name}</span>}</label>
                  <input
                    type="text"
                    className={`${styles.input} ${errors.name ? styles.errorInput : ''}`}
                    value={task.name}
                    onChange={(e) => setTask((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Crear wireframe"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Descripción *{errors.description && <span className={styles.error}>{errors.description}</span>}</label>
                  <input
                    type="text"
                    className={`${styles.input} ${errors.description ? styles.errorInput : ''}`}
                    value={task.description}
                    onChange={(e) => setTask((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Ej: Diseñar wireframes para la nueva app móvil"
                  />
                </div>
              </div>
              <div className={styles.level1Column}>
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
                    <label className={styles.label}>Fecha de Inicio *{errors.startDate && <span className={styles.error}>{errors.startDate}</span>}</label>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.startDate ? styles.errorInput : ''}`}
                      value={task.startDate ? task.startDate.toLocaleDateString('es-ES') : ''}
                      onClick={() => setIsStartDateOpen(true)}
                      placeholder="Selecciona una fecha"
                      readOnly
                      ref={startDateInputRef}
                    />
                    {isStartDateOpen &&
                      createPortal(
                        <div
                          className={styles.datePickerPopper}
                          style={{
                            top: startDatePosition?.top,
                            left: startDatePosition?.left,
                            position: 'absolute',
                            zIndex: 130000,
                          }}
                          ref={startDatePopperRef}
                        >
                          <DatePicker
                            selected={task.startDate}
                            onChange={(date: Date) => {
                              setTask((prev) => ({ ...prev, startDate: date }));
                              setErrors((prev) => ({ ...prev, startDate: undefined }));
                            }}
                            inline
                            dateFormat="dd/MM/yyyy"
                          />
                        </div>,
                        document.body
                      )}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha de Finalización *{errors.endDate && <span className={styles.error}>{errors.endDate}</span>}</label>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.endDate ? styles.errorInput : ''}`}
                      value={task.endDate ? task.endDate.toLocaleDateString('es-ES') : ''}
                      onClick={() => setIsEndDateOpen(true)}
                      placeholder="Selecciona una fecha"
                      readOnly
                      ref={endDateInputRef}
                    />
                    {isEndDateOpen &&
                      createPortal(
                        <div
                          className={styles.datePickerPopper}
                          style={{
                            top: endDatePosition?.top,
                            left: endDatePosition?.left,
                            position: 'absolute',
                            zIndex: 130000,
                          }}
                          ref={endDatePopperRef}
                        >
                          <DatePicker
                            selected={task.endDate}
                            onChange={(date: Date) => {
                              setTask((prev) => ({ ...prev, endDate: date }));
                              setErrors((prev) => ({ ...prev, endDate: undefined }));
                            }}
                            inline
                            dateFormat="dd/MM/yyyy"
                          />
                        </div>,
                        document.body
                      )}
                  </div>
                </div>
              </div>
              <div className={styles.level1Column}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Estado Inicial *{errors.status && <span className={styles.error}>{errors.status}</span>}</label>
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
              </div>
              <div className={styles.level1Column}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Prioridad *{errors.priority && <span className={styles.error}>{errors.priority}</span>}</label>
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
          </div>
          {/* Container 2: Team */}
          <div className={styles.section} ref={(el) => { sectionsRef.current[3] = el; }}>
            <div className={styles.sectionTitle}>2: Agregar información de equipo</div>
            <div className={styles.sectionTitle}>Persona Encargada de la tarea: *{errors.LeadedBy && <span className={styles.error}>{errors.LeadedBy}</span>}</div>
            <div className={styles.sectionSubtitle}>
              Selecciona la persona principal responsable de la tarea. Esta persona será el punto de contacto y supervisará el progreso.
            </div>
            <div className={styles.slideshow}>
              <button className={styles.slideButton} onClick={handlePmSlidePrev} disabled={pmSlideIndex === 0}>
                <Image src="/chevron-left.svg" alt="Previous" width={24} height={52} />
              </button>
              <div className={styles.slidesContainer}>
                <Draggable
                  axis="x"
                  bounds={{ left: -(users.length - 6) * 150, right: 0 }}
                  nodeRef={pmDragRef}
                  onDrag={(e, data) => {
                    const slideWidth = 150; // Approximate card width + gap
                    const newIndex = Math.round(-data.x / slideWidth);
                    setPmSlideIndex(newIndex);
                  }}
                >
                  <div className={styles.slides} ref={pmDragRef}>
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
                </Draggable>
              </div>
              <button
                className={styles.slideButton}
                onClick={handlePmSlideNext}
                disabled={pmSlideIndex >= Math.ceil(users.length / 6) - 1}
              >
                <Image src="/chevron-right.svg" alt="Next" width={24} height={52} />
              </button>
            </div>
            <div className={styles.sectionTitle}>Colaboradores: *{errors.AssignedTo && <span className={styles.error}>{errors.AssignedTo}</span>}</div>
            <div className={styles.sectionSubtitle}>
              Agrega a los miembros del equipo que trabajarán en la tarea. Puedes incluir varios colaboradores según sea necesario.
            </div>
            <div className={styles.formGroup}>
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
                        {u.fullName} ({u.role}) {task.AssignedTo.includes(u.id) && '(Seleccionado)'}
                      </div>
                    ))
                  ) : (
                    <div className={styles.dropdownItem}>No hay coincidencias</div>
                  )}
                </div>
              )}
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
          </div>
          {/* Container 3: Resources */}
          <div className={styles.section} ref={(el) => { sectionsRef.current[4] = el; }}>
            <div className={styles.sectionTitle}>3: Recursos</div>
            <div className={styles.resourceRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Presupuesto Asignado</label>
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
                <label className={styles.label}>Horas Asignadas</label>
                <input
                  type="text"
                  className={styles.input}
                  value={task.hours}
                  onChange={(e) => setTask((prev) => ({ ...prev, hours: e.target.value }))}
                  placeholder="120"
                />
              </div>
            </div>
          </div>
          {/* Container 4: Advanced Configuration */}
          <div className={styles.section} ref={(el) => { sectionsRef.current[5] = el; }}>
            <button className={styles.advancedToggle} onClick={toggleAdvancedSection}>
              4: Configuración Avanzada
              <Image
                src={isAdvancedOpen ? '/chevron-up.svg' : '/chevron-down.svg'}
                alt={isAdvancedOpen ? 'Cerrar' : 'Abrir'}
                width={16}
                height={16}
              />
            </button>
            <div className={styles.advancedContent} ref={advancedSectionRef}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Metodología del Proyecto</label>
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
          </div>
          {/* Submit Section */}
          <div className={styles.submitSection} ref={(el) => { sectionsRef.current[6] = el; }}>
            <div className={styles.submitText}>
              Has seleccionado {task.AssignedTo.length} personas asignadas a este proyecto.
              <br />
              Al presionar “Registrar Tarea” se notificarán a las personas involucradas en la tarea a través de mail. Si
              cometieras un error, tendrás que comunicarlo y solicitar una corrección.
            </div>
            <button className={styles.submitButton} onClick={handleTaskSubmit} disabled={isSaving}>
              Registrar Tarea
            </button>
          </div>
        </div>
      )}
      {isSaving && (
        <div className={styles.loaderOverlay}>
          <div className={styles.loader}></div>
        </div>
      )}
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
};

export default CreateTask;
