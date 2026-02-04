/**
 * Client Form Hook
 * Manages form state and validation for client creation/editing
 */

import { useState, useCallback } from 'react';
import { ClientFormData } from '../../types/form';
import {
  validateClientForm,
  hasValidationErrors,
  formatRFC,
  parsePhoneString,
  type PhoneNumber,
} from '../../utils/validation';

interface UseClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit?: (data: ClientFormData) => Promise<void>;
}

/**
 * Parse initial phone value - handle both legacy string and structured format
 */
function parseInitialPhone(phone?: string | PhoneNumber, phoneCountry?: string): PhoneNumber {
  if (!phone) {
    return { country: phoneCountry || 'MX', number: '' };
  }
  if (typeof phone === 'object' && 'country' in phone) {
    return phone;
  }
  // Legacy string format
  return parsePhoneString(phone, phoneCountry || 'MX');
}

export function useClientForm({ initialData, onSubmit }: UseClientFormProps = {}) {
  const getDefaultFormData = (): ClientFormData => ({
    name: '',
    email: '',
    phone: { country: 'MX', number: '' },
    phoneCountry: 'MX',
    address: '',
    industry: '',
    website: '',
    taxId: '',
    notes: '',
    imageUrl: undefined,
    gradientId: 'default',
    gradientColors: undefined,
    projects: [],
    isActive: true,
  });

  // Check if initial data has a valid custom image
  const initialHasValidImage = initialData?.imageUrl && !initialData.imageUrl.includes('empty-image');

  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: parseInitialPhone(initialData?.phone, initialData?.phoneCountry),
    phoneCountry: initialData?.phoneCountry || 'MX',
    address: initialData?.address || '',
    industry: initialData?.industry || '',
    website: initialData?.website || '',
    taxId: initialData?.taxId || '',
    notes: initialData?.notes || '',
    imageUrl: initialData?.imageUrl || undefined,
    // If there's a valid image, set gradientId to 'custom-image' so the selector shows it as selected
    gradientId: initialHasValidImage ? 'custom-image' : (initialData?.gradientId || 'default'),
    gradientColors: initialHasValidImage ? undefined : (initialData?.gradientColors || undefined),
    projects: initialData?.projects || [],
    isActive: initialData?.isActive ?? true,
    createdAt: initialData?.createdAt,
    createdBy: initialData?.createdBy,
    lastModified: initialData?.lastModified,
    lastModifiedBy: initialData?.lastModifiedBy,
  });

  // Store initial data for change tracking
  const [savedData, setSavedData] = useState<ClientFormData | null>(null);

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});

  const updateField = useCallback(<K extends keyof ClientFormData>(
    field: K,
    value: ClientFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    setErrors(prev => {
      if (prev[field]) {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return prev;
    });
  }, []);

  const updateProjects = useCallback((projects: string[]) => {
    setFormData(prev => ({ ...prev, projects }));
  }, []);

  const addProject = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      projects: [...(prev.projects || []), ''],
    }));
  }, []);

  const removeProject = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      projects: (prev.projects || []).filter((_, i) => i !== index),
    }));
  }, []);

  const updateProject = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      projects: (prev.projects || []).map((p, i) => i === index ? value : p),
    }));
  }, []);

  const validate = useCallback((): boolean => {
    // Use comprehensive validation from utils
    const validationErrors = validateClientForm({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      taxId: formData.taxId,
    });

    setErrors(validationErrors);
    return !hasValidationErrors(validationErrors);
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) {
      return false;
    }

    if (onSubmit) {
      await onSubmit(formData);
    }

    return true;
  }, [validate, formData, onSubmit]);

  const reset = useCallback(() => {
    setFormData(getDefaultFormData());
    setSavedData(null);
    setErrors({});
  }, []);

  // Set initial data for editing (used for change tracking)
  const setInitialData = useCallback((data: Partial<ClientFormData>) => {
    // Check if there's a valid custom image (not empty-image placeholder)
    const hasValidImage = data.imageUrl && !data.imageUrl.includes('empty-image');

    const newData: ClientFormData = {
      name: data.name || '',
      email: data.email || '',
      phone: parseInitialPhone(data.phone, data.phoneCountry),
      phoneCountry: data.phoneCountry || 'MX',
      address: data.address || '',
      industry: data.industry || '',
      website: data.website || '',
      taxId: data.taxId || '',
      notes: data.notes || '',
      imageUrl: data.imageUrl || undefined,
      // If there's a valid image, set gradientId to 'custom-image' so the selector shows it as selected
      gradientId: hasValidImage ? 'custom-image' : (data.gradientId || 'default'),
      gradientColors: hasValidImage ? undefined : (data.gradientColors || undefined),
      projects: data.projects || [],
      isActive: data.isActive ?? true,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      lastModified: data.lastModified,
      lastModifiedBy: data.lastModifiedBy,
    };
    setFormData(newData);
    setSavedData(newData);
    setErrors({});
  }, []);

  // Discard changes and revert to saved data
  const discardChanges = useCallback(() => {
    if (savedData) {
      setFormData(savedData);
      setErrors({});
    }
  }, [savedData]);

  // Check if form has unsaved changes
  const hasChanges = useCallback((): boolean => {
    if (!savedData) return false;

    // Compare relevant fields
    const fieldsToCompare: (keyof ClientFormData)[] = [
      'name', 'email', 'address', 'industry', 'website', 'taxId', 'notes',
      'imageUrl', 'gradientId', 'isActive'
    ];

    for (const field of fieldsToCompare) {
      if (formData[field] !== savedData[field]) return true;
    }

    // Compare phone
    const currentPhone = typeof formData.phone === 'string' ? formData.phone : formData.phone?.number || '';
    const savedPhone = typeof savedData.phone === 'string' ? savedData.phone : savedData.phone?.number || '';
    if (currentPhone !== savedPhone) return true;

    // Compare gradient colors
    const currentColors = JSON.stringify(formData.gradientColors || []);
    const savedColors = JSON.stringify(savedData.gradientColors || []);
    if (currentColors !== savedColors) return true;

    return false;
  }, [formData, savedData]);

  // Get client initials from name
  const getClientInitials = useCallback((): string => {
    const name = formData.name.trim();
    if (!name) return 'C';

    const words = name.split(' ').filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [formData.name]);

  // Handle phone number change from PhoneNumberInput component
  const updatePhone = useCallback((phone: PhoneNumber, isValid: boolean) => {
    setFormData(prev => ({
      ...prev,
      phone,
      phoneCountry: phone.country,
    }));
    // Clear phone error if valid
    if (isValid) {
      setErrors(prev => {
        if (prev.phone) {
          const { phone: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    }
  }, []);

  // Format RFC on blur
  const handleRFCBlur = useCallback(() => {
    if (formData.taxId) {
      const formatted = formatRFC(formData.taxId);
      if (formatted !== formData.taxId) {
        setFormData(prev => ({ ...prev, taxId: formatted }));
      }
    }
  }, [formData.taxId]);

  return {
    formData,
    errors,
    updateField,
    updateProjects,
    addProject,
    removeProject,
    updateProject,
    updatePhone,
    handleRFCBlur,
    validate,
    handleSubmit,
    reset,
    getClientInitials,
    setInitialData,
    discardChanges,
    hasChanges,
  };
}
