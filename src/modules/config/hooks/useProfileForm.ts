/**
 * @module config/hooks/useProfileForm
 * @description Hook para manejar la lógica del formulario de perfil
 * 
 * IMPORTANTE: Este hook consume datos del userDataStore (Single Source of Truth)
 * y solo hace fallback a Firestore si el store no tiene datos.
 * 
 * Al guardar:
 * - Guarda directamente en Firestore
 * - El onSnapshot del userDataStore detecta el cambio automáticamente
 * - Se invalida el cache local del formulario
 */

import { useCallback, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileFormStore } from '../stores';
import { useConfigPageStore } from '../stores';
import { useUserDataStore } from '@/stores/userDataStore';
import { Config } from '../types';
import {
  validateConfigForm,
  hasFormErrors,
  configCache,
  shouldBypassCache,
  uploadProfileImage,
  uploadCoverImage,
  deleteImageFromBlob,
  deleteImageFromGCS,
  extractFilePathFromUrl,
  isClerkImage,
  isDefaultImage,
  isVercelBlobImage,
  isGCSImage,
} from '../utils';
import { useDebouncedCallback } from '../utils/useDebouncedCallback';

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
 * Transforma datos de Config a ConfigForm
 */
function transformConfigToFormData(data: Config, userId: string, currentUser: any): any {
  return {
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
    github: data.socialLinks?.github || '',
    linkedin: data.socialLinks?.linkedin || '',
    twitter: data.socialLinks?.twitter || '',
    instagram: data.socialLinks?.instagram || '',
    facebook: data.socialLinks?.facebook || '',
    tiktok: data.socialLinks?.tiktok || '',
    whatsapp: data.socialLinks?.whatsapp || '',
  };
}

/**
 * Obtiene datos por defecto para usuario nuevo
 */
function getDefaultFormData(userId: string, currentUser: any): any {
  return {
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
    profilePhoto: currentUser.imageUrl || '',
    coverPhoto: '/empty-cover.png',
    profilePhotoFile: null,
    coverPhotoFile: null,
    status: 'Disponible',
    emailPreferences: { messages: true, creation: true, edition: true, timers: true },
    github: '',
    linkedin: '',
    twitter: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    whatsapp: '',
  };
}

/**
 * Hook para manejar el formulario de perfil
 */
