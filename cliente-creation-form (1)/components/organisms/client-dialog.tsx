"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ClientForm } from "./client-form"
import { Plus } from 'lucide-react'
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { modalVariants } from "@/lib/animations"

export function ClientDialog() {
  const [open, setOpen] = useState(false)

  const handleSubmit = (data: any) => {
    console.log("Datos del formulario:", data)
    // Aquí iría la lógica para enviar los datos
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none bg-transparent shadow-none">
        <AnimatePresence mode="wait">
          {open && (
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
                <ClientForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
