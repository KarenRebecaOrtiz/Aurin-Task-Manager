"use client"

import { useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useSonnerToast } from "@/modules/sonner/hooks/useSonnerToast"
import { CrudDialog, DialogHeader } from "@/modules/dialogs"
import { useProfileForm } from "../../hooks"
import { useConfigPageStore } from "../../stores"
import { ConfigForm } from "./ConfigForm"
import { ProfileHeader } from "../header"
import { SaveActions } from "../ui"

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
  const { hasUnsavedChanges } = useConfigPageStore()

  const { handleSubmit, handleDiscard, isSaving } = useProfileForm({
    userId,
    onSuccess: (message) => {
      showSuccess(message)
      onOpenChange(false)
    },
    onError: showError,
  })

  useEffect(() => {
    if (!isOpen) {
      // Reset tab changes when dialog closes
      useConfigPageStore.getState().clearAllTabChanges()
    }
  }, [isOpen])

  if (!user) {
    return null
  }

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      mode="edit"
      title="Editar Perfil"
      description="Actualiza tu información pública y detalles de cuenta."
      size="xl"
      // Use DialogHeader standard + ProfileHeader
      header={
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
      }
      footer={
        <SaveActions
          hasChanges={hasUnsavedChanges}
          isSaving={isSaving}
          onSave={handleSubmit}
          onDiscard={handleDiscard}
        />
      }
    >
      <ConfigForm
        userId={userId}
        onSuccess={showSuccess}
        onError={showError}
      />
    </CrudDialog>
  )
}
