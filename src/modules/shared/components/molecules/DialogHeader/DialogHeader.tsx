"use client"

import { X } from "lucide-react"

export interface DialogHeaderProps {
  title: string
  description: string
  showCloseButton?: boolean
  className?: string
}

/**
 * Componente reutilizable para el header de dialogs
 * Incluye título, descripción y botón de cerrar
 * 
 * @example
 * <DialogHeader
 *   title="Crear Tarea"
 *   description="Completa el formulario para crear una nueva tarea"
 *   showCloseButton={true}
 * />
 */
export function DialogHeader({
  title,
  description,
  showCloseButton = true,
  className = "",
}: DialogHeaderProps) {
  return (
    <div className={`relative px-6 pt-6 pb-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-[18px] font-bold leading-tight text-gray-900 dark:!text-white">
            {title}
          </h2>
          <p className="text-[12px] mt-2 text-gray-600 dark:!text-gray-300">
            {description}
          </p>
        </div>
        {showCloseButton && (
          <button
            type="button"
            className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="sr-only">Cerrar</span>
          </button>
        )}
      </div>
    </div>
  )
}
