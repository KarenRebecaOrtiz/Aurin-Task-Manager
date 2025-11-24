"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useUser } from "@clerk/nextjs"
import { useSonnerToast } from "@/modules/sonner/hooks/useSonnerToast"
import { FormHeader } from "./FormHeader"
import { CrystalButton } from "@/modules/shared/components/atoms"
import { Small } from "@/components/ui/Typography"
import { CrystalInput } from "@/components/ui/inputs/crystal-input"
import { FormSection } from "./FormSection"
import styles from "./TaskDialog.module.scss"
import Image from "next/image"
import { invalidateClientsCache } from "@/lib/cache-utils"

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

interface ClientDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onClientCreated: () => void
}

export function ClientDialog({
  isOpen,
  onOpenChange,
  onClientCreated,
}: ClientDialogProps) {
  const { user } = useUser()
  const { success: showSuccess, error: showError } = useSonnerToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientName, setClientName] = useState("")
  const [projects, setProjects] = useState<string[]>([""])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("/empty-image.png")

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validExtensions = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!validExtensions.includes(file.type)) {
        showError('Formato inválido', 'Por favor, selecciona un archivo de imagen válido (jpg, jpeg, png, gif).')
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setImageFile(file)
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [showError])

  const handleProjectChange = useCallback((index: number, value: string) => {
    setProjects(prev => prev.map((project, i) => (i === index ? value : project)))
  }, [])

  const handleAddProject = useCallback(() => {
    setProjects(prev => [...prev, ""])
  }, [])

  const handleRemoveProject = useCallback((index: number) => {
    setProjects(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!user) {
      showError('Sesión expirada', 'Por favor, inicia sesión nuevamente.')
      return
    }

    if (!clientName.trim()) {
      showError('Campo requerido', 'Por favor, ingresa el nombre del cliente.')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload image if provided
      let imageUrl = '/empty-image.png'
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        formData.append('userId', user.id)
        formData.append('type', 'profile')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: { 'x-clerk-user-id': user.id },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to upload image')
        }

        const { url } = await response.json()
        imageUrl = url
      }

      // Create client in Firestore
      const { doc, collection, setDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')

      const clientDocRef = doc(collection(db, 'clients'))
      const clientId = clientDocRef.id

      const clientData = {
        id: clientId,
        name: clientName,
        imageUrl,
        projects: projects.filter(p => p.trim()),
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        isActive: true,
      }

      await setDoc(clientDocRef, clientData)

      // Invalidate clients cache
      invalidateClientsCache()

      showSuccess(`El cliente "${clientName}" se ha creado exitosamente.`)

      // Reset form
      setClientName("")
      setProjects([""])
      setImageFile(null)
      setImagePreview("/empty-image.png")

      onClientCreated()
      onOpenChange(false)

      // Reload to show the new client
      window.location.reload()
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido'
      showError('No se pudo crear el cliente', errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [user, clientName, projects, imageFile, onClientCreated, onOpenChange, showSuccess, showError])

  const handleCancel = useCallback(() => {
    // Reset form
    setClientName("")
    setProjects([""])
    setImageFile(null)
    setImagePreview("/empty-image.png")
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${styles.dialogContent} flex flex-col w-full h-[90vh] p-0 gap-0 !border-none overflow-hidden rounded-lg shadow-xl`}>
        <DialogTitle className="sr-only">Crear Nueva Cuenta</DialogTitle>
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full flex flex-col flex-1"
            >
              <FormHeader
                title="Crear Nueva Cuenta"
                description="Completa el formulario para crear una nueva cuenta en el sistema."
              />
              <div className="flex-1 px-6 pb-6 overflow-y-auto">
                <div className="flex flex-col gap-4">
                  <FormSection>
                    {/* Image Upload */}
                    <motion.div variants={fadeInUp} className="md:col-span-2 flex justify-center">
                      <div
                        className="relative w-32 h-32 rounded-full overflow-hidden cursor-pointer border-2 border-gray-200 hover:border-blue-500 transition-colors"
                        onClick={() => document.getElementById('client-image-input')?.click()}
                      >
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                        <input
                          id="client-image-input"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif"
                          style={{ display: 'none' }}
                          onChange={handleImageChange}
                          disabled={isSubmitting}
                        />
                      </div>
                    </motion.div>

                    {/* Client Name */}
                    <motion.div variants={fadeInUp} className="md:col-span-2">
                      <CrystalInput
                        label="Nombre del Cliente *"
                        type="text"
                        id="client-name"
                        name="client-name"
                        required
                        placeholder="Ej. Clínica Azul, Tienda Koala, María González"
                        value={clientName}
                        onChange={setClientName}
                      />
                    </motion.div>
                  </FormSection>

                  <FormSection>
                    {/* Projects */}
                    <motion.div variants={fadeInUp} className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-700 mb-2 block">
                        Proyectos
                      </label>
                      <div className="flex flex-col gap-2">
                        {projects.map((project, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <CrystalInput
                              type="text"
                              placeholder={`Proyecto ${index + 1}`}
                              value={project}
                              onChange={(value) => handleProjectChange(index, value)}
                            />
                            {projects.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveProject(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                                disabled={isSubmitting}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={handleAddProject}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                          disabled={isSubmitting}
                        >
                          + Añadir otro proyecto
                        </button>
                      </div>
                    </motion.div>
                  </FormSection>
                </div>
              </div>
              <div className="flex justify-end gap-4 px-6 pb-6 border-gray-200">
                <CrystalButton
                  type="button"
                  variant="secondary"
                  size="medium"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <Small>Cancelar</Small>
                </CrystalButton>
                <CrystalButton
                  type="button"
                  variant="primary"
                  size="medium"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  icon="/circle-plus.svg"
                >
                  <Small>{isSubmitting ? "Creando..." : "Crear Cliente"}</Small>
                </CrystalButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
