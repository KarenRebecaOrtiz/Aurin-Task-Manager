// src/hooks/useTextReformulation.ts - Hook para reformulación de texto usando GPT
import { useCallback } from 'react';
import useTextReformulationStore from '@/stores/textReformulationStore';

// ✅ TIPOS PARA REFORMULACIÓN
export type ReformulationMode = 
  | 'correct' 
  | 'rewrite' 
  | 'friendly' 
  | 'professional' 
  | 'concise' 
  | 'summarize' 
  | 'keypoints' 
  | 'list';

// ✅ PROMPTS ESPECÍFICOS PARA CADA MODO
const REFORMULATION_PROMPTS: Record<ReformulationMode, string> = {
  correct: 'Corrige todos los errores de ortografía, gramática, puntuación y sintaxis en el texto:',
  rewrite: 'Reescribe completamente el texto manteniendo el mismo significado:',
  friendly: 'Transforma el texto a un tono más amigable y cercano:',
  professional: 'Transforma el texto a un tono más profesional y formal:',
  concise: 'Haz el texto más conciso manteniendo toda la información importante:',
  summarize: 'Crea un resumen conciso del texto:',
  keypoints: 'Extrae los puntos clave del texto:',
  list: 'Convierte el texto en una lista organizada:',
};

export const useTextReformulation = () => {
  const { addToHistory, setProcessing, isProcessing } = useTextReformulationStore();

  // ✅ FUNCIÓN PRINCIPAL DE REFORMULACIÓN
  const reformulateText = useCallback(async (
    mode: ReformulationMode,
    text: string,
    context?: string
  ): Promise<string> => {
    if (!text || text.trim().length === 0) {
      throw new Error('📝 No hay texto para reformular.');
    }

    setProcessing(true);

    try {
      // ✅ CONSTRUIR PROMPT PARA GPT
      const basePrompt = REFORMULATION_PROMPTS[mode];
      const contextInfo = context ? `\n\nContexto de la conversación: ${context}` : '';
      const prompt = `${basePrompt}\n\n"${text}"${contextInfo}`;

      // ✅ CONSTRUIR MENSAJES PARA GPT
      const messages = [
        {
          role: 'system' as const,
          content: 'Eres un asistente experto en reestructuración de texto. Proporcionas respuestas claras, útiles y bien formateadas. Mantienes el significado original del texto pero lo mejoras según la solicitud del usuario. Responde únicamente con el texto reformulado, sin explicaciones adicionales.'
        },
        {
          role: 'user' as const,
          content: prompt
        }
      ];

      // ✅ LLAMAR A NUESTRA API DE GPT
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskContext: 'Reformulación de texto',
          activityContext: prompt,
          interval: 'texto',
          messages: messages
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`🚫 Error de la API: ${response.status} - ${errorData.error || 'Error desconocido'}`);
      }

      const data = await response.json();
      
      if (!data.summary || data.summary.trim().length === 0) {
        throw new Error('📝 GPT devolvió una respuesta vacía.');
      }

      const reformulatedText = data.summary.trim();

      // ✅ GUARDAR EN HISTORIAL
      addToHistory({
        originalText: text,
        reformulatedText,
        mode,
        timestamp: Date.now(),
      });

      return reformulatedText;
    } catch (error) {
      console.error('[useTextReformulation] Error en reformulación:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  }, [addToHistory, setProcessing]);

  // ✅ FUNCIÓN PARA REFORMULAR CON RETRY
  const reformulateWithRetry = useCallback(async (
    mode: ReformulationMode,
    text: string,
    context?: string,
    maxRetries: number = 3
  ): Promise<string> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await reformulateText(mode, text, context);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // ✅ BACKOFF EXPONENCIAL
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`[useTextReformulation] Reintento ${attempt}/${maxRetries} después de ${delay}ms`);
      }
    }
    
    throw new Error('❌ Falló la reformulación con GPT después de todos los reintentos.');
  }, [reformulateText]);

  return {
    reformulateText,
    reformulateWithRetry,
    REFORMULATION_PROMPTS,
    isProcessing,
  };
};
