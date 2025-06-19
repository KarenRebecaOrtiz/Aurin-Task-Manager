"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { doc, collection, setDoc, addDoc, onSnapshot, getDoc } from "firebase/firestore";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import styles from "@/components/CreateTask.module.scss";
import { Timestamp } from "firebase/firestore";
import SuccessAlert from "./SuccessAlert";
import FailAlert from "./FailAlert";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wizard, WizardStep, WizardProgress, WizardActions } from "@/components/ui/wizard";
import { toast } from "@/components/ui/use-toast";
import { useFormPersistence } from "@/components/ui/use-form-persistence";
import { useRouter } from "next/navigation";
import Splide from "@splidejs/splide";
import "@splidejs/splide/css/core";
import { db } from "@/lib/firebase";

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

const formSchema = z.object({
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
    status: z.enum(["Por comenzar", "En Proceso", "Finalizado", "Backlog", "Cancelada"], {
      required_error: "Selecciona un estado*",
    }),
    priority: z.enum(["Baja", "Media", "Alta"], { required_error: "Selecciona una prioridad*" }),
  }),
  teamInfo: z.object({
    LeadedBy: z.array(z.string()).min(1, { message: "Selecciona al menos un líder*" }),
    AssignedTo: z.array(z.string()).min(1, { message: "Selecciona al menos un colaborador*" }),
  }),
  resources: z.object({
    budget: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "El presupuesto debe ser un número válido*",
    }),
    hours: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Las horas deben ser un número válido*",
    }),
  }),
  advanced: z.object({
    methodology: z.string().optional(),
    risks: z.string().optional(),
    mitigation: z.string().optional(),
    stakeholders: z.string().optional(),
  }),
});

type FormValues = z.infer<typeof formSchema>;

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
    status: "Por comenzar",
    priority: "Baja",
  },
  teamInfo: {
    LeadedBy: [],
    AssignedTo: [],
  },
  resources: {
    budget: "",
    hours: "",
  },
  advanced: {
    methodology: "",
    risks: "",
    mitigation: "",
    stakeholders: "",
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
  ["resources.budget", "resources.hours"],
  ["advanced.methodology", "advanced.risks", "advanced.mitigation", "advanced.stakeholders"],
];

interface CreateTaskProps {
  isOpen: boolean;
  onHasUnsavedChanges: (hasChanges: boolean) => void;
  onCreateClientOpen: () => void;
  onEditClientOpen: (client: Client) => void;
  onInviteSidebarOpen: () => void;
  onClientAlertChange?: (alert: { type: "success" | "fail"; message?: string; error?: string } | null) => void;
}

