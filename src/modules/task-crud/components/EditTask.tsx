'use client';

/**
 * EditTask Component - Refactored
 * Modular task editing with wizard flow
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Wizard, WizardStep, WizardProgress, WizardActions } from '@/components/ui/wizard';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useKeyboardShortcuts } from '../hooks/ui/useKeyboardShortcuts';
import { updateTaskActivity } from '@/lib/taskUtils';
import { emailNotificationService } from '@/services/emailNotificationService';
import SearchableDropdown from '@/modules/config/components/ui/SearchableDropdown';
import { PopupLoader } from './ui/PopupLoader';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { Small, Muted } from '@/components/ui/Typography';
import GoBackButton from '@/components/ui/GoBackButton';

// Module imports
import { EditTaskProps, STEP_FIELDS, FORM_PERSISTENCE_KEYS } from '../types/form';
import { useTaskForm } from '../hooks/form/useTaskForm';
import { useStepValidation } from '../hooks/form/useStepValidation';
import { useTaskFormData } from '../hooks/data/useTaskData';
import { useMultipleDropdowns } from '../hooks/ui/useDropdownPosition';
import { useMultipleClickOutside } from '../hooks/ui/useClickOutside';
import { StatusSelector, PrioritySelector, DateSelector } from './molecules/selectors';
import { validateTaskDates, getUserFriendlyErrorMessage } from '../utils/validation';
import { containerAnimation, scaleIn, transitions } from '../utils/animations';
import { PLACEHOLDERS, EMPTY_MESSAGES, TOAST_MESSAGES, UI_CONSTANTS } from '../config';

import styles from './CreateTask.module.scss';

const EditTask: React.FC<EditTaskProps> = ({
  isOpen,
  onToggle,
  taskId,
  onHasUnsavedChanges,
  onCreateClientOpen,
  onEditClientOpen,
  onShowSuccessAlert,
  onShowFailAlert,
}) => {
  const { user } = useUser();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { success: showSuccess, error: showError } = useSonnerToast();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [includeMembers, setIncludeMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPopupLoader, setShowPopupLoader] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [originalAssignedTo, setOriginalAssignedTo] = useState<string[]>([]);
  const [originalLeadedBy, setOriginalLeadedBy] = useState<string[]>([]);

  // Data hooks
  const { clients, users, isLoading: dataLoading } = useTaskFormData();

  // Form hook
  const { form, resetForm, hasPersistedData, clearPersistedData } = useTaskForm({
    includeMembers,
    persistenceKey: FORM_PERSISTENCE_KEYS.EDIT(taskId),
    onHasUnsavedChanges,
    enablePersistence: true,
  });

  // Validation hook
  const { validateStep } = useStepValidation({ form, includeMembers });

  // Dropdown management
  const { dropdowns, toggleDropdown, closeAllDropdowns, setRef } = useMultipleDropdowns([
    'status',
    'priority',
    'startDate',
    'endDate',
  ]);

  // Click outside handling
  useMultipleClickOutside({
    status: {
      refs: [],
      isOpen: dropdowns.status.isOpen,
      onClose: () => closeAllDropdowns(),
    },
    priority: {
      refs: [],
      isOpen: dropdowns.priority.isOpen,
      onClose: () => closeAllDropdowns(),
    },
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({ enabled: isOpen });

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load task data
  useEffect(() => {
    if (!isOpen || !taskId) return;

    const loadTaskData = async () => {
      try {
        setIsLoadingTask(true);
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const taskDoc = await getDoc(doc(db, 'tasks', taskId));

        if (!taskDoc.exists()) {
          throw new Error('Tarea no encontrada');
        }

        const taskData = taskDoc.data();

        // Convert Firestore Timestamps to Dates
        const startDate = taskData.startDate?.toDate?.() || null;
        const endDate = taskData.endDate?.toDate?.() || null;

        // Set form values
        form.setValue('clientInfo.clientId', taskData.clientId || '');
        form.setValue('clientInfo.project', taskData.project || '');
        form.setValue('basicInfo.name', taskData.name || '');
        form.setValue('basicInfo.description', taskData.description || '');
        form.setValue('basicInfo.objectives', taskData.objectives || '');
        form.setValue('basicInfo.startDate', startDate);
        form.setValue('basicInfo.endDate', endDate);
        form.setValue('basicInfo.status', taskData.status || 'Por Iniciar');
        form.setValue('basicInfo.priority', taskData.priority || 'Baja');
        form.setValue('teamInfo.LeadedBy', taskData.LeadedBy || []);
        form.setValue('teamInfo.AssignedTo', taskData.AssignedTo || []);

        // Store original team members for notification comparison
        setOriginalAssignedTo(taskData.AssignedTo || []);
        setOriginalLeadedBy(taskData.LeadedBy || []);

        // Set includeMembers if there are assigned members
        if (taskData.AssignedTo && taskData.AssignedTo.length > 0) {
          setIncludeMembers(true);
        }

        setIsLoadingTask(false);
      } catch (_error: unknown) {
        // Error handled silently - user will see toast notification
        toast({
          title: '🔍 Error al cargar la tarea',
          description: 'No se pudo cargar los datos de la tarea. Por favor, intenta nuevamente.',
          variant: 'error',
        });
        setIsLoadingTask(false);
      }
    };

    loadTaskData();
  }, [isOpen, taskId, form]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setCurrentStep(0);
      setIncludeMembers(false);
      setIsLoadingTask(true);
    }
  }, [isOpen, resetForm]);

  // Handle scroll - close dropdowns
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      closeAllDropdowns();
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen, closeAllDropdowns]);

  // Submit handler
  const onSubmit = async (values: any) => {
    if (!user) {
      toast(TOAST_MESSAGES.SESSION_EXPIRED);
      return;
    }

    // Validate dates
    if (!validateTaskDates(values.basicInfo.startDate, values.basicInfo.endDate)) {
      return;
    }

    setShowPopupLoader(true);
    setIsSaving(true);

    try {
      const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const taskDocRef = doc(db, 'tasks', taskId);

      const taskData = {
        ...values.clientInfo,
        ...values.basicInfo,
        ...values.teamInfo,
        AssignedTo: includeMembers ? values.teamInfo.AssignedTo || [] : [],
        updatedAt: Timestamp.fromDate(new Date()),
        updatedBy: user.id,
      };

      await updateDoc(taskDocRef, taskData);
      await updateTaskActivity(taskId, 'edit');

      // Determine new members to notify
      const newLeaders = (values.teamInfo?.LeadedBy || []).filter((id: string) => !originalLeadedBy.includes(id));
      const newMembers = includeMembers
        ? ((values.teamInfo?.AssignedTo || [])).filter((id: string) => !originalAssignedTo.includes(id))
        : [];

      const newRecipients = new Set<string>([...newLeaders, ...newMembers]);
      newRecipients.delete(user.id);

      // Send notifications only to new members
      if (newRecipients.size > 0) {
        try {
          await emailNotificationService.createEmailNotificationsForRecipients(
            {
              userId: user.id,
              message: `${user.firstName || 'Usuario'} te asignó la tarea ${values.basicInfo.name}`,
              type: 'task_assignment_changed',
              taskId,
            },
            Array.from(newRecipients)
          );
        } catch (_error: unknown) {
          // Error sending notifications - continue without blocking
        }
      }

      // Success
      showSuccess(`La tarea "${values.basicInfo.name}" se ha actualizado exitosamente.`);
      if (onShowSuccessAlert) {
        onShowSuccessAlert(`La tarea "${values.basicInfo.name}" se ha actualizado exitosamente.`);
      }

      form.reset();
      clearPersistedData();
      setIsSaving(false);

      window.location.reload();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      const { title, description } = getUserFriendlyErrorMessage(errorMessage);
      showError(title, description);

      if (onShowFailAlert) {
        onShowFailAlert('No se pudo actualizar la tarea.', errorMessage);
      }

      setIsSaving(false);
      setShowPopupLoader(false);
      onToggle();
    }
  };

  // Loading state
  if (authLoading || dataLoading || !isMounted || isLoadingTask) {
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
      <motion.div
        className={`${styles.container} ${isOpen ? styles.open : ''} ${isSaving ? styles.saving : ''}`}
        style={{ position: 'relative' }}
        {...containerAnimation}
        transition={transitions.normal}
      >
        {isOpen && (
          <>
            {/* Header */}
            <div className={styles.header}>
              <GoBackButton onClick={onToggle} />
              <div className={styles.headerTitle}>Editar Tarea</div>
              <div className={styles.headerProgress}>
                <WizardProgress totalSteps={STEP_FIELDS.length} currentStep={currentStep} />
              </div>
            </div>

            {/* Content */}
            <div className={styles.content}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Wizard totalSteps={STEP_FIELDS.length} currentStep={currentStep} onStepChange={setCurrentStep}>
                  {/* Step 1: Client Info */}
                  <WizardStep step={0} validator={() => validateStep(STEP_FIELDS[0])}>
                    <div className={styles.section}>
                      <h2 className={styles.sectionTitle}>Información del Cliente</h2>

                      {hasPersistedData && (
                        <div className={styles.persistedData}>
                          <span>Progreso guardado restaurado</span>
                          <button
                            type="button"
                            onClick={() => {
                              clearPersistedData();
                              form.reset();
                              toast({
                                title: 'Progreso eliminado',
                                description: 'Se ha reiniciado el formulario.',
                                variant: 'info',
                              });
                            }}
                          >
                            Borrar progreso
                          </button>
                        </div>
                      )}

                      {/* Client Selector */}
                      <div className={styles.formGroup}>
                        <Small className={styles.label}>Cuenta Asignada*</Small>
                        <Muted className={styles.sectionSubtitle}>
                          Selecciona la cuenta a la que se asignará esta tarea.
                        </Muted>
                        <SearchableDropdown
                          items={clients.map((client) => ({
                            id: client.id,
                            name: client.name,
                            imageUrl: client.imageUrl,
                            subtitle: `${client.projects.length} proyectos`,
                          }))}
                          selectedItems={form.watch('clientInfo.clientId') ? [form.watch('clientInfo.clientId')] : []}
                          onSelectionChange={(selectedIds) => {
                            if (selectedIds.length > 0) {
                              form.setValue('clientInfo.clientId', selectedIds[0]);
                              form.setValue('clientInfo.project', '');
                            } else {
                              form.setValue('clientInfo.clientId', '');
                              form.setValue('clientInfo.project', '');
                            }
                          }}
                          placeholder={PLACEHOLDERS.CLIENT}
                          searchPlaceholder="Buscar cuentas..."
                          emptyMessage={isAdmin ? EMPTY_MESSAGES.NO_CLIENTS_ADMIN : EMPTY_MESSAGES.NO_CLIENTS_USER}
                        />
                        {form.formState.errors.clientInfo?.clientId && (
                          <Small className={styles.error}>{form.formState.errors.clientInfo.clientId.message}</Small>
                        )}

                        {isAdmin && !form.watch('clientInfo.clientId') && (
                          <div className={styles.addButtonWrapper}>
                            <div className={styles.addButtonText}>
                              ¿No encuentras alguna cuenta? <strong>Agrega una nueva.</strong>
                            </div>
                            <button type="button" className={styles.addButton} onClick={onCreateClientOpen}>
                              + Agregar Cuenta
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Project Selector */}
                      <div className={styles.formGroup}>
                        <Small className={styles.label}>Carpeta*</Small>
                        <Muted className={styles.sectionSubtitle}>Selecciona la carpeta del proyecto.</Muted>
                        <SearchableDropdown
                          items={(() => {
                            const selectedClient = clients.find((c) => c.id === form.getValues('clientInfo.clientId'));
                            if (!selectedClient || !selectedClient.projects.length) return [];
                            return selectedClient.projects.map((project, index) => ({
                              id: `${project}-${index}`,
                              name: project,
                              svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><style>.cls-1{fill:#0072ff;}</style></defs><title>shapes folder</title><g id="Layer_2" data-name="Layer 2"><path class="cls-1" d="M52,16H34a5.27,5.27,0,0,1-3.77-1.59l-3.9-4A8,8,0,0,0,20.58,8H12a8,8,0,0,0-8,8V52a8,8,0,0,0,8,8H52a8,8,0,0,0,8-8V24A8,8,0,0,0,52,16ZM19,35a5,5,0,1,1,5,5A5,5,0,0,1,19,35ZM37.22,52H26.78a1.57,1.57,0,0,1-1.3-2.46L30.7,41.9a1.57,1.57,0,0,1,2.59,0l5.22,7.64A1.57,1.57,0,0,1,37.22,52ZM46,38a2,2,0,0,1-2,2H38a2,2,0,0,1-2-2V32a2,2,0,0,1,2-2H44a2,2,0,0,1,2,2Z"/></g></svg>`,
                            }));
                          })()}
                          selectedItems={form.watch('clientInfo.project') ? [form.watch('clientInfo.project')] : []}
                          onSelectionChange={(selectedIds) => {
                            form.setValue('clientInfo.project', selectedIds.length > 0 ? selectedIds[0] : '');
                          }}
                          placeholder={PLACEHOLDERS.PROJECT}
                          searchPlaceholder="Buscar carpeta..."
                          emptyMessage={isAdmin ? EMPTY_MESSAGES.NO_PROJECTS_ADMIN : EMPTY_MESSAGES.NO_PROJECTS_USER}
                          disabled={!form.getValues('clientInfo.clientId')}
                        />
                        {form.formState.errors.clientInfo?.project && (
                          <Small className={styles.error}>{form.formState.errors.clientInfo.project.message}</Small>
                        )}

                        {isAdmin && form.getValues('clientInfo.clientId') && (
                          <button
                            type="button"
                            className={styles.addButton}
                            style={{ marginTop: 8 }}
                            onClick={() => {
                              const client = clients.find((c) => c.id === form.getValues('clientInfo.clientId'));
                              if (client) onEditClientOpen(client);
                            }}
                          >
                            + Crear Proyecto
                          </button>
                        )}
                      </div>
                    </div>
                  </WizardStep>

                  {/* Step 2: Basic Info */}
                  <WizardStep step={1} validator={() => validateStep(STEP_FIELDS[1])}>
                    <div className={styles.section}>
                      <h2 className={styles.sectionTitle}>Información Básica del Proyecto</h2>
                      <div className={styles.level1Grid}>
                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <Small className={styles.label}>Nombre de la tarea*</Small>
                            <Controller
                              name="basicInfo.name"
                              control={form.control}
                              render={({ field }) => (
                                <input className={styles.input} placeholder={PLACEHOLDERS.TASK_NAME} {...field} />
                              )}
                            />
                            {form.formState.errors.basicInfo?.name && (
                              <Small className={styles.error}>{form.formState.errors.basicInfo.name.message}</Small>
                            )}
                          </div>

                          <div className={styles.formGroup}>
                            <Small className={styles.label}>Descripción*</Small>
                            <Controller
                              name="basicInfo.description"
                              control={form.control}
                              render={({ field }) => (
                                <input className={styles.input} placeholder={PLACEHOLDERS.DESCRIPTION} {...field} />
                              )}
                            />
                            {form.formState.errors.basicInfo?.description && (
                              <Small className={styles.error}>{form.formState.errors.basicInfo.description.message}</Small>
                            )}
                          </div>
                        </div>

                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <Small className={styles.label}>Objetivos</Small>
                            <Controller
                              name="basicInfo.objectives"
                              control={form.control}
                              render={({ field }) => (
                                <input className={styles.input} placeholder={PLACEHOLDERS.OBJECTIVES} {...field} />
                              )}
                            />
                          </div>

                          <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                              <Small className={styles.label}>Fecha de Inicio*</Small>
                              <Controller
                                name="basicInfo.startDate"
                                control={form.control}
                                render={({ field }) => (
                                  <DateSelector
                                    ref={(el) => setRef('startDate', el)}
                                    value={field.value}
                                    onChange={field.onChange}
                                    isOpen={dropdowns.startDate.isOpen}
                                    onToggle={() => toggleDropdown('startDate')}
                                    position={dropdowns.startDate.position}
                                  />
                                )}
                              />
                              {form.formState.errors.basicInfo?.startDate && (
                                <Small className={styles.error}>{form.formState.errors.basicInfo.startDate.message}</Small>
                              )}
                            </div>

                            <div className={styles.formGroup}>
                              <Small className={styles.label}>Fecha de Finalización*</Small>
                              <Controller
                                name="basicInfo.endDate"
                                control={form.control}
                                render={({ field }) => (
                                  <DateSelector
                                    ref={(el) => setRef('endDate', el)}
                                    value={field.value}
                                    onChange={field.onChange}
                                    isOpen={dropdowns.endDate.isOpen}
                                    onToggle={() => toggleDropdown('endDate')}
                                    position={dropdowns.endDate.position}
                                  />
                                )}
                              />
                              {form.formState.errors.basicInfo?.endDate && (
                                <Small className={styles.error}>{form.formState.errors.basicInfo.endDate.message}</Small>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <Small className={styles.label}>Estado Inicial*</Small>
                            <Controller
                              name="basicInfo.status"
                              control={form.control}
                              render={({ field }) => (
                                <StatusSelector
                                  ref={(el) => setRef('status', el)}
                                  value={field.value}
                                  onChange={field.onChange}
                                  isOpen={dropdowns.status.isOpen}
                                  onToggle={() => toggleDropdown('status')}
                                  position={dropdowns.status.position}
                                />
                              )}
                            />
                            {form.formState.errors.basicInfo?.status && (
                              <Small className={styles.error}>{form.formState.errors.basicInfo.status.message}</Small>
                            )}
                          </div>
                        </div>

                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <Small className={styles.label}>Prioridad*</Small>
                            <Controller
                              name="basicInfo.priority"
                              control={form.control}
                              render={({ field }) => (
                                <PrioritySelector
                                  ref={(el) => setRef('priority', el)}
                                  value={field.value}
                                  onChange={field.onChange}
                                  isOpen={dropdowns.priority.isOpen}
                                  onToggle={() => toggleDropdown('priority')}
                                  position={dropdowns.priority.position}
                                />
                              )}
                            />
                            {form.formState.errors.basicInfo?.priority && (
                              <Small className={styles.error}>{form.formState.errors.basicInfo.priority.message}</Small>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </WizardStep>

                  {/* Step 3: Team Info */}
                  <WizardStep step={2} validator={() => validateStep(STEP_FIELDS[2])}>
                    <div className={styles.section}>
                      <h2 className={styles.sectionTitle}>Información del Equipo</h2>

                      {/* Leader Selector */}
                      <div className={styles.formGroup}>
                        <Small className={styles.label}>Líder del Proyecto*</Small>
                        <Muted className={styles.sectionSubtitle}>
                          Selecciona la persona principal responsable de la tarea.
                        </Muted>
                        <SearchableDropdown
                          items={users.map((user) => ({
                            id: user.id,
                            name: user.fullName,
                            imageUrl: user.imageUrl,
                            subtitle: user.role,
                          }))}
                          selectedItems={form.watch('teamInfo.LeadedBy')}
                          onSelectionChange={(selectedIds) => form.setValue('teamInfo.LeadedBy', selectedIds)}
                          placeholder={PLACEHOLDERS.LEADER}
                          searchPlaceholder="Buscar líderes..."
                          multiple={true}
                          emptyMessage={isAdmin ? EMPTY_MESSAGES.NO_USERS_ADMIN : EMPTY_MESSAGES.NO_USERS_USER}
                        />
                        {form.formState.errors.teamInfo?.LeadedBy && (
                          <Small className={styles.error}>{form.formState.errors.teamInfo.LeadedBy.message}</Small>
                        )}
                      </div>

                      {/* Include Members Checkbox */}
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

                      {/* Members Selector */}
                      <AnimatePresence>
                        {includeMembers && (
                          <motion.div className={styles.formGroup} {...scaleIn} transition={transitions.normal}>
                            <Small className={styles.label}>Colaboradores*</Small>
                            <Muted className={styles.sectionSubtitle}>
                              Agrega a los colaboradores del equipo que trabajarán en la tarea.
                            </Muted>
                            <SearchableDropdown
                              items={users
                                .filter((user) => !form.watch('teamInfo.LeadedBy').includes(user.id))
                                .map((user) => ({
                                  id: user.id,
                                  name: user.fullName,
                                  imageUrl: user.imageUrl,
                                  subtitle: user.role,
                                }))}
                              selectedItems={form.watch('teamInfo.AssignedTo') || []}
                              onSelectionChange={(selectedIds) => form.setValue('teamInfo.AssignedTo', selectedIds)}
                              placeholder={PLACEHOLDERS.COLLABORATOR}
                              searchPlaceholder="Buscar colaboradores..."
                              multiple={true}
                              emptyMessage={isAdmin ? EMPTY_MESSAGES.NO_USERS_ADMIN : EMPTY_MESSAGES.NO_USERS_USER}
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
      </motion.div>

      {/* PopupLoader */}
      <PopupLoader
        isOpen={showPopupLoader}
        title="Actualizando Tarea"
        description="Estamos procesando los cambios y enviando notificaciones a los nuevos colaboradores..."
        onComplete={() => {
          setShowPopupLoader(false);
        }}
        autoClose={true}
        autoCloseDelay={UI_CONSTANTS.POPUP_LOADER_EDIT_DURATION}
      />
    </>
  );
};

export default EditTask;
