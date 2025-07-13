import { useForm, UseFormReturn, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useCallback, useRef } from 'react';
import { z } from 'zod';

interface UseOptimizedFormOptions<T extends z.ZodTypeAny> {
  schema: T;
  defaultValues: z.infer<T>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
}

export const useOptimizedForm = <T extends z.ZodTypeAny>({
  schema,
  defaultValues,
  mode = 'onChange',
  reValidateMode = 'onChange'
}: UseOptimizedFormOptions<T>): UseFormReturn<z.infer<T>> => {
  // Memoizar el resolver para evitar recrearlo constantemente
  const resolver = useMemo(() => {
    return zodResolver(schema);
  }, [schema]);

  // Memoizar los defaultValues para evitar re-renders
  const memoizedDefaultValues = useMemo(() => {
    return defaultValues;
  }, [defaultValues]);

  const form = useForm<z.infer<T>>({
    resolver,
    defaultValues: memoizedDefaultValues,
    mode,
    reValidateMode,
  });

  // Memoizar funciones del formulario para evitar re-renders
  const memoizedSetValue = useCallback(<K extends Path<z.infer<T>>>(name: K, value: z.infer<T>) => {
    form.setValue(name, value);
  }, [form]);

  const memoizedGetValues = useCallback(() => {
    return form.getValues();
  }, [form]);

  const memoizedReset = useCallback((values?: Partial<z.infer<T>>) => {
    form.reset(values || memoizedDefaultValues);
  }, [form, memoizedDefaultValues]);

  // Retornar un objeto con las funciones memoizadas
  return {
    ...form,
    setValue: memoizedSetValue,
    getValues: memoizedGetValues,
    reset: memoizedReset,
  };
};

// Hook para optimizar el watch del formulario
export const useFormWatch = <T extends z.ZodTypeAny>(
  form: UseFormReturn<z.infer<T>>,
  callback?: (data: Partial<z.infer<T>>) => void
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const memoizedCallback = useCallback((data: Partial<z.infer<T>>) => {
    if (callbackRef.current) {
      callbackRef.current(data);
    }
  }, []);

  return form.watch(memoizedCallback);
};

// Hook para optimizar la validación del formulario
export const useFormValidation = <T extends z.ZodTypeAny>(
  form: UseFormReturn<z.infer<T>>
) => {
  const validateField = useCallback(<K extends Path<z.infer<T>>>(name: K) => {
    return form.trigger(name);
  }, [form]);

  const validateAll = useCallback(() => {
    return form.trigger();
  }, [form]);

  const clearErrors = useCallback(<K extends Path<z.infer<T>>>(name?: K) => {
    if (name) {
      form.clearErrors(name);
    } else {
      form.clearErrors();
    }
  }, [form]);

  return {
    validateField,
    validateAll,
    clearErrors,
  };
}; 