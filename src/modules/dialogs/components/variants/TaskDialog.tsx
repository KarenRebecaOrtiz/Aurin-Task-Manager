"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useUser } from "@clerk/nextjs"
import { CrudDialog } from "../organisms/CrudDialog"
import { DialogLoadingState } from "../atoms/DialogLoadingState"
import { useSonnerToast } from "@/modules/sonner/hooks/useSonnerToast"
import { TaskForm, type TaskFormData } from "@/modules/task-crud/components/forms/TaskForm"
import { useTaskFormData } from "@/modules/task-crud/hooks/data/useTaskData"
import { taskService } from "@/modules/task-crud/services/taskService"
import { validateTaskDates } from "@/modules/task-crud/utils/validation"
import { FormFooter } from "@/modules/task-crud/components/forms/FormFooter"
import { ClientDialog } from "@/modules/client-crud"
import { ManageProjectsDialog } from "./ManageProjectsDialog"
import { useTaskState } from "@/hooks/useTaskData"
import { useAuth } from "@/contexts/AuthContext"
import { useDataStore } from "@/stores/dataStore"
import { Client } from "@/types"

interface TaskDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onTaskCreated: () => void
  taskId?: string
}

export function TaskDialog({
  isOpen,
  onOpenChange,
  onTaskCreated,
  taskId,
}: TaskDialogProps) {
  const { user } = useUser()
  const { clients, users } = useTaskFormData()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false)
  const [selectedClientForProject, setSelectedClientForProject] = useState<Client | null>(null)
  const [formClientId, setFormClientId] = useState<string>('')
  const { success: showSuccess, error: showError } = useSonnerToast()
  const { isAdmin } = useAuth()

  const isEditMode = !!taskId

  // Use centralized task data store with real-time updates
  const { taskData, isLoading: isLoadingTask, error: taskError } = useTaskState(taskId || '', {
    autoSubscribe: isOpen && isEditMode && !!taskId,
    unsubscribeOnUnmount: true,
  })

  // Show error if task not found
  useEffect(() => {
    if (taskError && isOpen && isEditMode) {
      showError('Tarea no encontrada', 'No se pudo cargar la información de la tarea.')
    }
  }, [taskError, isOpen, isEditMode, showError])

  // Convert task data to form initial data
  const initialData: TaskFormData | null = useMemo(() => {
    if (!isEditMode || !taskData) return null

    // Convert ISO strings to Dates for the form
    const startDate = taskData.startDate ? new Date(taskData.startDate) : undefined
    const endDate = taskData.endDate ? new Date(taskData.endDate) : undefined

    return {
      clientId: taskData.clientId || '',
      project: taskData.project || '',
      name: taskData.name || '',
      description: taskData.description || '',
      startDate,
      endDate,
      LeadedBy: taskData.LeadedBy || [],
      AssignedTo: taskData.AssignedTo || [],
      priority: taskData.priority || 'Media',
      status: taskData.status || 'Por Iniciar',
    }
  }, [isEditMode, taskData])

  // Store original team members for notification comparison
  const originalAssignedTo = useMemo(() => taskData?.AssignedTo || [], [taskData?.AssignedTo])
  const originalLeadedBy = useMemo(() => taskData?.LeadedBy || [], [taskData?.LeadedBy])

  const handleSubmit = useCallback(async (formData: TaskFormData) => {
    console.log('[TaskDialog] handleSubmit called with formData:', formData)

    if (!user) {
      console.error('[TaskDialog] No user found')
      showError('Sesión expirada', 'Por favor, inicia sesión nuevamente.')
      return
    }

    // Validate dates
    if (!validateTaskDates(formData.startDate, formData.endDate)) {
      console.error('[TaskDialog] Date validation failed')
      showError('Fechas inválidas', 'La fecha de inicio debe ser anterior a la fecha de finalización.')
      return
    }

    console.log('[TaskDialog] Starting task submission...')
    setIsSubmitting(true)

    // Flatten the form data for API (API expects flat structure)
    const apiFormData = {
      clientId: formData.clientId,
      project: formData.project,
      name: formData.name,
      description: formData.description,
      startDate: formData.startDate?.toISOString() || null,
      endDate: formData.endDate?.toISOString() || null,
      status: formData.status,
      priority: formData.priority,
      LeadedBy: formData.LeadedBy,
      AssignedTo: formData.AssignedTo || [],
      objectives: '',
    }

    // Save previous state for rollback on error (edit mode only)
    const previousTaskData = isEditMode && taskId ? useDataStore.getState().getTaskById(taskId) : null

    try {
      if (isEditMode && taskId) {
        // Persist to backend (dialog stays open with loader)
        const response = await taskService.updateTask(taskId, apiFormData)

        if (!response.success) {
          throw new Error(response.error || 'Error al actualizar la tarea')
        }

        // Update store and close dialog on success
        useDataStore.getState().updateTask(taskId, {
          ...apiFormData,
          lastActivity: new Date().toISOString(),
        })

        onOpenChange(false)
        showSuccess(`La tarea "${formData.name}" se ha actualizado exitosamente.`)
      } else {
        // Create via API (dialog stays open with loader)
        const response = await taskService.createTask(apiFormData, user.id)

        if (!response.success) {
          throw new Error(response.error || 'Error al crear la tarea')
        }

        // Add task to store with the real server ID
        if (response.data) {
          const taskResponseData = response.data;
          useDataStore.getState().addTask({
            id: taskResponseData.id,
            clientId: taskResponseData.clientId,
            project: taskResponseData.project,
            name: taskResponseData.name,
            description: taskResponseData.description,
            status: taskResponseData.status,
            priority: taskResponseData.priority,
            startDate: apiFormData.startDate,
            endDate: apiFormData.endDate,
            LeadedBy: taskResponseData.LeadedBy || [],
            AssignedTo: taskResponseData.AssignedTo || [],
            createdAt: new Date().toISOString(),
            CreatedBy: user.id,
            lastActivity: new Date().toISOString(),
          })
        }

        onOpenChange(false)
        showSuccess(`La tarea "${formData.name}" se ha creado exitosamente.`)
      }

      onTaskCreated()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('[TaskDialog] Error:', errorMessage, error)

      const action = isEditMode ? 'actualizar' : 'crear'
      showError(`No se pudo ${action} la tarea`, errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [user, isEditMode, taskId, onTaskCreated, onOpenChange, showSuccess, showError])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleCreateClient = useCallback(() => {
    setIsClientDialogOpen(true)
  }, [])

  const handleClientCreated = useCallback(() => {
    // Refresh will happen automatically in ClientDialog
  }, [])

  // Initialize formClientId when in edit mode
  useEffect(() => {
    if (initialData?.clientId) {
      setFormClientId(initialData.clientId)
    }
  }, [initialData?.clientId])

  const handleCreateProject = useCallback(() => {
    // Find the currently selected client to open projects dialog
    const client = clients.find(c => c.id === formClientId)
    if (client) {
      setSelectedClientForProject(client as Client)
      setIsProjectsDialogOpen(true)
    }
  }, [clients, formClientId])

  const handleProjectsUpdated = useCallback(() => {
    // Projects updated, will refresh via store
  }, [])

  // Rich loading state content
  const loadingStateContent = useMemo(() => {
    if (isSubmitting) {
      return isEditMode ? (
        <DialogLoadingState
          heading="Guardando cambios"
          subheading="Actualizando tarea..."
          note="Los miembros del equipo recibirán una notificación con los cambios."
        />
      ) : (
        <DialogLoadingState
          heading="Creando tarea"
          subheading="Preparando todo para tu equipo..."
          note="Se notificará a los líderes y colaboradores asignados."
        />
      )
    }

    return (
      <DialogLoadingState
        heading="Cargando tarea"
        subheading="Obteniendo la información..."
      />
    )
  }, [isSubmitting, isEditMode])

  // Footer personalizado con FormFooter
  const customFooter = (
    <FormFooter
      onCancel={handleCancel}
      isLoading={isSubmitting}
      submitText={isEditMode ? "Actualizar" : "Crear Tarea"}
    />
  )

  return (
    <>
      <CrudDialog
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        mode={isEditMode ? 'edit' : 'create'}
        title={isEditMode ? "Editar Tarea" : "Crear Tarea"}
        description={isEditMode
          ? "Modifica la información de la tarea existente."
          : "Completa el formulario para crear una nueva tarea en el sistema."}
        isLoading={isLoadingTask || isSubmitting}
        isSubmitting={isSubmitting}
        loadingState={loadingStateContent}
        onCancel={handleCancel}
        footer={customFooter}
        size="xl"
        closeOnOverlayClick={false}
      >
        <TaskForm
          clients={clients}
          users={users}
          onSubmit={handleSubmit}
          onCreateClient={isAdmin ? handleCreateClient : undefined}
          onCreateProject={isAdmin ? handleCreateProject : undefined}
          onClientIdChange={setFormClientId}
          initialData={initialData}
        />
      </CrudDialog>

      <ClientDialog
        isOpen={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        onClientCreated={handleClientCreated}
        mode="create"
      />

      {/* Manage Projects Dialog - only for admins */}
      {selectedClientForProject && (
        <ManageProjectsDialog
          isOpen={isProjectsDialogOpen}
          onOpenChange={setIsProjectsDialogOpen}
          client={selectedClientForProject}
          onProjectsUpdated={handleProjectsUpdated}
        />
      )}
    </>
  )
}
