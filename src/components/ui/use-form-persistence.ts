import { useState, useEffect, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { Editor } from "@tiptap/react";

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

// Interfaz para datos persistidos del editor
interface PersistedEditorData {
  content: string;
}

// Hook para persistencia de Tiptap editor mejorado
export const useEditorPersistence = (
  editor: Editor | null,
  storageKey: string,
  enabled: boolean = true,
) => {
  const [restoredData, setRestoredData] = useState<PersistedEditorData | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  // Restaurar datos desde localStorage al montar
  useEffect(() => {
    if (!enabled || !editor) {
      setIsLoading(false);
      return;
    }

    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData: PersistedEditorData = JSON.parse(savedData);
        setRestoredData(parsedData);
        console.log(`[useEditorPersistence] Data restored for key: ${storageKey}`);
      }
    } catch (error) {
      console.error('[useEditorPersistence] Error restoring data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [editor, storageKey, enabled]);

  // Guardar datos a localStorage
  const watchAndSave = useCallback(() => {
    if (!enabled || !editor) return;

    try {
      const content = editor.getHTML();
      if (content.trim()) {
        const data: PersistedEditorData = {
          content,
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
        console.log(`[useEditorPersistence] Content saved for key: ${storageKey}`);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('[useEditorPersistence] Error saving data:', error);
    }
  }, [editor, storageKey, enabled]);

  // Limpiar datos persistidos
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setRestoredData(null);
      console.log(`[useEditorPersistence] Data cleared for key: ${storageKey}`);
    } catch (error) {
      console.error('[useEditorPersistence] Error clearing data:', error);
    }
  }, [storageKey]);

  return {
    isLoading,
    watchAndSave,
    clearPersistedData,
    restoredData,
  };
};

// Hook genérico para persistencia de inputs simples
interface PersistedInputData {
  value: string;
  // Agregar otros campos según sea necesario, e.g., file, metadata
}

export const useInputPersistence = (
  storageKey: string,
  enabled: boolean = true,
) => {
  const [restoredData, setRestoredData] = useState<PersistedInputData | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  // Restaurar datos desde localStorage al montar
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData: PersistedInputData = JSON.parse(savedData);
        setRestoredData(parsedData);
      }
    } catch (error) {
      console.error('[useInputPersistence] Error restoring data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, enabled]);

  // Guardar datos a localStorage
  const saveInputData = useCallback((data: PersistedInputData) => {
    if (!enabled) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[useInputPersistence] Error saving data:', error);
    }
  }, [storageKey, enabled]);

  // Limpiar datos persistidos
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setRestoredData(null);
    } catch (error) {
      console.error('[useInputPersistence] Error clearing data:', error);
    }
  }, [storageKey]);

  return {
    isLoading,
    saveInputData,
    clearPersistedData,
    restoredData,
  };
};