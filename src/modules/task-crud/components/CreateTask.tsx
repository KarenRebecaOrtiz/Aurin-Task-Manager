'use client';

/**
 * CreateTask Component - Refactored
 * Modular task creation with wizard flow
 */

import { useState, useEffect, useCallback } from 'react';
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
import { CreateTaskProps, STEP_FIELDS, FORM_PERSISTENCE_KEYS } from '../types/form';
import { Client } from '../types/domain';
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

const CreateTask: React.FC<CreateTaskProps> = ({
  isOpen,
  onToggle,
  onHasUnsavedChanges,
  onCreateClientOpen,
  onEditClientOpen,
  onTaskCreated,
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

  // Data hooks
  const { clients, users, isLoading: dataLoading } = useTaskFormData();

  // Form hook
  const { form, resetForm, hasPersistedData, clearPersistedData } = useTaskForm({
    includeMembers,
    persistenceKey: FORM_PERSISTENCE_KEYS.CREATE,
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

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setCurrentStep(0);
      setIncludeMembers(false);
    }
  }, [isOpen, resetForm]);

  // Handle scroll - close dropdowns
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      closeAllDropdowns();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
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
      // Note: For now using direct Firestore (backend API integration pending)
      // TODO: Switch to taskService.createTask() when ready
      const { doc, collection, setDoc, Timestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      const taskDocRef = doc(collection(db, 'tasks'));
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

      // Send notifications
      const recipients = new Set<string>([
        ...values.teamInfo.LeadedBy,
        ...(includeMembers ? values.teamInfo.AssignedTo || [] : []),
      ]);
      recipients.delete(user.id);

      if (recipients.size > 0) {
        try {
          await emailNotificationService.createEmailNotificationsForRecipients(
            {
              userId: user.id,
              message: `${user.firstName || 'Usuario'} te asignó la tarea ${values.basicInfo.name}`,
              type: 'task_created',
              taskId,
            },
            Array.from(recipients)
          );
        } catch (error) {
          console.warn('[CreateTask] Error sending notifications:', error);
        }
      }

      // Success
      showSuccess(`La tarea "${values.basicInfo.name}" se ha creado exitosamente.`);
      if (onShowSuccessAlert) {
        onShowSuccessAlert(`La tarea "${values.basicInfo.name}" se ha creado exitosamente.`);
      }

      form.reset();
      clearPersistedData();
      setIsSaving(false);

      window.location.reload();

      if (onTaskCreated) {
        setTimeout(onTaskCreated, 2000);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido';
      console.error('[CreateTask] Error:', errorMessage);

      const { title, description } = getUserFriendlyErrorMessage(errorMessage);
      toast({ title, description, variant: 'error' });

      showError('No se pudo crear la tarea.', errorMessage);
      if (onShowFailAlert) {
        onShowFailAlert('No se pudo crear la tarea.', errorMessage);
      }

      setIsSaving(false);
      setShowPopupLoader(false);
    }
  };

  // Loading state
  if (authLoading || dataLoading || !isMounted) {
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
              <div className={styles.headerTitle}>Crear Tarea</div>
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
                          <Muted>Progreso guardado restaurado</Muted>
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
                            <label className={styles.label}>Nombre de la tarea*</label>
                            <Controller
                              name="basicInfo.name"
                              control={form.control}
                              render={({ field }) => (
                                <input className={styles.input} placeholder={PLACEHOLDERS.TASK_NAME} {...field} />
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
                                <input className={styles.input} placeholder={PLACEHOLDERS.DESCRIPTION} {...field} />
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
                                <input className={styles.input} placeholder={PLACEHOLDERS.OBJECTIVES} {...field} />
                              )}
                            />
                          </div>

                          <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Fecha de Inicio*</label>
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
                                <span className={styles.error}>{form.formState.errors.basicInfo.startDate.message}</span>
                              )}
                            </div>

                            <div className={styles.formGroup}>
                              <label className={styles.label}>Fecha de Finalización*</label>
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
                                <span className={styles.error}>{form.formState.errors.basicInfo.endDate.message}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Estado Inicial*</label>
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
                              <span className={styles.error}>{form.formState.errors.basicInfo.status.message}</span>
                            )}
                          </div>
                        </div>

                        <div className={styles.level1Column}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Prioridad*</label>
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
                              <span className={styles.error}>{form.formState.errors.basicInfo.priority.message}</span>
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
                        <label className={styles.label}>Líder del Proyecto*</label>
                        <div className={styles.sectionSubtitle}>
                          Selecciona la persona principal responsable de la tarea.
                        </div>
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
                          <span className={styles.error}>{form.formState.errors.teamInfo.LeadedBy.message}</span>
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
                            <label className={styles.label}>Colaboradores*</label>
                            <div className={styles.sectionSubtitle}>
                              Agrega a los colaboradores del equipo que trabajarán en la tarea.
                            </div>
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
        title="Creando Tarea"
        description="Estamos procesando tu tarea y enviando notificaciones a los colaboradores..."
        onComplete={() => {
          setShowPopupLoader(false);
          if (onTaskCreated) onTaskCreated();
        }}
        autoClose={true}
        autoCloseDelay={UI_CONSTANTS.POPUP_LOADER_DURATION}
      />
    </>
  );
};

export default CreateTask;
