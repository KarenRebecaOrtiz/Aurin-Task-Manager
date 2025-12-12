/**
 * Client Form Hook
 * Manages form state and validation for client creation/editing
 */

import { useState, useCallback } from 'react';
import { ClientFormData } from '../../types/form';

interface UseClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit?: (data: ClientFormData) => Promise<void>;
}

export function useClientForm({ initialData, onSubmit }: UseClientFormProps = {}) {
  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    industry: initialData?.industry || '',
    website: initialData?.website || '',
    taxId: initialData?.taxId || '',
    notes: initialData?.notes || '',
    imageUrl: initialData?.imageUrl || undefined,
    gradientId: initialData?.gradientId || 'default',
    projects: initialData?.projects || [''],
    isActive: initialData?.isActive ?? true,
    createdAt: initialData?.createdAt,
    createdBy: initialData?.createdBy,
    lastModified: initialData?.lastModified,
    lastModifiedBy: initialData?.lastModifiedBy,
  });

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
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.website && formData.website.trim() && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'URL inválida (debe comenzar con http:// o https://)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      industry: '',
      website: '',
      taxId: '',
      notes: '',
      imageUrl: undefined,
      gradientId: 'default',
      projects: [''],
      isActive: true,
    });
    setErrors({});
  }, []);

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

  return {
    formData,
    errors,
    updateField,
    updateProjects,
    addProject,
    removeProject,
    updateProject,
    validate,
    handleSubmit,
    reset,
    getClientInitials,
  };
}
