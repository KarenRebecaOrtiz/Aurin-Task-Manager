"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TaskCreateForm } from "./TaskCreateForm"
import { Plus } from 'lucide-react'
import { useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"

export interface TaskFormData {
  account: string
  project: string
  taskName: string
  description: string
  startDate?: Date
  endDate?: Date
  projectLeader: string
  collaborators: string[]
  priority: string
}

interface TaskCreateDialogProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onTaskCreated?: (data: TaskFormData) => void
}

export function TaskCreateDialog({ isOpen, onOpenChange, onTaskCreated }: TaskCreateDialogProps) {
  const [open, setOpen] = useState(isOpen ?? false)

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }, [onOpenChange])

  const handleSubmit = useCallback((data: TaskFormData) => {
    onTaskCreated?.(data)
    handleOpenChange(false)
  }, [onTaskCreated, handleOpenChange])

  const handleCancel = useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 border-none bg-transparent shadow-none overflow-visible">
        <VisuallyHidden.Root>
          <DialogTitle>Alta de Tarea</DialogTitle>
        </VisuallyHidden.Root>
        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-background rounded-lg shadow-lg w-full flex flex-col max-h-[90vh]"
            >
              <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                <h2 className="text-2xl font-semibold">Alta de Tarea</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Completa el formulario para crear una nueva tarea en el sistema.
                </p>
              </div>
              <div className="px-6 pb-6 overflow-y-auto flex-1">
                <TaskCreateForm onSubmit={handleSubmit} onCancel={handleCancel} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