export const useProfileForm = ({ userId, onSuccess, onError }: UseProfileFormOptions) => {
  const { user: currentUser, isLoaded } = useUser();
  const { isSynced } = useAuth();
  const { activeTab } = useConfigPageStore();
  const {
    formData,
    errors,
    isSaving,
    isLoading,
    currentUserId,
    setFormData,
    updateFormData,
    setErrors,
    clearError,
    setIsSaving,
    setIsLoading,
    setCurrentUserId,
  } = useProfileFormStore();

  // Refs estables para callbacks
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Actualizar refs cuando cambian las props
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  /**
   * Verifica si existe un draft en localStorage (optimizado con flag)
   */
  const hasDraft = useCallback((userId: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      const flagKey = `configFormDraft_${userId}_exists`;
      return localStorage.getItem(flagKey) === 'true';
    } catch {
      return false;
    }
  }, []);

  /**
   * Carga draft desde localStorage solo si existe (optimizado)
   */
  const loadDraftFromLocalStorage = useCallback((userId: string) => {
    if (!hasDraft(userId)) return null;

    try {
      const dataKey = `configFormData_${userId}`;
      const savedDraft = localStorage.getItem(dataKey);

      if (savedDraft) {
        console.log('[useProfileForm] Loaded draft from localStorage');
        return JSON.parse(savedDraft);
      }
    } catch (err) {
      console.warn('[useProfileForm] Failed to load draft from localStorage:', err);
    }
    return null;
  }, [hasDraft]);

  /**
   * Carga los datos del usuario priorizando el userDataStore (Single Source of Truth)
   * Orden de prioridad:
   * 1. Draft de localStorage (si el usuario tiene cambios sin guardar)
   * 2. userDataStore (Single Source of Truth - tiene datos de onSnapshot)
   * 3. configCache (cache local del módulo config)
   * 4. Firestore getDoc (último recurso)
   */
  useEffect(() => {
    // Wait for Clerk to load and Firebase Auth to sync
    if (!isLoaded || !userId || !currentUser || !isSynced) return;

    // Si el userId no ha cambiado y ya tenemos datos, no recargar
    if (currentUserId === userId && formData?.userId === userId) {
      return;
    }

    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setCurrentUserId(userId);

        // 1. Intentar cargar desde draft de localStorage primero (cambios sin guardar)
        const draftData = loadDraftFromLocalStorage(userId);
        if (draftData && draftData.userId === userId) {
          setFormData(draftData);
          setIsLoading(false);
          return;
        }

        // 2. Intentar cargar desde userDataStore (Single Source of Truth)
        const storeData = useUserDataStore.getState().userData;
        if (storeData && storeData.userId === userId) {
          // El store ya tiene los datos del usuario - usar como fuente principal
          const formDataFromStore = transformConfigToFormData(storeData as unknown as Config, userId, currentUser);
          setFormData(formDataFromStore);
          setIsLoading(false);
          return;
        }

        // 3. Intentar cargar desde configCache (si no está bypass activado)
        if (!shouldBypassCache()) {
          const cachedData = configCache.get(userId);
          if (cachedData) {
            setFormData(transformConfigToFormData(cachedData.config, userId, currentUser));
            setIsLoading(false);
            return;
          }
        }

        // 4. Último recurso: Fetch desde Firestore directamente
        // Esto solo debería pasar si el userDataStore aún no ha cargado
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Config & { id: string };

          // Guardar en configCache para futuros usos del form
          configCache.set(userId, data as Config);

          const formDataToSet = transformConfigToFormData(data, userId, currentUser);
          setFormData(formDataToSet);
        } else {
          // Usuario nuevo, datos por defecto
          const defaultFormData = getDefaultFormData(userId, currentUser);
          setFormData(defaultFormData);
        }
      } catch {
        if (onErrorRef.current) {
          onErrorRef.current('Error al cargar los datos del usuario');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [userId, isLoaded, currentUser, currentUserId, formData?.userId, loadDraftFromLocalStorage, setFormData, setIsLoading, setCurrentUserId, isSynced]);

  /**
   * Guarda automáticamente en localStorage cuando cambia formData (con debounce y flag)
   * No guarda URLs temporales (blob:) para evitar problemas al recargar
   */
  const saveToLocalStorage = useDebouncedCallback(() => {
    if (!formData || !userId) return;

    try {
      const dataKey = `configFormData_${userId}`;
      const flagKey = `configFormDraft_${userId}_exists`;

      // Crear una copia sin URLs temporales
      const dataToSave = {
        ...formData,
        // No guardar URLs temporales de blob
        profilePhoto: formData.profilePhoto?.startsWith('blob:') ? '' : formData.profilePhoto,
        coverPhoto: formData.coverPhoto?.startsWith('blob:') ? '' : formData.coverPhoto,
        // No guardar archivos en localStorage
        profilePhotoFile: null,
        coverPhotoFile: null,
      };

      localStorage.setItem(dataKey, JSON.stringify(dataToSave));
      localStorage.setItem(flagKey, 'true'); // Flag para optimización
    } catch {
      // Error saving to localStorage
    }
  }, 500);

  useEffect(() => {
    if (!formData || !userId || isLoading) return;
    saveToLocalStorage();
  }, [formData, userId, isLoading, saveToLocalStorage]);

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
   * Maneja el cambio de los links de redes sociales
   */
  const handleSocialLinksChange = useCallback((links: Array<{ networkId: string; username: string }>) => {
    const socialLinksMap: Record<string, string> = {};
    links.forEach(link => {
      socialLinksMap[link.networkId] = link.username;
    });
    updateFormData(socialLinksMap);
    useConfigPageStore.getState().markTabAsChanged(activeTab);
  }, [updateFormData, activeTab]);

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
   * Optimizado: imports estáticos + invalidación de cache
   */
  const handleSubmit = useCallback(async () => {
    if (!formData || !userId || !currentUser) return;

    if (!validateForm()) {
      if (onErrorRef.current) {
        onErrorRef.current('Por favor corrige los errores en el formulario');
      }
      return;
    }

    try {
      setIsSaving(true);

      // Inicializar con los valores actuales del form
      // IMPORTANTE: Si la foto actual es de Clerk, no la guardamos en Firestore
      // Firestore solo debe tener URLs de Vercel Blob o estar vacío
      let profilePhotoUrl = formData.profilePhoto || '';
      let coverPhotoUrl = formData.coverPhoto || '';

      // Si la foto actual es de Clerk, limpiarla para no guardarla en Firestore
      if (isClerkImage(profilePhotoUrl)) {
        profilePhotoUrl = '';
      }

      // Subir imagen de perfil si hay un archivo nuevo
      if (formData.profilePhotoFile) {
        // Eliminar imagen anterior si existe y no es de Clerk o por defecto
        if (formData.profilePhoto && !isClerkImage(formData.profilePhoto) && !isDefaultImage(formData.profilePhoto, 'profile')) {
          try {
            // Determinar si es Vercel Blob o GCS y eliminar apropiadamente
            if (isVercelBlobImage(formData.profilePhoto)) {
              await deleteImageFromBlob(formData.profilePhoto, userId);
            } else if (isGCSImage(formData.profilePhoto)) {
              const filePath = extractFilePathFromUrl(formData.profilePhoto);
              if (filePath) {
                await deleteImageFromGCS(filePath);
              }
            }
          } catch {
            // Solo advertencia, no fallar todo el proceso
          }
        }

        // Subir nueva imagen
        profilePhotoUrl = await uploadProfileImage(formData.profilePhotoFile, userId);

        // Actualizar imagen de perfil en Clerk
        try {
          await currentUser.setProfileImage({ file: formData.profilePhotoFile });
        } catch {
          // Solo advertencia, no fallar
        }
      }

      // Subir imagen de portada si hay un archivo nuevo
      if (formData.coverPhotoFile) {
        // Eliminar imagen anterior si existe y no es por defecto
        if (formData.coverPhoto && !isDefaultImage(formData.coverPhoto, 'cover')) {
          try {
            // Determinar si es Vercel Blob o GCS y eliminar apropiadamente
            if (isVercelBlobImage(formData.coverPhoto)) {
              await deleteImageFromBlob(formData.coverPhoto, userId);
            } else if (isGCSImage(formData.coverPhoto)) {
              const filePath = extractFilePathFromUrl(formData.coverPhoto);
              if (filePath) {
                await deleteImageFromGCS(filePath);
              }
            }
          } catch {
            // Solo advertencia, no fallar todo el proceso
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
        profilePhoto: profilePhotoUrl,
        coverPhoto: coverPhotoUrl,
        status: formData.status || 'Disponible',
        emailPreferences: formData.emailPreferences,
        socialLinks: {
          github: formData.github || '',
          linkedin: formData.linkedin || '',
          twitter: formData.twitter || '',
          instagram: formData.instagram || '',
          facebook: formData.facebook || '',
          tiktok: formData.tiktok || '',
          whatsapp: formData.whatsapp || '',
        },
      };

      await updateDoc(userDocRef, dataToSave);

      // Invalidar caches para que se recarguen con datos frescos
      // El onSnapshot del userDataStore detectará el cambio automáticamente
      configCache.invalidate(userId);
      
      // También invalidar el userDataStore cache (sessionStorage)
      // Esto asegura que cualquier componente que lea del cache obtenga datos frescos
      useUserDataStore.getState().invalidateCache();

      // Actualizar formData con las URLs finales de las imágenes
      updateFormData({
        profilePhotoFile: null,
        coverPhotoFile: null,
        profilePhoto: profilePhotoUrl,
        coverPhoto: coverPhotoUrl,
      });

      // Limpiar localStorage y flag
      try {
        const dataKey = `configFormData_${userId}`;
        const flagKey = `configFormDraft_${userId}_exists`;
        localStorage.removeItem(dataKey);
        localStorage.removeItem(flagKey);
        console.log('[useProfileForm] localStorage cleared');
      } catch (err) {
        console.warn('[useProfileForm] Failed to clear localStorage:', err);
      }

      useConfigPageStore.getState().clearTabChanges(activeTab);

      if (onSuccessRef.current) {
        onSuccessRef.current('Configuración guardada exitosamente');
      }
    } catch (error) {
      console.error('[useProfileForm] Error saving data:', error);
      if (onErrorRef.current) {
        onErrorRef.current('Error al guardar la configuración', error instanceof Error ? error.message : 'Error desconocido');
      }
    } finally {
      setIsSaving(false);
    }
  }, [formData, userId, currentUser, validateForm, setIsSaving, updateFormData, activeTab]);

  /**
   * Descarta los cambios y restaura los datos originales
   * Optimizado: limpia localStorage con flag
   */
  const handleDiscard = useCallback(() => {
    // Limpiar localStorage y flag
    try {
      const dataKey = `configFormData_${userId}`;
      const flagKey = `configFormDraft_${userId}_exists`;
      localStorage.removeItem(dataKey);
      localStorage.removeItem(flagKey);
      console.log('[useProfileForm] Draft discarded');
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

    // Invalidar datos actuales para forzar recarga desde cache o Firestore
    setCurrentUserId(null);
  }, [userId, activeTab, updateFormData, setCurrentUserId]);

  return {
    formData,
    errors,
    isSaving,
    isLoading,
    handleInputChange,
    handleStackChange,
    handlePhoneLadaChange,
    handlePhoneChange,
    handleSocialLinksChange,
    handleSubmit,
    handleDiscard,
    validateForm,
  };
};
