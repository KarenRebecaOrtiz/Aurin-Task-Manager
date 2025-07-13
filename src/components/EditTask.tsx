'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { doc, collection, setDoc, addDoc, getDoc, onSnapshot } from "firebase/firestore";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import styles from "@/components/CreateTask.module.scss";
import { Timestamp } from "firebase/firestore";
import { Wizard, WizardStep, WizardProgress, WizardActions } from "@/components/ui/wizard";
import { toast } from "@/components/ui/use-toast";
import { useFormPersistence } from "@/components/ui/use-form-persistence";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from "@/components/ui/use-keyboard-shortcuts";
import { updateTaskActivity } from '@/lib/taskUtils';
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';

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
    AssignedTo: z.array(z.string()).optional(),
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

interface EditTaskProps {
  isOpen: boolean;
  onToggle: () => void;
  taskId: string;
  onHasUnsavedChanges: (hasChanges: boolean) => void;
  onCreateClientOpen: () => void;
  onEditClientOpen: (client: Client) => void;
  onClientAlertChange?: (alert: { type: "success" | "fail"; message?: string; error?: string } | null) => void;
  onShowSuccessAlert?: (message: string) => void;
  onShowFailAlert?: (message: string, error?: string) => void;
}

const EditTask: React.FC<EditTaskProps> = ({
  isOpen,
  onToggle,
  taskId,
  onHasUnsavedChanges,
  onCreateClientOpen,
  onEditClientOpen,
  onClientAlertChange,
  onShowSuccessAlert,
  onShowFailAlert,
}) => {
  const { user } = useUser();
  const router = useRouter();
  const { isAdmin, isLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const [isCollaboratorDropdownOpen, setIsCollaboratorDropdownOpen] = useState(false);
  const [isLeaderDropdownOpen, setIsLeaderDropdownOpen] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [projectDropdownPosition, setProjectDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [collaboratorDropdownPosition, setCollaboratorDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [leaderDropdownPosition, setLeaderDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [clientDropdownPosition, setClientDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [startDatePosition, setStartDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [endDatePosition, setEndDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [searchCollaborator, setSearchCollaborator] = useState("");
  const [searchLeader, setSearchLeader] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showFailAlert, setShowFailAlert] = useState(false);
  const [failErrorMessage, setFailErrorMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [includeMembers, setIncludeMembers] = useState(false);
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
  const { users, isLoadingUsers } = useDataStore(
    useShallow((state) => ({
      users: state.users,
      isLoadingUsers: state.isLoadingUsers,
    }))
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(includeMembers)),
    defaultValues,
    mode: "onChange",
  });

  const { isLoading: hasPersistedData, saveFormData, clearPersistedData } = useFormPersistence(
    form,
    `edit-task-wizard-${taskId}`,
    true,
  );

  // Habilitar atajos de teclado
  useKeyboardShortcuts({ enabled: isOpen });

  // Prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update resolver when includeMembers changes
  useEffect(() => {
    form.clearErrors();
    form.trigger();
  }, [includeMembers, form]);

  // Track unsaved changes
  const defaultValuesRef = useRef(defaultValues);
  defaultValuesRef.current = defaultValues;

  const checkForChanges = useCallback((value: FormValues) => {
    saveFormData();
    const isChanged = Object.keys(value).some((key) => {
      const current = value[key as keyof FormValues];
      const initial = defaultValuesRef.current[key as keyof FormValues];
      if (Array.isArray(current) && Array.isArray(initial)) {
        return current.join() !== initial.join();
      }
      return current !== initial;
    });
    onHasUnsavedChanges(isChanged);
  }, [saveFormData, onHasUnsavedChanges]);

  useEffect(() => {
    const subscription = form.watch(checkForChanges);
    return () => subscription.unsubscribe();
  }, [form, checkForChanges]);

  // Reset form when closing
  const resetForm = useCallback(() => {
    form.reset(defaultValuesRef.current);
    clearPersistedData();
    setShowSuccessAlert(false);
    setShowFailAlert(false);
    onHasUnsavedChanges(false);
    setIsStartDateOpen(false);
    setIsEndDateOpen(false);
  }, [form, clearPersistedData, onHasUnsavedChanges]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  // Handle alert changes
  useEffect(() => {
    if (onClientAlertChange) {
      if (showSuccessAlert || showFailAlert) {
        onClientAlertChange({
          type: showSuccessAlert ? "success" : "fail",
          message: showSuccessAlert
            ? `La tarea "${form.getValues("basicInfo.name")}" se ha actualizado exitosamente.`
            : "No se pudo actualizar la tarea.",
          error: showFailAlert ? failErrorMessage : undefined,
        });
      } else {
        onClientAlertChange(null);
      }
    }
  }, [onClientAlertChange, showSuccessAlert, showFailAlert, failErrorMessage, form]);

  // Optimized dropdown positions useEffect - only run when dropdowns actually open/close
  const updatePositions = useCallback(() => {
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
  }, [
    isStartDateOpen,
    isEndDateOpen,
    isProjectDropdownOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
    isCollaboratorDropdownOpen,
    isLeaderDropdownOpen,
    isClientDropdownOpen,
  ]);

  const animatePoppers = useCallback(() => {
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
  }, [
    isProjectDropdownOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
    isCollaboratorDropdownOpen,
    isLeaderDropdownOpen,
    isClientDropdownOpen,
    isStartDateOpen,
    isEndDateOpen,
  ]);

  useEffect(() => {
    if (!isMounted) return;

    if (containerRef.current) {
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
    }

    updatePositions();
    animatePoppers();

    const handleResize = debounce(updatePositions, 100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    isOpen,
    isMounted,
    updatePositions,
    animatePoppers,
  ]);

  // Handle click outside to close dropdowns
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
        startDateInputRef.current &&
        !startDateInputRef.current.contains(event.target as Node) &&
        startDatePopperRef.current &&
        !startDatePopperRef.current.contains(event.target as Node) &&
        isStartDateOpen
      ) {
        setIsStartDateOpen(false);
      }
      if (
        endDateInputRef.current &&
        !endDateInputRef.current.contains(event.target as Node) &&
        endDatePopperRef.current &&
        !endDatePopperRef.current.contains(event.target as Node) &&
        isEndDateOpen
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
      if (
        clientInputRef.current &&
        !clientInputRef.current.contains(event.target as Node) &&
        clientDropdownPopperRef.current &&
        !clientDropdownPopperRef.current.contains(event.target as Node) &&
        isClientDropdownOpen
      ) {
        setIsClientDropdownOpen(false);
      }
      if (
        leaderInputRef.current &&
        !leaderInputRef.current.contains(event.target as Node) &&
        leaderDropdownPopperRef.current &&
        !leaderDropdownPopperRef.current.contains(event.target as Node) &&
        isLeaderDropdownOpen
      ) {
        setIsLeaderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    isProjectDropdownOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
    isStartDateOpen,
    isEndDateOpen,
    isCollaboratorDropdownOpen,
    isClientDropdownOpen,
    isLeaderDropdownOpen,
  ]);

  // Handle scroll to close dropdowns
  useEffect(() => {
    const handleScroll = debounce(() => {
      if (
        isStartDateOpen ||
        isEndDateOpen ||
        isProjectDropdownOpen ||
        isStatusDropdownOpen ||
        isPriorityDropdownOpen ||
        isCollaboratorDropdownOpen ||
        isLeaderDropdownOpen ||
        isClientDropdownOpen
      ) {
        setIsStartDateOpen(false);
        setIsEndDateOpen(false);
        setIsProjectDropdownOpen(false);
        setIsStatusDropdownOpen(false);
        setIsPriorityDropdownOpen(false);
        setIsCollaboratorDropdownOpen(false);
        setIsLeaderDropdownOpen(false);
        setIsClientDropdownOpen(false);
      }
    }, 200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [
    isStartDateOpen,
    isEndDateOpen,
    isProjectDropdownOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
    isCollaboratorDropdownOpen,
    isLeaderDropdownOpen,
    isClientDropdownOpen,
  ]);

  const animateClick = useCallback((element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.98,
      opacity: 0.9,
      duration: 0.15,
      ease: "power1.out",
      yoyo: true,
      repeat: 1,
    });
  }, []);

  const handleClientSelectDropdown = useCallback(
    (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("clientInfo.clientId", clientId);
      setSearchClient("");
      setIsClientDropdownOpen(false);
    },
    [form, animateClick],
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
      setIsProjectDropdownOpen(false);
    },
    [form, animateClick],
  );

  const handleStatusSelect = useCallback(
    (status: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("basicInfo.status", status as FormValues["basicInfo"]["status"]);
      setIsStatusDropdownOpen(false);
    },
    [form, animateClick],
  );

  const handlePrioritySelect = useCallback(
    (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      form.setValue("basicInfo.priority", priority as FormValues["basicInfo"]["priority"]);
      setIsPriorityDropdownOpen(false);
    },
    [form, animateClick],
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
      setSearchLeader("");
      setIsLeaderDropdownOpen(false);
    },
    [form, animateClick],
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
        setSearchCollaborator("");
        setIsCollaboratorDropdownOpen(false);
      }
    },
    [form, animateClick],
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

  // Memoize form values to avoid unnecessary re-renders
  const watchedLeadedBy = form.watch("teamInfo.LeadedBy");
  const watchedAssignedTo = form.watch("teamInfo.AssignedTo");
  const currentLeadedBy = form.getValues("teamInfo.LeadedBy");

  const filteredCollaborators = useMemo(() => {
    return users.filter(
      (u) =>
        !watchedLeadedBy.includes(u.id) &&
        (u.fullName.toLowerCase().includes(searchCollaborator.toLowerCase()) ||
         u.role.toLowerCase().includes(searchCollaborator.toLowerCase())),
    );
  }, [users, searchCollaborator, watchedLeadedBy]);

  const filteredLeaders = useMemo(() => {
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(searchLeader.toLowerCase()) ||
        u.role.toLowerCase().includes(searchLeader.toLowerCase()),
    );
  }, [users, searchLeader]);

  const filteredClients = useMemo(() => {
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(searchClient.toLowerCase()) ||
        c.projects.some((project) => project.toLowerCase().includes(searchClient.toLowerCase())),
    );
  }, [clients, searchClient]);

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
      const taskData = {
        ...values.clientInfo,
        ...values.basicInfo,
        ...values.teamInfo,
        AssignedTo: includeMembers ? values.teamInfo.AssignedTo || [] : [],
        CreatedBy: user.id,
        createdAt: Timestamp.fromDate(new Date()),
      };

      await setDoc(doc(db, "tasks", taskId), taskData);

      // Actualizar la actividad de la tarea
      await updateTaskActivity(taskId, 'edit');

      const recipients = new Set<string>([...values.teamInfo.LeadedBy, ...(includeMembers ? (values.teamInfo.AssignedTo || []) : [])]);
      recipients.delete(user.id);
      for (const recipientId of Array.from(recipients)) {
        await addDoc(collection(db, "notifications"), {
          userId: user.id,
          taskId,
          message: `${user.firstName || "Usuario"} actualizó la tarea ${values.basicInfo.name}`,
          timestamp: Timestamp.now(),
          read: false,
          recipientId,
        });
      }

      // Use parent alert handlers if available, otherwise use local state
      if (onShowSuccessAlert) {
        onShowSuccessAlert(`La tarea "${values.basicInfo.name}" se ha actualizado exitosamente.`);
      } else {
        setShowSuccessAlert(true);
      }
      
      form.reset(defaultValuesRef.current);
      clearPersistedData();
      setIsSaving(false);
      onHasUnsavedChanges(false);
      
      // Cerrar el modal de edición
      onToggle();
      
      // Redirigir inmediatamente después de guardar exitosamente
      router.push("/dashboard/tasks");
      
      // Cerrar el alert de éxito después de 2 segundos
      setTimeout(() => {
        if (onShowSuccessAlert) {
          // Parent will handle closing
        } else {
          setShowSuccessAlert(false);
        }
      }, 2000);

      // Inicializar el estado includeMembers basado en si la tarea tiene miembros asignados
      setIncludeMembers((taskData.AssignedTo && taskData.AssignedTo.length > 0) || false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al actualizar la tarea.";
      console.error("Error updating task:", errorMessage);

      let userFriendlyTitle = "❌ Error al Actualizar Tarea";
      let userFriendlyDescription = "No pudimos actualizar tu tarea en este momento. ";

      if (errorMessage.includes("permission")) {
        userFriendlyTitle = "🔒 Sin Permisos";
        userFriendlyDescription = "No tienes permisos para actualizar esta tarea. Solo el creador o un administrador pueden editarla.";
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        userFriendlyTitle = "🌐 Problema de Conexión";
        userFriendlyDescription = "Hay un problema con tu conexión a internet. Verifica tu conexión e intenta nuevamente.";
      } else if (errorMessage.includes("not-found") || errorMessage.includes("does not exist")) {
        userFriendlyTitle = "📋 Tarea No Encontrada";
        userFriendlyDescription = "La tarea que intentas editar ya no existe o fue eliminada por otro usuario.";
      } else if (errorMessage.includes("validation") || errorMessage.includes("required")) {
        userFriendlyTitle = "📝 Datos Incompletos";
        userFriendlyDescription = "Algunos campos obligatorios están incompletos o contienen errores. Revisa el formulario y completa toda la información requerida.";
      } else if (errorMessage.includes("timeout")) {
        userFriendlyTitle = "⏱️ Tiempo de Espera Agotado";
        userFriendlyDescription = "La operación tardó demasiado en completarse. Tu conexión puede ser lenta, intenta nuevamente.";
      } else if (errorMessage.includes("conflict") || errorMessage.includes("version")) {
        userFriendlyTitle = "⚡ Conflicto de Versión";
        userFriendlyDescription = "Otro usuario modificó esta tarea mientras la editabas. Recarga la página para ver los cambios más recientes.";
      } else {
        userFriendlyDescription += "Por favor, verifica todos los campos y intenta nuevamente. Si el problema persiste, contacta al soporte técnico.";
      }

      toast({
        title: userFriendlyTitle,
        description: userFriendlyDescription,
        variant: "error",
      });

      // Use parent alert handlers if available, otherwise use local state
      if (onShowFailAlert) {
        onShowFailAlert("No se pudo actualizar la tarea.", errorMessage);
      } else {
        setShowFailAlert(true);
        setFailErrorMessage(errorMessage);
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

  // Funciones para manejo de shortcuts de teclado específicas para cada tipo de input
  const handleSearchInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, setter: (value: string) => void, currentValue: string, setDropdownOpen: (open: boolean) => void) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          e.currentTarget.select();
          break;
        case 'c':
          e.preventDefault();
          const targetC = e.currentTarget as HTMLInputElement;
          if (targetC.selectionStart !== targetC.selectionEnd) {
            const selectedText = currentValue.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
        case 'v':
          e.preventDefault();
          const targetV = e.currentTarget as HTMLInputElement;
          navigator.clipboard.readText().then(text => {
            if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
              const start = targetV.selectionStart;
              const end = targetV.selectionEnd;
              const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
              setter(newValue);
              setDropdownOpen(text.trim() !== "");
              setTimeout(() => {
                targetV.setSelectionRange(start + text.length, start + text.length);
              }, 0);
            } else {
              setter(currentValue + text);
            }
          }).catch(() => {
            document.execCommand('paste');
          });
          break;
        case 'x':
          e.preventDefault();
          const targetX = e.currentTarget as HTMLInputElement;
          if (targetX.selectionStart !== targetX.selectionEnd) {
            const selectedText = currentValue.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).then(() => {
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = currentValue.substring(0, start) + currentValue.substring(end);
                setter(newValue);
                setDropdownOpen(newValue.trim() !== "");
              } else {
                setter('');
              }
            }).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = currentValue.substring(0, start) + currentValue.substring(end);
                setter(newValue);
                setDropdownOpen(newValue.trim() !== "");
              } else {
                setter('');
              }
            });
          }
          break;
      }
    }
  }, []);

  const handleFormInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, field: { value?: string; onChange: (value: string) => void }) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          e.currentTarget.select();
          break;
        case 'c':
          e.preventDefault();
          const targetC = e.currentTarget as HTMLInputElement;
          if (targetC.selectionStart !== targetC.selectionEnd) {
            const selectedText = (field.value || '').substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
        case 'v':
          e.preventDefault();
          const targetV = e.currentTarget as HTMLInputElement;
          navigator.clipboard.readText().then(text => {
            if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
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
          const targetX = e.currentTarget as HTMLInputElement;
          if (targetX.selectionStart !== targetX.selectionEnd) {
            const selectedText = (field.value || '').substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
            navigator.clipboard.writeText(selectedText).then(() => {
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
                const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
                field.onChange(newValue);
              } else {
                field.onChange('');
              }
            }).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selectedText;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                const start = targetX.selectionStart;
                const end = targetX.selectionEnd;
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
  }, []);

  // Fetch task, clients, and users
  const fetchTask = useCallback(async () => {
    if (!taskId || !user?.id) return;
    
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      if (!taskDoc.exists()) {
        console.warn('[EditTask] Task not found:', taskId);
        router.push('/dashboard/tasks');
        return;
      }
      const taskData = taskDoc.data();
      if (taskData.CreatedBy !== user.id) {
        console.warn('[EditTask] User not authorized to edit task:', taskId);
        router.push('/dashboard/tasks');
        return;
      }
      const status = taskData.status === 'Por Comenzar' ? 'Por Iniciar' :
                     taskData.status === 'Cancelada' ? 'Cancelado' : taskData.status || 'Por Iniciar';
      const formValues: FormValues = {
        clientInfo: {
          clientId: taskData.clientId || '',
          project: taskData.project || '',
        },
        basicInfo: {
          name: taskData.name || '',
          description: taskData.description || '',
          objectives: taskData.objectives || '',
          startDate: taskData.startDate ? taskData.startDate.toDate() : null,
          endDate: taskData.endDate ? taskData.endDate.toDate() : null,
          status: status as FormValues["basicInfo"]["status"],
          priority: taskData.priority || 'Baja',
        },
        teamInfo: {
          LeadedBy: taskData.LeadedBy || [],
          AssignedTo: taskData.AssignedTo || [],
        },
      };
      form.reset(formValues);

      // Inicializar el estado includeMembers basado en si la tarea tiene miembros asignados
      setIncludeMembers((taskData.AssignedTo && taskData.AssignedTo.length > 0) || false);
    } catch (error) {
      console.error('[EditTask] Error fetching task:', error);
      router.push('/dashboard/tasks');
    }
  }, [taskId, user?.id, router, form]);

  useEffect(() => {
    if (!taskId || !user?.id) return;

    const clientsCollection = collection(db, 'clients');
    const unsubscribeClients = onSnapshot(
      clientsCollection,
      (snapshot) => {
        const clientsData: Client[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || '',
          imageUrl: doc.data().imageUrl || '',
          projects: doc.data().projects || [],
          createdBy: doc.data().createdBy || '',
        }));
        setClients(clientsData);
      },
      (error) => {
        console.error('[EditTask] Error listening to clients:', error);
      },
    );

    fetchTask();
    return () => unsubscribeClients();
  }, [taskId, user?.id, router, fetchTask]);

  if (isLoading || !isMounted || isLoadingUsers) {
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
              <div className={styles.headerTitle}>Editar Tarea</div>
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
                              form.reset(defaultValuesRef.current);
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
                        <input
                          className={styles.input}
                          value={searchClient}
                          onChange={(e) => {
                            setSearchClient(e.target.value);
                            setIsClientDropdownOpen(e.target.value.trim() !== "");
                          }}
                          onBlur={() => {
                            setTimeout(() => setIsClientDropdownOpen(false), 200);
                          }}
                          placeholder="Ej: Nombre de la cuenta"
                          ref={clientInputRef}
                          onKeyDown={(e) => handleSearchInputKeyDown(e, setSearchClient, searchClient, setIsClientDropdownOpen)}
                          onCopy={e => e.stopPropagation()}
                          onPaste={e => e.stopPropagation()}
                          onCut={e => e.stopPropagation()}
                          onSelect={e => e.stopPropagation()}
                        />
                        {isClientDropdownOpen &&
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
                                    className={styles.dropdownItem}
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
                                    {form.watch("clientInfo.clientId") === client.id && " (Seleccionado)"}
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
                              setIsProjectDropdownOpen(!isProjectDropdownOpen);
                            }}
                          >
                            <span>{form.watch("clientInfo.project") || "Seleccionar una Carpeta"}</span>
                            <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
                          </div>
                          {isProjectDropdownOpen &&
                            createPortal(
                              <motion.div
                                className={styles.dropdownItems}
                                style={{
                                  top: projectDropdownPosition?.top,
                                  left: projectDropdownPosition?.left,
                                  position: "absolute",
                                  zIndex: 150000,
                                }}
                                ref={projectDropdownPopperRef}
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                              >
                                {(() => {
                                  const selectedClient = clients.find(
                                    (c) => c.id === form.getValues("clientInfo.clientId")
                                  );
                                  if (!selectedClient || !selectedClient.projects.length) {
                                    return (
                                      <div className={styles.emptyState}>
                                        <span>
                                          {isAdmin
                                            ? "No hay carpetas disponibles. ¡Crea una nueva para organizar tus tareas!"
                                            : "No hay carpetas disponibles. Pide a un administrador que añada una para tu proyecto."}
                                        </span>
                                      </div>
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
                                            src="/shapes/folder.svg"
                                            alt="Folder"
                                            width={32}
                                            height={32}
                                            className={styles.svgIcon}
                                            style={{ objectFit: 'contain' }}
                                          />
                                        </div>
                                        <span>{project}</span>
                                      </div>
                                    </motion.div>
                                  ));
                                })()}
                              </motion.div>,
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
                                  onKeyDown={(e) => handleFormInputKeyDown(e, field)}
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
                                  onKeyDown={(e) => handleFormInputKeyDown(e, field)}
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
                                  onKeyDown={(e) => handleFormInputKeyDown(e, field)}
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
                                onClick={() => setIsStartDateOpen(!isStartDateOpen)}
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
                                        setIsStartDateOpen(false);
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
                                onClick={() => setIsEndDateOpen(!isEndDateOpen)}
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
                                        setIsEndDateOpen(false);
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
                                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                                }}
                              >
                                <span>{form.watch("basicInfo.status") || "Seleccionar"}</span>
                                <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
                              </div>
                              {isStatusDropdownOpen &&
                                createPortal(
                                  <div
                                    className={styles.dropdownItems}
                                    style={{
                                      top: statusDropdownPosition?.top,
                                      left: statusDropdownPosition?.left,
                                      position: "absolute",
                                      zIndex: 150000,
                                      width: statusDropdownRef.current?.offsetWidth,
                                    }}
                                    ref={statusDropdownPopperRef}
                                  >
                                    {["Por Iniciar", "En Proceso", "Backlog", "Por Finalizar", "Finalizado", "Cancelado"].map((status) => (
                                      <div
                                        key={status}
                                        className={styles.dropdownItem}
                                        onClick={(e) => handleStatusSelect(status, e)}
                                      >
                                        {status}
                                      </div>
                                    ))}
                                  </div>,
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
                                  setIsPriorityDropdownOpen(!isPriorityDropdownOpen);
                                }}
                              >
                                <span>{form.watch("basicInfo.priority") || "Seleccionar"}</span>
                                <Image src="/chevron-down.svg" alt="Chevron" width={16} height={16} />
                              </div>
                              {isPriorityDropdownOpen &&
                                createPortal(
                                  <div
                                    className={styles.dropdownItems}
                                    style={{
                                      top: priorityDropdownPosition?.top,
                                      left: priorityDropdownPosition?.left,
                                      position: "absolute",
                                      zIndex: 150000,
                                      width: priorityDropdownRef.current?.offsetWidth,
                                    }}
                                    ref={priorityDropdownPopperRef}
                                  >
                                    {["Baja", "Media", "Alta"].map((priority) => (
                                      <div
                                        key={priority}
                                        className={styles.dropdownItem}
                                        onClick={(e) => handlePrioritySelect(priority, e)}
                                      >
                                        {priority}
                                      </div>
                                    ))}
                                  </div>,
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
                            setSearchLeader(e.target.value);
                          }}
                          onFocus={() => {
                            setIsLeaderDropdownOpen(true);
                          }}
                          onBlur={() => {
                            setTimeout(() => setIsLeaderDropdownOpen(false), 200);
                          }}
                          placeholder="Ej: John Doe"
                          ref={leaderInputRef}
                          onKeyDown={(e) => handleSearchInputKeyDown(e, setSearchLeader, searchLeader, setIsLeaderDropdownOpen)}
                          onCopy={e => e.stopPropagation()}
                          onPaste={e => e.stopPropagation()}
                          onCut={e => e.stopPropagation()}
                          onSelect={e => e.stopPropagation()}
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
                                    {watchedLeadedBy.includes(u.id) && " (Seleccionado)"}
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
                          {watchedLeadedBy.map((userId) => {
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
                        {isAdmin && (
                          <div className={styles.addButtonWrapper}>
                            <div className={styles.addButtonText}>
                              ¿No encuentras algún colaborador? <strong>Invita a uno nuevo.</strong>
                            </div>
                            <button
                              type="button"
                              className={styles.addButton}
                              onClick={(e) => {
                                animateClick(e.currentTarget);
                                onEditClientOpen(clients.find(c => c.id === form.getValues("clientInfo.clientId")) || { id: "", name: "", imageUrl: "", projects: [], createdBy: "" });
                              }}
                            >
                              + Invitar Colaborador
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Checkbox para incluir miembros */}
                      <div className={styles.formGroup}>
                        <div className={styles.checkboxContainer}>
                          <input
                            type="checkbox"
                            id="includeMembers"
                            checked={includeMembers}
                            onChange={(e) => setIncludeMembers(e.target.checked)}
                            className={styles.checkbox}
                          />
                          <label htmlFor="includeMembers" className={styles.checkboxLabel}>
                            ¿Deseas agregar miembros a esta tarea?
                          </label>
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {includeMembers && (
                          <motion.div 
                            className={styles.formGroup}
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: "auto", scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <label className={styles.label}>Colaboradores*</label>
                            <div className={styles.sectionSubtitle}>
                              Agrega a los miembros del equipo que trabajarán en la tarea.
                            </div>
                            <input
                              className={styles.input}
                              value={searchCollaborator}
                              onChange={(e) => {
                                setSearchCollaborator(e.target.value);
                              }}
                              onFocus={() => {
                                setIsCollaboratorDropdownOpen(true);
                              }}
                              onBlur={() => {
                                setTimeout(() => setIsCollaboratorDropdownOpen(false), 200);
                              }}
                              placeholder="Ej: John Doe"
                              ref={collaboratorInputRef}
                              onKeyDown={(e) => handleSearchInputKeyDown(e, setSearchCollaborator, searchCollaborator, setIsCollaboratorDropdownOpen)}
                              onCopy={e => e.stopPropagation()}
                              onPaste={e => e.stopPropagation()}
                              onCut={e => e.stopPropagation()}
                              onSelect={e => e.stopPropagation()}
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
                                          currentLeadedBy.includes(u.id) ? styles.disabled : ""
                                        }`}
                                        onClick={(e) => {
                                          if (!currentLeadedBy.includes(u.id)) {
                                            handleCollaboratorSelect(u.id, e);
                                          }
                                        }}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: 0.05 }}
                                        whileHover={!currentLeadedBy.includes(u.id) ? {
                                          scale: 1.02,
                                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                          transition: { duration: 0.2, ease: "easeOut" }
                                        } : {}}
                                        whileTap={!currentLeadedBy.includes(u.id) ? {
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
                                        {watchedAssignedTo.includes(u.id) && "(Seleccionado)"}
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
                              {watchedAssignedTo.map((userId) => {
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
                            {isAdmin && (
                              <div className={styles.addButtonWrapper}>
                                <div className={styles.addButtonText}>
                                  ¿No encuentras algún colaborador? <strong>Invita a uno nuevo.</strong>
                                </div>
                                <button
                                  type="button"
                                  className={styles.addButton}
                                  onClick={(e) => {
                                    animateClick(e.currentTarget);
                                    onEditClientOpen(clients.find(c => c.id === form.getValues("clientInfo.clientId")) || { id: "", name: "", imageUrl: "", projects: [], createdBy: "" });
                                  }}
                                >
                                  + Invitar Colaborador
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
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

export default EditTask; 