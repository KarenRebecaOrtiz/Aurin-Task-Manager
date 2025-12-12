'use client';

import { useState, useCallback } from 'react';
import type { TeamFormData, TeamFormErrors } from '../types';
import { DEFAULT_GRADIENT_ID } from '../config';

const INITIAL_FORM_DATA: TeamFormData = {
  name: '',
  description: '',
  memberIds: [],
  isPublic: true, // Default: public team (switch unchecked)
  gradientId: DEFAULT_GRADIENT_ID,
  avatarUrl: undefined,
};

export function useTeamForm(initialData?: Partial<TeamFormData>) {
  const [formData, setFormData] = useState<TeamFormData>({
    ...INITIAL_FORM_DATA,
    ...initialData,
  });

  const [errors, setErrors] = useState<TeamFormErrors>({});

  const updateField = useCallback(<K extends keyof TeamFormData>(
    field: K,
    value: TeamFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field as keyof TeamFormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof TeamFormErrors];
        return newErrors;
      });
    }
  }, [errors]);

  const validate = useCallback((): boolean => {
    const newErrors: TeamFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del equipo es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (formData.memberIds.length === 0) {
      newErrors.memberIds = 'Debe seleccionar al menos un miembro';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const reset = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
  }, []);

  const setInitialData = useCallback((data: Partial<TeamFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
    setErrors({});
  }, []);

  // Get team initials from name
  const getTeamInitials = useCallback((): string => {
    const name = formData.name.trim();
    if (!name) return 'T';

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
    validate,
    reset,
    setInitialData,
    getTeamInitials,
  };
}

export default useTeamForm;
