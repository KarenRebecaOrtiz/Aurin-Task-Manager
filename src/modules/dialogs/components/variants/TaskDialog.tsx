"use client"

import { useState, useCallback, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { CrudDialog } from "../organisms/CrudDialog"
import { useSonnerToast } from "@/modules/sonner/hooks/useSonnerToast"
import { TaskForm, type TaskFormData } from "@/modules/task-crud/components/forms/TaskForm"
import { useTaskFormData } from "@/modules/task-crud/hooks/data/useTaskData"
import { taskService } from "@/modules/task-crud/services/taskService"
import { validateTaskDates } from "@/modules/task-crud/utils/validation"
import { FormFooter } from "@/modules/task-crud/components/forms/FormFooter"
import { ClientDialog } from "./ClientDialog"

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
  const [isLoadingTask, setIsLoadingTask] = useState(false)
  const [initialData, setInitialData] = useState<TaskFormData | null>(null)
  const [originalAssignedTo, setOriginalAssignedTo] = useState<string[]>([])
  const [originalLeadedBy, setOriginalLeadedBy] = useState<string[]>([])
  const { success: showSuccess, error: showError } = useSonnerToast()

  const isEditMode = !!taskId

  // Load task data when in edit mode
  useEffect(() => {
    if (!isOpen || !isEditMode || !taskId) {
      setInitialData(null)
      return
    }

    const loadTaskData = async () => {
      try {
        setIsLoadingTask(true)
        const { doc, getDoc } = await import('firebase/firestore')
        const { db } = await import('@/lib/firebase')

        const taskDoc = await getDoc(doc(db, 'tasks', taskId))

        if (!taskDoc.exists()) {
          showError('Tarea no encontrada', 'No se pudo cargar la información de la tarea.')
          setIsLoadingTask(false)
          return
        }

        const taskData = taskDoc.data()

        // Convert Firestore Timestamps to Dates
        const startDate = taskData.startDate?.toDate?.() || undefined
        const endDate = taskData.endDate?.toDate?.() || undefined

        // Set initial data
        setInitialData({
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
        })

        // Store original team members for notification comparison
        setOriginalAssignedTo(taskData.AssignedTo || [])
        setOriginalLeadedBy(taskData.LeadedBy || [])

        setIsLoadingTask(false)
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        showError('Error al cargar la tarea', errorMessage)
        setIsLoadingTask(false)
      }
    }

    loadTaskData()
  }, [isOpen, isEditMode, taskId, showError])

  // Reset when closing
  useEffect(() => {
    if (!isOpen) {
      setInitialData(null)
      setIsLoadingTask(false)
      setOriginalAssignedTo([])
      setOriginalLeadedBy([])
    }
  }, [isOpen])

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

    try {
      if (isEditMode && taskId) {
        console.log('[TaskDialog] Updating task via API...')

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

        console.log('[TaskDialog] API form data prepared for update:', apiFormData);
        const response = await taskService.updateTask(taskId, apiFormData)

        if (!response.success) {
          throw new Error(response.error || 'Error al actualizar la tarea')
        }

        console.log('[TaskDialog] Task updated successfully')
        showSuccess(`La tarea "${formData.name}" se ha actualizado exitosamente.`)
      } else {
        // CREATE MODE - Use API
        console.log('[TaskDialog] Creating task via API...')

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
          objectives: '',
          LeadedBy: formData.LeadedBy,
          AssignedTo: formData.AssignedTo || [],
        }

        console.log('[TaskDialog] API form data prepared:', apiFormData);
        const response = await taskService.createTask(apiFormData, user.id)

        if (!response.success) {
          throw new Error(response.error || 'Error al crear la tarea')
        }

        console.log('[TaskDialog] Task created successfully')
        showSuccess(`La tarea "${formData.name}" se ha creado exitosamente.`)
      }

      onTaskCreated()
      onOpenChange(false)

      // Reload the page after a short delay to show the toast notification
      setTimeout(() => {
        window.location.reload()
      }, 1500)
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
        isLoading={isLoadingTask}
        isSubmitting={isSubmitting}
        loadingMessage="Cargando información de la tarea..."
        onCancel={handleCancel}
        footer={customFooter}
        size="xl"
        closeOnOverlayClick={false}
      >
        <TaskForm
          clients={clients}
          users={users}
          onSubmit={handleSubmit}
          onCreateClient={handleCreateClient}
          initialData={initialData}
        />
      </CrudDialog>

      <ClientDialog
        isOpen={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        onClientCreated={handleClientCreated}
        mode="create"
      />
    </>
  )
}
