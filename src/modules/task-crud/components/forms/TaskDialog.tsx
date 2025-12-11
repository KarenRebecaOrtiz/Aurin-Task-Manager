"use client"

import { Dialog, DialogContent, DialogTitle } from "@/modules/dialogs"
import { VisuallyHidden } from "@/components/ui"
import { TaskForm, type TaskFormData } from "./TaskForm"
import { ClientDialog } from "@/modules/client-crud"
import { useState, useCallback, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTaskFormData } from "../../hooks/data/useTaskData"
import { useUserDataStore } from "@/stores/userDataStore"
import { useSonnerToast } from "@/modules/sonner/hooks/useSonnerToast"
import { taskService } from "../../services/taskService"
import { validateTaskDates } from "../../utils/validation"
import { FormFooter } from "./FormFooter"
import { DialogHeader } from "@/modules/dialogs/components/molecules"
import styles from "@/modules/dialogs/styles/Dialog.module.scss"
import { useTaskState } from "@/hooks/useTaskData"

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
}

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
  // ✅ Obtener userId desde userDataStore (Single Source of Truth)
  const userId = useUserDataStore((state) => state.userData?.userId || '')
  const { clients, users } = useTaskFormData()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const { success: showSuccess, error: showError } = useSonnerToast()

  const isEditMode = !!taskId

  // ✅ Use centralized task data store with real-time updates
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

  // ✅ Convert task data to form initial data using useMemo
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

  // ✅ Store original team members for notification comparison (memoized)
  const originalAssignedTo = useMemo(() => taskData?.AssignedTo || [], [taskData?.AssignedTo])
  const originalLeadedBy = useMemo(() => taskData?.LeadedBy || [], [taskData?.LeadedBy])

  const handleSubmit = useCallback(async (formData: TaskFormData) => {
    console.log('[TaskDialog] handleSubmit called with formData:', formData)

    if (!userId) {
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
        const response = await taskService.createTask(apiFormData, userId)

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
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido'
      console.error('[TaskDialog] Error:', errorMessage, error)

      const action = isEditMode ? 'actualizar' : 'crear'
      showError(`No se pudo ${action} la tarea`, errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [userId, isEditMode, taskId, onTaskCreated, onOpenChange, showSuccess, showError])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleCreateClient = useCallback(() => {
    setIsClientDialogOpen(true)
  }, [])

  const handleClientCreated = useCallback(() => {
    // Refresh will happen automatically in ClientDialog
  }, [])

  // Show loading state when loading task data
  if (isLoadingTask) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className={`${styles.dialogContent} flex flex-col w-full h-[90vh] p-0 gap-0 !border-none overflow-hidden rounded-lg shadow-xl`}>
          <VisuallyHidden>
            <DialogTitle>Cargando tarea</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-500">Cargando información de la tarea...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className={`${styles.dialogContent} flex flex-col w-full h-[90vh] p-0 gap-0 !border-none overflow-hidden rounded-lg shadow-xl`}>
          <VisuallyHidden>
            <DialogTitle>{isEditMode ? "Editar Tarea" : "Crear Tarea"}</DialogTitle>
          </VisuallyHidden>
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full flex flex-col h-full"
              >
                <DialogHeader
                  title={isEditMode ? "Editar Tarea" : "Crear Tarea"}
                  description={isEditMode
                    ? "Modifica la información de la tarea existente."
                    : "Completa el formulario para crear una nueva tarea en el sistema."}
                />

                <div className={`${styles.scrollableContent} flex-1 min-h-0 overflow-y-auto`}>
                  <TaskForm
                    clients={clients}
                    users={users}
                    onSubmit={handleSubmit}
                    onCreateClient={handleCreateClient}
                    initialData={initialData}
                  />
                </div>

                <div className={styles.stickyFooter}>
                  <FormFooter
                    onCancel={handleCancel}
                    isLoading={isSubmitting}
                    submitText={isEditMode ? "Actualizar" : "Crear Tarea"}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <ClientDialog
        isOpen={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        onClientCreated={handleClientCreated}
        mode="create"
      />
    </>
  )
}
