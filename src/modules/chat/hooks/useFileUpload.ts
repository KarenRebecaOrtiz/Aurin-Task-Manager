/**
 * InputChat Module - File Upload Hook
 *
 * Manages file selection, validation, and upload
 * @module chat/hooks/useFileUpload
 */

'use client';

import { useState, useRef, useCallback } from 'react';

export interface UseFileUploadOptions {
  maxSizeMB?: number;
  allowedExtensions?: string[];
  onError?: (error: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB default
const DEFAULT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];

/**
 * useFileUpload - Manages file upload state
 *
 * Features:
 * - File validation (size, type)
 * - Preview URL generation
 * - Drag-and-drop support
 * - Upload progress tracking
 *
 * @returns File upload state and handlers
 */
export function useFileUpload({
  maxSizeMB = 10,
  allowedExtensions = DEFAULT_EXTENSIONS,
  onError,
}: UseFileUploadOptions = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSize = maxSizeMB * 1024 * 1024;

  // Validate file
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check size
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `El archivo supera los ${maxSizeMB} MB.`,
        };
      }

      // Check extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        return {
          valid: false,
          error: `Extensión no permitida. Permitidas: ${allowedExtensions.join(', ')}`,
        };
      }

      return { valid: true };
    },
    [maxSize, maxSizeMB, allowedExtensions]
  );

  // Select file
  const selectFile = useCallback(
    (selectedFile: File) => {
      const validation = validateFile(selectedFile);

      if (!validation.valid) {
        onError?.(validation.error || 'Archivo inválido');
        return;
      }

      setFile(selectedFile);

      // Generate preview for images
      if (selectedFile.type.startsWith('image/')) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    },
    [validateFile, onError]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        selectFile(selectedFile);
      }
      // Reset input
      if (e.target) e.target.value = '';
    },
    [selectFile]
  );

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        selectFile(droppedFile);
      }
    },
    [selectFile]
  );

  // Remove file
  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setIsUploading(false);
  }, [previewUrl]);

  // Trigger file input click
  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    file,
    previewUrl,
    isDragging,
    uploadProgress,
    isUploading,
    fileInputRef,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemove,
    handleThumbnailClick,
    setUploadProgress,
    setIsUploading,
  };
}
