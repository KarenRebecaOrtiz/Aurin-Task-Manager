import { useState, useEffect, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";

export const useFormPersistence = <T extends object>(
  form: UseFormReturn<T>,
  key: string,
  enabled: boolean,
) => {
  const [isLoading, setIsLoading] = useState(enabled);
  const [hasPersistedData, setHasPersistedData] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      const savedData = localStorage.getItem(key);
      if (savedData) {
        const parsedData = JSON.parse(savedData, (k, v) => {
          if (typeof v === "string" && v.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            return new Date(v);
          }
          return v;
        });
        form.reset(parsedData);
        setHasPersistedData(true);
      }
    } catch (error) {
      console.error("Error loading persisted form data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [form, key, enabled]);

  const saveFormData = useCallback(() => {
    if (!enabled) return;

    try {
      const formData = form.getValues();
      localStorage.setItem(key, JSON.stringify(formData));
      setHasPersistedData(true);
    } catch (error) {
      console.error("Error saving form data:", error);
    }
  }, [form, key, enabled]);

  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setHasPersistedData(false);
    } catch (error) {
      console.error("Error clearing persisted form data:", error);
    }
  }, [key]);

  return {
    isLoading,
    hasPersistedData,
    saveFormData,
    clearPersistedData,
  };
};