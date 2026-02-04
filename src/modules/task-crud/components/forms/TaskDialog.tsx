"use client"

import { Dialog, DialogContent, DialogTitle } from "@/modules/dialogs"
import { VisuallyHidden } from "@/components/ui"
import { TaskForm, type TaskFormData } from "./TaskForm"
import { ClientDialog } from "@/modules/client-crud"
import { ManageProjectsDialog } from "@/modules/dialogs/components/variants/ManageProjectsDialog"
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
import { useAuth } from "@/contexts/AuthContext"
import { useDataStore } from "@/stores/dataStore"
import { Client } from "@/types"

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
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false)
  const [selectedClientForProject, setSelectedClientForProject] = useState<Client | null>(null)
  const { success: showSuccess, error: showError } = useSonnerToast()
  const { isAdmin } = useAuth()

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

    // Guardar estado previo para rollback en caso de error (solo edit mode)
    const previousTaskData = isEditMode && taskId ? useDataStore.getState().getTaskById(taskId) : null

    try {
      if (isEditMode && taskId) {
        // ✅ OPTIMISTIC UPDATE: Actualizar store INMEDIATAMENTE
        useDataStore.getState().updateTask(taskId, {
          ...apiFormData,
          lastActivity: new Date().toISOString(),
        })

        // Cerrar dialog inmediatamente para UX fluida
        onOpenChange(false)
        showSuccess(`La tarea "${formData.name}" se ha actualizado exitosamente.`)

        // Persistir en backend (en background)
        const response = await taskService.updateTask(taskId, apiFormData)

        if (!response.success) {
          throw new Error(response.error || 'Error al actualizar la tarea')
        }
      } else {
        // CREATE MODE - Cerrar dialog y mostrar feedback inmediato
        onOpenChange(false)

        // Llamar API para crear
        const response = await taskService.createTask(apiFormData, userId)

        if (!response.success) {
          throw new Error(response.error || 'Error al crear la tarea')
        }

        // ✅ Agregar tarea al store con el ID real del servidor
        if (response.data) {
          useDataStore.getState().addTask({
            ...response.data,
            id: response.data.id,
          })
        }

        showSuccess(`La tarea "${formData.name}" se ha creado exitosamente.`)
      }

      onTaskCreated()
    } catch (error: any) {
      // ❌ ROLLBACK en caso de error (solo edit mode)
      if (isEditMode && taskId && previousTaskData) {
        useDataStore.getState().updateTask(taskId, previousTaskData)
        // Reabrir dialog para que el usuario pueda reintentar
        onOpenChange(true)
      }
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

  // Track selected client ID from the form for project creation
  const [formClientId, setFormClientId] = useState<string>('')

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
                    onCreateClient={isAdmin ? handleCreateClient : undefined}
                    onCreateProject={isAdmin ? handleCreateProject : undefined}
                    onClientIdChange={setFormClientId}
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
