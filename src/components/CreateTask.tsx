"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { doc, collection, setDoc, addDoc, onSnapshot, getDoc } from "firebase/firestore";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Splide from "@splidejs/splide";
import "@splidejs/splide/css/core";
import { db } from "@/lib/firebase";
import styles from "@/components/CreateTask.module.scss";
import { Timestamp } from "firebase/firestore";
import SuccessAlert from "./SuccessAlert";
import FailAlert from "./FailAlert";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wizard, WizardStep, WizardProgress, WizardButtons } from "@/components/ui/wizard";
import { toast } from "@/components/ui/use-toast";
import { useFormPersistence } from "@/components/ui/use-form-persistence";
import Calendar from "@/components/ui/Calendar";

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

const formSchema = z.object({
  clientInfo: z.object({
    clientId: z.string().min(1, { message: "Selecciona una cuenta" }),
    project: z.string().min(1, { message: "Selecciona un proyecto" }),
  }),
  basicInfo: z.object({
    name: z.string().min(1, { message: "El nombre es obligatorio" }),
    description: z.string().min(1, { message: "La descripción es obligatoria" }),
    objectives: z.string().optional(),
    startDate: z.date({ required_error: "La fecha de inicio es obligatoria" }),
    endDate: z.date({ required_error: "La fecha de finalización es obligatoria" }),
    status: z.enum(["Por comenzar", "En Proceso", "Finalizado", "Backlog", "Cancelada"], {
      required_error: "Selecciona un estado",
    }),
    priority: z.enum(["Baja", "Media", "Alta"], { required_error: "Selecciona una prioridad" }),
  }),
  teamInfo: z.object({
    LeadedBy: z.array(z.string()).min(1, { message: "Selecciona al menos un encargado" }),
    AssignedTo: z.array(z.string()).min(1, { message: "Selecciona al menos un colaborador" }),
  }),
  resources: z.object({
    budget: z.string().optional(),
    hours: z.string().optional(),
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
    startDate: null as any,
    endDate: null as any,
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

const stepFields: string[][] = [
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
  onToggle: () => void;
  onHasUnsavedChanges: (hasChanges: boolean) => void;
  onCreateClientOpen: () => void;
  onEditClientOpen: (client: Client) => void;
  onInviteSidebarOpen: () => void;
  onClientAlertChange?: (alert: { type: "success" | "fail"; message?: string; error?: string } | null) => void;
}

const CreateTask: React.FC<CreateTaskProps> = ({
  isOpen,
  onToggle,
  onHasUnsavedChanges,
  onCreateClientOpen,
  onEditClientOpen,
  onInviteSidebarOpen,
  onClientAlertChange,
}) => {
  console.log("[CreateTask] Component mounted", { isOpen, isAdminLoaded: false, isLoading: true });

  const { user } = useUser();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const [isCollaboratorDropdownOpen, setIsCollaboratorDropdownOpen] = useState(false);
  const [projectDropdownPosition, setProjectDropdownPosition] = useState<{ top: number; left: number; width?: number } | null>(null);
  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [collaboratorDropdownPosition, setCollaboratorDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [startDatePosition, setStartDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [endDatePosition, setEndDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [searchCollaborator, setSearchCollaborator] = useState("");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showFailAlert, setShowFailAlert] = useState(false);
  const [failErrorMessage, setFailErrorMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoaded, setIsAdminLoaded] = useState(false);
  const [clientCreators, setClientCreators] = useState<{ [clientId: string]: string }>({});
  const [currentStep, setCurrentStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
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
  const clientSplideRef = useRef<HTMLDivElement>(null);
  const pmSplideRef = useRef<HTMLDivElement>(null);
  const clientSplideInstance = useRef<Splide | null>(null);
  const pmSplideInstance = useRef<Splide | null>(null);
  const wizardStepRef = useRef<HTMLDivElement>(null);

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

  // Log initial state
  useEffect(() => {
    console.log("[CreateTask] Initial state", {
      isOpen,
      isLoading,
      isAdminLoaded,
      currentStep,
      clientsCount: clients.length,
      usersCount: users.length,
      formValues: form.getValues(),
    });
  }, [isOpen, isLoading, isAdminLoaded, currentStep, clients, users, form]);

  // Fetch admin status
  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (!user?.id) {
        console.log("[CreateTask] No user ID, setting isAdmin to false");
        setIsAdmin(false);
        setIsAdminLoaded(true);
        return;
      }
      try {
        console.log("[CreateTask] Fetching admin status for user:", user.id);
        const userDoc = await getDoc(doc(db, "users", user.id));
        if (userDoc.exists()) {
          const access = userDoc.data().access;
          setIsAdmin(access === "admin");
          console.log("[CreateTask] Admin status fetched", { userId: user.id, access, isAdmin: access === "admin" });
        } else {
          setIsAdmin(false);
          console.warn("[CreateTask] User document not found for ID:", user.id);
        }
      } catch (error) {
        console.error("[CreateTask] Error fetching admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsAdminLoaded(true);
        console.log("[CreateTask] Admin status loaded", { isAdmin, isAdminLoaded: true });
      }
    };
    fetchAdminStatus();
  }, [user?.id]);

  // Fetch client creators' names
  useEffect(() => {
    const fetchCreators = async () => {
      const creatorMap: { [clientId: string]: string } = {};
      for (const client of clients) {
        if (client.createdBy) {
          try {
            const userDoc = await getDoc(doc(db, "users", client.createdBy));
            if (userDoc.exists()) {
              creatorMap[client.id] = userDoc.data().fullName || "Usuario desconocido";
            } else {
              creatorMap[client.id] = "Usuario desconocido";
            }
          } catch (error) {
            console.error("[CreateTask] Error fetching creator name for client:", client.id, error);
            creatorMap[client.id] = "Usuario desconocido";
          }
        }
      }
      setClientCreators(creatorMap);
      console.log("[CreateTask] Client creators fetched", creatorMap);
    };
    if (clients.length > 0) {
      fetchCreators();
    }
  }, [clients]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      saveFormData();
      const isChanged = Object.keys(value).some((key) => {
        const current = value[key as keyof typeof value];
        const initial = defaultValues[key as keyof typeof defaultValues];
        if (Array.isArray(current)) {
          return current.join() !== (initial as any)?.join();
        }
        return current !== initial;
      });
      onHasUnsavedChanges(isChanged);
      console.log("[CreateTask] Form values changed", { values: value, isChanged });
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
      console.log("[CreateTask] Reset form due to isOpen=false");
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
        console.log("[CreateTask] Clients updated", { clientsCount: clientsData.length });
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
        console.log("[CreateTask] Users fetched", { usersCount: usersData.length });
      } catch (error) {
        console.error("[CreateTask] Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (onClientAlertChange) {
      const handleAlert = (alert: { type: "success" | "fail"; message?: string; error?: string } | null) => {
        if (alert) {
          if (alert.type === "success") {
            setShowSuccessAlert(true);
          } else if (alert.type === "fail") {
            setShowFailAlert(true);
            setFailErrorMessage(alert.error || "Unknown error");
          }
        } else {
          setShowSuccessAlert(false);
          setShowFailAlert(false);
          setFailErrorMessage("");
        }
        console.log("[CreateTask] Alert changed", { alert });
      };
      onClientAlertChange = handleAlert;
    }
  }, [onClientAlertChange]);

  useEffect(() => {
    if (containerRef.current) {
      if (isOpen) {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, height: 0 },
          { opacity: 1, height: "auto", duration: 0.3, ease: "power2.out" },
        );
        console.log("[CreateTask] Container animation started");
      } else {
        gsap.to(containerRef.current, {
          opacity: 0,
          height: 0,
          duration: 0.3,
          ease: "power2.in"
        });
        console.log("[CreateTask] Container animation closed");
      }
    }
  }, [isOpen]);

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
        console.log("[CreateTask] Closed dropdowns due to scroll");
      }
    }, 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [
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
        console.log("[CreateTask] Closed project dropdown due to outside click");
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node) &&
        statusDropdownPopperRef.current &&
        !statusDropdownPopperRef.current.contains(event.target as Node) &&
        isStatusDropdownOpen
      ) {
        setIsStatusDropdownOpen(false);
        console.log("[CreateTask] Closed status dropdown due to outside click");
      }
      if (
        priorityDropdownRef.current &&
        !priorityDropdownRef.current.contains(event.target as Node) &&
        priorityDropdownPopperRef.current &&
        !priorityDropdownPopperRef.current.contains(event.target as Node) &&
        isPriorityDropdownOpen
      ) {
        setIsPriorityDropdownOpen(false);
        console.log("[CreateTask] Closed priority dropdown due to outside click");
      }
      if (
        startDatePopperRef.current &&
        !startDatePopperRef.current.contains(event.target as Node) &&
        isStartDateOpen &&
        !startDateInputRef.current?.contains(event.target as Node)
      ) {
        setIsStartDateOpen(false);
        console.log("[CreateTask] Closed start date calendar due to outside click");
      }
      if (
        endDatePopperRef.current &&
        !endDatePopperRef.current.contains(event.target as Node) &&
        isEndDateOpen &&
        !endDateInputRef.current?.contains(event.target as Node)
      ) {
        setIsEndDateOpen(false);
        console.log("[CreateTask] Closed end date calendar due to outside click");
      }
      if (
        collaboratorInputRef.current &&
        !collaboratorInputRef.current.contains(event.target as Node) &&
        collaboratorDropdownPopperRef.current &&
        !collaboratorDropdownPopperRef.current.contains(event.target as Node) &&
        isCollaboratorDropdownOpen
      ) {
        setIsCollaboratorDropdownOpen(false);
        console.log("[CreateTask] Closed collaborator dropdown due to outside click");
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

  useEffect(() => {
    if (isStartDateOpen && startDateInputRef.current) {
      const rect = startDateInputRef.current.getBoundingClientRect();
      setStartDatePosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      console.log("[CreateTask] Start date position updated", { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    if (isEndDateOpen && endDateInputRef.current) {
      const rect = endDateInputRef.current.getBoundingClientRect();
      setEndDatePosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      console.log("[CreateTask] End date position updated", { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    if (isProjectDropdownOpen && projectDropdownRef.current) {
      const rect = projectDropdownRef.current.getBoundingClientRect();
      setProjectDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
      console.log("[CreateTask] Project dropdown position updated", { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }
    if (isStatusDropdownOpen && statusDropdownRef.current) {
      const rect = statusDropdownRef.current.getBoundingClientRect();
      setStatusDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      console.log("[CreateTask] Status dropdown position updated", { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    if (isPriorityDropdownOpen && priorityDropdownRef.current) {
      const rect = priorityDropdownRef.current.getBoundingClientRect();
      setPriorityDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      console.log("[CreateTask] Priority dropdown position updated", { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
    if (isCollaboratorDropdownOpen && collaboratorInputRef.current) {
      const rect = collaboratorInputRef.current.getBoundingClientRect();
      setCollaboratorDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      console.log("[CreateTask] Collaborator dropdown position updated", { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    }
  }, [
    isStartDateOpen,
    isEndDateOpen,
    isProjectDropdownOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
    isCollaboratorDropdownOpen,
  ]);

  useEffect(() => {
    if (isProjectDropdownOpen && projectDropdownPopperRef.current) {
      gsap.fromTo(
        projectDropdownPopperRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
      );
      console.log("[CreateTask] Project dropdown animation triggered");
    }
    if (isStatusDropdownOpen && statusDropdownPopperRef.current) {
      gsap.fromTo(
        statusDropdownPopperRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
      );
      console.log("[CreateTask] Status dropdown animation triggered");
    }
    if (isPriorityDropdownOpen && priorityDropdownPopperRef.current) {
      gsap.fromTo(
        priorityDropdownPopperRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
      );
      console.log("[CreateTask] Priority dropdown animation triggered");
    }
    if (isCollaboratorDropdownOpen && collaboratorDropdownPopperRef.current) {
      gsap.fromTo(
        collaboratorDropdownPopperRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
      );
      console.log("[CreateTask] Collaborator dropdown animation triggered");
    }
  }, [isProjectDropdownOpen, isStatusDropdownOpen, isPriorityDropdownOpen, isCollaboratorDropdownOpen]);

  // Initialize Client Splide
  useEffect(() => {
    if (clientSplideRef.current && clients.length > 0) {
      clientSplideInstance.current = new Splide(clientSplideRef.current, {
        type: "loop",
        perPage: 6,
        perMove: 1,
        gap: "1.25rem",
        autoWidth: true,
        focus: "center",
        arrows: false,
        pagination: false,
        mediaQuery: "min",
        breakpoints: {
          480: { perPage: 1, gap: "0.5rem" },
          767: { perPage: 2, gap: "0.75rem" },
          1024: { perPage: 4, gap: "1rem" },
        },
      }).mount();
      console.log("[CreateTask] Client Splide initialized", { clientsCount: clients.length });
      return () => {
        if (clientSplideInstance.current) {
          clientSplideInstance.current.destroy();
          console.log("[CreateTask] Client Splide destroyed");
        }
      };
    }
  }, [clients]);

  // Initialize PM Splide
  useEffect(() => {
    if (pmSplideRef.current && users.length > 0) {
      pmSplideInstance.current = new Splide(pmSplideRef.current, {
        type: "loop",
        perPage: 6,
        perMove: 1,
        gap: "1.25rem",
        autoWidth: true,
        focus: "center",
        arrows: false,
        pagination: false,
        mediaQuery: "min",
        breakpoints: {
          480: { perPage: 1, gap: "0.5rem" },
          767: { perPage: 2, gap: "0.75rem" },
          1024: { perPage: 4, gap: "1rem" },
        },
      }).mount();
      console.log("[CreateTask] PM Splide initialized", { usersCount: users.length });
      return () => {
        if (pmSplideInstance.current) {
          pmSplideInstance.current.destroy();
          console.log("[CreateTask] PM Splide destroyed");
        }
      };
    }
  }, [users]);

  // Wizard step animation
  useEffect(() => {
    if (wizardStepRef.current) {
      gsap.fromTo(
        wizardStepRef.current,
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" },
      );
      console.log("[CreateTask] Wizard step animation triggered", { currentStep });
    }
  }, [currentStep]);

  const animateClick = (element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.98,
      opacity: 0.9,
      duration: 0.15,
      ease: "power1.out",
      yoyo: true,
      repeat: 1,
    });
    console.log("[CreateTask] Click animation triggered");
  };

  const handleClientSelect = useCallback(
    (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      form.setValue("clientInfo.clientId", clientId);
      form.setValue("clientInfo.project", "");
      console.log("[CreateTask] Client selected", { clientId });
    },
    [form],
  );

  const handleProjectSelect = useCallback(
    (project: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      form.setValue("clientInfo.project", project);
      setIsProjectDropdownOpen(false);
      console.log("[CreateTask] Project selected", { project });
    },
    [form],
  );

  const handleStatusSelect = useCallback(
    (status: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      form.setValue("basicInfo.status", status as FormValues["basicInfo"]["status"]);
      setIsStatusDropdownOpen(false);
      console.log("[CreateTask] Status selected", { status });
    },
    [form],
  );

  const handlePrioritySelect = useCallback(
    (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      form.setValue("basicInfo.priority", priority as FormValues["basicInfo"]["priority"]);
      setIsPriorityDropdownOpen(false);
      console.log("[CreateTask] Priority selected", { priority });
    },
    [form],
  );

  const handlePmSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
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
      console.log("[CreateTask] PM selected", { userId, newLeadedBy });
    },
    [form],
  );

  const handleCollaboratorSelect = useCallback(
    (userId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      if (!form.getValues("teamInfo.LeadedBy").includes(userId)) {
        const currentAssignedTo = form.getValues("teamInfo.AssignedTo");
        form.setValue(
          "teamInfo.AssignedTo",
          currentAssignedTo.includes(userId)
            ? currentAssignedTo.filter((id) => id !== userId)
            : [...currentAssignedTo, userId],
        );
        setSearchCollaborator("");
        console.log("[CreateTask] Collaborator selected", { userId });
      }
    },
    [form],
  );

  const handleCollaboratorRemove = useCallback(
    (userId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      animateClick(e.currentTarget);
      form.setValue(
        "teamInfo.AssignedTo",
        form.getValues("teamInfo.AssignedTo").filter((id) => id !== userId),
      );
      console.log("[CreateTask] Collaborator removed", { userId });
    },
    [form],
  );

  const filteredCollaborators = useMemo(() => {
    const filtered = users.filter(
      (u) =>
        !form.getValues("teamInfo.LeadedBy").includes(u.id) &&
        (u.fullName.toLowerCase().includes(searchCollaborator.toLowerCase()) ||
         u.role.toLowerCase().includes(searchCollaborator.toLowerCase())),
    );
    console.log("[CreateTask] Filtered collaborators", { count: filtered.length, searchCollaborator });
    return filtered;
  }, [users, searchCollaborator, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Usuario no autenticado.",
        variant: "error",
      });
      console.log("[CreateTask] Submit failed: No user");
      return;
    }

    if (values.basicInfo.startDate > values.basicInfo.endDate) {
      toast({
        title: "Error",
        description: "La fecha de inicio debe ser anterior a la fecha de finalización.",
        variant: "error",
      });
      console.log("[CreateTask] Submit failed: Invalid date range");
      return;
    }

    setIsSaving(true);
    console.log("[CreateTask] Submitting form", { values });
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
      console.log("[CreateTask] Form submitted successfully", { taskId });
      setTimeout(() => {
        router.push("/dashboard/tasks");
      }, 3000);
    } catch (error: any) {
      console.error("[CreateTask] Error saving task:", error);
      setShowFailAlert(true);
      setFailErrorMessage(error.message || "Error al guardar la tarea.");
      setIsSaving(false);
    }
  };

  const validateStep = async (fields: string[]) => {
    const result = await form.trigger(fields as any);
    if (!result) {
      toast({
        title: "Error de Validación",
        description: "Por favor, revisa los campos y corrige los errores.",
        variant: "error",
      });
      console.log("[CreateTask] Step validation failed", { fields });
    }
    console.log("[CreateTask] Step validation result", { fields, result });
    return result;
  };

  // Wrapper for WizardStep to track rendering
  const TrackedWizardStep: React.FC<{
    step: number;
    validator: () => Promise<boolean>;
    children: React.ReactNode;
  }> = ({ step, validator, children }) => {
    useEffect(() => {
      if (currentStep === step) {
        console.log("[CreateTask] Rendering WizardStep", { step });
        setCurrentStep(step);
      }
    }, [step]);

    return (
      <WizardStep step={step} validator={validator}>
        {children}
      </WizardStep>
    );
  };

  if (isLoading || !isAdminLoaded) {
    console.log("[CreateTask] Rendering loading state", { isLoading, isAdminLoaded });
    return (
      <div className={`${styles.container} ${styles.open}`}>
        <div className={styles.loaderOverlay}>
          <div className={styles.loader}></div>
        </div>
      </div>
    );
  }

  console.log("[CreateTask] Rendering main content", { isOpen, currentStep });

  return (
    <>
      <div className={`${styles.container} ${isOpen ? styles.open : ""} ${isSaving ? styles.saving : ""}`} ref={containerRef}>
        {isOpen && (
          <div className={styles.content}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Wizard totalSteps={5}>
                <WizardProgress />
                <div ref={wizardStepRef}>
                  <TrackedWizardStep step={0} validator={() => validateStep(stepFields[0])}>
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
                              console.log("[CreateTask] Cleared persisted data");
                            }}
                          >
                            Borrar progreso
                          </button>
                        </div>
                      )}
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Cuenta Asignada</label>
                        <div className={styles.sectionSubtitle}>
                          Selecciona la cuenta a la que se asignará esta tarea.
                        </div>
                        <div className={styles.slideshow}>
                          <section
                            ref={clientSplideRef}
                            className="splide"
                            aria-label="Carrusel de Cuentas"
                          >
                            <div className="splide__track">
                              <ul className="splide__list">
                                {clients.map((client) => (
                                  <li key={client.id} className={`splide__slide ${styles.splideSlide}`}>
                                    <div
                                      className={`${styles.slideCard} ${form.watch("clientInfo.clientId") === client.id ? styles.selected : ""}`}
                                      onClick={(e) => handleClientSelect(client.id, e)}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handleClientSelect(client.id, e as any);
                                        }
                                      }}
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
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </section>
                        </div>
                        {form.formState.errors.clientInfo?.clientId && (
                          <span className={styles.error}>{form.formState.errors.clientInfo.clientId.message}</span>
                        )}
                        {isAdmin && (
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
                                console.log("[CreateTask] Add account button clicked");
                              }}
                            >
                              + Agregar Cuenta
                            </button>
                          </div>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Proyecto</label>
                        <div className={styles.sectionSubtitle}>Selecciona la carpeta del proyecto.</div>
                        <div className={styles.dropdownContainer} ref={projectDropdownRef}>
                          <div
                            className={styles.dropdownTrigger}
                            onClick={(e) => {
                              animateClick(e.currentTarget);
                              setIsProjectDropdownOpen(!isProjectDropdownOpen);
                              console.log("[CreateTask] Project dropdown toggled", { isProjectDropdownOpen: !isProjectDropdownOpen });
                            }}
                          >
                            <span>{form.watch("clientInfo.project") || "Seleccionar un Proyecto"}</span>
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
                                  width: projectDropdownPosition?.width,
                                }}
                                ref={projectDropdownPopperRef}
                              >
                                {(() => {
                                  const selectedClient = clients.find(
                                    (c) => c.id === form.getValues("clientInfo.clientId"),
                                  );
                                  const projects = selectedClient?.projects || [];
                                  console.log("[CreateTask] Project dropdown rendering", { clientId: selectedClient?.id, projectsCount: projects.length });
                                  if (projects.length === 0) {
                                    return (
                                      <div className={styles.emptyState}>
                                        <span>Parece que aún no hay proyectos disponibles.</span>
                                        {isAdmin ? (
                                          <span>
                                            Puedes crear uno desde el botón{" "}
                                            <strong>"Agregar Proyecto"</strong>.
                                          </span>
                                        ) : (
                                          <span>
                                            Pide a{" "}
                                            <strong>
                                              {clientCreators[selectedClient?.id || ""] || "un administrador"}
                                            </strong>{" "}
                                            que cree una carpeta.
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                  return projects.map((project, index) => (
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
                          clients.find((c) => c.id === form.getValues("clientInfo.clientId"))?.createdBy ===
                            user?.id && (
                            <button
                              type="button"
                              className={styles.addButton}
                              onClick={(e) => {
                                animateClick(e.currentTarget);
                                const client = clients.find((c) => c.id === form.getValues("clientInfo.clientId"));
                                if (client) {
                                  onEditClientOpen(client);
                                  console.log("[CreateTask] New folder button clicked", { clientId: client.id });
                                }
                              }}
                            >
                              + Nueva Carpeta
                            </button>
                          )}
                      </div>
                    </div>
                  </TrackedWizardStep>
                  <TrackedWizardStep step={1} validator={() => validateStep(stepFields[1])}>
                    <div className={styles.section}>
                      <h2 className={styles.sectionTitle}>Información Básica del Proyecto</h2>
                      <div className={styles.level1Grid}>
                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Nombre de la tarea</label>
                            <Controller
                              name="basicInfo.name"
                              control={form.control}
                              render={({ field }) => (
                                <input
                                  className={styles.input}
                                  placeholder="Ej: Crear wireframe"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    console.log("[CreateTask] Task name changed", { value: e.target.value });
                                  }}
                                />
                              )}
                            />
                            {form.formState.errors.basicInfo?.name && (
                              <span className={styles.error}>{form.formState.errors.basicInfo.name.message}</span>
                            )}
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Descripción</label>
                            <Controller
                              name="basicInfo.description"
                              control={form.control}
                              render={({ field }) => (
                                <input
                                  className={styles.input}
                                  placeholder="Ej: Diseñar wireframes para la nueva app móvil"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    console.log("[CreateTask] Description changed", { value: e.target.value });
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
                                  onChange={(e) => {
                                    field.onChange(e);
                                    console.log("[CreateTask] Objectives changed", { value: e.target.value });
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
                              <label className={styles.label}>Fecha de Inicio</label>
                              <Controller
                                name="basicInfo.startDate"
                                control={form.control}
                                render={({ field }) => (
                                  <input
                                    className={styles.input}
                                    value={field.value ? (field.value as Date).toLocaleDateString("es-ES") : ""}
                                    onClick={() => {
                                      setIsStartDateOpen(true);
                                      console.log("[CreateTask] Start date input clicked");
                                    }}
                                    placeholder="Selecciona una fecha"
                                    readOnly
                                    ref={startDateInputRef}
                                  />
                                )}
                              />
                              {isStartDateOpen &&
                                createPortal(
                                  <div
                                    className={styles.datePickerPopper}
                                    style={{
                                      top: startDatePosition?.top,
                                      left: startDatePosition?.left,
                                      position: "absolute",
                                      zIndex: 130000,
                                    }}
                                    ref={startDatePopperRef}
                                  >
                                    <Calendar
                                      defaultDate={form.watch("basicInfo.startDate") || new Date()}
                                      selectionMode="single"
                                      onDateSelect={(date: Date) => {
                                        form.setValue("basicInfo.startDate", date);
                                        setIsStartDateOpen(false);
                                        console.log("[CreateTask] Start date selected", { date });
                                      }}
                                      className={styles.customCalendar}
                                    />
                                  </div>,
                                  document.body,
                                )}
                              {form.formState.errors.basicInfo?.startDate && (
                                <span className={styles.error}>{form.formState.errors.basicInfo.startDate.message}</span>
                              )}
                            </div>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Fecha de Finalización</label>
                              <Controller
                                name="basicInfo.endDate"
                                control={form.control}
                                render={({ field }) => (
                                  <input
                                    className={styles.input}
                                    value={field.value ? (field.value as Date).toLocaleDateString("es-ES") : ""}
                                    onClick={() => {
                                      setIsEndDateOpen(true);
                                      console.log("[CreateTask] End date input clicked");
                                    }}
                                    placeholder="Selecciona una fecha"
                                    readOnly
                                    ref={endDateInputRef}
                                  />
                                )}
                              />
                              {isEndDateOpen &&
                                createPortal(
                                  <div
                                    className={styles.datePickerPopper}
                                    style={{
                                      top: endDatePosition?.top,
                                      left: endDatePosition?.left,
                                      position: "absolute",
                                      zIndex: 130000,
                                    }}
                                    ref={endDatePopperRef}
                                  >
                                    <Calendar
                                      defaultDate={form.watch("basicInfo.endDate") || new Date()}
                                      selectionMode="single"
                                      onDateSelect={(date: Date) => {
                                        form.setValue("basicInfo.endDate", date);
                                        setIsEndDateOpen(false);
                                        console.log("[CreateTask] End date selected", { date });
                                      }}
                                      className={styles.customCalendar}
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
                            <label className={styles.label}>Estado Inicial</label>
                            <div className={styles.dropdownContainer} ref={statusDropdownRef}>
                              <div
                                className={styles.dropdownTrigger}
                                onClick={(e) => {
                                  animateClick(e.currentTarget);
                                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                                  console.log("[CreateTask] Status dropdown toggled", { isStatusDropdownOpen: !isStatusDropdownOpen });
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
                            <label className={styles.label}>Prioridad</label>
                            <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                              <div
                                className={styles.dropdownTrigger}
                                onClick={(e) => {
                                  animateClick(e.currentTarget);
                                  setIsPriorityDropdownOpen(!isPriorityDropdownOpen);
                                  console.log("[CreateTask] Priority dropdown toggled", { isPriorityDropdownOpen: !isPriorityDropdownOpen });
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
                  </TrackedWizardStep>
                  <TrackedWizardStep step={2} validator={() => validateStep(stepFields[2])}>
                    <div className={styles.section}>
                      <h2 className={styles.sectionTitle}>Información del Equipo</h2>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Persona Encargada</label>
                        <div className={styles.sectionSubtitle}>
                          Selecciona la persona principal responsable de la tarea.
                        </div>
                        <div className={styles.slideshow}>
                          <section
                            ref={pmSplideRef}
                            className="splide"
                            aria-label="Carrusel de Encargados"
                          >
                            <div className="splide__track">
                              <ul className="splide__list">
                                {users.map((user) => (
                                  <li key={user.id} className={`splide__slide ${styles.splideSlide}`}>
                                    <div
                                      className={`${styles.slideCard} ${form.watch("teamInfo.LeadedBy").includes(user.id) ? styles.selected : ""}`}
                                      onClick={(e) => handlePmSelect(user.id, e)}
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handlePmSelect(user.id, e as any);
                                        }
                                      }}
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
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </section>
                        </div>
                        {form.formState.errors.teamInfo?.LeadedBy && (
                          <span className={styles.error}>{form.formState.errors.teamInfo.LeadedBy.message}</span>
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Colaboradores</label>
                        <div className={styles.sectionSubtitle}>
                          Agrega a los miembros del equipo que trabajarán en la tarea.
                        </div>
                        <input
                          className={styles.input}
                          value={searchCollaborator}
                          onChange={(e) => {
                            setSearchCollaborator(e.target.value);
                            setIsCollaboratorDropdownOpen(e.target.value.trim() !== "");
                            console.log("[CreateTask] Collaborator search changed", { value: e.target.value });
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setIsCollaboratorDropdownOpen(false);
                              console.log("[CreateTask] Collaborator dropdown closed on blur");
                            }, 200);
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
                                    className={`${styles.dropdownItem} ${form.getValues("teamInfo.LeadedBy").includes(u.id) ? styles.disabled : ""}`}
                                    onClick={(e) => {
                                      if (!form.getValues("teamInfo.LeadedBy").includes(u.id)) {
                                        handleCollaboratorSelect(u.id, e);
                                      }
                                    }}
                                  >
                                    {u.fullName} ({u.role}) {form.watch("teamInfo.AssignedTo").includes(u.id) && "(Seleccionado)"}
                                  </div>
                                ))
                              ) : (
                                <div className={styles.dropdownItem}>No hay coincidencias</div>
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
                                <button
                                  onClick={(e) => handleCollaboratorRemove(userId, e)}
                                >
                                  X
                                </button>
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
                              ¿No encuentras algún colaborador? <strong>Agrega una nueva.</strong>
                            </div>
                            <button
                              type="button"
                              className={styles.addButton}
                              onClick={(e) => {
                                animateClick(e.currentTarget);
                                onInviteSidebarOpen();
                                console.log("[CreateTask] Invite collaborator button clicked");
                              }}
                            >
                              + Invitar Colaborador
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TrackedWizardStep>
                  <TrackedWizardStep step={3} validator={() => validateStep(stepFields[3])}>
                    <div className={styles.section}>
                      <h2 className={styles.sectionTitle}>Gestión de Recursos</h2>
                      <div className={styles.resourceRow}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Presupuesto Asignado</label>
                          <div className={styles.currencyInput}>
                            <span className={styles.currencySymbol}>$</span>
                            <Controller
                              name="resources.budget"
                              control={form.control}
                              render={({ field }) => (
                                <input
                                  className={styles.input}
                                  placeholder="1000.00"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    console.log("[CreateTask] Budget changed", { value: e.target.value });
                                  }}
                                />
                              )}
                            />
                          </div>
                          {form.formState.errors.resources?.budget && (
                            <span className={styles.error}>{form.formState.errors.resources.budget.message}</span>
                          )}
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Horas Asignadas</label>
                          <Controller
                            name="resources.hours"
                            control={form.control}
                            render={({ field }) => (
                              <input
                                className={styles.input}
                                placeholder="120"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  console.log("[CreateTask] Hours changed", { value: e.target.value });
                                }}
                              />
                            )}
                          />
                          {form.formState.errors.resources?.hours && (
                            <span className={styles.error}>{form.formState.errors.resources.hours.message}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TrackedWizardStep>
                  <TrackedWizardStep step={4} validator={() => validateStep(stepFields[4])}>
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
                              onChange={(e) => {
                                field.onChange(e);
                                console.log("[CreateTask] Methodology changed", { value: e.target.value });
                              }}
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
                              onChange={(e) => {
                                field.onChange(e);
                                console.log("[CreateTask] Risks changed", { value: e.target.value });
                              }}
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
                              onChange={(e) => {
                                field.onChange(e);
                                console.log("[CreateTask] Mitigation changed", { value: e.target.value });
                              }}
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
                              onChange={(e) => {
                                field.onChange(e);
                                console.log("[CreateTask] Stakeholders changed", { value: e.target.value });
                              }}
                            />
                          )}
                        />
                        {form.formState.errors.advanced?.stakeholders && (
                          <span className={styles.error}>{form.formState.errors.advanced.stakeholders.message}</span>
                        )}
                      </div>
                    </div>
                  </TrackedWizardStep>
                </div>
                <WizardButtons onComplete={() => form.handleSubmit(onSubmit)()} />
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
          onClose={() => {
            setShowSuccessAlert(false);
            console.log("[CreateTask] Success alert closed");
          }}
          actionLabel="Ver Tareas"
          onAction={() => {
            router.push("/dashboard/tasks");
            console.log("[CreateTask] Success alert action: Navigating to tasks");
          }}
        />
      )}
      {showFailAlert && (
        <FailAlert
          message="No se pudo crear la tarea."
          error={failErrorMessage}
          onClose={() => {
            setShowFailAlert(false);
            console.log("[CreateTask] Fail alert closed");
          }}
        />
      )}
    </>
  );
};

export default CreateTask;