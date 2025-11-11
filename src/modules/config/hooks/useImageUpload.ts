/**
 * @module config/hooks/useImageUpload
 * @description Hook para manejar la subida de imágenes de perfil y portada
 */

import { useState, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  uploadProfileImage, 
  uploadCoverImage, 
  deleteImageFromGCS,
  extractFilePathFromUrl,
  isClerkImage,
  isDefaultImage,
  validateImageFile
} from '../utils';
import { useProfileFormStore } from '../stores';

/**
 * Opciones para el hook useImageUpload
 */
interface UseImageUploadOptions {
  /** Callback cuando se sube exitosamente */
  onSuccess?: (message: string) => void;
  /** Callback cuando hay un error */
  onError?: (message: string, error?: string) => void;
}

/**
 * Hook para manejar la subida de imágenes
 */
export const useImageUpload = ({ onSuccess, onError }: UseImageUploadOptions = {}) => {
  const { user: currentUser } = useUser();
  const { formData, updateFormData } = useProfileFormStore();
  const [isUploading, setIsUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);

  /**
   * Maneja la selección de imagen de perfil
   */
  const handleProfilePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar archivo
    const validation = validateImageFile(file, 'profile');
    if (!validation.valid) {
      if (onError) onError(validation.error || 'Archivo no válido');
      return;
    }

    updateFormData({ 
      profilePhotoFile: file,
      profilePhoto: URL.createObjectURL(file) 
    });
  }, [updateFormData, onError]);

  /**
   * Maneja la selección de imagen de portada
   */
  const handleCoverPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar archivo
    const validation = validateImageFile(file, 'cover');
    if (!validation.valid) {
      if (onError) onError(validation.error || 'Archivo no válido');
      return;
    }

    updateFormData({ 
      coverPhotoFile: file,
      coverPhoto: URL.createObjectURL(file) 
    });
  }, [updateFormData, onError]);

  /**
   * Sube la imagen de perfil al servidor
   */
  const uploadProfile = useCallback(async (userId: string, currentPhotoUrl?: string) => {
    if (!formData?.profilePhotoFile) return null;

    try {
      setIsUploading(true);

      // Eliminar imagen anterior si existe
      if (currentPhotoUrl && !isClerkImage(currentPhotoUrl) && !isDefaultImage(currentPhotoUrl, 'profile')) {
        const filePath = extractFilePathFromUrl(currentPhotoUrl);
        if (filePath) {
          await deleteImageFromGCS(filePath);
        }
      }

      // Subir nueva imagen
      const url = await uploadProfileImage(formData.profilePhotoFile, userId);
      
      // Actualizar Clerk si es posible
      if (currentUser) {
        try {
          await currentUser.setProfileImage({ file: formData.profilePhotoFile });
        } catch (error) {
          console.warn('[useImageUpload] Failed to update Clerk profile image:', error);
        }
      }

      return url;
    } catch (error) {
      console.error('[useImageUpload] Error uploading profile image:', error);
      if (onError) onError('Error al subir la imagen de perfil', error instanceof Error ? error.message : 'Error desconocido');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [formData, currentUser, onError]);

  /**
   * Sube la imagen de portada al servidor
   */
  const uploadCover = useCallback(async (userId: string, currentCoverUrl?: string) => {
    if (!formData?.coverPhotoFile) return null;

    try {
      setIsUploading(true);

      // Eliminar imagen anterior si existe
      if (currentCoverUrl && !isDefaultImage(currentCoverUrl, 'cover')) {
        const filePath = extractFilePathFromUrl(currentCoverUrl);
        if (filePath) {
          await deleteImageFromGCS(filePath);
        }
      }

      // Subir nueva imagen
      const url = await uploadCoverImage(formData.coverPhotoFile, userId);
      return url;
    } catch (error) {
      console.error('[useImageUpload] Error uploading cover image:', error);
      if (onError) onError('Error al subir la imagen de portada', error instanceof Error ? error.message : 'Error desconocido');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [formData, onError]);

  /**
   * Abre el selector de imagen de perfil
   */
  const openProfilePhotoSelector = useCallback(() => {
    profilePhotoInputRef.current?.click();
  }, []);

  /**
   * Abre el selector de imagen de portada
   */
  const openCoverPhotoSelector = useCallback(() => {
    coverPhotoInputRef.current?.click();
  }, []);

  /**
   * Elimina la imagen de perfil seleccionada
   */
  const removeProfilePhoto = useCallback(() => {
    updateFormData({ 
      profilePhotoFile: null,
      profilePhoto: currentUser?.imageUrl || '/empty-image.png'
    });
  }, [updateFormData, currentUser]);

  /**
   * Elimina la imagen de portada seleccionada
   */
  const removeCoverPhoto = useCallback(() => {
    updateFormData({ 
      coverPhotoFile: null,
      coverPhoto: '/empty-cover.png'
    });
  }, [updateFormData]);

  return {
    isUploading,
    profilePhotoInputRef,
    coverPhotoInputRef,
    handleProfilePhotoChange,
    handleCoverPhotoChange,
    uploadProfile,
    uploadCover,
    openProfilePhotoSelector,
    openCoverPhotoSelector,
    removeProfilePhoto,
    removeCoverPhoto,
  };
};
