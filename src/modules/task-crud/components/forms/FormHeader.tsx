"use client"

import { DialogHeader } from "@/modules/shared/components/molecules"
import type { DialogHeaderProps } from "@/modules/shared/components/molecules"

/**
 * Alias para mantener compatibilidad backward con FormHeader
 * Usa el componente DialogHeader del módulo shared
 */
export function FormHeader(props: DialogHeaderProps) {
  return <DialogHeader {...props} />
}
