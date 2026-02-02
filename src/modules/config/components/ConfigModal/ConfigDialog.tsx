"use client"

import { useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useSonnerToast } from "@/modules/sonner/hooks/useSonnerToast"
import { CrudDialog, DialogActions } from "@/modules/dialogs"
import { useConfigPageStore } from "../../stores"
import { useProfileFormStore } from "../../stores"
import { useProfileForm } from "../../hooks"
import useProfileCardStore from "@/modules/profile-card/stores/profileCardStore"
import { useUserDataStore } from "@/stores/userDataStore"
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
  const invalidateCache = useUserDataStore((state) => state.invalidateCache)

  // Callbacks para success/error que se pasan a useProfileForm
  const handleSuccess = useCallback((message: string) => {
    showSuccess(message)
    
    // Limpiar localStorage para evitar datos stale
    try {
      const dataKey = `configFormData_${userId}`
      const flagKey = `configFormDraft_${userId}_exists`
      localStorage.removeItem(dataKey)
      localStorage.removeItem(flagKey)
    } catch {
      // Ignore localStorage errors
    }
    
    // Invalidar el cache del userDataStore (Single Source of Truth)
    invalidateCache()
    
    // Invalidar el perfil en el ProfileCardStore para que se recargue con los nuevos datos
    useProfileCardStore.getState().invalidateProfile(userId)
    
    // Forzar recarga del store para la próxima apertura
    useProfileFormStore.getState().forceReload()
    onOpenChange(false)
  }, [showSuccess, onOpenChange, userId, invalidateCache])

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
      size="md"
      footer={customFooter}
      // Solo ProfileHeader como en el drawer
      header={
        !isLoading ? (
          <ProfileHeader
            userId={userId}
            isOwnProfile={user.id === userId}
            onSuccess={showSuccess}
            onError={showError}
          />
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
