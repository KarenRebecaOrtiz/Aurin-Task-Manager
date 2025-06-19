'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, collection, setDoc, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation } from 'swiper/modules';
import { db } from '@/lib/firebase';
import styles from "@/components/CreateTask.module.scss";
import { Timestamp } from 'firebase/firestore';

gsap.registerPlugin(ScrollTrigger);

const debounce = <T extends unknown[]>(func: (...args: T) => void, delay: number) => {
  let timer: NodeJS.Timeout | null = null;
  return (...args: T) => {
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
  id: string;
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

interface EditTaskProps {
  isOpen: boolean;
  onToggle: () => void;
  taskId: string;
  onHasUnsavedChanges: (hasChanges: boolean) => void;
  onCreateClientOpen: () => void;
  onEditClientOpen: (client: Client) => void;
  onInviteSidebarOpen: () => void;
}

const EditTask: React.FC<EditTaskProps> = ({
  isOpen,
  onToggle,
  taskId,
  onHasUnsavedChanges,
  onCreateClientOpen,
  onEditClientOpen,
  onInviteSidebarOpen,
}) => {
  const { user } = useUser();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [task, setTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialTaskState = useRef<Task | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const [isCollaboratorDropdownOpen, setIsCollaboratorDropdownOpen] = useState(false);
  const [projectDropdownPosition, setProjectDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [collaboratorDropdownPosition, setCollaboratorDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [startDatePosition, setStartDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [endDatePosition, setEndDatePosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const collaboratorInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);
  const startDatePopperRef = useRef<HTMLDivElement>(null);
  const endDatePopperRef = useRef<HTMLDivElement>(null);
  const projectDropdownPopperRef = useRef<HTMLDivElement>(null);
  const statusDropdownPopperRef = useRef<HTMLDivElement>(null);
  const priorityDropdownPopperRef = useRef<HTMLDivElement>(null);
  const collaboratorDropdownPopperRef = useRef<HTMLDivElement>(null);
  const advancedSectionRef = useRef<HTMLDivElement>(null);
  const [searchCollaborator, setSearchCollaborator] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof Task, string>>>({});

  // Fetch task, clients, and users
  useEffect(() => {
    if (!taskId || !user?.id) return;

    const fetchTask = async () => {
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', taskId));
        if (!taskDoc.exists()) {
          console.warn('Task not found:', taskId);
          router.push('/dashboard/tasks');
          return;
        }
        const taskData = taskDoc.data();
        if (taskData.CreatedBy !== user.id) {
          console.warn('User not authorized to edit task:', taskId);
          router.push('/dashboard/tasks');
          return;
        }
        const fetchedTask: Task = {
          id: taskDoc.id,
          clientId: taskData.clientId || '',
          project: taskData.project || '',
          name: taskData.name || '',
          description: taskData.description || '',
          objectives: taskData.objectives || '',
          startDate: taskData.startDate ? taskData.startDate.toDate() : null,
          endDate: taskData.endDate ? taskData.endDate.toDate() : null,
          status: taskData.status || 'Seleccionar',
          priority: taskData.priority || 'Seleccionar',
          budget: taskData.budget ? taskData.budget.toString() : '',
          hours: taskData.hours ? taskData.hours.toString() : '',
          methodology: taskData.methodology || '',
          risks: taskData.risks || '',
          mitigation: taskData.mitigation || '',
          stakeholders: taskData.stakeholders || '',
          CreatedBy: taskData.CreatedBy || '',
          LeadedBy: taskData.LeadedBy || [],
          AssignedTo: taskData.AssignedTo || [],
          createdAt: taskData.createdAt ? taskData.createdAt.toDate() : new Date(),
        };
        setTask(fetchedTask);
        initialTaskState.current = { ...fetchedTask };
        setLoading(false);
      } catch (error) {
        console.error('Error fetching task:', error);
        router.push('/dashboard/tasks');
      }
    };

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

    fetchTask();
    fetchClients();
    fetchUsers();
  }, [taskId, user?.id, router]);

  // Track unsaved changes
  useEffect(() => {
    if (!task || !initialTaskState.current) return;
    const isChanged = Object.keys(task).some((key) => {
      if (key === 'createdAt') return false;
      if (Array.isArray(task[key as keyof Task])) {
        return (task[key as keyof Task] as string[]).join() !== (initialTaskState.current[key as keyof Task] as string[]).join();
      }
      return task[key as keyof Task] !== initialTaskState.current[key as keyof Task];
    });
    onHasUnsavedChanges(isChanged);
  }, [task, onHasUnsavedChanges]);
  

  // Reset form when closing
  useEffect(() => {
    if (!isOpen && task) {
      setTask(initialTaskState.current);
      setErrors({});
    }
  }, [isOpen, task]);

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

  // Close DatePickers and Dropdowns on scroll
  useEffect(() => {
    const handleScroll = debounce(() => {
      if (isStartDateOpen || isEndDateOpen || isProjectDropdownOpen || isStatusDropdownOpen || isPriorityDropdownOpen || isCollaboratorDropdownOpen) {
        console.log('Closing date pickers and dropdowns due to scroll');
        setIsStartDateOpen(false);
        setIsEndDateOpen(false);
        setIsProjectDropdownOpen(false);
        setIsStatusDropdownOpen(false);
        setIsPriorityDropdownOpen(false);
        setIsCollaboratorDropdownOpen(false);
      }
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isStartDateOpen, isEndDateOpen, isProjectDropdownOpen, isStatusDropdownOpen, isPriorityDropdownOpen, isCollaboratorDropdownOpen]);

  // Close popups and dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node) &&
        projectDropdownPopperRef.current &&
        !projectDropdownPopperRef.current.contains(event.target as Node) &&
        isProjectDropdownOpen
      ) {
        setIsProjectDropdownOpen(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node) &&
        statusDropdownPopperRef.current &&
        !statusDropdownPopperRef.current.contains(event.target as Node) &&
        isStatusDropdownOpen
      ) {
        setIsStatusDropdownOpen(false);
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node) &&
        priorityDropdownPopperRef.current &&
        !priorityDropdownPopperRef.current.contains(event.target as Node) &&
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
      if (
        collaboratorInputRef.current &&
        !collaboratorInputRef.current.contains(event.target as Node) &&
        collaboratorDropdownPopperRef.current &&
        !collaboratorDropdownPopperRef.current.contains(event.target as Node) &&
        isCollaboratorDropdownOpen
      ) {
        setIsCollaboratorDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [
    isProjectDropdownOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
    isStartDateOpen,
    isEndDateOpen,
    isCollaboratorDropdownOpen,
  ]);

  // Position DatePicker and Dropdown poppers
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
    if (isProjectDropdownOpen && projectDropdownRef.current) {
      const rect = projectDropdownRef.current.getBoundingClientRect();
      setProjectDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    if (isStatusDropdownOpen && statusDropdownRef.current) {
      const rect = statusDropdownRef.current.getBoundingClientRect();
      setStatusDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    if (isPriorityDropdownOpen && priorityDropdownRef.current) {
      const rect = priorityDropdownRef.current.getBoundingClientRect();
      setPriorityDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    if (isCollaboratorDropdownOpen && collaboratorInputRef.current) {
      const rect = collaboratorInputRef.current.getBoundingClientRect();
      setCollaboratorDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [isStartDateOpen, isEndDateOpen, isProjectDropdownOpen, isStatusDropdownOpen, isPriorityDropdownOpen, isCollaboratorDropdownOpen]);

  // GSAP dropdown animations
  useEffect(() => {
    if (isProjectDropdownOpen && projectDropdownPopperRef.current) {
      gsap.fromTo(
        projectDropdownPopperRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
    if (isStatusDropdownOpen && statusDropdownPopperRef.current) {
      gsap.fromTo(
        statusDropdownPopperRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
    if (isPriorityDropdownOpen && priorityDropdownPopperRef.current) {
      gsap.fromTo(
        priorityDropdownPopperRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
    if (isCollaboratorDropdownOpen && collaboratorDropdownPopperRef.current) {
      gsap.fromTo(
        collaboratorDropdownPopperRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    }
  }, [isProjectDropdownOpen, isStatusDropdownOpen, isPriorityDropdownOpen, isCollaboratorDropdownOpen]);

  // GSAP click animation handler (subtle)
  const animateClick = (element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.98,
      opacity: 0.9,
      duration: 0.15,
      ease: 'power1.out',
      yoyo: true,
      repeat: 1,
    });
  };

  // Form handlers
  const handleClientSelect = useCallback(
    (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev!, clientId, project: '' }));
      setErrors((prev) => ({ ...prev, clientId: undefined }));
    },
    [],
  );

  const handlePmSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => {
        const isSelected = prev!.LeadedBy.includes(userId);
        const newLeadedBy = isSelected
          ? prev!.LeadedBy.filter((id) => id !== userId)
          : [...prev!.LeadedBy, userId];
        return {
          ...prev!,
          LeadedBy: newLeadedBy,
          AssignedTo: prev!.AssignedTo.filter((id) => id !== userId),
        };
      });
      setErrors((prev) => ({ ...prev, LeadedBy: undefined }));
    },
    [],
  );

  const handleCollaboratorSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      if (!task!.LeadedBy.includes(userId)) {
        setTask((prev) => ({
          ...prev!,
          AssignedTo: prev!.AssignedTo.includes(userId)
            ? prev!.AssignedTo.filter((id) => id !== userId)
            : [...prev!.AssignedTo, userId],
        }));
        setSearchCollaborator('');
        setErrors((prev) => ({ ...prev, AssignedTo: undefined }));
      }
    },
    [task],
  );

  const handleCollaboratorRemove = useCallback(
    (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({
        ...prev!,
        AssignedTo: prev!.AssignedTo.filter((id) => id !== userId),
      }));
      setErrors((prev) => ({ ...prev, AssignedTo: undefined }));
    },
    [],
  );

  const validateTask = useCallback(() => {
    const newErrors: Partial<Record<keyof Task, string>> = {};
    if (!task!.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (!task!.description.trim()) newErrors.description = 'La descripción es obligatoria';
    if (!task!.clientId) newErrors.clientId = 'Selecciona una cuenta';
    if (!task!.project) newErrors.project = 'Selecciona un proyecto';
    if (!task!.startDate) newErrors.startDate = 'La fecha de inicio es obligatoria';
    if (!task!.endDate) newErrors.endDate = 'La fecha de finalización es obligatoria';
    if (task!.status === 'Seleccionar') newErrors.status = 'Selecciona un estado';
    if (task!.priority === 'Seleccionar') newErrors.priority = 'Selecciona una prioridad';
    if (!task!.LeadedBy.length) newErrors.LeadedBy = 'Selecciona al menos un encargado';
    if (!task!.AssignedTo.length) newErrors.AssignedTo = 'Selecciona al menos un colaborador';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [task]);

  const handleTaskSubmit = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      e.preventDefault();
      if (!user || !task || !validateTask()) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
      }
  
      if (task.startDate && task.endDate && task.startDate > task.endDate) {
        alert('La fecha de inicio debe ser anterior a la fecha de finalización.');
        return;
      }
  
      setIsSaving(true);
      try {
        const taskData = {
          ...task,
          budget: parseFloat(task.budget.replace('$', '')) || 0,
          hours: parseInt(task.hours) || 0,
          createdAt: Timestamp.fromDate(task.createdAt),
        };
        await setDoc(doc(db, 'tasks', task.id), taskData);
  
        const recipients = new Set<string>([...task.LeadedBy, ...task.AssignedTo]);
        recipients.delete(user.id);
        for (const recipientId of Array.from(recipients)) {
          await addDoc(collection(db, 'notifications'), {
            userId: user.id,
            taskId: task.id,
            message: `${user.firstName || 'Usuario'} actualizó la tarea ${task.name}`,
            timestamp: Timestamp.now(),
            read: false,
            recipientId,
          });
        }
  
        onHasUnsavedChanges(false);
        setIsSaving(false);
        onToggle();
      } catch (error) {
        console.error('Error updating task:', error);
        alert('Error al guardar la tarea.');
        setIsSaving(false);
      }
    },
    [user, task, validateTask, onToggle, onHasUnsavedChanges]
  );

  const filteredCollaborators = useMemo(() => {
    return users.filter(
      (u) =>
        !task?.LeadedBy.includes(u.id) &&
        (u.fullName.toLowerCase().includes(searchCollaborator.toLowerCase()) ||
         u.role.toLowerCase().includes(searchCollaborator.toLowerCase())),
    );
  }, [users, task?.LeadedBy, searchCollaborator]);

  const handleProjectSelect = useCallback(
    (project: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev!, project }));
      setIsProjectDropdownOpen(false);
      setErrors((prev) => ({ ...prev, project: undefined }));
    },
    [],
  );

  const handleStatusSelect = useCallback(
    (status: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev!, status }));
      setIsStatusDropdownOpen(false);
      setErrors((prev) => ({ ...prev, status: undefined }));
    },
    [],
  );

  const handlePrioritySelect = useCallback(
    (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      setTask((prev) => ({ ...prev!, priority }));
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

  if (loading) {
    return <div className={styles.container}>Cargando...</div>;
  }

  if (!task) {
    return <div className={styles.container}>Tarea no encontrada</div>;
  }

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ''} ${isSaving ? styles.saving : ''}`} ref={containerRef}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Editar Tarea</div>
        <button className={styles.toggleButton} onClick={onToggle}>
          <Image
            src={isOpen ? '/x.svg' : '/x.svg'}
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
              <Swiper
                modules={[Navigation]}
                slidesPerView={6}
                spaceBetween={20}
                navigation={{
                  prevEl: `.${styles.clientPrev}`,
                  nextEl: `.${styles.clientNext}`,
                }}
                breakpoints={{
                  1024: { slidesPerView: 4 },
                  767: { slidesPerView: 2 },
                  480: { slidesPerView: 1 },
                }}
                className={styles.swiper}
              >
                {clients.map((client) => (
                  <SwiperSlide key={client.id}>
                    <div
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
                  </SwiperSlide>
                ))}
              </Swiper>
              <button className={`${styles.slideButton} ${styles.clientPrev}`}>
                <Image src="/chevron-left.svg" alt="Previous" width={24} height={52} />
              </button>
              <button className={`${styles.slideButton} ${styles.clientNext}`}>
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
                  onCreateClientOpen();
                }}
              >
                + Agregar Cuenta
              </button>
            </div>
          </div>
          <div className={styles.section} ref={(el) => { sectionsRef.current[1] = el; }}>
            <div className={styles.projectSection}>
              <div className={styles.sectionSubtitle}>Selecciona la carpeta a la que se asignará esta tarea:</div>
              <div className={styles.dropdownContainer} ref={projectDropdownRef}>
                <div 
                  style={{ border: 'solid 1px #f2f2f3', padding: '10px', overflow: 'hidden', borderRadius: '5px', marginTop: '5px' }}
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsProjectDropdownOpen(!isProjectDropdownOpen);
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{task.project || 'Seleccionar un Proyecto'}</span>
                  <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
                </div>
                {isProjectDropdownOpen &&
                  createPortal(
                    <div
                      className={styles.dropdownItems}
                      style={{
                        top: projectDropdownPosition?.top,
                        left: projectDropdownPosition?.left,
                        position: 'absolute',
                        zIndex: 150000,
                        backgroundColor: '#FFFFFF',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        boxShadow: `
                          0px 2px 4px rgba(0, 0, 0, 0.04),
                          0px 7px 7px rgba(0, 0, 0, 0.03),
                          0px 15px 9px rgba(0, 0, 0, 0.02),
                          0px 27px 11px rgba(0, 0, 0, 0.01),
                          0px 42px 12px rgba(0, 0, 0, 0.00)
                        `,
                      }}
                      ref={projectDropdownPopperRef}
                    >
                            {clients
                            .find((c) => c.id === task.clientId)
                            ?.projects.map((project, index) => (
                                <div
                                key={`${project}-${index}`} 
                                className={styles.dropdownItem}
                                onClick={(e) => handleProjectSelect(project, e)}
                                style={{ backgroundColor: '#FFFFFF', padding: '12px', border: '1px solid rgba(243, 243, 243, 0.47)', borderRadius: '2px', cursor: 'pointer' }}
                                >
                                {project}
                                </div>
                            ))}
                    </div>,
                    document.body
                  )}
              </div>
              {errors.project && <div className={styles.error}>{errors.project}</div>}
              {task.clientId && clients.find((c) => c.id === task.clientId)?.createdBy === user?.id && (
                <button
                  className={styles.addButton}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    const client = clients.find((c) => c.id === task.clientId);
                    if (client) {
                      onEditClientOpen(client);
                    }
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
                    onChange={(e) => setTask((prev) => ({ ...prev!, name: e.target.value }))}
                    placeholder="Ej: Crear wireframe"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Descripción *{errors.description && <span className={styles.error}>{errors.description}</span>}</label>
                  <input
                    type="text"
                    className={`${styles.input} ${errors.description ? styles.errorInput : ''}`}
                    value={task.description}
                    onChange={(e) => setTask((prev) => ({ ...prev!, description: e.target.value }))}
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
                    onChange={(e) => setTask((prev) => ({ ...prev!, objectives: e.target.value }))}
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
                              setTask((prev) => ({ ...prev!, startDate: date }));
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
                              setTask((prev) => ({ ...prev!, endDate: date }));
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
                    {isStatusDropdownOpen &&
                      createPortal(
                        <div
                          className={styles.dropdownItems}
                          style={{
                            top: statusDropdownPosition?.top,
                            left: statusDropdownPosition?.left,
                            position: 'absolute',
                            zIndex: 150000,
                            width: statusDropdownRef.current?.offsetWidth,
                            backgroundColor: '#FFFFFF',
                            borderRadius: '5px',
                            overflow: 'hidden',
                            boxShadow: `
                              0px 2px 4px rgba(0, 0, 0, 0.04),
                              0px 7px 7px rgba(0, 0, 0, 0.03),
                              0px 15px 9px rgba(0, 0, 0, 0.02),
                              0px 27px 11px rgba(0, 0, 0, 0.01),
                              0px 42px 12px rgba(0, 0, 0, 0.00)
                            `,
                          }}
                          ref={statusDropdownPopperRef}
                        >
                          {['Por comenzar', 'En Proceso', 'Finalizado', 'Backlog', 'Cancelada'].map((status) => (
                            <div
                              key={status}
                              className={styles.dropdownItem}
                              onClick={(e) => handleStatusSelect(status, e)}
                              style={{ backgroundColor: '#FFFFFF', padding: '12px', border: '1px solid rgba(243, 243, 243, 0.47)', borderRadius: '2px', cursor: 'pointer' }}
                            >
                              {status}
                            </div>
                          ))}
                        </div>,
                        document.body
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
                    {isPriorityDropdownOpen &&
                      createPortal(
                        <div
                          className={styles.dropdownItems}
                          style={{
                            top: priorityDropdownPosition?.top,
                            left: priorityDropdownPosition?.left,
                            position: 'absolute',
                            zIndex: 150000,
                            width: priorityDropdownRef.current?.offsetWidth,
                            backgroundColor: '#FFFFFF',
                            borderRadius: '5px',
                            overflow: 'hidden',
                            boxShadow: `
                              0px 2px 4px rgba(0, 0, 0, 0.04),
                              0px 7px 7px rgba(0, 0, 0, 0.03),
                              0px 15px 9px rgba(0, 0, 0, 0.02),
                              0px 27px 11px rgba(0, 0, 0, 0.01),
                              0px 42px 12px rgba(0, 0, 0, 0.00)
                            `,
                          }}
                          ref={priorityDropdownPopperRef}
                        >
                          {['Baja', 'Media', 'Alta'].map((priority) => (
                            <div
                              key={priority}
                              className={styles.dropdownItem}
                              onClick={(e) => handlePrioritySelect(priority, e)}
                              style={{ backgroundColor: '#FFFFFF', padding: '12px', border: '1px solid rgba(243, 243, 243, 0.47)', borderRadius: '2px', cursor: 'pointer' }}
                            >
                              {priority}
                            </div>
                          ))}
                        </div>,
                        document.body
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
              <Swiper
                modules={[Navigation]}
                slidesPerView={6}
                spaceBetween={20}
                navigation={{
                  prevEl: `.${styles.pmPrev}`,
                  nextEl: `.${styles.pmNext}`,
                }}
                breakpoints={{
                  1024: { slidesPerView: 4 },
                  767: { slidesPerView: 2 },
                  480: { slidesPerView: 1 },
                }}
                className={styles.swiper}
              >
                {users.map((user) => (
                  <SwiperSlide key={user.id}>
                    <div
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
                  </SwiperSlide>
                ))}
              </Swiper>
              <button className={`${styles.slideButton} ${styles.pmPrev}`}>
                <Image src="/chevron-left.svg" alt="Previous" width={24} height={52} />
              </button>
              <button className={`${styles.slideButton} ${styles.pmNext}`}>
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
                onChange={(e) => {
                  setSearchCollaborator(e.target.value);
                  setIsCollaboratorDropdownOpen(e.target.value.trim() !== '');
                }}
                onBlur={() => {
                  setTimeout(() => setIsCollaboratorDropdownOpen(false), 200);
                }}
                placeholder="Ej: John Doe"
                ref={collaboratorInputRef}
              />
              {isCollaboratorDropdownOpen &&
                createPortal(
                  <div
                    className={styles.dropdown}
                    style={{
                      top: collaboratorDropdownPosition?.top,
                      left: collaboratorDropdownPosition?.left,
                      position: 'absolute',
                      zIndex: 150000,
                      width: collaboratorInputRef.current?.offsetWidth,
                      backgroundColor: '#FFFFFF',
                      borderRadius: '5px',
                      overflow: 'hidden',
                      boxShadow: `
                        0px 2px 4px rgba(0, 0, 0, 0.04),
                        0px 7px 7px rgba(0, 0, 0, 0.03),
                        0px 15px 9px rgba(0, 0, 0, 0.02),
                        0px 27px 11px rgba(0, 0, 0, 0.01),
                        0px 42px 12px rgba(0, 0, 0, 0.00)
                      `,
                    }}
                    ref={collaboratorDropdownPopperRef}
                  >
                    {filteredCollaborators.length ? (
                      filteredCollaborators.map((u) => (
                        <div
                          key={u.id}
                          className={`${styles.dropdownItem} ${task.LeadedBy.includes(u.id) ? styles.disabled : ''}`}
                          onClick={(e) => !task.LeadedBy.includes(u.id) && handleCollaboratorSelect(u.id, e)}
                          style={{
                            backgroundColor: '#FFFFFF',
                            padding: '12px',
                            border: '1px solid rgba(243, 243, 243, 0.47)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                          }}
                        >
                          {u.fullName} ({u.role}) {task.AssignedTo.includes(u.id) && '(Seleccionado)'}
                        </div>
                      ))
                    ) : (
                      <div
                        className={styles.dropdownItem}
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '12px',
                          border: '1px solid rgba(243, 243, 243, 0.47)',
                          borderRadius: '2px',
                        }}
                      >
                        No hay coincidencias
                      </div>
                    )}
                  </div>,
                  document.body
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
                    onInviteSidebarOpen();
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
                    onChange={(e) => setTask((prev) => ({ ...prev!, budget: e.target.value.replace('$', '') }))}
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
                  onChange={(e) => setTask((prev) => ({ ...prev!, hours: e.target.value }))}
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
                src={isAdvancedOpen ? '/chevron-down.svg' : '/chevron-up.svg'}
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
                  onChange={(e) => setTask((prev) => ({ ...prev!, methodology: e.target.value }))}
                  placeholder="Selecciona una metodología"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Riesgos Potenciales</label>
                <input
                  type="text"
                  className={styles.input}
                  value={task.risks}
                  onChange={(e) => setTask((prev) => ({ ...prev!, risks: e.target.value }))}
                  placeholder="Ej: Retrasos en entregas, Falta de recursos"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Estrategias de Mitigación</label>
                <input
                  type="text"
                  className={styles.input}
                  value={task.mitigation}
                  onChange={(e) => setTask((prev) => ({ ...prev!, mitigation: e.target.value }))}
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
              Al presionar “Guardar Cambios” se actualizará la tarea y se notificará a las personas involucradas.
            </div>
            <button className={styles.submitButton} onClick={handleTaskSubmit} disabled={isSaving}>
              Guardar Cambios
            </button>
          </div>
        </div>
      )}
      {isSaving && (
        <div className={styles.loaderOverlay}>
          <div className={styles.loader}></div>
        </div>
      )}
    </div>
  );
};

export default EditTask;