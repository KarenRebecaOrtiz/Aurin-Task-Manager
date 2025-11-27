"use client"

import { Button } from "@/components/ui/buttons"
import { Small } from "@/components/ui/Typography"

interface FormFooterProps {
  onCancel: () => void
  isLoading: boolean
  submitText?: string
}

export function FormFooter({ onCancel, isLoading, submitText = "Crear Tarea" }: FormFooterProps) {
  const loadingText = submitText === "Actualizar" ? "Actualizando..." : "Creando..."

  const handleSubmitClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('[FormFooter] Submit button clicked', e)
  }

  return (
    <div className="flex justify-end gap-4 px-6 pb-6 border-gray-200">
      <Button
        type="button"
        intent="outline"
        onClick={onCancel}
        disabled={isLoading}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        intent="primary"
        isLoading={isLoading}
        disabled={isLoading}
        onClick={handleSubmitClick}
      >
        {isLoading ? loadingText : submitText}
      </Button>
    </div>
  )
}