const CreateTask: React.FC<CreateTaskProps> = ({
  isOpen,
  onHasUnsavedChanges,
  onCreateClientOpen,
  onEditClientOpen,
  onInviteSidebarOpen,
  onClientAlertChange,
}) => {
  const { user } = useUser();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const [isCollaboratorDropdownOpen, setIsCollaboratorDropdownOpen] = useState(false);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [projectDropdownPosition, setProjectDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [collaboratorDropdownPosition, setCollaboratorDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [startDatePosition, setStartDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [endDatePosition, setEndDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [searchCollaborator, setSearchCollaborator] = useState("");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showFailAlert, setShowFailAlert] = useState(false);
  const [failErrorMessage, setFailErrorMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoaded, setIsAdminLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const collaboratorInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLDivElement>(null);
  const endDateInputRef = useRef<HTMLDivElement>(null);
  const startDatePopperRef = useRef<HTMLDivElement>(null);
  const endDatePopperRef = useRef<HTMLDivElement>(null);
  const projectDropdownPopperRef = useRef<HTMLDivElement>(null);
  const statusDropdownPopperRef = useRef<HTMLDivElement>(null);
  const priorityDropdownPopperRef = useRef<HTMLDivElement>(null);
  const collaboratorDropdownPopperRef = useRef<HTMLDivElement>(null);
  const clientSplideRef = useRef<HTMLDivElement>(null);
  const pmSplideRef = useRef<HTMLDivElement>(null);
  const clientSplideInstance = useRef<Splide | null>(null);
  const pmSplideInstance = useRef<Splide | null>(null);
  const [clientCanPrev, setClientCanPrev] = useState(false);
  const [clientCanNext, setClientCanNext] = useState(true);
  const [pmCanPrev, setPmCanPrev] = useState(false);
  const [pmCanNext, setPmCanNext] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const { isLoading, hasPersistedData, saveFormData, clearPersistedData } = useFormPersistence(
    form,
    "create-task-wizard",
    true,
  );

  // Prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!user?.id) {
        console.warn('[CreateTask] No userId, skipping admin status fetch');
        setIsAdmin(false);
        setIsAdminLoaded(true);
        return;
      }
      try {
        console.log('[CreateTask] Fetching admin status for user:', user.id);
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const access = userDoc.data().access;
          setIsAdmin(access === 'admin');
          console.log('[CreateTask] Admin status fetched:', {
            userId: user.id,
            access,
            isAdmin: access === 'admin',
            userDocData: userDoc.data(),
          });
        } else {
          setIsAdmin(false);
          console.warn('[CreateTask] User document not found for ID:', user.id);
        }
      } catch (error) {
        console.error('[CreateTask] Error fetching admin status:', {
          error: error instanceof Error ? error.message : JSON.stringify(error),
          userId: user.id,
        });
        setIsAdmin(false);
      } finally {
        setIsAdminLoaded(true);
        console.log('[CreateTask] Admin status load completed:', { userId: user.id, isAdmin });
      }
    };
    fetchAdminStatus();
  }, [user?.id, isAdmin]);

  useEffect(() => {
    const subscription = form.watch((value) => {
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
    });
    return () => subscription.unsubscribe();
  }, [form, onHasUnsavedChanges, saveFormData]);

  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultValues);
      clearPersistedData();
      setShowSuccessAlert(false);
      setShowFailAlert(false);
      onHasUnsavedChanges(false);
      setIsStartDateOpen(false);
      setIsEndDateOpen(false);
    }
  }, [isOpen, form, onHasUnsavedChanges, clearPersistedData]);

  useEffect(() => {
    const clientsCollection = collection(db, "clients");
    const unsubscribe = onSnapshot(
      clientsCollection,
      (snapshot) => {
        const clientsData: Client[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          imageUrl: doc.data().imageUrl || "/default-avatar.png",
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
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) throw new Error("Failed to fetch users");
        const clerkUsers: {
          id: string;
          imageUrl?: string;
          firstName?: string;
          lastName?: string;
          publicMetadata: { role?: string };
        }[] = await response.json();
        const usersData: User[] = clerkUsers.map((user) => ({
          id: user.id,
          imageUrl: user.imageUrl || "/default-avatar.png",
          fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Sin nombre",
          role: user.publicMetadata.role || "Sin rol",
        }));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
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

  // Combined useEffect for dropdowns and container animations
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
    };

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
      if (isCollaboratorDropdownOpen && collaboratorDropdownPopperRef.current) {
        gsap.fromTo(
          collaboratorDropdownPopperRef.current,
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
    };

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

    window.addEventListener("resize", updatePositions);
    return () => window.removeEventListener("resize", updatePositions);
  }, [
    isOpen,
    isMounted,
    isStartDateOpen,
    isEndDateOpen,
    isProjectDropdownOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
    isCollaboratorDropdownOpen,
  ]);

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
  ]);

  // Handle scroll with touch compatibility
  useEffect(() => {
    const handleScroll = debounce(() => {
      if (
        isStartDateOpen ||
        isEndDateOpen ||
        isProjectDropdownOpen ||
        isStatusDropdownOpen ||
        isPriorityDropdownOpen ||
        isCollaboratorDropdownOpen
      ) {
        setIsStartDateOpen(false);
        setIsEndDateOpen(false);
        setIsProjectDropdownOpen(false);
        setIsStatusDropdownOpen(false);
        setIsPriorityDropdownOpen(false);
        setIsCollaboratorDropdownOpen(false);
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
  ]);

  // Initialize client Splide
  useEffect(() => {
    if (!isMounted || !clientSplideRef.current || clients.length === 0) return;

    const timer = setTimeout(() => {
      if (clientSplideInstance.current) {
        clientSplideInstance.current.destroy();
        clientSplideInstance.current = null;
      }

      const perPage = Math.min(clients.length, 6);
      clientSplideInstance.current = new Splide(clientSplideRef.current, {
        type: "loop",
        perPage,
        perMove: 1,
        gap: "1rem",
        autoWidth: false,
        focus: "center",
        autoplay: false,
        drag: true,
        dragMinThreshold: { mouse: 10, touch: 10 },
        arrows: false,
        pagination: false,
        breakpoints: {
          1024: { perPage: Math.min(clients.length, 4), gap: "0.75rem" },
          767: { perPage: Math.min(clients.length, 2), gap: "0.5rem" },
          480: { perPage: 1, gap: "0.5rem" },
        },
      }).mount();

      // Update navigation button states
      const updateNavButtons = () => {
        if (clientSplideInstance.current) {
          const { index, length } = clientSplideInstance.current;
          setClientCanPrev(index > 0);
          setClientCanNext(index < length - perPage);
        }
      };

      clientSplideInstance.current.on("moved", updateNavButtons);
      updateNavButtons();

      // Debug swipe events
      clientSplideInstance.current.on("drag", () => {
        console.log(`[${new Date().toISOString()}] [Splide:clients] Swipe started`);
        gsap.killTweensOf(clientSplideRef.current?.querySelectorAll(".splide__slide"));
      });

      clientSplideInstance.current.on("dragged", () => {
        console.log(`[${new Date().toISOString()}] [Splide:clients] Swipe ended, position: ${clientSplideInstance.current?.index}`);
      });

    }, 0);

    return () => {
      clearTimeout(timer);
      if (clientSplideInstance.current) {
        clientSplideInstance.current.destroy();
        clientSplideInstance.current = null;
      }
    };
  }, [clients, isMounted]);

  // Initialize PM Splide
  useEffect(() => {
    if (!isMounted || !pmSplideRef.current || users.length === 0) return;

    const timer = setTimeout(() => {
      if (pmSplideInstance.current) {
        pmSplideInstance.current.destroy();
        pmSplideInstance.current = null;
      }

      const perPage = Math.min(users.length, 6);
      pmSplideInstance.current = new Splide(pmSplideRef.current, {
        type: "loop",
        perPage,
        perMove: 1,
        gap: "1rem",
        autoWidth: false,
        focus: "center",
        autoplay: false,
        drag: true,
        dragMinThreshold: { mouse: 10, touch: 10 },
        arrows: false,
        pagination: false,
        breakpoints: {
          1024: { perPage: Math.min(users.length, 4), gap: "0.75rem" },
          767: { perPage: Math.min(users.length, 2), gap: "0.5rem" },
          480: { perPage: 1, gap: "0.5rem" },
        },
      }).mount();

      // Update navigation button states
      const updateNavButtons = () => {
        if (pmSplideInstance.current) {
          const { index, length } = pmSplideInstance.current;
          setPmCanPrev(index > 0);
          setPmCanNext(index < length - perPage);
        }
      };

      pmSplideInstance.current.on("moved", updateNavButtons);
      updateNavButtons();

      // Debug swipe events
      pmSplideInstance.current.on("drag", () => {
        console.log(`[${new Date().toISOString()}] [Splide:leaders] Swipe started`);
        gsap.killTweensOf(pmSplideRef.current?.querySelectorAll(".splide__slide"));
      });

      pmSplideInstance.current.on("dragged", () => {
        console.log(`[${new Date().toISOString()}] [Splide:leaders] Swipe ended, position: ${pmSplideInstance.current?.index}`);
      });

    }, 0);

    return () => {
      clearTimeout(timer);
      if (pmSplideInstance.current) {
        pmSplideInstance.current.destroy();
        pmSplideInstance.current = null;
      }
    };
  }, [users, isMounted]);

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

  const handleClientSelect = useCallback(
    (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      const currentClientId = form.watch("clientInfo.clientId");
      if (currentClientId === clientId) {
        form.setValue("clientInfo.clientId", "");
      } else {
        form.setValue("clientInfo.clientId", clientId);
        form.setValue("clientInfo.project", "");
      }
    },
    [form, animateClick],
  );

  const handleProjectSelect = useCallback(
    (project: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      const currentProject = form.watch("clientInfo.project");
      if (currentProject === project) {
        form.setValue("clientInfo.project", "");
      } else {
        form.setValue("clientInfo.project", project);
      }
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

  const handlePmSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      animateClick(e.currentTarget);
      const currentLeadedBy = form.getValues("teamInfo.LeadedBy");
      const isSelected = currentLeadedBy.includes(userId);
      const newLeadedBy = isSelected
        ? currentLeadedBy.filter((id) => id !== userId)
        : [...currentLeadedBy, userId];
      form.setValue("teamInfo.LeadedBy", newLeadedBy);
      form.setValue(
        "teamInfo.AssignedTo",
        form.getValues("teamInfo.AssignedTo").filter((id) => id !== userId),
      );
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
      }
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

  const handleClientPrev = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (clientSplideInstance.current) {
      clientSplideInstance.current.go("<");
      console.log(`[${new Date().toISOString()}] [Splide:clients] Navigated to previous slide`);
    }
  }, []);

  const handleClientNext = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (clientSplideInstance.current) {
      clientSplideInstance.current.go(">");
      console.log(`[${new Date().toISOString()}] [Splide:clients] Navigated to next slide`);
    }
  }, []);

  const handlePmPrev = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (pmSplideInstance.current) {
      pmSplideInstance.current.go("<");
      console.log(`[${new Date().toISOString()}] [Splide:leaders] Navigated to previous slide`);
    }
  }, []);

  const handlePmNext = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (pmSplideInstance.current) {
      pmSplideInstance.current.go(">");
      console.log(`[${new Date().toISOString()}] [Splide:leaders] Navigated to next slide`);
    }
  }, []);

  const filteredCollaborators = useMemo(() => {
    return users.filter(
      (u) =>
        !form.getValues("teamInfo.LeadedBy").includes(u.id) &&
        (u.fullName.toLowerCase().includes(searchCollaborator.toLowerCase()) ||
         u.role.toLowerCase().includes(searchCollaborator.toLowerCase())),
    );
  }, [users, searchCollaborator, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Usuario no autenticado.",
        variant: "error",
      });
      return;
    }

    if (values.basicInfo.startDate && values.basicInfo.endDate && values.basicInfo.startDate > values.basicInfo.endDate) {
      toast({
        title: "Error",
        description: "La fecha de inicio debe ser anterior a la fecha de finalización.",
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
        ...values.resources,
        ...values.advanced,
        budget: parseFloat(values.resources.budget.replace("$", "")) || 0,
        hours: parseInt(values.resources.hours) || 0,
        CreatedBy: user.id,
        createdAt: Timestamp.fromDate(new Date()),
        id: taskId,
      };
      await setDoc(taskDocRef, taskData);

      const recipients = new Set<string>([...values.teamInfo.LeadedBy, ...values.teamInfo.AssignedTo]);
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

      setShowSuccessAlert(true);
      form.reset(defaultValues);
      clearPersistedData();
      setIsSaving(false);
      setTimeout(() => {
        router.push("/dashboard/tasks");
      }, 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar la tarea.";
      console.error("Error saving task:", errorMessage);
      setShowFailAlert(true);
      setFailErrorMessage(errorMessage);
      setIsSaving(false);
    }
  };

  const validateStep = async (fields: (keyof FormValues | string)[]) => {
    const result = await form.trigger(fields as (keyof FormValues)[]);
    if (!result) {
      toast({
        title: "Error de Validación",
        description: "Por favor, revisa los campos y corrige los errores.",
        variant: "error",
      });
    }
    return result;
  };

  if (isLoading || !isAdminLoaded || !isMounted) {
    return (
      <div className={`${styles.container} ${styles.open}`}>
        <div className={styles.loaderOverlay}>
          <div className={styles.loader}></div>
        </div>
      </div>
    );
  }

  interface SlideCardProps {
    imageUrl: string;
    name: string;
    role?: string;
    isSelected: boolean;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  }

  const SlideCard: React.FC<SlideCardProps> = ({ imageUrl, name, role, isSelected, onClick }) => (
    <div
      className={`${styles.slideCard} ${isSelected ? styles.selected : ""}`}
      onClick={onClick}
      style={{ touchAction: "pan-y", pointerEvents: "auto" }}
    >
      <Image
        src={imageUrl}
        alt={name}
        width={36}
        height={36}
        className={role ? styles.userImage : styles.clientImage}
        priority
      />
      <div className={styles.clientName}>{name}</div>
      {role && <div className={styles.userRole}>{role}</div>}
    </div>
  );

  return (
    <>
      <div className={`${styles.container} ${isOpen ? styles.open : ""} ${isSaving ? styles.saving : ""}`} ref={containerRef}>

        {isOpen && (
          <div className={styles.content}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Wizard totalSteps={5}>
                <WizardProgress />
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
                      <div className={styles.splideWrapper} style={{ overflow: "visible", position: "relative" }}>
                        {clients.length > 1 && (
                          <>
                            <button
                              type="button"
                              className={styles.navButton}
                              onClick={handleClientPrev}
                              disabled={!clientCanPrev}
                              style={{
                                position: "absolute",
                                display:'none',
                                left: "-40px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                zIndex: 10,
                                opacity: clientCanPrev ? 1 : 0.5,
                              }}
                            >
                              Anterior
                            </button>
                            <button
                              type="button"
                              className={styles.navButton}
                              onClick={handleClientNext}
                              disabled={!clientCanNext}
                              style={{
                                position: "absolute",
                                right: "-40px",
                                display:'none',
                                top: "50%",
                                transform: "translateY(-50%)",
                                zIndex: 10,
                                opacity: clientCanNext ? 1 : 0.5,
                              }}
                            >
                              Siguiente
                            </button>
                          </>
                        )}
                        <div className={styles.slideshow} style={{ overflow: "visible" }}>
                          <section
                            ref={clientSplideRef}
                            style={{ visibility: clients.length ? "visible" : "hidden" }}
                            className="splide"
                            aria-label="Carrusel de Cuentas"
                          >
                            <div className="splide__track">
                              <ul className="splide__list">
                                {clients.map((client) => (
                                  <li key={client.id} className={`splide__slide ${styles.splideSlide}`}>
                                    <SlideCard
                                      imageUrl={client.imageUrl}
                                      name={client.name}
                                      isSelected={form.watch("clientInfo.clientId") === client.id}
                                      onClick={(e) => handleClientSelect(client.id, e)}
                                    />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </section>
                        </div>
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
                            <div
                              className={styles.dropdownItems}
                              style={{
                                top: projectDropdownPosition?.top,
                                left: projectDropdownPosition?.left,
                                position: "absolute",
                                zIndex: 150000,
                              }}
                              ref={projectDropdownPopperRef}
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
                                  <div
                                    key={`${project}-${index}`}
                                    className={styles.dropdownItem}
                                    onClick={(e) => handleProjectSelect(project, e)}
                                  >
                                    {project}
                                  </div>
                                ));
                              })()}
                            </div>,
                            document.body,
                          )}
                      </div>
                      {form.formState.errors.clientInfo?.project && (
                        <span className={styles.error}>{form.formState.errors.clientInfo.project.message}</span>
                      )}
                      {isAdmin &&
                        form.getValues("clientInfo.clientId") &&
                        clients.find((c) => c.id === form.getValues("clientInfo.clientId"))?.createdBy === user?.id && (
                          <button
                            type="button"
                            className={styles.addButton}
                            onClick={(e) => {
                              animateClick(e.currentTarget);
                              const client = clients.find((c) => c.id === form.getValues("clientInfo.clientId"));
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
                                  {["Por comenzar", "En Proceso", "Finalizado", "Backlog", "Cancelada"].map((status) => (
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
                      <div className={styles.splideWrapper} style={{ overflow: "visible", position: "relative" }}>
                        {users.length > 1 && (
                          <>
                            <button
                              type="button"
                              className={styles.navButton}
                              onClick={handlePmPrev}
                              disabled={!pmCanPrev}
                              style={{
                                position: "absolute",
                                left: "-40px",
                                display:'none',
                                top: "50%",
                                transform: "translateY(-50%)",
                                zIndex: 10,
                                opacity: pmCanPrev ? 1 : 0.5,
                              }}
                            >
                              Anterior
                            </button>
                            <button
                              type="button"
                              className={styles.navButton}
                              onClick={handlePmNext}
                              disabled={!pmCanNext}
                              style={{
                                position: "absolute",
                                right: "-40px",
                                display:'none',
                                top: "50%",
                                transform: "translateY(-50%)",
                                zIndex: 10,
                                opacity: pmCanNext ? 1 : 0.5,
                              }}
                            >
                              Siguiente
                            </button>
                          </>
                        )}
                        <div className={styles.slideshow} style={{ overflow: "visible" }}>
                          <section
                            ref={pmSplideRef}
                            style={{ visibility: users.length ? "visible" : "hidden" }}
                            className="splide"
                            aria-label="Carrusel de Líderes"
                          >
                            <div className="splide__track">
                              <ul className="splide__list">
                                {users.map((user) => (
                                  <li key={user.id} className={`splide__slide ${styles.splideSlide}`}>
                                    <SlideCard
                                      imageUrl={user.imageUrl}
                                      name={user.fullName}
                                      role={user.role}
                                      isSelected={form.watch("teamInfo.LeadedBy").includes(user.id)}
                                      onClick={(e) => handlePmSelect(user.id, e)}
                                    />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </section>
                        </div>
                      </div>
                      {form.formState.errors.teamInfo?.LeadedBy && (
                        <span className={styles.error}>{form.formState.errors.teamInfo.LeadedBy.message}</span>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Colaboradores*</label>
                      <div className={styles.sectionSubtitle}>
                        Agrega a los miembros del equipo que trabajarán en la tarea.
                      </div>
                      <input
                        className={styles.input}
                        value={searchCollaborator}
                        onChange={(e) => {
                          setSearchCollaborator(e.target.value);
                          setIsCollaboratorDropdownOpen(e.target.value.trim() !== "");
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
                              position: "absolute",
                              zIndex: 150000,
                              width: collaboratorInputRef.current?.offsetWidth,
                            }}
                            ref={collaboratorDropdownPopperRef}
                          >
                            {filteredCollaborators.length ? (
                              filteredCollaborators.map((u) => (
                                <div
                                  key={u.id}
                                  className={`${styles.dropdownItem} ${
                                    form.getValues("teamInfo.LeadedBy").includes(u.id) ? styles.disabled : ""
                                  }`}
                                  onClick={(e) => {
                                    if (!form.getValues("teamInfo.LeadedBy").includes(u.id)) {
                                      handleCollaboratorSelect(u.id, e);
                                    }
                                  }}
                                >
                                  {u.fullName} ({u.role}){" "}
                                  {form.watch("teamInfo.AssignedTo").includes(u.id) && "(Seleccionado)"}
                                </div>
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
                          </div>,
                          document.body,
                        )}
                      <div className={styles.tags}>
                        {form.watch("teamInfo.AssignedTo").map((userId) => {
                          const collaborator = users.find((u) => u.id === userId);
                          return collaborator ? (
                            <div key={userId} className={styles.tag}>
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
                              onInviteSidebarOpen();
                            }}
                          >
                            + Invitar Colaborador
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </WizardStep>
                <WizardStep step={3} validator={() => validateStep(stepFields[3] as (keyof FormValues)[])}>
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Gestión de Recursos</h2>
                    <div className={styles.resourceRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Presupuesto Asignado*</label>
                        <div className={styles.currencyInput}>
                          <span className={styles.currencySymbol}>$</span>
                          <Controller
                            name="resources.budget"
                            control={form.control}
                            render={({ field }) => (
                              <input
                                className={styles.input}
                                type="number"
                                placeholder="1000.00"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            )}
                          />
                        </div>
                        {form.formState.errors.resources?.budget && (
                          <span className={styles.error}>{form.formState.errors.resources.budget.message}</span>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Horas asignadas a esta tarea*</label>
                        <Controller
                          name="resources.hours"
                          control={form.control}
                          render={({ field }) => (
                            <input
                              className={styles.input}
                              type="number"
                              placeholder="120"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          )}
                        />
                        {form.formState.errors.resources?.hours && (
                          <span className={styles.error}>{form.formState.errors.resources.hours.message}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </WizardStep>
                <WizardStep step={4} validator={() => validateStep(stepFields[4] as (keyof FormValues)[])}>
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Configuración Avanzada</h2>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Metodología del Proyecto</label>
                      <Controller
                        name="advanced.methodology"
                        control={form.control}
                        render={({ field }) => (
                          <input
                            className={styles.input}
                            placeholder="Selecciona una metodología"
                            {...field}
                          />
                        )}
                      />
                      {form.formState.errors.advanced?.methodology && (
                        <span className={styles.error}>{form.formState.errors.advanced.methodology.message}</span>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Riesgos Potenciales</label>
                      <Controller
                        name="advanced.risks"
                        control={form.control}
                        render={({ field }) => (
                          <input
                            className={styles.input}
                            placeholder="Ej: Retrasos en entregas, Falta de recursos"
                            {...field}
                          />
                        )}
                      />
                      {form.formState.errors.advanced?.risks && (
                        <span className={styles.error}>{form.formState.errors.advanced.risks.message}</span>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Estrategias de Mitigación</label>
                      <Controller
                        name="advanced.mitigation"
                        control={form.control}
                        render={({ field }) => (
                          <input
                            className={styles.input}
                            placeholder="Ej: Contratar freelancers como respaldo"
                            {...field}
                          />
                        )}
                      />
                      {form.formState.errors.advanced?.mitigation && (
                        <span className={styles.error}>{form.formState.errors.advanced.mitigation.message}</span>
                      )}
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Interesados</label>
                      <Controller
                        name="advanced.stakeholders"
                        control={form.control}
                        render={({ field }) => (
                          <input
                            className={styles.input}
                            placeholder="Ej: Cliente, equipo interno"
                            {...field}
                          />
                        )}
                      />
                      {form.formState.errors.advanced?.stakeholders && (
                        <span className={styles.error}>{form.formState.errors.advanced.stakeholders.message}</span>
                      )}
                    </div>
                  </div>
                </WizardStep>
                <WizardActions onComplete={() => form.handleSubmit(onSubmit)()} />
              </Wizard>
            </form>
          </div>
        )}
        {isSaving && (
          <div className={styles.loaderOverlay}>
            <div className={styles.loader}></div>
          </div>
        )}
      </div>
      {showSuccessAlert && (
        <SuccessAlert
          message={`La tarea "${form.getValues("basicInfo.name")}" se ha creado exitosamente.`}
          onClose={() => setShowSuccessAlert(false)}
          actionLabel="Ver Tareas"
          onAction={() => router.push("/dashboard/tasks")}
        />
      )}
      {showFailAlert && (
        <FailAlert
          message="No se pudo crear la tarea."
          error={failErrorMessage}
          onClose={() => setShowFailAlert(false)}
        />
      )}
    </>
  );
};

export default CreateTask;
