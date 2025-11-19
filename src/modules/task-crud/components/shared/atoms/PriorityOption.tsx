"use client"

import { RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

interface PriorityOptionProps {
  id: string
  value: string
  title: string
  description: string
  color: string
}

export function PriorityOption({ id, value, title, description, color }: PriorityOptionProps) {
  return (
    <label
      htmlFor={id}
      className="relative flex flex-col gap-3 rounded-lg border border-input p-4 cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <RadioGroupItem value={value} id={id} className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", color)} />
            <span className="font-medium text-sm">{title}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </label>
  )
}
