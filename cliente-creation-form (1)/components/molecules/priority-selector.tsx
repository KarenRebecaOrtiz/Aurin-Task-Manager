"use client"

import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group"
import { PriorityOption } from "@/components/atoms/priority-option"

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

interface PrioritySelectorProps {
  value?: string
  onValueChange?: (value: string) => void
}

export function PrioritySelector({ value, onValueChange }: PrioritySelectorProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      {priorities.map((priority) => (
        <PriorityOption
          key={priority.id}
          {...priority}
        />
      ))}
    </RadioGroup>
  )
}
