/**
 * @module config/utils/formHelpers
 * @description Funciones auxiliares para manejo de formularios
 */

/**
 * Maneja eventos de teclado para campos de formulario con soporte de clipboard
 */
export const handleFormInputKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  field: { value?: string; onChange: (value: string) => void }
): void => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'a':
        // Seleccionar todo
        e.preventDefault();
        e.currentTarget.select();
        break;
        
      case 'c':
        // Copiar
        e.preventDefault();
        const targetC = e.currentTarget as HTMLInputElement;
        if (targetC.selectionStart !== targetC.selectionEnd) {
          const selectedText = (field.value || '').substring(
            targetC.selectionStart || 0,
            targetC.selectionEnd || 0
          );
          navigator.clipboard.writeText(selectedText).catch(() => {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = selectedText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          });
        }
        break;
        
      case 'v':
        // Pegar
        e.preventDefault();
        const targetV = e.currentTarget as HTMLInputElement;
        navigator.clipboard.readText().then(text => {
          if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
            const start = targetV.selectionStart;
            const end = targetV.selectionEnd;
            const newValue = (field.value || '').substring(0, start) + text + (field.value || '').substring(end);
            field.onChange(newValue);
            setTimeout(() => {
              targetV.setSelectionRange(start + text.length, start + text.length);
            }, 0);
          } else {
            field.onChange((field.value || '') + text);
          }
        }).catch(() => {
          document.execCommand('paste');
        });
        break;
        
      case 'x':
        // Cortar
        e.preventDefault();
        const targetX = e.currentTarget as HTMLInputElement;
        if (targetX.selectionStart !== targetX.selectionEnd) {
          const selectedText = (field.value || '').substring(
            targetX.selectionStart || 0,
            targetX.selectionEnd || 0
          );
          navigator.clipboard.writeText(selectedText).then(() => {
            if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
              const start = targetX.selectionStart;
              const end = targetX.selectionEnd;
              const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
              field.onChange(newValue);
            } else {
              field.onChange('');
            }
          }).catch(() => {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = selectedText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
              const start = targetX.selectionStart;
              const end = targetX.selectionEnd;
              const newValue = (field.value || '').substring(0, start) + (field.value || '').substring(end);
              field.onChange(newValue);
            } else {
              field.onChange('');
            }
          });
        }
        break;
    }
  }
};

/**
 * Limita la entrada de un campo a solo números
 */
export const handleNumericInput = (
  e: React.ChangeEvent<HTMLInputElement>,
  maxLength?: number
): string => {
  const value = e.target.value.replace(/\D/g, '');
  return maxLength ? value.slice(0, maxLength) : value;
};

/**
 * Limita la entrada de un campo a solo letras
 */
export const handleAlphaInput = (
  e: React.ChangeEvent<HTMLInputElement>
): string => {
  return e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
};

/**
 * Limita la entrada de un campo a alfanumérico
 */
export const handleAlphanumericInput = (
  e: React.ChangeEvent<HTMLInputElement>
): string => {
  return e.target.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '');
};

/**
 * Previene el envío del formulario al presionar Enter
 */
export const preventFormSubmitOnEnter = (
  e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
): void => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
  }
};

/**
 * Maneja el cambio de un checkbox
 */
export const handleCheckboxChange = (
  e: React.ChangeEvent<HTMLInputElement>
): boolean => {
  return e.target.checked;
};

/**
 * Maneja el cambio de un select
 */
export const handleSelectChange = (
  e: React.ChangeEvent<HTMLSelectElement>
): string => {
  return e.target.value;
};

/**
 * Limpia un objeto de valores vacíos
 */
export const cleanFormData = <T extends Record<string, unknown>>(data: T): Partial<T> => {
  const cleaned: Partial<T> = {};
  
  for (const key in data) {
    const value = data[key];
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

/**
 * Compara dos objetos para detectar cambios
 */
export const hasFormChanged = <T extends Record<string, unknown>>(
  original: T,
  current: T,
  ignoreKeys: string[] = []
): boolean => {
  const keys = Object.keys(current).filter(key => !ignoreKeys.includes(key));
  
  return keys.some(key => {
    const originalValue = original[key];
    const currentValue = current[key];
    
    // Comparación profunda para arrays
    if (Array.isArray(originalValue) && Array.isArray(currentValue)) {
      return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
    }
    
    // Comparación profunda para objetos
    if (typeof originalValue === 'object' && typeof currentValue === 'object') {
      return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
    }
    
    return originalValue !== currentValue;
  });
};

/**
 * Resetea un formulario a sus valores iniciales
 */
export const resetForm = <T>(initialValues: T): T => {
  return { ...initialValues };
};

/**
 * Obtiene los campos modificados de un formulario
 */
export const getChangedFields = <T extends Record<string, unknown>>(
  original: T,
  current: T
): Partial<T> => {
  const changed: Partial<T> = {};
  
  for (const key in current) {
    if (JSON.stringify(original[key]) !== JSON.stringify(current[key])) {
      changed[key] = current[key];
    }
  }
  
  return changed;
};

/**
 * Debounce para inputs
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle para eventos frecuentes
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};
