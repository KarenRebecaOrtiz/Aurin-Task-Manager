'use client';

import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { doc, collection, setDoc, addDoc, onSnapshot } from "firebase/firestore";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";

import Image from "next/image";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import styles from "@/components/CreateTask.module.scss";
import { Timestamp } from "firebase/firestore";
import { z } from "zod";
import { useForm, Controller, Control, FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wizard, WizardStep, WizardProgress, WizardActions } from "@/components/ui/wizard";
import { toast } from "@/components/ui/use-toast";
import { useFormPersistence } from "@/components/ui/use-form-persistence";
import { db } from "@/lib/firebase";
import { useAuth } from '@/contexts/AuthContext'; 
import { useKeyboardShortcuts } from "@/components/ui/use-keyboard-shortcuts";
import { updateTaskActivity } from '@/lib/taskUtils';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useFilteredCollaborators, useFilteredLeaders, useFilteredClients, useAnimationOptimizations } from '@/hooks/useCreateTaskOptimizations';
import { useCreateTaskDropdowns, useCreateTaskSearch, useCreateTaskAlerts, useCreateTaskGeneral } from '@/stores/createTaskStore';

gsap.registerPlugin(ScrollTrigger);

// Esquema base sin validación condicional
const baseFormSchema = z.object({
  clientInfo: z.object({
    clientId: z.string().min(1, { message: "Selecciona una cuenta*" }),
    project: z.string().min(1, { message: "Selecciona una carpeta*" }),
  }),
  basicInfo: z.object({
    name: z.string().min(1, { message: "El nombre es obligatorio*" }),
    description: z.string().min(1, { message: "La descripción es obligatoria*" }),
    objectives: z.string().optional(),
    startDate: z.date({ required_error: "La fecha de inicio es obligatoria*" }).nullable(),
    endDate: z.date({ required_error: "La fecha de finalización es obligatoria*" }).nullable(),
    status: z.enum(["Por Iniciar", "En Proceso", "Backlog", "Por Finalizar", "Finalizado", "Cancelado"], {
      required_error: "Selecciona un estado*",
    }),
    priority: z.enum(["Baja", "Media", "Alta"], { required_error: "Selecciona una prioridad*" }),
  }),
  teamInfo: z.object({
    LeadedBy: z.array(z.string()).min(1, { message: "Selecciona al menos un líder*" }),
    AssignedTo: z.array(z.string()),
  }),
});

// Función para crear esquema dinámico basado en includeMembers
const createFormSchema = (includeMembers: boolean) => {
  return baseFormSchema.refine(
    (data) => {
      if (includeMembers) {
        return data.teamInfo.AssignedTo && data.teamInfo.AssignedTo.length > 0;
      }
      return true;
    },
    {
      message: "Debes seleccionar al menos un colaborador cuando incluyes miembros",
      path: ["teamInfo", "AssignedTo"],
    }
  );
};

type FormValues = z.infer<typeof baseFormSchema>;

const defaultValues: FormValues = {
  clientInfo: {
    clientId: "",
    project: "",
  },
  basicInfo: {
    name: "",
    description: "",
    objectives: "",
    startDate: null,
    endDate: null,
    status: "Por Iniciar",
    priority: "Baja",
  },
  teamInfo: {
    LeadedBy: [],
    AssignedTo: [],
  },
};

const stepFields: (keyof FormValues | string)[][] = [
  ["clientInfo.clientId", "clientInfo.project"],
  [
    "basicInfo.name",
    "basicInfo.description",
    "basicInfo.objectives",
    "basicInfo.startDate",
    "basicInfo.endDate",
    "basicInfo.status",
    "basicInfo.priority",
  ],
  ["teamInfo.LeadedBy", "teamInfo.AssignedTo"],
];

interface CreateTaskProps {
  isOpen: boolean;
  onToggle: () => void;
  onHasUnsavedChanges: (hasChanges: boolean) => void;
  onCreateClientOpen: () => void;
  onEditClientOpen: (client: Client) => void;
  onClientAlertChange?: (alert: { type: "success" | "fail"; message?: string; error?: string } | null) => void;
  onTaskCreated?: () => void; // Nueva prop para manejar cuando se crea exitosamente la tarea
  onShowSuccessAlert?: (message: string) => void;
  onShowFailAlert?: (message: string, error?: string) => void;
}

// Interfaces necesarias
interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projects: string[];
  createdBy: string;
}

interface DropdownStates {
  project: boolean;
  status: boolean;
  priority: boolean;
  collaborator: boolean;
  leader: boolean;
  client: boolean;
  startDate: boolean;
  endDate: boolean;
}



// Componentes memoizados para evitar re-renders innecesarios
const MemoizedTextInput = memo(({ 
  name, 
  control, 
  placeholder, 
  label, 
  subtitle,
  onKeyDown,
  ...props 
}: {
  name: string;
  control: Control<FieldValues>; // Arreglar tipo any
  placeholder: string;
  label: string;
  subtitle?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  [key: string]: unknown;
}) => (
  <div className={styles.formGroup}>
    <label className={styles.label}>{label}</label>
    {subtitle && <div className={styles.sectionSubtitle}>{subtitle}</div>}
    <Controller
      name={name}
      control={control}
      render={({ field }) => ( // Remover fieldState no usado
        <input
          className={styles.input}
          placeholder={placeholder}
          {...field}
          onKeyDown={onKeyDown}
          {...props}
        />
      )}
    />
  </div>
));

MemoizedTextInput.displayName = 'MemoizedTextInput';

const MemoizedDropdown = memo(({ 
  isOpen, 
  onToggle, 
  placeholder, 
  label, 
  children 
}: {
  isOpen: boolean;
  onToggle: () => void;
  placeholder: string;
  label: string;
  children: React.ReactNode;
}) => (
  <div className={styles.formGroup}>
    <label className={styles.label}>{label}</label>
    <div className={styles.dropdownContainer}>
      <div className={styles.dropdownTrigger} onClick={onToggle}>
        <span>{placeholder}</span>
        <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
      </div>
      {isOpen && children}
    </div>
  </div>
));

MemoizedDropdown.displayName = 'MemoizedDropdown';

