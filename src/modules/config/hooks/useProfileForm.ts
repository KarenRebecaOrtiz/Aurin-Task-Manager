/**
 * @module config/hooks/useProfileForm
 * @description Hook para manejar la lógica del formulario de perfil
 */

import { useCallback, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProfileFormStore } from '../stores';
import { useConfigPageStore } from '../stores';
import { Config } from '../types';
import { validateConfigForm, hasFormErrors } from '../utils';

/**
 * Opciones para el hook useProfileForm
 */
interface UseProfileFormOptions {
  /** ID del usuario */
  userId: string;
  /** Callback cuando se guarda exitosamente */
  onSuccess?: (message: string) => void;
  /** Callback cuando hay un error */
  onError?: (message: string, error?: string) => void;
}

/**
 * Hook para manejar el formulario de perfil
 */
export const useProfileForm = ({ userId, onSuccess, onError }: UseProfileFormOptions) => {
  const { user: currentUser, isLoaded } = useUser();
  const { activeTab } = useConfigPageStore();
  const { 
    formData, 
    errors, 
    isSaving,
    setFormData, 
    updateFormData, 
    setErrors,
    clearError,
    setIsSaving 
  } = useProfileFormStore();

  /**
   * Intenta cargar draft desde localStorage
   */
  useEffect(() => {
    if (!userId) return;

    try {
      const localStorageKey = `configFormData_${userId}`;
      const savedDraft = localStorage.getItem(localStorageKey);

      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        console.log('[useProfileForm] Loaded draft from localStorage');
        setFormData(parsedDraft);
      }
    } catch (err) {
      console.warn('[useProfileForm] Failed to load draft from localStorage:', err);
    }
  }, [userId, setFormData]);

  /**
   * Carga los datos del usuario desde Firestore
   */
  useEffect(() => {
    if (!isLoaded || !userId || !currentUser) return;

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Config & { id: string };
          setFormData({
            userId,
            notificationsEnabled: data.notificationsEnabled || false,
            darkMode: data.darkMode || false,
            emailAlerts: data.emailAlerts || false,
            taskReminders: data.taskReminders || false,
            highContrast: data.highContrast || false,
            grayscale: data.grayscale || false,
            soundEnabled: data.soundEnabled || false,
            fullName: data.fullName || currentUser.fullName || '',
            role: data.role || '',
            description: data.description || '',
            birthDate: data.birthDate || '',
            phone: data.phone?.startsWith('+') ? data.phone.split(' ').slice(1).join('') : data.phone || '',
            phoneLada: data.phone?.startsWith('+') ? data.phone.split(' ')[0] : '+52',
            city: data.city || '',
            gender: data.gender || '',
            portfolio: data.portfolio?.replace(/^https?:\/\//, '') || '',
            stack: data.stack || [],
            teams: data.teams || [],
            profilePhoto: data.profilePhoto || currentUser.imageUrl || '',
            coverPhoto: data.coverPhoto || '/empty-cover.png',
            profilePhotoFile: null,
            coverPhotoFile: null,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            status: data.status || 'Disponible',
            emailPreferences: data.emailPreferences || { 
              messages: true, 
              creation: true, 
              edition: true, 
              timers: true 
            },
            homeLocation: data.personalLocations?.home,
            secondaryLocation: data.personalLocations?.secondary,
            github: data.socialLinks?.github || '',
            linkedin: data.socialLinks?.linkedin || '',
            twitter: data.socialLinks?.twitter || '',
            instagram: data.socialLinks?.instagram || '',
            facebook: data.socialLinks?.facebook || '',
            tiktok: data.socialLinks?.tiktok || '',
          });
        } else {
          // Usuario nuevo, datos por defecto
          setFormData({
            userId,
            notificationsEnabled: false,
            darkMode: false,
            emailAlerts: false,
            taskReminders: false,
            highContrast: false,
            grayscale: false,
            soundEnabled: false,
            fullName: currentUser.fullName || '',
            role: '',
            description: '',
            birthDate: '',
            phone: '',
            phoneLada: '+52',
            city: '',
            gender: '',
            portfolio: '',
            stack: [],
            teams: [],
            profilePhoto: currentUser.imageUrl || '',
            coverPhoto: '/empty-cover.png',
            profilePhotoFile: null,
            coverPhotoFile: null,
            status: 'Disponible',
            emailPreferences: { messages: true, creation: true, edition: true, timers: true },
          });
        }
      },
      (error) => {
        console.error('[useProfileForm] Error loading user data:', error);
        if (onError) onError('Error al cargar los datos del usuario');
      }
    );

    return () => unsubscribe();
  }, [userId, isLoaded, currentUser, setFormData, onError]);

  /**
   * Guarda automáticamente en localStorage cuando cambia formData
   */
  useEffect(() => {
    if (!formData || !userId) return;

    try {
      const localStorageKey = `configFormData_${userId}`;
      localStorage.setItem(localStorageKey, JSON.stringify(formData));
    } catch (err) {
      console.warn('[useProfileForm] Failed to save draft to localStorage:', err);
    }
  }, [formData, userId]);

  /**
   * Maneja el cambio de un campo del formulario
   */
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    updateFormData({ 
      [name]: type === 'checkbox' ? checked : value 
    });
    clearError(name as keyof typeof errors);
    
    // Marcar que hay cambios en el tab actual
    useConfigPageStore.getState().markTabAsChanged(activeTab);
  }, [updateFormData, clearError, activeTab]);

  /**
   * Maneja el cambio del stack tecnológico
   */
  const handleStackChange = useCallback((selectedValues: string[]) => {
    const values = Array.isArray(selectedValues) ? selectedValues : [];
    updateFormData({ stack: values.slice(0, 40) });
    useConfigPageStore.getState().markTabAsChanged(activeTab);
  }, [updateFormData, activeTab]);

  /**
   * Maneja el cambio de equipos
   */
  const handleTeamsChange = useCallback((selectedTeams: string | string[]) => {
    // Convertir a array si es string
    const teamsArray = Array.isArray(selectedTeams) ? selectedTeams : [selectedTeams];

    // Validar y limitar a máximo 3 equipos
    const teams = teamsArray.slice(0, 3);

    updateFormData({ teams });
    useConfigPageStore.getState().markTabAsChanged(activeTab);
  }, [updateFormData, activeTab]);

  /**
   * Maneja el cambio del código de país del teléfono
   */
  const handlePhoneLadaChange = useCallback((value: string) => {
    updateFormData({ phoneLada: value });
    clearError('phone');
    useConfigPageStore.getState().markTabAsChanged(activeTab);
  }, [updateFormData, clearError, activeTab]);

  /**
   * Maneja el cambio del número de teléfono
   */
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const limitedValue = rawValue.slice(0, 10);
    
    updateFormData({ phone: limitedValue });
    clearError('phone');
    useConfigPageStore.getState().markTabAsChanged(activeTab);
  }, [updateFormData, clearError, activeTab]);

  /**
   * Valida el formulario
   */
  const validateForm = useCallback((): boolean => {
    if (!formData) return false;
    
    const validationErrors = validateConfigForm(formData);
    setErrors(validationErrors);
    
    return !hasFormErrors(validationErrors);
  }, [formData, setErrors]);

  /**
   * Guarda los datos del formulario (incluyendo subida de imágenes)
   */
  const handleSubmit = useCallback(async () => {
    if (!formData || !userId || !currentUser) return;

    if (!validateForm()) {
      if (onError) onError('Por favor corrige los errores en el formulario');
      return;
    }

    try {
      setIsSaving(true);

      // Importar dinámicamente las funciones de upload
      const {
        uploadProfileImage,
        uploadCoverImage,
        deleteImageFromGCS,
        extractFilePathFromUrl,
        isClerkImage,
        isDefaultImage
      } = await import('../utils/imageProcessing');

      let profilePhotoUrl = formData.profilePhoto;
      let coverPhotoUrl = formData.coverPhoto;

      // Subir imagen de perfil si hay un archivo nuevo
      if (formData.profilePhotoFile) {
        // Eliminar imagen anterior si existe y no es de Clerk o por defecto
        if (formData.profilePhoto && !isClerkImage(formData.profilePhoto) && !isDefaultImage(formData.profilePhoto, 'profile')) {
          const filePath = extractFilePathFromUrl(formData.profilePhoto);
          if (filePath) {
            try {
              await deleteImageFromGCS(filePath);
            } catch (err) {
              console.warn('[useProfileForm] Failed to delete old profile image:', err);
            }
          }
        }

        // Subir nueva imagen
        profilePhotoUrl = await uploadProfileImage(formData.profilePhotoFile, userId);

        // Actualizar imagen de perfil en Clerk
        try {
          await currentUser.setProfileImage({ file: formData.profilePhotoFile });
        } catch (err) {
          console.warn('[useProfileForm] Failed to update Clerk profile image:', err);
        }
      }

      // Subir imagen de portada si hay un archivo nuevo
      if (formData.coverPhotoFile) {
        // Eliminar imagen anterior si existe y no es por defecto
        if (formData.coverPhoto && !isDefaultImage(formData.coverPhoto, 'cover')) {
          const filePath = extractFilePathFromUrl(formData.coverPhoto);
          if (filePath) {
            try {
              await deleteImageFromGCS(filePath);
            } catch (err) {
              console.warn('[useProfileForm] Failed to delete old cover image:', err);
            }
          }
        }

        // Subir nueva imagen
        coverPhotoUrl = await uploadCoverImage(formData.coverPhotoFile, userId);
      }

      const userDocRef = doc(db, 'users', userId);

      // Preparar datos para guardar
      const dataToSave: Partial<Config> = {
        notificationsEnabled: formData.notificationsEnabled,
        darkMode: formData.darkMode,
        emailAlerts: formData.emailAlerts,
        taskReminders: formData.taskReminders,
        highContrast: formData.highContrast,
        grayscale: formData.grayscale,
        soundEnabled: formData.soundEnabled,
        fullName: formData.fullName,
        role: formData.role,
        description: formData.description,
        birthDate: formData.birthDate,
        phone: formData.phoneLada && formData.phone
          ? `${formData.phoneLada} ${formData.phone}`
          : formData.phone || '',
        city: formData.city,
        gender: formData.gender,
        portfolio: formData.portfolio ? `https://${formData.portfolio}` : '',
        stack: formData.stack,
        teams: formData.teams,
        profilePhoto: profilePhotoUrl,
        coverPhoto: coverPhotoUrl,
        status: formData.status || 'Disponible',
        emailPreferences: formData.emailPreferences,
        personalLocations: {
          home: formData.homeLocation || null,
          secondary: formData.secondaryLocation || null,
        },
        socialLinks: {
          github: formData.github || '',
          linkedin: formData.linkedin || '',
          twitter: formData.twitter || '',
          instagram: formData.instagram || '',
          facebook: formData.facebook || '',
          tiktok: formData.tiktok || '',
        },
      };

      await updateDoc(userDocRef, dataToSave);

      // Limpiar archivos temporales del estado
      updateFormData({
        profilePhotoFile: null,
        coverPhotoFile: null,
        profilePhoto: profilePhotoUrl,
        coverPhoto: coverPhotoUrl,
      });

      // Limpiar localStorage si existe
      try {
        const localStorageKey = `configFormData_${userId}`;
        localStorage.removeItem(localStorageKey);
      } catch (err) {
        console.warn('[useProfileForm] Failed to clear localStorage:', err);
      }

      useConfigPageStore.getState().clearTabChanges(activeTab);

      if (onSuccess) onSuccess('Configuración guardada exitosamente');
    } catch (error) {
      console.error('[useProfileForm] Error saving data:', error);
      if (onError) onError('Error al guardar la configuración', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
    }
  }, [formData, userId, currentUser, validateForm, setIsSaving, updateFormData, activeTab, onSuccess, onError]);

  /**
   * Descarta los cambios y restaura los datos originales
   */
  const handleDiscard = useCallback(() => {
    // Limpiar localStorage
    try {
      const localStorageKey = `configFormData_${userId}`;
      localStorage.removeItem(localStorageKey);
    } catch (err) {
      console.warn('[useProfileForm] Failed to clear localStorage:', err);
    }

    // Limpiar cambios del tab actual
    useConfigPageStore.getState().clearTabChanges(activeTab);

    // Limpiar archivos de imágenes seleccionados
    updateFormData({
      profilePhotoFile: null,
      coverPhotoFile: null,
    });

    // Forzar recarga de datos desde Firestore
    // El efecto principal del hook se encargará de recargar los datos
  }, [userId, activeTab, updateFormData]);

  return {
    formData,
    errors,
    isSaving,
    handleInputChange,
    handleStackChange,
    handleTeamsChange,
    handlePhoneLadaChange,
    handlePhoneChange,
    handleSubmit,
    handleDiscard,
    validateForm,
  };
};
