"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { TaskForm, type TaskFormData } from "./TaskForm"
import { ClientDialog } from "./ClientDialog"
import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTaskFormData } from "../../hooks/data/useTaskData"
import { useUser } from "@clerk/nextjs"
import { useSonnerToast } from "@/modules/sonner/hooks/useSonnerToast"
import { updateTaskActivity } from "@/lib/taskUtils"
import { emailNotificationService } from "@/services/emailNotificationService"
import { validateTaskDates } from "../../utils/validation"
import { FormHeader } from "./FormHeader"
import styles from "./TaskDialog.module.scss"

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
}

interface TaskDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onTaskCreated: () => void
  taskId?: string  // Optional: if provided, dialog is in edit mode
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
      } catch (error: any) {
        showError('Error al cargar la tarea', error?.message || 'Error desconocido')
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
    if (!user) {
      showError('Sesión expirada', 'Por favor, inicia sesión nuevamente.')
      return
    }

    // Validate dates
    if (!validateTaskDates(formData.startDate, formData.endDate)) {
      showError('Fechas inválidas', 'La fecha de inicio debe ser anterior a la fecha de finalización.')
      return
    }

    setIsSubmitting(true)

    try {
      const { doc, collection, setDoc, updateDoc, Timestamp } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      if (isEditMode && taskId) {
        // UPDATE MODE
        const taskDocRef = doc(db, 'tasks', taskId)

        const taskData = {
          clientId: formData.clientId,
          project: formData.project,
          name: formData.name,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate,
          LeadedBy: formData.LeadedBy,
          AssignedTo: formData.AssignedTo || [],
          priority: formData.priority,
          status: formData.status,
          updatedAt: Timestamp.fromDate(new Date()),
          updatedBy: user.id,
        }

        await updateDoc(taskDocRef, taskData)
        await updateTaskActivity(taskId, 'edit')

        // Determine new members to notify
        const newLeaders = formData.LeadedBy.filter((id: string) => !originalLeadedBy.includes(id))
        const newMembers = (formData.AssignedTo || []).filter((id: string) => !originalAssignedTo.includes(id))

        const newRecipients = new Set<string>([...newLeaders, ...newMembers])
        newRecipients.delete(user.id)

        // Send notifications only to new members
        if (newRecipients.size > 0) {
          try {
            await emailNotificationService.createEmailNotificationsForRecipients(
              {
                userId: user.id,
                message: `${user.firstName || 'Usuario'} te asignó la tarea ${formData.name}`,
                type: 'task_assignment_changed',
                taskId,
              },
              Array.from(newRecipients)
            )
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('[TaskDialog] Error sending notifications:', error)
          }
        }

        showSuccess(`La tarea "${formData.name}" se ha actualizado exitosamente.`)
      } else {
        // CREATE MODE
        const taskDocRef = doc(collection(db, 'tasks'))
        const newTaskId = taskDocRef.id

        const taskData = {
          clientId: formData.clientId,
          project: formData.project,
          name: formData.name,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate,
          LeadedBy: formData.LeadedBy,
          AssignedTo: formData.AssignedTo || [],
          priority: formData.priority,
          status: formData.status,
          objectives: '',
          CreatedBy: user.id,
          createdAt: Timestamp.fromDate(new Date()),
          id: newTaskId,
        }

        await setDoc(taskDocRef, taskData)
        await updateTaskActivity(newTaskId, 'edit')

        // Send notifications
        const recipients = new Set<string>([
          ...formData.LeadedBy,
          ...(formData.AssignedTo || []),
        ])
        recipients.delete(user.id)

        if (recipients.size > 0) {
          try {
            await emailNotificationService.createEmailNotificationsForRecipients(
              {
                userId: user.id,
                message: `${user.firstName || 'Usuario'} te asignó la tarea ${formData.name}`,
                type: 'task_created',
                taskId: newTaskId,
              },
              Array.from(recipients)
            )
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('[TaskDialog] Error sending notifications:', error)
          }
        }

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
      // eslint-disable-next-line no-console
      console.error('[TaskDialog] Error:', errorMessage)

      const action = isEditMode ? 'actualizar' : 'crear'
      showError(`No se pudo ${action} la tarea`, errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [user, isEditMode, taskId, originalLeadedBy, originalAssignedTo, onTaskCreated, onOpenChange, showSuccess, showError])

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
          <DialogTitle className="sr-only">Cargando tarea</DialogTitle>
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
          <DialogTitle className="sr-only">
            {isEditMode ? "Editar Tarea" : "Crear Tarea"}
          </DialogTitle>
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full flex flex-col flex-1 "
              >
                <FormHeader
                  title={isEditMode ? "Editar Tarea" : "Crear Tarea"}
                  description={isEditMode
                    ? "Modifica la información de la tarea existente."
                    : "Completa el formulario para crear una nueva tarea en el sistema."}
                />
                <div className="flex-1  px-6 pb-6">
                  <TaskForm
                    clients={clients}
                    users={users}
                    onSubmit={handleSubmit}
                    isLoading={isSubmitting}
                    onCreateClient={handleCreateClient}
                    initialData={initialData}
                    onCancel={handleCancel}
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
      />
    </>
  )
}
