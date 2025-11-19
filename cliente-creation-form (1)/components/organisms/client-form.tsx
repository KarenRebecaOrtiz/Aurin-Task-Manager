"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { FormField } from "@/components/atoms/form-field"
import { UserSelect, type User } from "@/components/molecules/user-select"
import { MultiUserSelect } from "@/components/molecules/multi-user-select"
import { DatePicker } from "@/components/molecules/date-picker"
import { PrioritySelector } from "@/components/molecules/priority-selector"
import { motion } from "framer-motion"
import { fadeInUp, listContainerVariants } from "@/lib/animations"

// Datos de ejemplo
const mockUsers: User[] = [
  { id: "1", name: "Ana García", role: "Product Manager", avatar: "/diverse-woman-portrait.png" },
  { id: "2", name: "Carlos Ruiz", role: "Desarrollador Senior", avatar: "/man.jpg" },
  { id: "3", name: "María López", role: "Diseñadora UX", avatar: "/diverse-woman-portrait.png" },
  { id: "4", name: "Juan Pérez", role: "Desarrollador Frontend", avatar: "/man.jpg" },
]

const mockAccounts = [
  { id: "1", name: "Cuenta Corporativa A" },
  { id: "2", name: "Cuenta Empresarial B" },
  { id: "3", name: "Cuenta Premium C" },
]

const mockProjects = [
  { id: "1", name: "Proyecto Alpha" },
  { id: "2", name: "Proyecto Beta" },
  { id: "3", name: "Proyecto Gamma" },
]

interface ClientFormData {
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

interface ClientFormProps {
  onSubmit?: (data: ClientFormData) => void
  onCancel?: () => void
}

export function ClientForm({ onSubmit, onCancel }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    account: "",
    project: "",
    taskName: "",
    description: "",
    startDate: undefined,
    endDate: undefined,
    projectLeader: "",
    collaborators: [],
    priority: "media"
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <motion.div 
        className="grid grid-cols-1 gap-4 sm:grid-cols-6"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Cuenta Asignada */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Cuenta Asignada" required htmlFor="account">
            <Select 
              value={formData.account} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, account: value }))}
            >
              <SelectTrigger id="account">
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {mockAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </motion.div>

        {/* Carpeta/Proyecto */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Carpeta/Proyecto" required htmlFor="project">
            <Select 
              value={formData.project} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, project: value }))}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Selecciona una carpeta" />
              </SelectTrigger>
              <SelectContent>
                {mockProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </motion.div>

        {/* Nombre de la tarea */}
        <motion.div className="col-span-full" variants={fadeInUp}>
          <FormField label="Nombre de la tarea" required htmlFor="task-name">
            <Input
              type="text"
              id="task-name"
              name="task-name"
              required
              placeholder="Ingresa el nombre de la tarea"
              value={formData.taskName}
              onChange={(e) => setFormData(prev => ({ ...prev, taskName: e.target.value }))}
            />
          </FormField>
        </motion.div>

        {/* Descripción y Objetivos */}
        <motion.div className="col-span-full" variants={fadeInUp}>
          <FormField label="Descripción y Objetivos" required htmlFor="description">
            <Textarea
              id="description"
              name="description"
              required
              placeholder="Describe los objetivos y alcance de la tarea"
              className="min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </FormField>
        </motion.div>

        {/* Fecha de Inicio */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Fecha de Inicio" required htmlFor="start-date">
            <DatePicker
              date={formData.startDate}
              onDateChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
              placeholder="Selecciona fecha de inicio"
            />
          </FormField>
        </motion.div>

        {/* Fecha de Fin */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Fecha de Fin" htmlFor="end-date">
            <DatePicker
              date={formData.endDate}
              onDateChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
              placeholder="Selecciona fecha de fin"
            />
          </FormField>
        </motion.div>

        {/* Líder de proyecto */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Líder de proyecto" htmlFor="project-leader">
            <UserSelect
              users={mockUsers}
              value={formData.projectLeader}
              onValueChange={(value) => setFormData(prev => ({ ...prev, projectLeader: value }))}
              placeholder="Selecciona un líder"
            />
          </FormField>
        </motion.div>

        {/* Colaboradores */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Colaboradores" htmlFor="collaborators">
            <MultiUserSelect
              users={mockUsers}
              selectedUsers={formData.collaborators}
              onSelectedUsersChange={(users) => setFormData(prev => ({ ...prev, collaborators: users }))}
              placeholder="Selecciona colaboradores"
            />
          </FormField>
        </motion.div>

        <motion.div className="col-span-full my-2" variants={fadeInUp}>
          <Separator />
        </motion.div>

        {/* Prioridad */}
        <motion.div className="col-span-full" variants={fadeInUp}>
          <FormField label="Prioridad" htmlFor="priority" className="space-y-4">
            <PrioritySelector
              value={formData.priority}
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
            />
          </FormField>
        </motion.div>
      </motion.div>

      <Separator className="my-6" />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button type="submit" className="w-full sm:w-auto">
          Crear Tarea
        </Button>
      </div>
    </form>
  )
}
