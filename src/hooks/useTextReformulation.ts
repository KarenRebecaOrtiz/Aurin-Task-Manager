// src/hooks/useTextReformulation.ts
import { useCallback } from 'react';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from '@firebase/ai';
import { ai } from '@/lib/firebase';
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
    if (!ai) {
      throw new Error('🤖 El servicio de Gemini AI no está disponible en este momento.');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('📝 No hay texto para reformular.');
    }

    setProcessing(true);

    try {
      // ✅ CONSTRUIR PROMPT
      const basePrompt = REFORMULATION_PROMPTS[mode];
      const contextInfo = context ? `\n\nContexto de la conversación: ${context}` : '';
      const prompt = `${basePrompt}\n\n"${text}"${contextInfo}`;

      // ✅ CONFIGURACIÓN DE GENERACIÓN
      const generationConfig = {
        maxOutputTokens: 500,
        temperature: 0.3,
        topK: 20,
        topP: 0.8,
      };

      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];

      const systemInstruction = `Eres un asistente experto en reestructuración de texto. Proporcionas respuestas claras, útiles y bien formateadas. Mantienes el significado original del texto pero lo mejoras según la solicitud del usuario.`;

      // ✅ GENERAR CONTENIDO
      const model = getGenerativeModel(ai, {
        model: 'gemini-1.5-flash',
        generationConfig,
        safetySettings,
        systemInstruction,
      });

      const result = await model.generateContent(prompt);
      if (!result || !result.response) {
        throw new Error('🚫 No se recibió respuesta del servidor de Gemini.');
      }

      // ✅ EXTRAER TEXTO
      let responseText: string;
      try {
        responseText = await result.response.text();
      } catch (textError) {
        console.error('[useTextReformulation] Error al extraer texto:', textError);
        throw new Error('⚠️ Error al procesar la respuesta de Gemini.');
      }

      if (!responseText || responseText.trim().length === 0) {
        throw new Error('📝 Gemini devolvió una respuesta vacía.');
      }

      const reformulatedText = responseText.trim();

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
    
    throw new Error('❌ Falló la reformulación después de todos los reintentos.');
  }, [reformulateText]);

  return {
    reformulateText,
    reformulateWithRetry,
    REFORMULATION_PROMPTS,
    isProcessing,
  };
};
