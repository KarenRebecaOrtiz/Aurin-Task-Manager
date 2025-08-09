import { useState, useRef, useCallback } from 'react';

interface UseImageUploadProps {
  onUpload?: (url: string) => void;
  maxSize?: number; // en bytes
  allowedTypes?: string[];
}

interface UseImageUploadReturn {
  previewUrl: string | null;
  fileName: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isDragging: boolean;
  uploadProgress: number;
  isUploading: boolean;
  handleThumbnailClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemove: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  setIsDragging: (dragging: boolean) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB por defecto
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export const useImageUpload = ({
  onUpload,
  maxSize = MAX_FILE_SIZE,
  allowedTypes = ALLOWED_TYPES,
}: UseImageUploadProps = {}): UseImageUploadReturn => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `El archivo supera el tamaño máximo de ${Math.round(maxSize / 1024 / 1024)}MB`;
    }
    
    if (!allowedTypes.includes(file.type)) {
      return `Tipo de archivo no permitido. Tipos válidos: ${allowedTypes.join(', ')}`;
    }
    
    return null;
  }, [maxSize, allowedTypes]);

  const handleFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      console.error('[useImageUpload] Validation error:', error);
      return;
    }

    setFileName(file.name);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Crear preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Simular progreso de upload para archivos grandes
      if (file.size > 5 * 1024 * 1024) { // 5MB
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);
      } else {
        setUploadProgress(100);
      }

      // Aquí podrías implementar el upload real a tu servidor
      // Por ahora, simulamos el upload
      setTimeout(() => {
        setUploadProgress(100);
        setIsUploading(false);
        if (onUpload) {
          onUpload(url);
        }
      }, 1000);

    } catch (error) {
      console.error('[useImageUpload] Upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [validateFile, onUpload]);

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo
    if (e.target) {
      e.target.value = '';
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileName(null);
    setUploadProgress(0);
    setIsUploading(false);
  }, [previewUrl]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return {
    previewUrl,
    fileName,
    fileInputRef,
    isDragging,
    uploadProgress,
    isUploading,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    setIsDragging,
  };
}; 