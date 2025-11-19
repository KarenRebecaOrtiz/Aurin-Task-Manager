"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TaskForm, type TaskFormData } from "./TaskForm"
import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTaskFormData } from "../../hooks/data/useTaskData"

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
}

interface TaskDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onTaskCreated: () => void
}

export function TaskDialog({
  isOpen,
  onOpenChange,
  onTaskCreated,
}: TaskDialogProps) {
  const { clients, users } = useTaskFormData()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async (formData: TaskFormData) => {
    try {
      setIsSubmitting(true)
      // TODO: Replace with actual task creation API call
      // Preserve backend connection here
      // formData contains: clientId, project, name, description, startDate, endDate, LeadedBy, AssignedTo, priority
      await new Promise(resolve => setTimeout(resolve, 1000))
      onTaskCreated()
      onOpenChange(false)
    } catch (error) {
      // Error handling will be done with Sonner toast
      // eslint-disable-next-line no-console
      console.error('Error creating task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [onTaskCreated, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none bg-transparent shadow-none">
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-background rounded-lg border shadow-lg w-full overflow-hidden"
            >
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle className="text-2xl">Alta de Tarea</DialogTitle>
                <DialogDescription>
                  Completa el formulario para crear una nueva tarea en el sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="p-6">
                <TaskForm 
                  clients={clients}
                  users={users}
                  onSubmit={handleSubmit} 
                  onCancel={handleCancel}
                  isLoading={isSubmitting}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
