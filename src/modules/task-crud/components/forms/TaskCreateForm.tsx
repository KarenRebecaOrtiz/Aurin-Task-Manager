"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/buttons";
import { CrystalInput } from "@/components/ui/inputs/crystal-input"
import { CrystalSearchableDropdown, type CrystalDropdownItem } from "@/components/ui/inputs/crystal-searchable-dropdown"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Mock data - reemplazar con datos reales
const mockUsers: CrystalDropdownItem[] = [
  { id: "1", name: "Ana García", subtitle: "Product Manager", imageUrl: "/diverse-woman-portrait.png" },
  { id: "2", name: "Carlos Ruiz", subtitle: "Desarrollador Senior", imageUrl: "/man.jpg" },
  { id: "3", name: "María López", subtitle: "Diseñadora UX", imageUrl: "/diverse-woman-portrait.png" },
  { id: "4", name: "Juan Pérez", subtitle: "Desarrollador Frontend", imageUrl: "/man.jpg" },
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

const priorities = [
  {
    id: "baja",
    value: "baja",
    title: "Baja",
    description: "No requiere atención inmediata. Puede completarse cuando haya tiempo disponible.",
    color: "bg-blue-500"
  },
  {
    id: "media",
    value: "media",
    title: "Media",
    description: "Debe completarse en el plazo establecido. Requiere seguimiento regular.",
    color: "bg-amber-500"
  },
  {
    id: "alta",
    value: "alta",
    title: "Alta",
    description: "Requiere atención urgente. Debe priorizarse sobre otras tareas.",
    color: "bg-red-500"
  }
]

interface TaskFormData {
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

interface TaskCreateFormProps {
  onSubmit?: (data: TaskFormData) => void
  onCancel?: () => void
}

export function TaskCreateForm({ onSubmit, onCancel }: TaskCreateFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(formData)
  }, [formData, onSubmit])

  const handleAccountChange = useCallback((selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, account: selectedIds[0] || "" }))
  }, [])

  const handleProjectChange = useCallback((selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, project: selectedIds[0] || "" }))
  }, [])

  const handleTaskNameChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, taskName: value }))
  }, [])

  const handleDescriptionChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, description: value }))
  }, [])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleDescriptionChange(e.target.value)
  }, [handleDescriptionChange])

  const handleProjectLeaderChange = useCallback((selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, projectLeader: selectedIds[0] || "" }))
  }, [])

  const handleCollaboratorsChange = useCallback((selectedIds: string[]) => {
    setFormData(prev => ({ ...prev, collaborators: selectedIds }))
  }, [])

  const handlePriorityChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, priority: value }))
  }, [])

  const accountItems: CrystalDropdownItem[] = mockAccounts.map(acc => ({
    id: acc.id,
    name: acc.name
  }))

  const projectItems: CrystalDropdownItem[] = mockProjects.map(proj => ({
    id: proj.id,
    name: proj.name
  }))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Cuenta Asignada */}
        <CrystalSearchableDropdown
          items={accountItems}
          selectedItems={formData.account ? [formData.account] : []}
          onSelectionChange={handleAccountChange}
          label="Cuenta Asignada *"
          placeholder="Selecciona una cuenta"
          multiple={false}
        />

        {/* Carpeta/Proyecto */}
        <CrystalSearchableDropdown
          items={projectItems}
          selectedItems={formData.project ? [formData.project] : []}
          onSelectionChange={handleProjectChange}
          label="Carpeta/Proyecto *"
          placeholder="Selecciona una carpeta"
          multiple={false}
        />

        {/* Nombre de la tarea */}
        <div className="sm:col-span-2">
          <CrystalInput
            label="Nombre de la tarea *"
            placeholder="Ingresa el nombre de la tarea"
            value={formData.taskName}
            onChange={handleTaskNameChange}
            required
          />
        </div>

        {/* Descripción y Objetivos */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-2">
            Descripción y Objetivos *
          </label>
          <textarea
            placeholder="Describe los objetivos y alcance de la tarea"
            className="w-full min-h-[100px] px-3 py-2 border rounded-md"
            value={formData.description}
            onChange={handleTextareaChange}
            required
          />
        </div>

        {/* Líder de proyecto */}
        <CrystalSearchableDropdown
          items={mockUsers}
          selectedItems={formData.projectLeader ? [formData.projectLeader] : []}
          onSelectionChange={handleProjectLeaderChange}
          label="Líder de proyecto"
          placeholder="Selecciona un líder"
          multiple={false}
        />

        {/* Colaboradores */}
        <CrystalSearchableDropdown
          items={mockUsers}
          selectedItems={formData.collaborators}
          onSelectionChange={handleCollaboratorsChange}
          label="Colaboradores"
          placeholder="Selecciona colaboradores"
          multiple={true}
        />

        {/* Prioridad */}
        <div className="sm:col-span-2 space-y-4">
          <Label className="font-medium">Prioridad</Label>
          <RadioGroup
            value={formData.priority}
            onValueChange={handlePriorityChange}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {priorities.map((priority) => (
              <div
                key={priority.id}
                className="border-input has-data-[state=checked]:border-ring relative flex flex-col gap-2 rounded-md border p-4 shadow-sm outline-none hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem
                    id={priority.id}
                    value={priority.value}
                    className="after:absolute after:inset-0"
                  />
                  <Label
                    htmlFor={priority.id}
                    className="block text-sm font-medium text-foreground cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2 w-2 rounded-full", priority.color)} />
                      {priority.title}
                    </div>
                  </Label>
                </div>
                <p className="ml-6 text-xs text-muted-foreground leading-relaxed">
                  {priority.description}
                </p>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button
          type="button"
          intent="outline"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button type="submit" intent="primary" className="w-full sm:w-auto">
          Crear Tarea
        </Button>
      </div>
    </form>
  )
}
