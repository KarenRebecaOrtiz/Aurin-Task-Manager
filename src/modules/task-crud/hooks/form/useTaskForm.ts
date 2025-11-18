/**
 * useTaskForm Hook
 * Custom hook for task form management with react-hook-form
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef } from 'react';
import { FormValues, createFormSchema, defaultFormValues } from '../../types/form';
import { useFormPersistence } from './useFormPersistence';
import { hasFormChanges } from '../../utils/helpers';

interface UseTaskFormOptions {
  includeMembers: boolean;
  persistenceKey: string;
  onHasUnsavedChanges?: (hasChanges: boolean) => void;
  defaultValues?: Partial<FormValues>;
  enablePersistence?: boolean;
}

export const useTaskForm = ({
  includeMembers,
  persistenceKey,
  onHasUnsavedChanges,
  defaultValues: customDefaults,
  enablePersistence = true,
}: UseTaskFormOptions) => {
  const initialValues = { ...defaultFormValues, ...customDefaults };
  const defaultValuesRef = useRef(initialValues);

  // Create form instance
  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(includeMembers)),
    defaultValues: initialValues,
    mode: 'onSubmit',
  });

  // Form persistence
  const { isLoading: hasPersistedData, saveFormData, clearPersistedData } = useFormPersistence(
    form,
    persistenceKey,
    enablePersistence
  );

  // Track changes
  const checkForChanges = useCallback(
    (value: Partial<FormValues>) => {
      if (enablePersistence) {
        saveFormData();
      }

      if (onHasUnsavedChanges) {
        const isChanged = hasFormChanges(value as FormValues, defaultValuesRef.current);
        onHasUnsavedChanges(isChanged);
      }
    },
    [saveFormData, onHasUnsavedChanges, enablePersistence]
  );

  // Watch for changes
  useEffect(() => {
    const subscription = form.watch(checkForChanges);
    return () => subscription.unsubscribe();
  }, [form, checkForChanges]);

  // Clear errors when includeMembers changes
  useEffect(() => {
    form.clearErrors();
  }, [includeMembers, form]);

  // Reset form
  const resetForm = useCallback(() => {
    form.reset(defaultValuesRef.current);
    clearPersistedData();
    if (onHasUnsavedChanges) {
      onHasUnsavedChanges(false);
    }
  }, [form, clearPersistedData, onHasUnsavedChanges]);

  return {
    form,
    resetForm,
    hasPersistedData,
    clearPersistedData,
    defaultValuesRef,
  };
};