const CreateTask: React.FC<CreateTaskProps> = ({
  isOpen,
  onToggle,
  onHasUnsavedChanges,
  onCreateClientOpen,
  onEditClientOpen,
  onClientAlertChange,
  onTaskCreated,
  onShowSuccessAlert,
  onShowFailAlert,
}) => {
  const { user } = useUser();
  const { isAdmin, isLoading } = useAuth(); // Use AuthContext for isAdmin and isLoading
  const [clients, setClients] = useState<Client[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  // Estados migrados al store optimizado
  const { dropdownStates, toggleDropdown } = useCreateTaskDropdowns();
  const { searchStates, setSearchState } = useCreateTaskSearch();
  const { alertStates, setAlertState } = useCreateTaskAlerts();
  const { isMounted: storeIsMounted, includeMembers: storeIncludeMembers, setMounted: setStoreMounted, setIncludeMembers: setStoreIncludeMembers } = useCreateTaskGeneral();
  
  // Mapear estados del store a variables locales para compatibilidad
  const isProjectDropdownOpen = dropdownStates.project;
  const isStatusDropdownOpen = dropdownStates.status;
  const isPriorityDropdownOpen = dropdownStates.priority;
  const isCollaboratorDropdownOpen = dropdownStates.collaborator;
  const isLeaderDropdownOpen = dropdownStates.leader;
  const isClientDropdownOpen = dropdownStates.client;
  const isStartDateOpen = dropdownStates.startDate;
  const isEndDateOpen = dropdownStates.endDate;
  
  const searchCollaborator = searchStates.collaborator;
  const searchLeader = searchStates.leader;
  const searchClient = searchStates.client;
  
  const showSuccessAlert = alertStates.showSuccess;
  const showFailAlert = alertStates.showFail;
  const failErrorMessage = alertStates.failMessage;
  
  const isMounted = storeIsMounted;
  const includeMembers = storeIncludeMembers;
  
  // Estados de posición mantenidos localmente por ahora
  const [projectDropdownPosition, setProjectDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [collaboratorDropdownPosition, setCollaboratorDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [leaderDropdownPosition, setLeaderDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [clientDropdownPosition, setClientDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [startDatePosition, setStartDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [endDatePosition, setEndDatePosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const collaboratorInputRef = useRef<HTMLInputElement>(null);
  const leaderInputRef = useRef<HTMLInputElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLDivElement>(null);
  const endDateInputRef = useRef<HTMLDivElement>(null);
  const startDatePopperRef = useRef<HTMLDivElement>(null);
  const endDatePopperRef = useRef<HTMLDivElement>(null);
  const projectDropdownPopperRef = useRef<HTMLDivElement>(null);
  const statusDropdownPopperRef = useRef<HTMLDivElement>(null);
  const priorityDropdownPopperRef = useRef<HTMLDivElement>(null);
  const collaboratorDropdownPopperRef = useRef<HTMLDivElement>(null);
  const leaderDropdownPopperRef = useRef<HTMLDivElement>(null);
  const clientDropdownPopperRef = useRef<HTMLDivElement>(null);

  // Consumir users del store global en lugar de hacer fetch directo
  const { users } = useDataStore(
    useShallow((state) => ({
      users: state.users,
    }))
  );

  // Memoizar el resolver para evitar recrearlo constantemente
  const formResolver = useMemo(() => {
    return zodResolver(createFormSchema(includeMembers));
  }, [includeMembers]);

  // Memoizar defaultValues para evitar recrearlos
  const memoizedDefaultValues = useMemo(() => defaultValues, []);

  const form = useForm<FormValues>({
    resolver: formResolver,
    defaultValues: memoizedDefaultValues,
    mode: "onChange",
  });

  const { isLoading: hasPersistedData, saveFormData, clearPersistedData } = useFormPersistence(
    form,
    "create-task-wizard",
    true,
  );

  // Habilitar atajos de teclado
  useKeyboardShortcuts({ enabled: isOpen });

  // Prevent hydration issues
  useEffect(() => {
    setStoreMounted(true);
  }, [setStoreMounted]);

  // Memoizar la función de validación para evitar re-renders
  const validateForm = useCallback(() => {
    form.clearErrors();
    form.trigger();
  }, [form]);

  // Update resolver when includeMembers changes - OPTIMIZADO
  useEffect(() => {
    validateForm();
  }, [includeMembers, validateForm]);

  // Memoizar la función de watch para evitar re-renders constantes
  const handleFormChange = useCallback((value: Partial<FormValues>) => {
      saveFormData();
      const isChanged = Object.keys(value).some((key) => {
        const current = value[key as keyof FormValues];
        const initial = defaultValues[key as keyof FormValues];
        if (Array.isArray(current) && Array.isArray(initial)) {
          return current.join() !== initial.join();
        }
        return current !== initial;
      });
      onHasUnsavedChanges(isChanged);
  }, [saveFormData, onHasUnsavedChanges]);

  // Optimizar el watch del formulario
  useEffect(() => {
    const subscription = form.watch(handleFormChange);
    return () => subscription.unsubscribe();
  }, [form, handleFormChange]);

  // Memoizar la función de reset para evitar re-renders
  const resetForm = useCallback(() => {
      form.reset(defaultValues);
      clearPersistedData();
    setAlertState('showSuccess', false);
    setAlertState('showFail', false);
      onHasUnsavedChanges(false);
    toggleDropdown('startDate');
    toggleDropdown('endDate');
  }, [form, clearPersistedData, setAlertState, onHasUnsavedChanges, toggleDropdown]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    const clientsCollection = collection(db, "clients");
    const unsubscribe = onSnapshot(
      clientsCollection,
      (snapshot) => {
        const clientsData: Client[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          imageUrl: doc.data().imageUrl || "",
          projects: doc.data().projects || [],
          createdBy: doc.data().createdBy || "",
        }));
        setClients(clientsData);
      },
      (error) => {
        console.error("[CreateTask] Error listening to clients:", error);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (onClientAlertChange) {
      if (showSuccessAlert || showFailAlert) {
        onClientAlertChange({
          type: showSuccessAlert ? "success" : "fail",
          message: showSuccessAlert
            ? `La tarea "${form.getValues("basicInfo.name")}" se ha creado exitosamente.`
            : "No se pudo crear la tarea.",
          error: showFailAlert ? failErrorMessage : undefined,
        });
      } else {
        onClientAlertChange(null);
      }
    }
  }, [onClientAlertChange, showSuccessAlert, showFailAlert, failErrorMessage, form]);

  // SEPARAR EL useEffect MASIVO en múltiples useEffect más pequeños
  // useEffect para animaciones del contenedor principal
  useEffect(() => {
    if (!isMounted || !containerRef.current) return;

    if (isOpen) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, height: 0 },
        { opacity: 1, height: "auto", duration: 0.3, ease: "power2.out" },
      );
    } else {
      gsap.to(containerRef.current, {
        opacity: 0,
        height: 0,
        duration: 0.3,
        ease: "power2.in",
      });
    }
  }, [isOpen, isMounted]);

  // useEffect para posiciones de dropdowns
  useEffect(() => {
    if (!isMounted) return;

    const updatePositions = () => {
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
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);
    return () => window.removeEventListener("resize", updatePositions);
  }, [isMounted, isStartDateOpen, isEndDateOpen]);

  // useEffect para posiciones de dropdowns de proyecto, estado y prioridad
  useEffect(() => {
    if (!isMounted) return;

    const updatePositions = () => {
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
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);
    return () => window.removeEventListener("resize", updatePositions);
  }, [isMounted, isProjectDropdownOpen, isStatusDropdownOpen, isPriorityDropdownOpen]);

  // useEffect para posiciones de dropdowns de usuarios
  useEffect(() => {
    if (!isMounted) return;

    const updatePositions = () => {
      if (isCollaboratorDropdownOpen && collaboratorInputRef.current) {
        const rect = collaboratorInputRef.current.getBoundingClientRect();
        setCollaboratorDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      }
      if (isLeaderDropdownOpen && leaderInputRef.current) {
        const rect = leaderInputRef.current.getBoundingClientRect();
        setLeaderDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      }
      if (isClientDropdownOpen && clientInputRef.current) {
        const rect = clientInputRef.current.getBoundingClientRect();
        setClientDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      }
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);
    return () => window.removeEventListener("resize", updatePositions);
  }, [isMounted, isCollaboratorDropdownOpen, isLeaderDropdownOpen, isClientDropdownOpen]);

  // useEffect para animaciones de poppers
  useEffect(() => {
    if (!isMounted) return;

    const animatePoppers = () => {
      if (isProjectDropdownOpen && projectDropdownPopperRef.current) {
        gsap.fromTo(
          projectDropdownPopperRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
      if (isStatusDropdownOpen && statusDropdownPopperRef.current) {
        gsap.fromTo(
          statusDropdownPopperRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
      if (isPriorityDropdownOpen && priorityDropdownPopperRef.current) {
        gsap.fromTo(
          priorityDropdownPopperRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
    };

    animatePoppers();
  }, [isMounted, isProjectDropdownOpen, isStatusDropdownOpen, isPriorityDropdownOpen]);

  // useEffect para animaciones de poppers de usuarios
  useEffect(() => {
    if (!isMounted) return;

    const animatePoppers = () => {
      if (isCollaboratorDropdownOpen && collaboratorDropdownPopperRef.current) {
        gsap.fromTo(
          collaboratorDropdownPopperRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
      if (isLeaderDropdownOpen && leaderDropdownPopperRef.current) {
        gsap.fromTo(
          leaderDropdownPopperRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
      if (isClientDropdownOpen && clientDropdownPopperRef.current) {
        gsap.fromTo(
          clientDropdownPopperRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
    };

    animatePoppers();
  }, [isMounted, isCollaboratorDropdownOpen, isLeaderDropdownOpen, isClientDropdownOpen]);

  // useEffect para animaciones de date pickers
  useEffect(() => {
    if (!isMounted) return;

    const animatePoppers = () => {
      if (isStartDateOpen && startDatePopperRef.current) {
        gsap.fromTo(
          startDatePopperRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
      if (isEndDateOpen && endDatePopperRef.current) {
        gsap.fromTo(
          endDatePopperRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
    };

    animatePoppers();
  }, [isMounted, isStartDateOpen, isEndDateOpen]);

  // OPTIMIZAR EL useEffect DE CLICK OUTSIDE separándolo en múltiples useEffect
  // useEffect para dropdowns de proyecto, estado y prioridad
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node) &&
        projectDropdownPopperRef.current &&
        !projectDropdownPopperRef.current.contains(event.target as Node) &&
        isProjectDropdownOpen
      ) {
        toggleDropdown("project");
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node) &&
        statusDropdownPopperRef.current &&
        !statusDropdownPopperRef.current.contains(event.target as Node) &&
        isStatusDropdownOpen
      ) {
        toggleDropdown("status");
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node) &&
        priorityDropdownPopperRef.current &&
        !priorityDropdownPopperRef.current.contains(event.target as Node) &&
        isPriorityDropdownOpen
      ) {
        toggleDropdown("priority");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProjectDropdownOpen, isStatusDropdownOpen, isPriorityDropdownOpen, toggleDropdown]);

  // useEffect para date pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        startDateInputRef.current &&
        !startDateInputRef.current.contains(event.target as Node) &&
        startDatePopperRef.current &&
        !startDatePopperRef.current.contains(event.target as Node) &&
        isStartDateOpen
      ) {
        toggleDropdown("startDate");
      }
      if (
        endDateInputRef.current &&
        !endDateInputRef.current.contains(event.target as Node) &&
        endDatePopperRef.current &&
        !endDatePopperRef.current.contains(event.target as Node) &&
        isEndDateOpen
      ) {
        toggleDropdown("endDate");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isStartDateOpen, isEndDateOpen, toggleDropdown]);

  // useEffect para dropdowns de usuarios
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        collaboratorInputRef.current &&
        !collaboratorInputRef.current.contains(event.target as Node) &&
        collaboratorDropdownPopperRef.current &&
        !collaboratorDropdownPopperRef.current.contains(event.target as Node) &&
        isCollaboratorDropdownOpen
      ) {
        toggleDropdown("collaborator");
      }
      if (
        clientInputRef.current &&
        !clientInputRef.current.contains(event.target as Node) &&
        clientDropdownPopperRef.current &&
        !clientDropdownPopperRef.current.contains(event.target as Node) &&
        isClientDropdownOpen
      ) {
        toggleDropdown("client");
      }
      if (
        leaderInputRef.current &&
        !leaderInputRef.current.contains(event.target as Node) &&
        leaderDropdownPopperRef.current &&
        !leaderDropdownPopperRef.current.contains(event.target as Node) &&
        isLeaderDropdownOpen
      ) {
        toggleDropdown("leader");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCollaboratorDropdownOpen, isClientDropdownOpen, isLeaderDropdownOpen, toggleDropdown]);

  // Animaciones optimizadas usando hooks memoizados
  const { animateClick } = useAnimationOptimizations();

  // MEMOIZAR LOS CALLBACKS para evitar recrearlos constantemente
  const memoizedToggleDropdown = useCallback((dropdown: keyof DropdownStates) => {
    toggleDropdown(dropdown);
  }, [toggleDropdown]);



  // Funciones de manejo de dropdowns memoizadas - definidas directamente como en EditTask
  const handleClientSelectDropdown = useCallback(
    (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("clientInfo.clientId", clientId);
      setSearchState("client", "");
      memoizedToggleDropdown("client");
    },
    [form, animateClick, setSearchState, memoizedToggleDropdown],
  );

  const handleClientRemove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("clientInfo.clientId", "");
      form.setValue("clientInfo.project", "");
    },
    [form, animateClick],
  );

  const handleProjectSelect = useCallback(
    (project: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("clientInfo.project", project);
      memoizedToggleDropdown("project");
    },
    [form, animateClick, memoizedToggleDropdown],
  );

  const handleStatusSelect = useCallback(
    (status: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("basicInfo.status", status as FormValues["basicInfo"]["status"]);
      memoizedToggleDropdown("status");
    },
    [form, animateClick, memoizedToggleDropdown],
  );

  const handlePrioritySelect = useCallback(
    (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("basicInfo.priority", priority as FormValues["basicInfo"]["priority"]);
      memoizedToggleDropdown("priority");
    },
    [form, animateClick, memoizedToggleDropdown],
  );

  const handleLeaderSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      const currentLeaders = form.getValues("teamInfo.LeadedBy");
      const isSelected = currentLeaders.includes(userId);
      const newLeaders = isSelected
        ? currentLeaders.filter((id) => id !== userId)
        : [...currentLeaders, userId];
      form.setValue("teamInfo.LeadedBy", newLeaders);
      setSearchState("leader", "");
      memoizedToggleDropdown("leader");
    },
    [form, animateClick, setSearchState, memoizedToggleDropdown],
  );

  const handleCollaboratorSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      if (!form.getValues("teamInfo.LeadedBy").includes(userId)) {
        const currentAssignedTo = form.getValues("teamInfo.AssignedTo");
        const isSelected = currentAssignedTo.includes(userId);
        const newAssignedTo = isSelected
          ? currentAssignedTo.filter((id) => id !== userId)
          : [...currentAssignedTo, userId];
        form.setValue("teamInfo.AssignedTo", newAssignedTo);
        setSearchState("collaborator", "");
        memoizedToggleDropdown("collaborator");
      }
    },
    [form, animateClick, setSearchState, memoizedToggleDropdown],
  );

  const handleLeaderRemove = useCallback(
    (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue(
        "teamInfo.LeadedBy",
        form.getValues("teamInfo.LeadedBy").filter((id) => id !== userId),
      );
    },
    [form, animateClick],
  );

  const handleCollaboratorRemove = useCallback(
    (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue(
        "teamInfo.AssignedTo",
        form.getValues("teamInfo.AssignedTo").filter((id) => id !== userId),
      );
    },
    [form, animateClick],
  );

  // MEMOIZAR LOS VALORES DEL FORMULARIO que se usan constantemente
  const watchedFormValues = useMemo(() => {
    return {
      clientId: form.watch("clientInfo.clientId"),
      project: form.watch("clientInfo.project"),
      name: form.watch("basicInfo.name"),
      description: form.watch("basicInfo.description"),
      objectives: form.watch("basicInfo.objectives"),
      startDate: form.watch("basicInfo.startDate"),
      endDate: form.watch("basicInfo.endDate"),
      status: form.watch("basicInfo.status"),
      priority: form.watch("basicInfo.priority"),
      leadedBy: form.watch("teamInfo.LeadedBy"),
      assignedTo: form.watch("teamInfo.AssignedTo"),
    };
  }, [form]);

  // Filtros optimizados usando hooks memoizados
  // MEMOIZAR LOS VALORES DEL FORMULARIO para evitar recálculos constantes
  const watchedLeadedBy = watchedFormValues.leadedBy;
  
  const filteredCollaborators = useFilteredCollaborators(
    searchCollaborator,
    watchedLeadedBy || []
  );
  const filteredLeaders = useFilteredLeaders(searchLeader);
  const filteredClients = useFilteredClients(searchClient);

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "🔐 Acceso Requerido",
        description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.",
        variant: "error",
      });
      return;
    }

    if (values.basicInfo.startDate && values.basicInfo.endDate && values.basicInfo.startDate > values.basicInfo.endDate) {
      toast({
        title: "📅 Error en las Fechas",
        description: "La fecha de inicio debe ser anterior a la fecha de finalización. Por favor, verifica las fechas seleccionadas.",
        variant: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const taskDocRef = doc(collection(db, "tasks"));
      const taskId = taskDocRef.id;
      const taskData = {
        ...values.clientInfo,
        ...values.basicInfo,
        ...values.teamInfo,
        AssignedTo: includeMembers ? values.teamInfo.AssignedTo || [] : [],
        CreatedBy: user.id,
        createdAt: Timestamp.fromDate(new Date()),
        id: taskId,
      };
      await setDoc(taskDocRef, taskData);

      // Actualizar la actividad de la tarea (aunque sea nueva, establece la actividad inicial)
      await updateTaskActivity(taskId, 'edit');

      const recipients = new Set<string>([...values.teamInfo.LeadedBy, ...(includeMembers ? (values.teamInfo.AssignedTo || []) : [])]);
      recipients.delete(user.id);
      for (const recipientId of Array.from(recipients)) {
        await addDoc(collection(db, "notifications"), {
          userId: user.id,
          taskId,
          message: `${user.firstName || "Usuario"} te asignó la tarea ${values.basicInfo.name}`,
          timestamp: Timestamp.now(),
          read: false,
          recipientId,
        });
      }

      // Use parent alert handlers if available, otherwise use local state
      if (onShowSuccessAlert) {
        onShowSuccessAlert(`La tarea "${values.basicInfo.name}" se ha creado exitosamente.`);
      } else {
        setAlertState("showSuccess", true);
      }
      
      form.reset(defaultValues);
      clearPersistedData();
      setIsSaving(false);
      
      // Llamar a onTaskCreated para cerrar el modal y mostrar TasksTable
      if (onTaskCreated) {
        setTimeout(() => {
          onTaskCreated();
        }, 2000); // Esperar 2 segundos para que el usuario vea el mensaje de éxito
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al crear la tarea.";
      console.error("Error saving task:", errorMessage);
      
      // Mensajes de error más específicos y útiles
      let userFriendlyTitle = "❌ Error al Crear Tarea";
      let userFriendlyDescription = "No pudimos crear tu tarea en este momento. ";
      
      if (errorMessage.includes("permission")) {
        userFriendlyTitle = "🔒 Sin Permisos";
        userFriendlyDescription = "No tienes permisos para crear esta tarea. Contacta a tu administrador para obtener los permisos necesarios.";
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        userFriendlyTitle = "🌐 Problema de Conexión";
        userFriendlyDescription = "Hay un problema con tu conexión a internet. Verifica tu conexión e intenta nuevamente.";
      } else if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
        userFriendlyTitle = "📊 Límite Alcanzado";
        userFriendlyDescription = "Se ha alcanzado el límite de tareas permitidas. Contacta a tu administrador para aumentar el límite.";
      } else if (errorMessage.includes("validation") || errorMessage.includes("required")) {
        userFriendlyTitle = "📝 Datos Incompletos";
        userFriendlyDescription = "Algunos campos obligatorios están incompletos o contienen errores. Revisa el formulario y completa toda la información requerida.";
      } else if (errorMessage.includes("timeout")) {
        userFriendlyTitle = "⏱️ Tiempo de Espera Agotado";
        userFriendlyDescription = "La operación tardó demasiado en completarse. Tu conexión puede ser lenta, intenta nuevamente.";
      } else {
        userFriendlyDescription += "Por favor, verifica todos los campos e intenta nuevamente. Si el problema persiste, contacta al soporte técnico.";
      }
      
      toast({
        title: userFriendlyTitle,
        description: userFriendlyDescription,
        variant: "error",
      });
      
      // Use parent alert handlers if available, otherwise use local state
      if (onShowFailAlert) {
        onShowFailAlert("No se pudo crear la tarea.", errorMessage);
      } else {
        setAlertState("showFail", true);
        setAlertState("failMessage", errorMessage);
      }
      
      setIsSaving(false);
    }
  };

  const validateStep = async (fields: (keyof FormValues | string)[]) => {
    // Validación especial para el paso 2 (equipo)
    if (fields.includes('teamInfo.AssignedTo') && includeMembers) {
      const assignedTo = form.getValues('teamInfo.AssignedTo');
      if (!assignedTo || assignedTo.length === 0) {
        form.setError('teamInfo.AssignedTo', {
          type: 'manual',
          message: 'Selecciona al menos un colaborador*'
        });
        toast({
          title: "⚠️ Campos Requeridos",
          description: "Hay algunos campos obligatorios que necesitan ser completados. Revisa los campos marcados en rojo y completa la información faltante.",
          variant: "error",
        });
        return false;
      }
    }
    
    const result = await form.trigger(fields as (keyof FormValues)[]);
    if (!result) {
      toast({
        title: "⚠️ Campos Requeridos",
        description: "Hay algunos campos obligatorios que necesitan ser completados. Revisa los campos marcados en rojo y completa la información faltante.",
        variant: "error",
      });
    }
    return result;
  };

  if (isLoading || !isMounted) {
    return (
      <div className={`${styles.container} ${styles.open}`}>
        <div className={styles.loaderOverlay}>
          <div className={styles.loader}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${styles.container} ${isOpen ? styles.open : ""} ${isSaving ? styles.saving : ""}`} ref={containerRef}>
        {isOpen && (
          <>
            <div className={styles.header}>
              <div className={styles.headerTitle}>Crear Tarea</div>
              <div className={styles.headerProgress}>
                <Wizard totalSteps={3}>
                  <WizardProgress />
                </Wizard>
              </div>
              <button className={styles.toggleButton} onClick={onToggle}>
                <Image src="/x.svg" alt="Cerrar" width={16} height={16} />
              </button>
            </div>
            <div className={styles.content}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Wizard totalSteps={3}>
                  <WizardStep step={0} validator={() => validateStep(stepFields[0] as (keyof FormValues)[])}>
                    <div className={styles.section}>
                      <h2 className={styles.sectionTitle}>Información del Cliente</h2>
                      {hasPersistedData && (
                        <div className={styles.persistedData}>
                          <span>Progreso guardado restaurado</span>
                          <button
                            type="button"
                            onClick={() => {
                              clearPersistedData();
                              form.reset(defaultValues);
                              toast({
                                title: "Progreso eliminado",
                                description: "Se ha reiniciado el formulario.",
                                variant: "info",
                              });
                            }}
                          >
                            Borrar progreso
                          </button>
                        </div>
                      )}
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Cuenta Asignada*</label>
                        <div className={styles.sectionSubtitle}>
                          Selecciona la cuenta a la que se asignará esta tarea.
                        </div>
                        {/* Ocultar el input cuando ya hay una cuenta seleccionada */}
                        {!form.watch("clientInfo.clientId") && (
                        <input
                          className={styles.input}
                          value={searchClient}
                          onChange={(e) => {
                              setSearchState("client", e.target.value);
                              memoizedToggleDropdown("client");
                          }}
                          onBlur={() => {
                              setTimeout(() => memoizedToggleDropdown("client"), 200);
                          }}
                          placeholder="Ej: Nombre de la cuenta"
                          ref={clientInputRef}
                          onKeyDown={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                              switch (e.key.toLowerCase()) {
                                case 'a':
                                  e.preventDefault();
                                  e.currentTarget.select();
                                  break;
                                case 'c':
                                  e.preventDefault();
                                  const selection = window.getSelection();
                                  if (selection && selection.toString().length > 0) {
                                    navigator.clipboard.writeText(selection.toString()).catch(() => {
                                      const textArea = document.createElement('textarea');
                                      textArea.value = selection.toString();
                                      document.body.appendChild(textArea);
                                      textArea.select();
                                      document.execCommand('copy');
                                      document.body.removeChild(textArea);
                                    });
                                  }
                                  break;
                                case 'v':
                                  e.preventDefault();
                                  const targetV = e.currentTarget as HTMLInputElement | null;
                                  navigator.clipboard.readText().then(text => {
                                    if (targetV && typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
                                      const start = targetV.selectionStart;
                                      const end = targetV.selectionEnd;
                                      const newValue = searchClient.substring(0, start) + text + searchClient.substring(end);
                                        setSearchState("client", newValue);
                                        memoizedToggleDropdown("client");
                                      setTimeout(() => {
                                        targetV.setSelectionRange(start + text.length, start + text.length);
                                      }, 0);
                                    } else {
                                        setSearchState("client", searchClient + text);
                                    }
                                  }).catch(() => {
                                    document.execCommand('paste');
                                  });
                                  break;
                                case 'x':
                                  e.preventDefault();
                                  const cutSelection = window.getSelection();
                                  if (cutSelection && cutSelection.toString().length > 0) {
                                    navigator.clipboard.writeText(cutSelection.toString()).then(() => {
                                      const targetX = e.currentTarget as HTMLInputElement | null;
                                      if (targetX && typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                                        const start = targetX.selectionStart;
                                        const end = targetX.selectionEnd;
                                        const newValue = searchClient.substring(0, start) + searchClient.substring(end);
                                          setSearchState("client", newValue);
                                          memoizedToggleDropdown("client");
                                      } else {
                                          setSearchState("client", '');
                                      }
                                    }).catch(() => {
                                      const textArea = document.createElement('textarea');
                                      textArea.value = cutSelection.toString();
                                      document.body.appendChild(textArea);
                                      textArea.select();
                                      document.execCommand('copy');
                                      document.body.removeChild(textArea);
                                      const targetX2 = e.currentTarget as HTMLInputElement | null;
                                      if (targetX2 && typeof targetX2.selectionStart === 'number' && typeof targetX2.selectionEnd === 'number') {
                                        const start = targetX2.selectionStart;
                                        const end = targetX2.selectionEnd;
                                        const newValue = searchClient.substring(0, start) + searchClient.substring(end);
                                          setSearchState("client", newValue);
                                          memoizedToggleDropdown("client");
                                      } else {
                                          setSearchState("client", '');
                                      }
                                    });
                                  }
                                  break;
                              }
                            }
                          }}
                        />
                        )}
                        {isClientDropdownOpen && !form.watch("clientInfo.clientId") &&
                          createPortal(
                            <motion.div
                              className={styles.dropdown}
                              style={{
                                top: clientDropdownPosition?.top,
                                left: clientDropdownPosition?.left,
                                position: "absolute",
                                zIndex: 150000,
                                width: clientInputRef.current?.offsetWidth,
                              }}
                              ref={clientDropdownPopperRef}
                              initial={{ opacity: 0, y: -20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.95 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                              {filteredClients.length ? (
                                filteredClients.map((client) => (
                                  <motion.div
                                    key={client.id}
                                    className={`${styles.dropdownItem} ${form.watch("clientInfo.clientId") === client.id ? styles.selectedItem : ''}`}
                                    onClick={(e) => handleClientSelectDropdown(client.id, e)}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.05 }}
                                    whileHover={{
                                      scale: 1.02,
                                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                      transition: { duration: 0.2, ease: "easeOut" }
                                    }}
                                    whileTap={{
                                      scale: 0.98,
                                      transition: { duration: 0.1 }
                                    }}
                                  >
                                    <div className={styles.dropdownItemContent}>
                                      <div className={styles.avatarContainer}>
                                        <Image
                                          src={client.imageUrl || '/empty-image.png'}
                                          alt={client.name}
                                          width={32}
                                          height={32}
                                          className={styles.avatarImage}
                                          onError={(e) => {
                                            e.currentTarget.src = '/empty-image.png';
                                          }}
                                        />
                                  </div>
                                      <span>{client.name}</span>
                                    </div>
                                  </motion.div>
                                ))
                              ) : (
                                <div className={styles.emptyState}>
                                  <span>
                                    {isAdmin
                                      ? "No hay coincidencias. Crea una nueva cuenta."
                                      : "No hay coincidencias. Pide a un administrador que cree una cuenta."}
                                  </span>
                                </div>
                              )}
                            </motion.div>,
                            document.body,
                          )}
                        <div className={styles.tags}>
                          {form.watch("clientInfo.clientId") && (
                            (() => {
                              const selectedClient = clients.find((c) => c.id === form.watch("clientInfo.clientId"));
                              return selectedClient ? (
                                <div key={selectedClient.id} className={styles.tag}>
                                  <Image
                                    src={selectedClient.imageUrl || '/empty-image.png'}
                                    alt={selectedClient.name}
                                    width={24}
                                    height={24}
                                    style={{ borderRadius: '50%', objectFit: 'cover', marginRight: 6 }}
                                  />
                                  {selectedClient.name}
                                  <button onClick={(e) => handleClientRemove(e)}>X</button>
                                </div>
                              ) : null;
                            })()
                          )}
                        </div>
                        {form.formState.errors.clientInfo?.clientId && (
                          <span className={styles.error}>{form.formState.errors.clientInfo.clientId.message}</span>
                        )}
                        {isAdmin && !form.watch("clientInfo.clientId") && (
                          <div className={styles.addButtonWrapper}>
                            <div className={styles.addButtonText}>
                              ¿No encuentras alguna cuenta? <strong>Agrega una nueva.</strong>
                            </div>
                            <button
                              type="button"
                              className={styles.addButton}
                              onClick={(e) => {
                                animateClick(e.currentTarget);
                                onCreateClientOpen();
                              }}
                            >
                              + Agregar Cuenta
                            </button>
                          </div>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Carpeta*</label>
                        <div className={styles.sectionSubtitle}>Selecciona la carpeta del proyecto.</div>
                        <div className={styles.dropdownContainer} ref={projectDropdownRef}>
                          <div
                            className={styles.dropdownTrigger}
                            onClick={(e) => {
                              animateClick(e.currentTarget);
                              memoizedToggleDropdown("project");
                            }}
                          >
                            <span>{form.watch("clientInfo.project") || "Seleccionar una Carpeta"}</span>
                            <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
                          </div>
                          {isProjectDropdownOpen &&
                            createPortal(
                              <AnimatePresence>
                                <motion.div
                                  className={styles.dropdownItems}
                                  style={{
                                    top: projectDropdownPosition?.top,
                                    left: projectDropdownPosition?.left,
                                    position: "absolute",
                                    zIndex: 150000,
                                    width: projectDropdownRef.current?.offsetWidth,
                                  }}
                                  ref={projectDropdownPopperRef}
                                  initial={{ opacity: 0, y: -16 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -16 }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                >
                                  {(() => {
                                    const selectedClient = clients.find(
                                      (c) => c.id === form.getValues("clientInfo.clientId")
                                    );
                                    if (!selectedClient || !selectedClient.projects.length) {
                                      return (
                                        <motion.div 
                                          className={styles.emptyState}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <span>
                                            {isAdmin
                                              ? "No hay carpetas disponibles. ¡Crea una nueva para organizar tus tareas!"
                                              : "No hay carpetas disponibles. Pide a un administrador que añada una para tu proyecto."}
                                          </span>
                                        </motion.div>
                                      );
                                    }
                                    return selectedClient.projects.map((project, index) => (
                                      <motion.div
                                        key={`${project}-${index}`}
                                        className={styles.dropdownItem}
                                        onClick={(e) => handleProjectSelect(project, e)}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        whileHover={{
                                          scale: 1.02,
                                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                          transition: { duration: 0.2, ease: "easeOut" }
                                        }}
                                        whileTap={{
                                          scale: 0.98,
                                          transition: { duration: 0.1 }
                                        }}
                                      >
                                        <div className={styles.dropdownItemContent}>
                                          <div className={styles.avatarContainer}>
                                            <Image
                                              src="/folder.svg"
                                              alt="Folder"
                                              width={20}
                                              height={20}
                                              className={styles.svgIcon}
                                              style={{ objectFit: 'contain' }}
                                            />
                                          </div>
                                          <span>{project}</span>
                                        </div>
                                      </motion.div>
                                    ));
                                  })()}
                                </motion.div>
                              </AnimatePresence>,
                              document.body,
                            )}
                        </div>
                        {form.formState.errors.clientInfo?.project && (
                          <span className={styles.error}>{form.formState.errors.clientInfo.project.message}</span>
                        )}
                        {isAdmin &&
                          form.getValues("clientInfo.clientId") && (
                            <button
                              type="button"
                              className={styles.addButton}
                              style={{ marginTop: 8 }}
                              onClick={(e) => {
                                animateClick(e.currentTarget);
                                const client = clients.find((c) => c.id === form.getValues("clientInfo.clientId"));
                                if (client) {
                                  onEditClientOpen(client);
                                }
                              }}
                            >
                              + Crear Proyecto
                            </button>
                          )}
                      </div>
                    </div>
                  </WizardStep>
                  <WizardStep step={1} validator={() => validateStep(stepFields[1] as (keyof FormValues)[])}>
                    <div className={styles.section}>
                      <h2 className={styles.sectionTitle}>Información Básica del Proyecto</h2>
                      <div className={styles.level1Grid}>
                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Nombre de la tarea*</label>
                            <Controller
                              name="basicInfo.name"
                              control={form.control}
                              render={({ field }) => (
                                <input
                                  className={styles.input}
                                  placeholder="Ej: Crear wireframe"
                                  {...field}
                                  onKeyDown={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                      switch (e.key.toLowerCase()) {
                                        case 'a':
                                          e.preventDefault();
                                          e.currentTarget.select();
                                          break;
                                        case 'c':
                                          e.preventDefault();
                                          const selection = window.getSelection();
                                          if (selection && selection.toString().length > 0) {
                                            navigator.clipboard.writeText(selection.toString()).catch(() => {
                                              const textArea = document.createElement('textarea');
                                              textArea.value = selection.toString();
                                              document.body.appendChild(textArea);
                                              textArea.select();
                                              document.execCommand('copy');
                                              document.body.removeChild(textArea);
                                            });
                                          }
                                          break;
                                        case 'v':
                                          e.preventDefault();
                                          const targetV = e.currentTarget as HTMLInputElement | null;
                                          navigator.clipboard.readText().then(text => {
                                            if (targetV && typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
                                              const start = targetV.selectionStart;
                                              const end = targetV.selectionEnd;
                                              const newValue = (field.value || '').substring(0, start) + text + (field.value || '').substring(end);
                                              field.onChange(newValue);
                                              setTimeout(() => {
                                                targetV.setSelectionRange(start + text.length, start + text.length);
                                              }, 0);
                                            } else {
                                              field.onChange((field.value || '') + text);
                                            }
                                          }).catch(() => {
                                            document.execCommand('paste');
                                          });
                                          break;
                                        case 'x':
                                          e.preventDefault();
                                          const cutSelection = window.getSelection();
                                          if (cutSelection && cutSelection.toString().length > 0) {
                                            navigator.clipboard.writeText(cutSelection.toString()).then(() => {
                                              const targetX = e.currentTarget as HTMLInputElement | null;
                                              if (targetX && typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                                                const start = targetX.selectionStart;
                                                const end = targetX.selectionEnd;
                                                const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
                                                field.onChange(newValue);
                                              } else {
                                                field.onChange('');
                                              }
                                            }).catch(() => {
                                              const textArea = document.createElement('textarea');
                                              textArea.value = cutSelection.toString();
                                              document.body.appendChild(textArea);
                                              textArea.select();
                                              document.execCommand('copy');
                                              document.body.removeChild(textArea);
                                              const targetX2 = e.currentTarget as HTMLInputElement | null;
                                              if (targetX2 && typeof targetX2.selectionStart === 'number' && typeof targetX2.selectionEnd === 'number') {
                                                const start = targetX2.selectionStart;
                                                const end = targetX2.selectionEnd;
                                                const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
                                                field.onChange(newValue);
                                              } else {
                                                field.onChange('');
                                              }
                                            });
                                          }
                                          break;
                                      }
                                    }
                                  }}
                                />
                              )}
                            />
                            {form.formState.errors.basicInfo?.name && (
                              <span className={styles.error}>{form.formState.errors.basicInfo.name.message}</span>
                            )}
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Descripción*</label>
                            <Controller
                              name="basicInfo.description"
                              control={form.control}
                              render={({ field }) => (
                                <input
                                  className={styles.input}
                                  placeholder="Ej: Diseñar wireframes para la nueva app móvil"
                                  {...field}
                                  onKeyDown={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                      switch (e.key.toLowerCase()) {
                                        case 'a':
                                          e.preventDefault();
                                          e.currentTarget.select();
                                          break;
                                        case 'c':
                                          e.preventDefault();
                                          const selection = window.getSelection();
                                          if (selection && selection.toString().length > 0) {
                                            navigator.clipboard.writeText(selection.toString()).catch(() => {
                                              const textArea = document.createElement('textarea');
                                              textArea.value = selection.toString();
                                              document.body.appendChild(textArea);
                                              textArea.select();
                                              document.execCommand('copy');
                                              document.body.removeChild(textArea);
                                            });
                                          }
                                          break;
                                        case 'v':
                                          e.preventDefault();
                                          const targetV = e.currentTarget as HTMLInputElement | null;
                                          navigator.clipboard.readText().then(text => {
                                            if (targetV && typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
                                              const start = targetV.selectionStart;
                                              const end = targetV.selectionEnd;
                                              const newValue = (field.value || '').substring(0, start) + text + (field.value || '').substring(end);
                                              field.onChange(newValue);
                                              setTimeout(() => {
                                                targetV.setSelectionRange(start + text.length, start + text.length);
                                              }, 0);
                                            } else {
                                              field.onChange((field.value || '') + text);
                                            }
                                          }).catch(() => {
                                            document.execCommand('paste');
                                          });
                                          break;
                                        case 'x':
                                          e.preventDefault();
                                          const cutSelection = window.getSelection();
                                          if (cutSelection && cutSelection.toString().length > 0) {
                                            navigator.clipboard.writeText(cutSelection.toString()).then(() => {
                                              const targetX = e.currentTarget as HTMLInputElement | null;
                                              if (targetX && typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                                                const start = targetX.selectionStart;
                                                const end = targetX.selectionEnd;
                                                const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
                                                field.onChange(newValue);
                                              } else {
                                                field.onChange('');
                                              }
                                            }).catch(() => {
                                              const textArea = document.createElement('textarea');
                                              textArea.value = cutSelection.toString();
                                              document.body.appendChild(textArea);
                                              textArea.select();
                                              document.execCommand('copy');
                                              document.body.removeChild(textArea);
                                              const targetX2 = e.currentTarget as HTMLInputElement | null;
                                              if (targetX2 && typeof targetX2.selectionStart === 'number' && typeof targetX2.selectionEnd === 'number') {
                                                const start = targetX2.selectionStart;
                                                const end = targetX2.selectionEnd;
                                                const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
                                                field.onChange(newValue);
                                              } else {
                                                field.onChange('');
                                              }
                                            });
                                          }
                                          break;
                                      }
                                    }
                                  }}
                                />
                              )}
                            />
                            {form.formState.errors.basicInfo?.description && (
                              <span className={styles.error}>{form.formState.errors.basicInfo.description.message}</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Objetivos</label>
                            <Controller
                              name="basicInfo.objectives"
                              control={form.control}
                              render={({ field }) => (
                                <input
                                  className={styles.input}
                                  placeholder="Ej: Aumentar la usabilidad del producto en un 20%"
                                  {...field}
                                  onKeyDown={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                      switch (e.key.toLowerCase()) {
                                        case 'a':
                                          e.preventDefault();
                                          e.currentTarget.select();
                                          break;
                                        case 'c':
                                          e.preventDefault();
                                          const selection = window.getSelection();
                                          if (selection && selection.toString().length > 0) {
                                            navigator.clipboard.writeText(selection.toString()).catch(() => {
                                              const textArea = document.createElement('textarea');
                                              textArea.value = selection.toString();
                                              document.body.appendChild(textArea);
                                              textArea.select();
                                              document.execCommand('copy');
                                              document.body.removeChild(textArea);
                                            });
                                          }
                                          break;
                                        case 'v':
                                          e.preventDefault();
                                          const targetV = e.currentTarget as HTMLInputElement | null;
                                          navigator.clipboard.readText().then(text => {
                                            if (targetV && typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
                                              const start = targetV.selectionStart;
                                              const end = targetV.selectionEnd;
                                              const newValue = (field.value || '').substring(0, start) + text + (field.value || '').substring(end);
                                              field.onChange(newValue);
                                              setTimeout(() => {
                                                targetV.setSelectionRange(start + text.length, start + text.length);
                                              }, 0);
                                            } else {
                                              field.onChange((field.value || '') + text);
                                            }
                                          }).catch(() => {
                                            document.execCommand('paste');
                                          });
                                          break;
                                        case 'x':
                                          e.preventDefault();
                                          const cutSelection = window.getSelection();
                                          if (cutSelection && cutSelection.toString().length > 0) {
                                            navigator.clipboard.writeText(cutSelection.toString()).then(() => {
                                              const targetX = e.currentTarget as HTMLInputElement | null;
                                              if (targetX && typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                                                const start = targetX.selectionStart;
                                                const end = targetX.selectionEnd;
                                                const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
                                                field.onChange(newValue);
                                              } else {
                                                field.onChange('');
                                              }
                                            }).catch(() => {
                                              const textArea = document.createElement('textarea');
                                              textArea.value = cutSelection.toString();
                                              document.body.appendChild(textArea);
                                              textArea.select();
                                              document.execCommand('copy');
                                              document.body.removeChild(textArea);
                                              const targetX2 = e.currentTarget as HTMLInputElement | null;
                                              if (targetX2 && typeof targetX2.selectionStart === 'number' && typeof targetX2.selectionEnd === 'number') {
                                                const start = targetX2.selectionStart;
                                                const end = targetX2.selectionEnd;
                                                const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
                                                field.onChange(newValue);
                                              } else {
                                                field.onChange('');
                                              }
                                            });
                                          }
                                          break;
                                      }
                                    }
                                  }}
                                />
                              )}
                            />
                            {form.formState.errors.basicInfo?.objectives && (
                              <span className={styles.error}>{form.formState.errors.basicInfo.objectives.message}</span>
                            )}
                          </div>
                          <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Fecha de Inicio*</label>
                              <div
                                ref={startDateInputRef}
                                className={styles.dateInput}
                                onClick={() => memoizedToggleDropdown("startDate")}
                                style={{
                                  padding: "12px 16px",
                                  background: "rgba(255, 255, 255, 0.15)",
                                  backdropFilter: "blur(10px)",
                                  borderRadius: "12px",
                                  border: "1px solid rgba(255, 255, 255, 0.2)",
                                  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                }}
                              >
                                {form.watch("basicInfo.startDate")
                                  ? form.watch("basicInfo.startDate")!.toLocaleDateString("es-ES")
                                  : "Selecciona una fecha"}
                              </div>
                              {isStartDateOpen &&
                                createPortal(
                                  <div
                                    ref={startDatePopperRef}
                                    className={styles.calendarPortal}
                                    style={{
                                      position: "absolute",
                                      top: startDatePosition?.top,
                                      left: startDatePosition?.left,
                                      zIndex: 150000,
                                      background: "rgba(255, 255, 255, 0.15)",
                                      backdropFilter: "blur(10px)",
                                      borderRadius: "12px",
                                      border: "1px solid rgba(255, 255, 255, 0.2)",
                                      boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
                                      padding: "1rem",
                                    }}
                                  >
                                    <DayPicker
                                      mode="single"
                                      selected={form.watch("basicInfo.startDate") || undefined}
                                      onSelect={(date) => {
                                        form.setValue("basicInfo.startDate", date || null);
                                        memoizedToggleDropdown("startDate");
                                      }}
                                      className={styles.customCalendar}
                                      style={{
                                        background: "transparent",
                                      }}
                                    />
                                  </div>,
                                  document.body,
                                )}
                              {form.formState.errors.basicInfo?.startDate && (
                                <span className={styles.error}>{form.formState.errors.basicInfo.startDate.message}</span>
                              )}
                            </div>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Fecha de Finalización*</label>
                              <div
                                ref={endDateInputRef}
                                className={styles.dateInput}
                                onClick={() => memoizedToggleDropdown("endDate")}
                                style={{
                                  padding: "12px 16px",
                                  background: "rgba(255, 255, 255, 0.15)",
                                  backdropFilter: "blur(10px)",
                                  borderRadius: "12px",
                                  border: "1px solid rgba(255, 255, 255, 0.2)",
                                  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                }}
                              >
                                {form.watch("basicInfo.endDate")
                                  ? form.watch("basicInfo.endDate")!.toLocaleDateString("es-ES")
                                  : "Selecciona una fecha"}
                              </div>
                              {isEndDateOpen &&
                                createPortal(
                                  <div
                                    ref={endDatePopperRef}
                                    className={styles.calendarPortal}
                                    style={{
                                      position: "absolute",
                                      top: endDatePosition?.top,
                                      left: endDatePosition?.left,
                                      zIndex: 150000,
                                      background: "rgba(255, 255, 255, 0.15)",
                                      backdropFilter: "blur(10px)",
                                      borderRadius: "12px",
                                      border: "1px solid rgba(255, 255, 255, 0.2)",
                                      boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
                                      padding: "1rem",
                                    }}
                                  >
                                    <DayPicker
                                      mode="single"
                                      selected={form.watch("basicInfo.endDate") || undefined}
                                      onSelect={(date) => {
                                        form.setValue("basicInfo.endDate", date || null);
                                        memoizedToggleDropdown("endDate");
                                      }}
                                      className={styles.customCalendar}
                                      style={{
                                        background: "transparent",
                                      }}
                                    />
                                  </div>,
                                  document.body,
                                )}
                              {form.formState.errors.basicInfo?.endDate && (
                                <span className={styles.error}>{form.formState.errors.basicInfo.endDate.message}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Estado Inicial*</label>
                            <div className={styles.dropdownContainer} ref={statusDropdownRef}>
                              <div
                                className={styles.dropdownTrigger}
                                onClick={(e) => {
                                  animateClick(e.currentTarget);
                                  memoizedToggleDropdown("status");
                                }}
                              >
                                <span>{form.watch("basicInfo.status") || "Seleccionar"}</span>
                                <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
                              </div>
                              {isStatusDropdownOpen &&
                                createPortal(
                                  <AnimatePresence>
                                    <motion.div
                                      className={styles.dropdownItems}
                                      style={{
                                        top: statusDropdownPosition?.top,
                                        left: statusDropdownPosition?.left,
                                        position: "absolute",
                                        zIndex: 150000,
                                        width: statusDropdownRef.current?.offsetWidth,
                                      }}
                                      ref={statusDropdownPopperRef}
                                      initial={{ opacity: 0, y: -16 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -16 }}
                                      transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                      {["Por Iniciar", "En Proceso", "Backlog", "Por Finalizar", "Finalizado", "Cancelado"].map((status, index) => (
                                        <motion.div
                                          key={status}
                                          className={styles.dropdownItem}
                                          onClick={(e) => handleStatusSelect(status, e)}
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ duration: 0.2, delay: index * 0.05 }}
                                        >
                                          {status}
                                        </motion.div>
                                      ))}
                                    </motion.div>
                                  </AnimatePresence>,
                                  document.body,
                                )}
                            </div>
                            {form.formState.errors.basicInfo?.status && (
                              <span className={styles.error}>{form.formState.errors.basicInfo.status.message}</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Prioridad*</label>
                            <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                              <div
                                className={styles.dropdownTrigger}
                                onClick={(e) => {
                                  animateClick(e.currentTarget);
                                  memoizedToggleDropdown("priority");
                                }}
                              >
                                <span>{form.watch("basicInfo.priority") || "Seleccionar"}</span>
                                <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
                              </div>
                              {isPriorityDropdownOpen &&
                                createPortal(
                                  <AnimatePresence>
                                    <motion.div
                                      className={styles.dropdownItems}
                                      style={{
                                        top: priorityDropdownPosition?.top,
                                        left: priorityDropdownPosition?.left,
                                        position: "absolute",
                                        zIndex: 150000,
                                        width: priorityDropdownRef.current?.offsetWidth,
                                      }}
                                      ref={priorityDropdownPopperRef}
                                      initial={{ opacity: 0, y: -16 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -16 }}
                                      transition={{ duration: 0.2, ease: "easeOut" }}
                                    >
                                      {["Baja", "Media", "Alta"].map((priority, index) => (
                                        <motion.div
                                          key={priority}
                                          className={styles.dropdownItem}
                                          onClick={(e) => handlePrioritySelect(priority, e)}
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ duration: 0.2, delay: index * 0.05 }}
                                        >
                                          {priority}
                                        </motion.div>
                                      ))}
                                    </motion.div>
                                  </AnimatePresence>,
                                  document.body,
                                )}
                            </div>
                            {form.formState.errors.basicInfo?.priority && (
                              <span className={styles.error}>{form.formState.errors.basicInfo.priority.message}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </WizardStep>
                  <WizardStep step={2} validator={() => validateStep(stepFields[2] as (keyof FormValues)[])}>
                    <div className={styles.section}>
                      <h2 className={styles.sectionTitle}>Información del Equipo</h2>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Líder del Proyecto*</label>
                        <div className={styles.sectionSubtitle}>
                          Selecciona la persona principal responsable de la tarea.
                        </div>
                        <input
                          className={styles.input}
                          value={searchLeader}
                          onChange={(e) => {
                            setSearchState("leader", e.target.value);
                            memoizedToggleDropdown("leader");
                          }}
                          onBlur={() => {
                            setTimeout(() => memoizedToggleDropdown("leader"), 200);
                          }}
                          placeholder="Ej: John Doe"
                          ref={leaderInputRef}
                          onKeyDown={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                              switch (e.key.toLowerCase()) {
                                case 'a':
                                  e.preventDefault();
                                  e.currentTarget.select();
                                  break;
                                case 'c':
                                  e.preventDefault();
                                  const selection = window.getSelection();
                                  if (selection && selection.toString().length > 0) {
                                    navigator.clipboard.writeText(selection.toString()).catch(() => {
                                      const textArea = document.createElement('textarea');
                                      textArea.value = selection.toString();
                                      document.body.appendChild(textArea);
                                      textArea.select();
                                      document.execCommand('copy');
                                      document.body.removeChild(textArea);
                                    });
                                  }
                                  break;
                                case 'v':
                                  e.preventDefault();
                                  const targetV = e.currentTarget as HTMLInputElement | null;
                                  navigator.clipboard.readText().then(text => {
                                    if (targetV && typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
                                      const start = targetV.selectionStart;
                                      const end = targetV.selectionEnd;
                                      const newValue = searchLeader.substring(0, start) + text + searchLeader.substring(end);
                                      setSearchState("leader", newValue);
                                      memoizedToggleDropdown("leader");
                                      setTimeout(() => {
                                        targetV.setSelectionRange(start + text.length, start + text.length);
                                      }, 0);
                                    } else {
                                      setSearchState("leader", searchLeader + text);
                                    }
                                  }).catch(() => {
                                    document.execCommand('paste');
                                  });
                                  break;
                                case 'x':
                                  e.preventDefault();
                                  const cutSelection = window.getSelection();
                                  if (cutSelection && cutSelection.toString().length > 0) {
                                    navigator.clipboard.writeText(cutSelection.toString()).then(() => {
                                      const targetX = e.currentTarget as HTMLInputElement | null;
                                      if (targetX && typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                                        const start = targetX.selectionStart;
                                        const end = targetX.selectionEnd;
                                        const newValue = searchLeader.substring(0, start) + searchLeader.substring(end);
                                        setSearchState("leader", newValue);
                                        memoizedToggleDropdown("leader");
                                      } else {
                                        setSearchState("leader", '');
                                      }
                                    }).catch(() => {
                                      const textArea = document.createElement('textarea');
                                      textArea.value = cutSelection.toString();
                                      document.body.appendChild(textArea);
                                      textArea.select();
                                      document.execCommand('copy');
                                      document.body.removeChild(textArea);
                                      const targetX2 = e.currentTarget as HTMLInputElement | null;
                                      if (targetX2 && typeof targetX2.selectionStart === 'number' && typeof targetX2.selectionEnd === 'number') {
                                        const start = targetX2.selectionStart;
                                        const end = targetX2.selectionEnd;
                                        const newValue = searchLeader.substring(0, start) + searchLeader.substring(end);
                                        setSearchState("leader", newValue);
                                        memoizedToggleDropdown("leader");
                                      } else {
                                        setSearchState("leader", '');
                                      }
                                    });
                                  }
                                  break;
                              }
                            }
                          }}
                        />
                        {isLeaderDropdownOpen &&
                          createPortal(
                            <motion.div
                              className={styles.dropdown}
                              style={{
                                top: leaderDropdownPosition?.top,
                                left: leaderDropdownPosition?.left,
                                position: "absolute",
                                zIndex: 150000,
                                width: leaderInputRef.current?.offsetWidth,
                              }}
                              ref={leaderDropdownPopperRef}
                              initial={{ opacity: 0, y: -20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.95 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                              {filteredLeaders.length ? (
                                filteredLeaders.map((u) => (
                                  <motion.div
                                    key={u.id}
                                    className={styles.dropdownItem}
                                    onClick={(e) => handleLeaderSelect(u.id, e)}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.05 }}
                                    whileHover={{
                                      scale: 1.02,
                                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                      transition: { duration: 0.2, ease: "easeOut" }
                                    }}
                                    whileTap={{
                                      scale: 0.98,
                                      transition: { duration: 0.1 }
                                    }}
                                  >
                                    <div className={styles.dropdownItemContent}>
                                      <div className={styles.avatarContainer}>
                                        <Image
                                          src={u.imageUrl || '/empty-image.png'}
                                          alt={u.fullName}
                                          width={32}
                                          height={32}
                                          className={styles.avatarImage}
                                          onError={(e) => {
                                            e.currentTarget.src = '/empty-image.png';
                                          }}
                                        />
                                        <div 
                                          className={styles.statusDot} 
                                          style={{ backgroundColor: '#178d00' }}
                                        />
                                  </div>
                                      <span>{u.fullName} ({u.role})</span>
                                    </div>
                                    {Array.isArray(form.watch("teamInfo.LeadedBy")) && form.watch("teamInfo.LeadedBy").includes(u.id) && " (Seleccionado)"}
                                  </motion.div>
                                ))
                              ) : (
                                <div className={styles.emptyState}>
                                  <span>
                                    {isAdmin
                                      ? "No hay coincidencias. Invita a nuevos colaboradores."
                                      : "No hay coincidencias. Pide a un administrador que invite a más colaboradores."}
                                  </span>
                                </div>
                              )}
                            </motion.div>,
                            document.body,
                          )}
                        <div className={styles.tags}>
                          {Array.isArray(form.watch("teamInfo.LeadedBy")) && form.watch("teamInfo.LeadedBy").map((userId) => {
                            const collaborator = users.find((u) => u.id === userId);
                            return collaborator ? (
                              <div key={userId} className={styles.tag}>
                                <Image
                                  src={collaborator.imageUrl || '/empty-image.png'}
                                  alt={collaborator.fullName}
                                  width={24}
                                  height={24}
                                  style={{ borderRadius: '50%', objectFit: 'cover', marginRight: 6 }}
                                />
                                {collaborator.fullName}
                                <button onClick={(e) => handleLeaderRemove(userId, e)}>X</button>
                              </div>
                            ) : null;
                          })}
                        </div>
                        {form.formState.errors.teamInfo?.LeadedBy && (
                          <span className={styles.error}>{form.formState.errors.teamInfo.LeadedBy.message}</span>
                        )}
                      </div>
                      
                      {/* Checkbox para incluir miembros */}
                      <div className={styles.formGroup}>
                        <div className={styles.checkboxContainer}>
                          <input
                            type="checkbox"
                            id="includeMembers"
                            checked={includeMembers}
                            onChange={(e) => setStoreIncludeMembers(e.target.checked)}
                            className={styles.checkbox}
                          />
                          <label htmlFor="includeMembers" className={styles.checkboxLabel}>
                            ¿Deseas agregar miembros a esta tarea?
                          </label>
                        </div>
                      </div>
                      
                      {includeMembers && (
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Colaboradores*</label>
                          <div className={styles.sectionSubtitle}>
                            Agrega a los miembros del equipo que trabajarán en la tarea.
                          </div>
                          <input
                            className={styles.input}
                            value={searchCollaborator}
                            onChange={(e) => {
                              setSearchState("collaborator", e.target.value);
                              memoizedToggleDropdown("collaborator");
                            }}
                            onBlur={() => {
                              setTimeout(() => memoizedToggleDropdown("collaborator"), 200);
                            }}
                            placeholder="Ej: John Doe"
                            ref={collaboratorInputRef}
                            onKeyDown={(e) => {
                              if (e.ctrlKey || e.metaKey) {
                                switch (e.key.toLowerCase()) {
                                  case 'a':
                                    e.preventDefault();
                                    e.currentTarget.select();
                                    break;
                                  case 'c':
                                    e.preventDefault();
                                    const selection = window.getSelection();
                                    if (selection && selection.toString().length > 0) {
                                      navigator.clipboard.writeText(selection.toString()).catch(() => {
                                        const textArea = document.createElement('textarea');
                                        textArea.value = selection.toString();
                                        document.body.appendChild(textArea);
                                        textArea.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(textArea);
                                      });
                                    }
                                    break;
                                  case 'v':
                                    e.preventDefault();
                                    const targetV = e.currentTarget as HTMLInputElement | null;
                                    navigator.clipboard.readText().then(text => {
                                      if (targetV && typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
                                        const start = targetV.selectionStart;
                                        const end = targetV.selectionEnd;
                                        const newValue = searchCollaborator.substring(0, start) + text + searchCollaborator.substring(end);
                                        setSearchState("collaborator", newValue);
                                        memoizedToggleDropdown("collaborator");
                                        setTimeout(() => {
                                          targetV.setSelectionRange(start + text.length, start + text.length);
                                        }, 0);
                                      } else {
                                        setSearchState("collaborator", searchCollaborator + text);
                                      }
                                    }).catch(() => {
                                      document.execCommand('paste');
                                    });
                                    break;
                                  case 'x':
                                    e.preventDefault();
                                    const cutSelection = window.getSelection();
                                    if (cutSelection && cutSelection.toString().length > 0) {
                                      navigator.clipboard.writeText(cutSelection.toString()).then(() => {
                                        const targetX = e.currentTarget as HTMLInputElement | null;
                                        if (targetX && typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                                          const start = targetX.selectionStart;
                                          const end = targetX.selectionEnd;
                                          const newValue = searchCollaborator.substring(0, start) + searchCollaborator.substring(end);
                                          setSearchState("collaborator", newValue);
                                          memoizedToggleDropdown("collaborator");
                                        } else {
                                          setSearchState("collaborator", '');
                                        }
                                      }).catch(() => {
                                        const textArea = document.createElement('textarea');
                                        textArea.value = cutSelection.toString();
                                        document.body.appendChild(textArea);
                                        textArea.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(textArea);
                                        const targetX2 = e.currentTarget as HTMLInputElement | null;
                                        if (targetX2 && typeof targetX2.selectionStart === 'number' && typeof targetX2.selectionEnd === 'number') {
                                          const start = targetX2.selectionStart;
                                          const end = targetX2.selectionEnd;
                                          const newValue = searchCollaborator.substring(0, start) + searchCollaborator.substring(end);
                                          setSearchState("collaborator", newValue);
                                          memoizedToggleDropdown("collaborator");
                                        } else {
                                          setSearchState("collaborator", '');
                                        }
                                      });
                                    }
                                    break;
                                }
                              }
                            }}
                          />
                          {isCollaboratorDropdownOpen &&
                            createPortal(
                              <motion.div
                                className={styles.dropdown}
                                style={{
                                  top: collaboratorDropdownPosition?.top,
                                  left: collaboratorDropdownPosition?.left,
                                  position: "absolute",
                                  zIndex: 150000,
                                  width: collaboratorInputRef.current?.offsetWidth,
                                }}
                                ref={collaboratorDropdownPopperRef}
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                              >
                                {filteredCollaborators.length ? (
                                  filteredCollaborators.map((u) => (
                                    <motion.div
                                      key={u.id}
                                      className={`${styles.dropdownItem} ${
                                        form.getValues("teamInfo.LeadedBy").includes(u.id) ? styles.disabled : ""
                                      }`}
                                      onClick={(e) => {
                                        if (!form.getValues("teamInfo.LeadedBy").includes(u.id)) {
                                          handleCollaboratorSelect(u.id, e);
                                        }
                                      }}
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.2, delay: 0.05 }}
                                      whileHover={!form.getValues("teamInfo.LeadedBy").includes(u.id) ? {
                                        scale: 1.02,
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                        transition: { duration: 0.2, ease: "easeOut" }
                                      } : {}}
                                      whileTap={!form.getValues("teamInfo.LeadedBy").includes(u.id) ? {
                                        scale: 0.98,
                                        transition: { duration: 0.1 }
                                      } : {}}
                                    >
                                      <div className={styles.dropdownItemContent}>
                                        <div className={styles.avatarContainer}>
                                          <Image
                                            src={u.imageUrl || '/empty-image.png'}
                                            alt={u.fullName}
                                            width={32}
                                            height={32}
                                            className={styles.avatarImage}
                                            onError={(e) => {
                                              e.currentTarget.src = '/empty-image.png';
                                            }}
                                          />
                                          <div 
                                            className={styles.statusDot} 
                                            style={{ backgroundColor: '#178d00' }}
                                          />
                                    </div>
                                        <span>{u.fullName} ({u.role})</span>
                                      </div>
                                      {Array.isArray(form.watch("teamInfo.AssignedTo")) && form.watch("teamInfo.AssignedTo").includes(u.id) && "(Seleccionado)"}
                                    </motion.div>
                                  ))
                                ) : (
                                  <div className={styles.emptyState}>
                                    <span>
                                      {isAdmin
                                        ? "No hay coincidencias. Invita a nuevos colaboradores."
                                        : "No hay coincidencias. Pide a un administrador que invite a más colaboradores."}
                                    </span>
                                  </div>
                                )}
                              </motion.div>,
                              document.body,
                            )}
                          <div className={styles.tags}>
                            {Array.isArray(form.watch("teamInfo.AssignedTo")) && form.watch("teamInfo.AssignedTo").map((userId) => {
                              const collaborator = users.find((u) => u.id === userId);
                              return collaborator ? (
                                <div key={userId} className={styles.tag}>
                                  <Image
                                    src={collaborator.imageUrl || '/empty-image.png'}
                                    alt={collaborator.fullName}
                                    width={24}
                                    height={24}
                                    style={{ borderRadius: '50%', objectFit: 'cover', marginRight: 6 }}
                                  />
                                  {collaborator.fullName}
                                  <button onClick={(e) => handleCollaboratorRemove(userId, e)}>X</button>
                                </div>
                              ) : null;
                            })}
                          </div>
                          {form.formState.errors.teamInfo?.AssignedTo && (
                            <span className={styles.error}>{form.formState.errors.teamInfo.AssignedTo.message}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </WizardStep>
                  <WizardActions onComplete={() => form.handleSubmit(onSubmit)()} />
                </Wizard>
              </form>
            </div>
          </>
        )}
        {isSaving && (
          <div className={styles.loaderOverlay}>
            <div className={styles.loader}></div>
          </div>
        )}
      </div>
    </>
  );
};

// Componentes memoizados para evitar re-renders innecesarios
const MemoizedDropdownItem = memo(({ 
  item, 
  onClick, 
  isSelected, 
  isDisabled = false 
}: { 
  item: { id: string; name?: string; fullName?: string; imageUrl?: string; role?: string }; 
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void; 
  isSelected?: boolean; 
  isDisabled?: boolean; 
}) => (
  <motion.div
    className={`${styles.dropdownItem} ${isDisabled ? styles.disabled : ""}`}
    onClick={isDisabled ? undefined : onClick}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, delay: 0.05 }}
    whileHover={!isDisabled ? {
      scale: 1.02,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      transition: { duration: 0.2, ease: "easeOut" }
    } : {}}
    whileTap={!isDisabled ? {
      scale: 0.98,
      transition: { duration: 0.1 }
    } : {}}
  >
    <div className={styles.dropdownItemContent}>
      <div className={styles.avatarContainer}>
        <Image
          src={item.imageUrl || '/empty-image.png'}
          alt={item.name || item.fullName}
          width={32}
          height={32}
          className={styles.avatarImage}
          onError={(e) => {
            e.currentTarget.src = '/empty-image.png';
          }}
        />
        <div 
          className={styles.statusDot} 
          style={{ backgroundColor: '#178d00' }}
        />
      </div>
      <span>{item.name || item.fullName}</span>
    </div>
    {isSelected && "(Seleccionado)"}
  </motion.div>
));

MemoizedDropdownItem.displayName = 'MemoizedDropdownItem';



export default CreateTask;