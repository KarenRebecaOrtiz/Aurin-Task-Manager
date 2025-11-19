"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"  // shadcn/ui select component
import { FormField } from "../shared"
import { type User, MultiUserSelect } from "../shared"
import { DatePicker } from "../DatePicker/DatePicker"
import { PrioritySelector } from "../shared"
import { motion } from "framer-motion"
import { addDays } from "date-fns"

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

interface Client {
  id: string
  name: string
  projects?: string[]
}

export interface TaskFormData {
  clientId: string
  project: string
  name: string
  description: string
  startDate?: Date
  endDate?: Date
  LeadedBy: string[]
  AssignedTo: string[]
  priority: string
}

interface TaskFormProps {
  clients: Client[]
  users: User[]
  onSubmit?: (data: TaskFormData) => void
  onCancel?: () => void
  isLoading?: boolean
}

export function TaskForm({ 
  clients, 
  users, 
  onSubmit, 
  onCancel,
  isLoading = false 
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    clientId: "",
    project: "",
    name: "",
    description: "",
    startDate: new Date(),
    endDate: addDays(new Date(), 7),
    LeadedBy: [],
    AssignedTo: [],
    priority: "Media"
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(formData)
  }

  const handleClientChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, clientId: value, project: "" }))
  }, [])

  const handleProjectChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, project: value }))
  }, [])

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }))
  }, [])

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }))
  }, [])

  const handleStartDateChange = useCallback((date: Date | undefined) => {
    setFormData(prev => ({ ...prev, startDate: date }))
  }, [])

  const handleEndDateChange = useCallback((date: Date | undefined) => {
    setFormData(prev => ({ ...prev, endDate: date }))
  }, [])


  const handlePriorityChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, priority: value }))
  }, [])

  const handleLeadersChange = useCallback((selected: string[]) => {
    setFormData(prev => ({ ...prev, LeadedBy: selected }))
  }, [])

  const handleCollaboratorsChange = useCallback((selected: string[]) => {
    setFormData(prev => ({ ...prev, AssignedTo: selected }))
  }, [])

  const selectedClient = clients.find(c => c.id === formData.clientId)
  const projectOptions = selectedClient?.projects || []

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
              value={formData.clientId} 
              onValueChange={handleClientChange}
            >
              <SelectTrigger id="account">
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
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
              onValueChange={handleProjectChange}
              disabled={!formData.clientId || projectOptions.length === 0}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="Selecciona una carpeta" />
              </SelectTrigger>
              <SelectContent>
                {projectOptions.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
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
              value={formData.name}
              onChange={handleNameChange}
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
              onChange={handleDescriptionChange}
            />
          </FormField>
        </motion.div>

        {/* Fecha de Inicio */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Fecha de Inicio" required htmlFor="start-date">
            <DatePicker
              value={formData.startDate}
              onChange={handleStartDateChange}
              placeholder="Selecciona fecha de inicio"
            />
          </FormField>
        </motion.div>

        {/* Fecha de Fin */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Fecha de Fin" htmlFor="end-date">
            <DatePicker
              value={formData.endDate}
              onChange={handleEndDateChange}
              placeholder="Selecciona fecha de fin"
            />
          </FormField>
        </motion.div>

        {/* Líder de proyecto */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Líder(es)" htmlFor="project-leader">
            <MultiUserSelect
              users={users}
              selectedUsers={formData.LeadedBy}
              onSelectedUsersChange={handleLeadersChange}
              placeholder="Selecciona líderes"
            />
          </FormField>
        </motion.div>

        {/* Colaboradores */}
        <motion.div className="col-span-full sm:col-span-3" variants={fadeInUp}>
          <FormField label="Colaboradores" htmlFor="collaborators">
            <MultiUserSelect
              users={users}
              selectedUsers={formData.AssignedTo}
              onSelectedUsersChange={handleCollaboratorsChange}
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
              onValueChange={handlePriorityChange}
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
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          className="w-full sm:w-auto"
          disabled={isLoading}
        >
          {isLoading ? 'Creando...' : 'Crear Tarea'}
        </Button>
      </div>
    </form>
  )
}
