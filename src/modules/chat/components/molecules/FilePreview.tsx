/**
 * File Preview - Shared Component
 * 
 * Componente para preview de archivos e imágenes
 * Reutiliza estilos del n8n-chatbot (mejorados)
 * 
 * @module chat/components/molecules/FilePreview
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import styles from '@/modules/n8n-chatbot/styles/components/input-area.module.scss'

export interface FilePreviewProps {
  file: File | null
  onRemove: () => void
  isRecording?: boolean
}

/**
 * FilePreview - Shows preview of attached file with n8n-chatbot styling
 *
 * Features:
 * - Beautiful image preview with thumbnail (64x64)
 * - File info for non-images
 * - Remove button with hover effect
 * - Animated entry/exit
 * - Auto-cleanup of preview URLs
 */
export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  isRecording = false,
}) => {
  const [filePreview, setFilePreview] = useState<string | null>(null)

  // File preview for images
  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setFilePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }

    // Cleanup
    return () => {
      if (filePreview && filePreview.startsWith('blob:')) {
        URL.revokeObjectURL(filePreview)
      }
    }
  }, [file])

  return (
    <AnimatePresence>
      {file && !isRecording && (
        <motion.div
          className={styles.filePreview}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.fileItem}>
            {file.type.startsWith('image/') && filePreview ? (
              <div className={styles.imagePreview}>
                <img src={filePreview} alt={file.name} />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove()
                  }}
                  className={styles.removeImageBtn}
                  type="button"
                  aria-label="Eliminar imagen"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ) : (
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <button
                  onClick={onRemove}
                  className={styles.removeFileBtn}
                  type="button"
                  aria-label="Eliminar archivo"
                >
                  <X className="h-3 w-3 text-neutral-400" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

FilePreview.displayName = 'FilePreview'
