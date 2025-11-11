"use client"

import type React from "react"

import { useState, useCallback } from "react"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx", ".txt"]

export function useImageUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")

  const selectFile = useCallback((f: File) => {
    // Validate file size
    if (f.size > MAX_FILE_SIZE) {
      console.error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
      return
    }

    // Validate extension
    const extension = `.${f.name.split(".").pop()}`.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      console.error(`File type ${extension} not allowed`)
      return
    }

    setFile(f)

    // Generate preview URL for images
    if (f.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(f)
    } else {
      setPreviewUrl("")
    }
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        selectFile(selectedFile)
      }
    },
    [selectFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files?.[0]
      if (droppedFile) {
        selectFile(droppedFile)
      }
    },
    [selectFile],
  )

  const handleRemove = useCallback(() => {
    setFile(null)
    setPreviewUrl("")
  }, [])

  return {
    file,
    previewUrl,
    selectFile,
    handleFileChange,
    handleDrop,
    handleRemove,
  }
}
