'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { doc, collection, setDoc, addDoc, onSnapshot } from "firebase/firestore";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import "react-day-picker/style.css";
import styles from "@/components/CreateTask.module.scss";
import { Timestamp } from "firebase/firestore";
import { Wizard, WizardStep, WizardProgress, WizardActions } from "@/components/ui/wizard";
import { toast } from "@/components/ui/use-toast";
import { useFormPersistence } from "@/components/ui/use-form-persistence";
import { db } from "@/lib/firebase";
import { useAuth } from '@/contexts/AuthContext'; 
import { useDataStore } from '@/stores/dataStore';
import { useKeyboardShortcuts } from "@/components/ui/use-keyboard-shortcuts";
import { updateTaskActivity } from '@/lib/taskUtils';
import { z } from "zod";
import { notificationService } from '@/services/notificationService';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import SearchableDropdown from "@/components/ui/SearchableDropdown";
import { useShallow } from "zustand/react/shallow";
import PopupLoader from "@/components/ui/PopupLoader";

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

const createFormSchema = (includeMembers: boolean) => {
  return baseFormSchema.refine(
    (data) => {
      if (includeMembers) {
        return data.teamInfo.AssignedTo && data.teamInfo.AssignedTo.length > 0;
      }
      return true;
    },
    {
      message: "Debes seleccionar al menos un colaborador",
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
  onTaskCreated?: () => void;
  onShowSuccessAlert?: (message: string) => void;
  onShowFailAlert?: (message: string, error?: string) => void;
}

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
  const { isAdmin, isLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const users = useDataStore(useShallow(state => state.users));
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);


  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);

  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);

  const [statusDropdownPosition, setStatusDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [priorityDropdownPosition, setPriorityDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const [startDatePosition, setStartDatePosition] = useState<{ top: number; left: number } | null>(null);
  const [endDatePosition, setEndDatePosition] = useState<{ top: number; left: number } | null>(null);

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showFailAlert, setShowFailAlert] = useState(false);
  const [failErrorMessage, setFailErrorMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [includeMembers, setIncludeMembers] = useState(false);
  const [showPopupLoader, setShowPopupLoader] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  const startDateInputRef = useRef<HTMLDivElement>(null);
  const endDateInputRef = useRef<HTMLDivElement>(null);
  const startDatePopperRef = useRef<HTMLDivElement>(null);
  const endDatePopperRef = useRef<HTMLDivElement>(null);

  const statusDropdownPopperRef = useRef<HTMLDivElement>(null);
  const priorityDropdownPopperRef = useRef<HTMLDivElement>(null);


  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(includeMembers)),
    defaultValues,
    mode: "onChange",
  });

  const { isLoading: hasPersistedData, saveFormData, clearPersistedData } = useFormPersistence(
    form,
    `create-task-wizard`,
    true,
  );

  useKeyboardShortcuts({ enabled: isOpen });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    form.clearErrors();
    form.trigger();
  }, [includeMembers, form]);

  const defaultValuesRef = useRef(defaultValues);

  const checkForChanges = useCallback((value: Partial<FormValues>) => {
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

  }, [
    isStartDateOpen,
    isEndDateOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
  ]);

  const animatePoppers = useCallback(() => {

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
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {

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

    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
    isStartDateOpen,
    isEndDateOpen,
  ]);

  useEffect(() => {
    const handleScroll = debounce(() => {
      if (
        isStartDateOpen ||
        isEndDateOpen ||
        isStatusDropdownOpen ||
        isPriorityDropdownOpen
      ) {
        setIsStartDateOpen(false);
        setIsEndDateOpen(false);
        setIsStatusDropdownOpen(false);
        setIsPriorityDropdownOpen(false);
      }
    }, 200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [
    isStartDateOpen,
    isEndDateOpen,
    isStatusDropdownOpen,
    isPriorityDropdownOpen,
  ]);
  
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

    // Mostrar PopupLoader
    setShowPopupLoader(true);
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

      await updateTaskActivity(taskId, 'edit');

      const recipients = new Set<string>([...values.teamInfo.LeadedBy, ...(includeMembers ? (values.teamInfo.AssignedTo || []) : [])]);
      recipients.delete(user.id);
      
      if (recipients.size > 0) {
        try {
          await notificationService.createNotificationsForRecipients({
            userId: user.id,
            message: `${user.firstName || "Usuario"} te asignó la tarea ${values.basicInfo.name}`,
            type: 'task_created',
            taskId,
          }, Array.from(recipients));
          console.log('[CreateTask] Sent task creation notifications to:', recipients.size, 'recipients');
        } catch (error) {
          console.warn('[CreateTask] Error sending task creation notifications:', error);
        }
      }

      if (onShowSuccessAlert) {
        onShowSuccessAlert(`La tarea "${values.basicInfo.name}" se ha creado exitosamente.`);
      } else {
        setShowSuccessAlert(true);
      }
      
      form.reset(defaultValues);
      clearPersistedData();
      setIsSaving(false);
      
      // El PopupLoader se cerrará automáticamente y llamará a onComplete
      if (onTaskCreated) {
        setTimeout(() => {
          onTaskCreated();
        }, 2000); 
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al crear la tarea.";
      console.error("Error saving task:", errorMessage);
      
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
      
      if (onShowFailAlert) {
        onShowFailAlert("No se pudo crear la tarea.", errorMessage);
      } else {
        setShowFailAlert(true);
        setFailErrorMessage(errorMessage);
      }
      
      setIsSaving(false);
      setShowPopupLoader(false);
    }
  };

  const validateStep = async (fields: (keyof FormValues | string)[]) => {
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
                <WizardProgress totalSteps={stepFields.length} currentStep={currentStep} />
              </div>
              <button className={styles.toggleButton} onClick={onToggle}>
                <Image src="/x.svg" alt="Cerrar" width={16} height={16} />
              </button>
            </div>
            <div className={styles.content}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Wizard totalSteps={stepFields.length} currentStep={currentStep} onStepChange={setCurrentStep}>
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
                        <SearchableDropdown
                          items={clients.map(client => ({
                            id: client.id,
                            name: client.name,
                            imageUrl: client.imageUrl,
                            subtitle: `${client.projects.length} proyectos`
                          }))}
                          selectedItems={form.watch("clientInfo.clientId") ? [form.watch("clientInfo.clientId")] : []}
                          onSelectionChange={(selectedIds) => {
                            if (selectedIds.length > 0) {
                              form.setValue("clientInfo.clientId", selectedIds[0]);
                              form.setValue("clientInfo.project", "");
                            } else {
                              form.setValue("clientInfo.clientId", "");
                              form.setValue("clientInfo.project", "");
                            }
                          }}
                          placeholder="Ej: Nombre de la cuenta"
                          searchPlaceholder="Buscar cuentas..."
                          emptyMessage={isAdmin 
                            ? "No hay coincidencias. Crea una nueva cuenta."
                            : "No hay coincidencias. Pide a un administrador que cree una cuenta."
                          }
                        />
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
                        <SearchableDropdown
                          items={(() => {
                            const selectedClient = clients.find(
                              (c) => c.id === form.getValues("clientInfo.clientId")
                            );
                            if (!selectedClient || !selectedClient.projects.length) {
                              return [];
                            }
                            return selectedClient.projects.map((project, index) => ({
                              id: `${project}-${index}`,
                              name: project,
                              svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><style>.cls-1{fill:#0072ff;}</style></defs><title>shapes folder</title><g id="Layer_2" data-name="Layer 2"><path class="cls-1" d="M52,16H34a5.27,5.27,0,0,1-3.77-1.59l-3.9-4A8,8,0,0,0,20.58,8H12a8,8,0,0,0-8,8V52a8,8,0,0,0,8,8H52a8,8,0,0,0,8-8V24A8,8,0,0,0,52,16ZM19,35a5,5,0,1,1,5,5A5,5,0,0,1,19,35ZM37.22,52H26.78a1.57,1.57,0,0,1-1.3-2.46L30.7,41.9a1.57,1.57,0,0,1,2.59,0l5.22,7.64A1.57,1.57,0,0,1,37.22,52ZM46,38a2,2,0,0,1-2,2H38a2,2,0,0,1-2-2V32a2,2,0,0,1,2-2H44a2,2,0,0,1,2,2Z"/></g></svg>`
                            }));
                          })()}
                          selectedItems={form.watch("clientInfo.project") ? [form.watch("clientInfo.project")] : []}
                          onSelectionChange={(selectedIds) => {
                            if (selectedIds.length > 0) {
                              form.setValue("clientInfo.project", selectedIds[0]);
                            } else {
                              form.setValue("clientInfo.project", "");
                            }
                          }}
                          placeholder="Seleccionar una Carpeta"
                          searchPlaceholder="Buscar carpeta..."
                          emptyMessage={
                            isAdmin
                              ? "No hay carpetas disponibles. ¡Crea una nueva para organizar tus tareas!"
                              : "No hay carpetas disponibles. Pide a un administrador que añada una para tu proyecto."
                          }
                          disabled={!form.getValues("clientInfo.clientId")}
                        />
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
                                    }}
                                  >
                                    <DayPicker
                                      mode="single"
                                      selected={form.watch("basicInfo.startDate") || undefined}
                                      onSelect={(date) => {
                                        form.setValue("basicInfo.startDate", date || null);
                                        setIsStartDateOpen(false);
                                      }}
                                      locale={es}
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
                                    }}
                                  >
                                    <DayPicker
                                      mode="single"
                                      selected={form.watch("basicInfo.endDate") || undefined}
                                      onSelect={(date) => {
                                        form.setValue("basicInfo.endDate", date || null);
                                        setIsEndDateOpen(false);
                                      }}
                                      locale={es}
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
                        <SearchableDropdown
                          items={users.map(user => ({
                            id: user.id,
                            name: user.fullName,
                            imageUrl: user.imageUrl,
                            subtitle: user.role
                          }))}
                          selectedItems={form.watch("teamInfo.LeadedBy")}
                          onSelectionChange={(selectedIds) => {
                            form.setValue("teamInfo.LeadedBy", selectedIds);
                          }}
                          placeholder="Ej: John Doe"
                          searchPlaceholder="Buscar líderes..."
                          multiple={true}
                          emptyMessage={isAdmin 
                            ? "No hay coincidencias. Invita a nuevos colaboradores."
                            : "No hay coincidencias. Pide a un administrador que invite a más colaboradores."
                          }
                        />
                        {form.formState.errors.teamInfo?.LeadedBy && (
                          <span className={styles.error}>{form.formState.errors.teamInfo.LeadedBy.message}</span>
                        )}

                      </div>
                      
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
                            ¿Deseas agregar colaboradores a esta tarea?
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
                              Agrega a los colaboradores del equipo que trabajarán en la tarea.
                          </div>
                          <SearchableDropdown
                            items={users
                              .filter(user => !form.watch("teamInfo.LeadedBy").includes(user.id))
                              .map(user => ({
                                id: user.id,
                                name: user.fullName,
                                imageUrl: user.imageUrl,
                                subtitle: user.role
                              }))}
                            selectedItems={form.watch("teamInfo.AssignedTo") || []}
                            onSelectionChange={(selectedIds) => {
                              form.setValue("teamInfo.AssignedTo", selectedIds);
                            }}
                            placeholder="Ej: John Doe"
                            searchPlaceholder="Buscar colaboradores..."
                            multiple={true}
                            emptyMessage={isAdmin 
                              ? "No hay coincidencias. Invita a nuevos colaboradores."
                              : "No hay coincidencias. Pide a un administrador que invite a más colaboradores."
                            }
                          />
                          {form.formState.errors.teamInfo?.AssignedTo && (
                            <span className={styles.error}>{form.formState.errors.teamInfo.AssignedTo.message}</span>
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
      
      {/* PopupLoader para mostrar progreso de creación */}
      <PopupLoader
        isOpen={showPopupLoader}
        title="Creando Tarea"
        description="Estamos procesando tu tarea y enviando notificaciones a los colaboradores..."
        onComplete={() => {
          setShowPopupLoader(false);
          // Redirigir al TasksTable
          if (onTaskCreated) {
            onTaskCreated();
          }
        }}
        autoClose={true}
        autoCloseDelay={3000}
      />
    </>
  );
};

export default CreateTask;
