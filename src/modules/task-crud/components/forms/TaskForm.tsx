"use client"

import { useState, useCallback, useEffect } from "react"
import { CrystalInput } from "@/components/ui/inputs/crystal-input"
import { CrystalSearchableDropdown } from "@/components/ui/inputs/crystal-searchable-dropdown"
import { CrystalCalendarDropdown } from "@/components/ui/inputs/crystal-calendar-dropdown"
import { type User } from "../shared"
import { ChipSelector } from "./ChipSelector"
import { motion } from "framer-motion"
import { addDays } from "date-fns"
import { FormSection } from "./FormSection"
import Image from "next/image"

const PRIORITY_OPTIONS = [
  { value: "Baja", label: "Baja" },
  { value: "Media", label: "Media" },
  { value: "Alta", label: "Alta" }
]

const STATUS_OPTIONS = [
  { value: 'Por Iniciar', label: 'Por Iniciar' },
  { value: 'En Proceso', label: 'En Proceso' },
  { value: 'Backlog', label: 'Backlog' },
  { value: 'Por Finalizar', label: 'Por Finalizar' },
  { value: 'Finalizado', label: 'Finalizado' }
]

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
  imageUrl?: string
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
  status: string
}

interface TaskFormProps {
  clients: Client[]
  users: User[]
  onSubmit?: (data: TaskFormData) => void
  onCreateClient?: () => void
  initialData?: TaskFormData | null
  isViewMode?: boolean
}

