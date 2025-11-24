"use client"

import { CrystalButton } from "@/modules/shared/components/atoms"
import { Small } from "@/components/ui/Typography"

interface FormFooterProps {
  onCancel: () => void
  isLoading: boolean
  submitText?: string
}

export function FormFooter({ onCancel, isLoading, submitText = "Crear Tarea" }: FormFooterProps) {
  const loadingText = submitText === "Actualizar" ? "Actualizando..." : "Creando..."

  return (
    <div className="flex justify-end gap-4 px-6 pb-6 border-gray-200">
      <CrystalButton
        type="button"
        variant="secondary"
        size="medium"
        onClick={onCancel}
        disabled={isLoading}
      >
        <Small>Cancelar</Small>
      </CrystalButton>
      <CrystalButton
        type="submit"
        variant="primary"
        size="medium"
        loading={isLoading}
        disabled={isLoading}
        icon="/circle-plus.svg"
      >
        <Small>{isLoading ? loadingText : submitText}</Small>
      </CrystalButton>
    </div>
  )
}
