"use client"

import { useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useSonnerToast } from "@/modules/sonner/hooks/useSonnerToast"
import { CrudDialog, DialogHeader, DialogActions } from "@/modules/dialogs"
import { useConfigPageStore } from "../../stores"
import { useProfileFormStore } from "../../stores"
import { useProfileForm } from "../../hooks"
import { ConfigForm } from "./ConfigForm"
import { ProfileHeader } from "../header"
import { MobileLoader } from "../ui"
import ConfigSkeletonLoader from "@/modules/data-views/components/shared/skeleton-loaders/ConfigSkeletonLoader"
import styles from "./ConfigDialog.module.scss"

interface ConfigDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  userId: string
}

export function ConfigDialog({
  isOpen,
  onOpenChange,
  userId,
}: ConfigDialogProps) {
  const { user } = useUser()
  const { success: showSuccess, error: showError } = useSonnerToast()
  const { isLoading, isSaving } = useProfileFormStore()
  const { hasUnsavedChanges } = useConfigPageStore()

  // Callbacks para success/error que se pasan a useProfileForm
  const handleSuccess = useCallback((message: string) => {
    showSuccess(message)
    onOpenChange(false)
  }, [showSuccess, onOpenChange])

  // Hook para manejar el formulario - nos da acceso a handleSubmit y handleDiscard
  const { handleSubmit, handleDiscard } = useProfileForm({
    userId,
    onSuccess: handleSuccess,
    onError: showError,
  })

  // Handler para cancelar
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      handleDiscard()
    }
    onOpenChange(false)
  }, [hasUnsavedChanges, handleDiscard, onOpenChange])

  useEffect(() => {
    if (!isOpen) {
      // Reset tab changes when dialog closes
      useConfigPageStore.getState().clearAllTabChanges()
    }
  }, [isOpen])

  if (!user) {
    return null
  }

  // Footer personalizado con DialogActions
  const customFooter = hasUnsavedChanges ? (
    <DialogActions
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      cancelText="Cancelar"
      submitText={isSaving ? "Guardando..." : "Guardar"}
      isLoading={isSaving}
      submitVariant="primary"
    />
  ) : null

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      mode="edit"
      title="Editar Perfil"
      description="Actualiza tu información pública y detalles de cuenta."
      size="xl"
      footer={customFooter}
      // Use DialogHeader standard + ProfileHeader
      header={
        !isLoading ? (
          <>
            <DialogHeader
              title="Editar Perfil"
              description="Actualiza tu información pública y detalles de cuenta."
            />
            <ProfileHeader
              userId={userId}
              isOwnProfile={user.id === userId}
              onSuccess={showSuccess}
              onError={showError}
            />
          </>
        ) : undefined
      }
    >
      {isLoading ? (
        <>
          {/* Loader para móviles - Centrado y simple */}
          <MobileLoader />
          {/* Skeleton loader para desktop - Oculto en móviles */}
          <div className={styles.desktopLoader}>
            <ConfigSkeletonLoader rows={3} />
          </div>
        </>
      ) : (
        <ConfigForm
          userId={userId}
          onSuccess={handleSuccess}
          onError={showError}
          hideActions
        />
      )}
    </CrudDialog>
  )
}
