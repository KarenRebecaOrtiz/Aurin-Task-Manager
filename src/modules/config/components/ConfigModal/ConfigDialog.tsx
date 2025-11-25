"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui"
import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import { useSonnerToast } from "@/modules/sonner/hooks/useSonnerToast"
import { useProfileForm } from "../../hooks"
import { useConfigPageStore } from "../../stores"
import { ConfigForm } from "./ConfigForm"
import { ProfileHeader } from "../header"
import { SaveActions } from "../ui"
import styles from "./ConfigDialog.module.scss"

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
}

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${styles.dialogContent} flex flex-col w-full h-[90vh] p-0 gap-0 !border-none overflow-hidden rounded-lg shadow-xl`}>
        <VisuallyHidden>
          <DialogTitle>Configuración de Perfil</DialogTitle>
        </VisuallyHidden>
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full flex flex-col h-full"
            >
              <ProfileHeader
                userId={userId}
                isOwnProfile={user.id === userId}
                onSuccess={showSuccess}
                onError={showError}
              />
              <div className={`${styles.scrollableContent} flex-1 min-h-0`}>
                <ConfigForm
                  userId={userId}
                  onSuccess={showSuccess}
                  onError={showError}
                />
              </div>
              <div className={styles.stickyFooter}>
                <SaveActions
                  hasChanges={hasUnsavedChanges}
                  isSaving={isSaving}
                  onSave={handleSubmit}
                  onDiscard={handleDiscard}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
