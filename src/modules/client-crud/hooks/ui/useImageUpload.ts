/**
 * Image Upload Hook
 * Handles image file selection and preview
 */

import { useState, useCallback } from 'react';
import { UI_CONSTANTS, TOAST_MESSAGES } from '../../config';

interface UseImageUploadProps {
  onError?: (title: string, description: string) => void;
  initialPreview?: string;
}

export function useImageUpload({ onError, initialPreview }: UseImageUploadProps = {}) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(
    initialPreview || UI_CONSTANTS.IMAGE_PREVIEW_DEFAULT
  );

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!(UI_CONSTANTS.VALID_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      if (onError) {
        onError(
          TOAST_MESSAGES.INVALID_IMAGE.title,
          TOAST_MESSAGES.INVALID_IMAGE.description
        );
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageFile(file);
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [onError]);

  const resetImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(UI_CONSTANTS.IMAGE_PREVIEW_DEFAULT);
  }, []);

  const setPreview = useCallback((url: string) => {
    setImagePreview(url);
  }, []);

  return {
    imageFile,
    imagePreview,
    handleImageChange,
    resetImage,
    setPreview,
  };
}
