"use client"

import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface FormHeaderProps {
  title: string
  description: string
}

export function FormHeader({ title, description }: FormHeaderProps) {
  return (
    <DialogHeader className="px-6 pt-6 pb-4">
      <DialogTitle className="text-[28px] font-bold leading-tight text-gray-900 dark:!text-white">
        {title}
      </DialogTitle>
      <DialogDescription className="text-[15px] mt-2 text-gray-600 dark:!text-gray-300">
        {description}
      </DialogDescription>
    </DialogHeader>
  )
}
