import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({ enabled = true }: UseKeyboardShortcutsProps = {}) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Detectar si es Mac o Windows/Linux
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      // Solo procesar si se presiona Ctrl (Windows/Linux) o Cmd (Mac)
      if (!isCtrlOrCmd) return;

      // Obtener el elemento activo
      const activeElement = document.activeElement as HTMLElement;
      
      // Solo aplicar a elementos de entrada de texto
      const isTextInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      if (!isTextInput) return;

      switch (event.key.toLowerCase()) {
        case 'c':
          // Copiar - comportamiento nativo del navegador
          break;
        
        case 'x':
          // Cortar - comportamiento nativo del navegador
          break;
        
        case 'v':
          // Pegar - comportamiento nativo del navegador
          break;
        
        case 'a':
          // Seleccionar todo - comportamiento nativo del navegador
          break;
        
        case 'z':
          // Deshacer - comportamiento nativo del navegador
          break;
        
        case 'y':
          // Rehacer (Windows) - comportamiento nativo del navegador
          break;
        
        default:
          return;
      }

      // Para comandos que queremos que funcionen nativamente, no preventDefault
      // El navegador manejará estos comandos automáticamente
    };

    // Agregar el event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return {
    // Funciones auxiliares para uso programático si es necesario
    isMac: navigator.platform.toUpperCase().indexOf('MAC') >= 0,
    
    // Función para copiar texto programáticamente
    copyToClipboard: async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          document.body.removeChild(textArea);
          return true;
        } catch {
          document.body.removeChild(textArea);
          return false;
        }
      }
    },

    // Función para pegar desde el clipboard
    pasteFromClipboard: async () => {
      try {
        const text = await navigator.clipboard.readText();
        return text;
      } catch (err) {
        console.warn('No se pudo acceder al clipboard:', err);
        return null;
      }
    }
  };
};