export function TaskForm({
  clients,
  users,
  onSubmit,
  onCreateClient,
  initialData = null,
  isViewMode = false,
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>(
    initialData || {
      clientId: "",
      project: "",
      name: "",
      description: "",
      startDate: new Date(),
      endDate: addDays(new Date(), 7),
      LeadedBy: [],
      AssignedTo: [],
      priority: "Media",
      status: "Por Iniciar"
    }
  )

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isViewMode) {
      onSubmit?.(formData)
    }
  }

  const handleClientChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, clientId: value, project: "" }))
  }, [])

  const handleProjectChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, project: value }))
  }, [])

  const handleNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, name: value }))
  }, [])

  const handleDescriptionChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, description: value }))
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

  const handleStatusChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, status: value }))
  }, [])

  const handleLeadersChange = useCallback((selected: string[]) => {
    setFormData(prev => ({ ...prev, LeadedBy: selected }))
  }, [])

  const handleCollaboratorsChange = useCallback((selected: string[]) => {
    setFormData(prev => ({ ...prev, AssignedTo: selected }))
  }, [])

  const selectedClient = clients.find(c => c.id === formData.clientId)
  const projectOptions = selectedClient?.projects || []

  const getTeamMember = (userId: string) => users.find(u => u.id === userId)

  return (
    <form id="task-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
      <motion.div
        className="flex flex-col gap-4"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {isViewMode && (
          <FormSection>
            <motion.div variants={fadeInUp} className="md:col-span-2 flex items-center gap-4">
              <div className="flex -space-x-4 rtl:space-x-reverse">
                {formData.LeadedBy.map(userId => getTeamMember(userId)).filter(Boolean).map(user => (
                  <Image
                    key={user!.id}
                    className="w-10 h-10 border-2 border-white rounded-full dark:border-gray-800"
                    src={user!.imageUrl || '/public/aurin.jpg'}
                    alt={user!.fullName}
                    width={40}
                    height={40}
                  />
                ))}
                {formData.AssignedTo.map(userId => getTeamMember(userId)).filter(Boolean).map(user => (
                  <Image
                    key={user!.id}
                    className="w-10 h-10 border-2 border-white rounded-full dark:border-gray-800"
                    src={user!.imageUrl || '/public/aurin.jpg'}
                    alt={user!.fullName}
                    width={40}
                    height={40}
                  />
                ))}
              </div>
            </motion.div>
          </FormSection>
        )}

        <FormSection>
          <motion.div variants={fadeInUp} className="md:col-span-2">
            <CrystalInput
              label="Nombre de la tarea *"
              type="text"
              id="task-name"
              name="task-name"
              required
              placeholder="Ej. Rediseño de Landing Page Q3"
              value={formData.name}
              onChange={handleNameChange}
              disabled={isViewMode}
              variant="no-icon"
            />
          </motion.div>

          <motion.div variants={fadeInUp} className="md:col-span-2">
            <CrystalInput
              label="Descripción y Objetivos *"
              type="text"
              id="description"
              name="description"
              required
              placeholder="Describe los objetivos y alcance de la tarea"
              value={formData.description}
              onChange={handleDescriptionChange}
              disabled={isViewMode}
              variant="no-icon"
            />
          </motion.div>
        </FormSection>

        <FormSection>
          <motion.div className="flex-1" variants={fadeInUp}>
            <CrystalSearchableDropdown
              label="Cuenta Asignada *"
              items={clients.map(client => ({
                id: client.id,
                name: client.name,
                imageUrl: client.imageUrl,
                subtitle: `${client.projects?.length || 0} proyectos`
              }))}
              selectedItems={formData.clientId ? [formData.clientId] : []}
              onSelectionChange={(selectedIds) => handleClientChange(selectedIds[0] || "")}
              placeholder="Selecciona una cuenta"
              searchPlaceholder="Buscar cuenta..."
              emptyMessage="No hay cuentas disponibles"
              fieldType="client"
              onCreateNew={onCreateClient}
              createNewLabel="Crear nueva cuenta"
              disabled={isViewMode}
              variant="no-icon"
            />
          </motion.div>

          <motion.div className="flex-1" variants={fadeInUp}>
            <CrystalSearchableDropdown
              label="Carpeta/Proyecto *"
              items={projectOptions.map(project => ({
                id: project,
                name: project,
                svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><style>.cls-1{fill:#0072ff;}</style></defs><title>folder</title><g id="Layer_2" data-name="Layer 2"><path class="cls-1" d="M52,16H34a5.27,5.27,0,0,1-3.77-1.59l-3.9-4A8,8,0,0,0,20.58,8H12a8,8,0,0,0-8,8V52a8,8,0,0,0,8,8H52a8,8,0,0,0,8-8V24A8,8,0,0,0,52,16Z"/></g></svg>`
              }))}
              selectedItems={formData.project ? [formData.project] : []}
              onSelectionChange={(selectedIds) => handleProjectChange(selectedIds[0] || "")}
              placeholder="Selecciona una carpeta"
              searchPlaceholder="Buscar carpeta..."
              emptyMessage="No hay carpetas disponibles"
              disabled={isViewMode || !formData.clientId || projectOptions.length === 0}
              fieldType="project"
              variant="no-icon"
            />
          </motion.div>

          <motion.div className="flex-1" variants={fadeInUp}>
            <CrystalSearchableDropdown
              label="Líder(es) *"
              items={users.map(user => ({
                id: user.id,
                name: user.fullName,
                imageUrl: user.imageUrl,
                subtitle: user.role || ''
              }))}
              selectedItems={formData.LeadedBy}
              onSelectionChange={handleLeadersChange}
              placeholder="Selecciona líderes"
              searchPlaceholder="Buscar usuario..."
              emptyMessage="No hay usuarios disponibles"
              multiple={true}
              fieldType="user"
              disabled={isViewMode}
              variant="no-icon"
            />
          </motion.div>

          <motion.div className="flex-1" variants={fadeInUp}>
            <CrystalSearchableDropdown
              label="Colaboradores"
              items={users.map(user => ({
                id: user.id,
                name: user.fullName,
                imageUrl: user.imageUrl,
                subtitle: user.role || ''
              }))}
              selectedItems={formData.AssignedTo}
              onSelectionChange={handleCollaboratorsChange}
              placeholder="Selecciona colaboradores"
              searchPlaceholder="Buscar usuario..."
              emptyMessage="No hay usuarios disponibles"
              multiple={true}
              fieldType="user"
              disabled={isViewMode}
              variant="no-icon"
            />
          </motion.div>
        </FormSection>

        <FormSection>
          <motion.div className="flex-1" variants={fadeInUp}>
            <CrystalCalendarDropdown
              label="Fecha de Inicio *"
              value={formData.startDate}
              onChange={handleStartDateChange}
              placeholder="Selecciona fecha de inicio"
              disabled={isViewMode}
              variant="no-icon"
            />
          </motion.div>

          <motion.div className="flex-1" variants={fadeInUp}>
            <CrystalCalendarDropdown
              label="Fecha de Fin"
              value={formData.endDate}
              onChange={handleEndDateChange}
              placeholder="Selecciona fecha de fin"
              minDate={formData.startDate}
              disabled={isViewMode}
              variant="no-icon"
            />
          </motion.div>
        </FormSection>

        <FormSection>
          <motion.div className="flex-1" variants={fadeInUp}>
            <ChipSelector
              label="Prioridad *"
              options={PRIORITY_OPTIONS}
              value={formData.priority}
              onChange={handlePriorityChange}
              required
              disabled={isViewMode}
            />
          </motion.div>

          <motion.div className="flex-1" variants={fadeInUp}>
            <ChipSelector
              label="Estado Inicial *"
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={handleStatusChange}
              required
              disabled={isViewMode}
            />
          </motion.div>
        </FormSection>
      </motion.div>
    </form>
  )
}
