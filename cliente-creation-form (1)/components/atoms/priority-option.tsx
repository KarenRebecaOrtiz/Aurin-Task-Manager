import { Label } from "@/components/ui/label"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { scaleIn } from "@/lib/animations"

interface PriorityOptionProps {
  id: string
  value: string
  title: string
  description: string
  color: string
}

export function PriorityOption({ id, value, title, description, color }: PriorityOptionProps) {
  return (
    <motion.div 
      variants={scaleIn}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="border-input has-data-[state=checked]:border-ring relative flex flex-col gap-2 rounded-md border p-4 shadow-sm outline-none hover:bg-accent/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <RadioGroupItem
          id={id}
          value={value}
          className="after:absolute after:inset-0"
        />
        <Label
          htmlFor={id}
          className="block text-sm font-medium text-foreground cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", color)} />
            {title}
          </div>
        </Label>
      </div>
      <p className="ml-6 text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </motion.div>
  )
}
