// src/hooks/useGeminiIntegration.ts
import { useCallback } from 'react';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold, GenerateContentResult } from '@firebase/ai';
import { ai } from '@/lib/firebase';
import useGeminiStore from '@/stores/geminiStore';
import { useGeminiContext } from './useGeminiContext';
import { decryptBatch } from '@/lib/encryption';
import { useSummaryStore } from '@/stores/summaryStore';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Helper function for conditional logging (only in development)
const debugLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(message, ...args);
  }
};

// Helper function for conditional error logging (only in development)
const debugError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(message, ...args);
  }
};

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Date | Timestamp;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  clientId: string;
}

// Labels para intervalos de tiempo
const intervalLabels = {
  '1day': 'último día',
  '3days': 'últimos 3 días',
  '1week': 'última semana',
  '1month': 'último mes',
  '6months': 'últimos 6 meses',
  '1year': 'último año'
} as const;

export const useGeminiIntegration = (taskId: string) => {
  const { addQuery, setProcessing, setLastQuery, setLastResponse } = useGeminiStore();
  const { getContextText, getContextMessages } = useGeminiContext(taskId);
  const { setSummary } = useSummaryStore();

  // Función de retry con backoff exponencial
  const retry = useCallback(async (fn: () => Promise<GenerateContentResult>, retries = 3, delay = 1000): Promise<GenerateContentResult> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(res => setTimeout(res, delay * (2 ** i)));
      }
    }
    throw new Error('Retry failed after all attempts');
  }, []);

  // Función helper para convertir timestamp a Date
  const timestampToDate = useCallback((timestamp: Date | Timestamp): Date => {
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    // Si es number, asumir que es timestamp en milisegundos
    return new Date(timestamp);
  }, []);

  // Generar respuesta para reformulación
  const generateReformulation = useCallback(async (
    mode: 'correct' | 'rewrite' | 'friendly' | 'professional' | 'concise' | 'summarize' | 'keypoints' | 'list',
    text: string
  ) => {
    if (!ai) throw new Error('🤖 El servicio de Gemini AI no está disponible en este momento.');
    
    setProcessing(true);
    setLastQuery(text);
    
    try {
      // Obtener contexto de los últimos mensajes
      const contextMessages = getContextMessages(3);
      const context = contextMessages.map(msg => msg.text).join('\n');
      
      const prompts = {
        correct: `Corrige todos los errores de ortografía, gramática, puntuación y sintaxis en el texto: "${text}". Contexto: ${context}`,
        rewrite: `Reescribe completamente el texto manteniendo el mismo significado: "${text}". Contexto: ${context}`,
        friendly: `Transforma el texto a un tono más amigable: "${text}". Contexto: ${context}`,
        professional: `Convierte el texto en una versión más profesional: "${text}". Contexto: ${context}`,
        concise: `Haz el texto más conciso: "${text}". Contexto: ${context}`,
        summarize: `Resume el texto en sus puntos más importantes: "${text}". Contexto: ${context}`,
        keypoints: `Extrae los puntos clave del texto como lista: "${text}". Contexto: ${context}`,
        list: `Convierte el texto en una lista organizada: "${text}". Contexto: ${context}`,
      };
      
      const generationConfig = { 
        maxOutputTokens: 800, 
        temperature: mode === 'rewrite' ? 0.8 : 0.6, 
        topK: 40, 
        topP: 0.9 
      };
      
      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];
      
      const systemInstruction = `Eres un asistente de escritura experto. Responde únicamente con el texto procesado.`;
      
      const model = getGenerativeModel(ai, { 
        model: 'gemini-1.5-flash', 
        generationConfig, 
        safetySettings, 
        systemInstruction 
      });
      
      const promptText = prompts[mode];
      
      const result = await retry(() => model.generateContent(promptText));
      const response = await result.response.text();
      
      if (!response.trim()) throw new Error('📝 Gemini devolvió una respuesta vacía.');
      
      // Guardar en store
      addQuery(taskId, `Reformulación ${mode}: ${text}`, response);
      setLastResponse(response);
      
      return response;
    } catch (error) {
      debugError('[useGeminiIntegration] Error en reformulación:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  }, [taskId, addQuery, setProcessing, setLastQuery, setLastResponse, getContextMessages, retry]);

  // Generar respuesta para consultas @gemini
  const generateQueryResponse = useCallback(async (query: string, needsFullContext: boolean = false) => {
    if (!ai) throw new Error('🤖 El servicio de Gemini AI no está disponible en este momento.');
    
    setProcessing(true);
    setLastQuery(query);
    
    try {
      // Determinar tamaño del batch basado en el tipo de query
      const batchSize = needsFullContext ? 20 : 3;
      const context = getContextText(batchSize);
      
      let prompt = `Responde como Gemini en chat de tarea: ${query}. Contexto (no revelar detalles privados): ${context}. Sé útil, conciso y mantén privacidad. Usa markdown si aplica.`;
      
      // Agregar información externa si es necesario (clima, búsqueda web, etc.)
      let externalInfo = '';
      
      // Real Clima tool (OpenWeather API)
      if (query.toLowerCase().includes('clima') || query.toLowerCase().includes('weather')) {
        const cityMatch = query.match(/en\s+([a-zA-Záéíóúñ\s]+)/i);
        const city = cityMatch ? cityMatch[1].trim() : 'Cuernavaca';
        
        try {
          const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'c4e9937072f9fa89a6087653624fcbf1';
          
          const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}&lang=es`);
          if (response.ok) {
            const data = await response.json();
            const weatherData = {
              city: data.name,
              temperature: `${Math.round(data.main.temp)}°C (sensación ${Math.round(data.main.feels_like)}°C)`,
              condition: data.weather[0].description,
              humidity: `${data.main.humidity}%`,
              wind: `${Math.round(data.wind.speed * 3.6)} km/h`,
              rain: data.rain ? `${data.rain['1h']}mm/h` : '0%',
              source: 'OpenWeather'
            };
            
            externalInfo = `\n\n🌤️ **Clima actual en ${weatherData.city}:**
- **Temperatura:** ${weatherData.temperature}
- **Condición:** ${weatherData.condition.charAt(0).toUpperCase() + weatherData.condition.slice(1)}
- **Humedad:** ${weatherData.humidity}
- **Viento:** ${weatherData.wind}
- **Lluvia:** ${weatherData.rain}
- **Fuente:** ${weatherData.source} (datos al ${new Date().toLocaleString('es-MX')})`;
          }
        } catch (error) {
          debugError('[useGeminiIntegration] Weather fetch error:', error);
          externalInfo = `\n\n⚠️ No pude obtener clima para ${city}. Verifica conexión o pregunta de nuevo.`;
        }
      }
      
      prompt += externalInfo;
      
      const generationConfig = { 
        maxOutputTokens: 1000, 
        temperature: 0.7, 
        topK: 40, 
        topP: 0.9 
      };
      
      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];
      
      const systemInstruction = `Eres Gemini, un asistente de IA útil y amigable. Responde de manera clara y concisa.`;
      
      const model = getGenerativeModel(ai, { 
        model: 'gemini-1.5-flash', 
        generationConfig, 
        safetySettings, 
        systemInstruction 
      });
      
      const result = await retry(() => model.generateContent(prompt));
      const response = await result.response.text();
      
      if (!response.trim()) throw new Error('📝 Gemini devolvió una respuesta vacía.');
      
      // Guardar en store
      addQuery(taskId, query, response);
      setLastResponse(response);
      
      return response;
    } catch (error) {
      debugError('[useGeminiIntegration] Error en consulta:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  }, [taskId, addQuery, setProcessing, setLastQuery, setLastResponse, getContextText, retry]);

  // Generar resumen de actividad
  const generateSummary = useCallback(async (
    interval: string, 
    messages: Message[], 
    forceRefresh = false
  ) => {
    if (!ai) {
      throw new Error('🤖 El servicio de Gemini AI no está disponible en este momento.');
    }

    setProcessing(true);
    
    try {
      const cacheKey = `${taskId}_${interval}`;
      
      // Verificar caché local primero
      if (!forceRefresh) {
        const summaries = useSummaryStore.getState().summaries;
        const localCached = summaries[cacheKey];
        if (localCached && Date.now() - localCached.timestamp < 3600000) { // 1 hora
          debugLog('[useGeminiIntegration] Using cached summary from local store');
          return localCached.text;
        }
      }

      const now = new Date();
      let startDate: Date;
      
      switch (interval) {
        case '1day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '3days':
          startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case '1week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '6months':
          startDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      const filteredMessages = messages.filter(msg => {
        if (!msg.timestamp) return false;
        const msgDate = timestampToDate(msg.timestamp);
        return msgDate >= startDate;
      });

      if (filteredMessages.length === 0) {
        const intervalLabel = intervalLabels[interval as keyof typeof intervalLabels] || interval;
        return `📊 No hay actividad registrada en los últimos ${intervalLabel.toLowerCase()}. El resumen estaría vacío.`;
      }

      // Decrypt batch de mensajes para privacidad
      const decryptedMessages = await decryptBatch(filteredMessages, 10, taskId);
      
      const chatContext = decryptedMessages
        .map(msg => {
          const date = timestampToDate(msg.timestamp);
          const timeStr = date.toLocaleDateString('es-MX') + ' ' + date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
          if (msg.hours) {
            return `[${timeStr}] ${msg.senderName}: Registró ${Math.floor(msg.hours)}h ${Math.round((msg.hours % 1) * 60)}m de tiempo en la tarea`;
          } else if (msg.text) {
            return `[${timeStr}] ${msg.senderName}: ${msg.text}`;
          } else if (msg.imageUrl) {
            return `[${timeStr}] ${msg.senderName}: Compartió una imagen (${msg.fileName || 'imagen'})`;
          } else if (msg.fileUrl) {
            return `[${timeStr}] ${msg.senderName}: Compartió un archivo (${msg.fileName || 'archivo'})`;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');

      const prompt = `Como experto analista de proyectos, genera un resumen ejecutivo y detallado de la actividad en esta tarea durante ${intervalLabels[interval as keyof typeof intervalLabels]}. 
Analiza el siguiente historial de conversación y actividades:
${chatContext}
Proporciona un resumen que incluya:
1. **📋 Resumen Ejecutivo**: Descripción general de la actividad y progreso
2. **💬 Actividad de Comunicación**: Número de mensajes, participantes más activos
3. **⏱️ Tiempo Registrado**: Total de horas trabajadas y por quién
4. **📎 Archivos Compartidos**: Lista de documentos e imágenes compartidas
5. **🎯 Puntos Clave**: Decisiones importantes, problemas identificados, próximos pasos
6. **📈 Estado del Proyecto**: Evaluación del progreso y momentum
Usa markdown para el formato y sé conciso pero informativo. Si hay poca actividad, menciona esto de manera constructiva.`;

      const generationConfig = {
        maxOutputTokens: 1000,
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

      const systemInstruction = `Eres un analista experto en gestión de proyectos. Creas resúmenes claros, estructurados y actionables de la actividad en tareas. Usa markdown para formatear tu respuesta y proporciona insights valiosos sobre el progreso y la colaboración del equipo.`;

      const model = getGenerativeModel(ai, {
        model: 'gemini-1.5-flash',
        generationConfig,
        safetySettings,
        systemInstruction,
      });

      const result = await retry(() => model.generateContent(prompt));
      if (!result || !result.response) {
        throw new Error('🚫 No se recibió respuesta del servidor de Gemini.');
      }

      let summaryText: string;
      try {
        summaryText = await result.response.text();
      } catch (textError) {
        debugError('[useGeminiIntegration] Error al extraer texto:', textError);
        throw new Error('⚠️ Error al procesar la respuesta de Gemini.');
      }

      if (!summaryText || summaryText.trim().length === 0) {
        throw new Error('📝 Gemini devolvió un resumen vacío.');
      }

      const fullSummaryText = `📊 Resumen de actividad - ${intervalLabels[interval as keyof typeof intervalLabels]}\n\n${summaryText}`;
      
      // Guardar en caché (local y Firestore)
      const cacheData = { text: fullSummaryText, timestamp: Date.now() };
      await setDoc(doc(db, 'summaries', cacheKey), cacheData);
      setSummary(cacheKey, cacheData);

      debugLog('[useGeminiIntegration] Summary generated and cached successfully');
      
      return fullSummaryText;
    } catch (error) {
      debugError('[useGeminiIntegration] Error en generación de resumen:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  }, [taskId, setProcessing, retry, setSummary, timestampToDate]);

  return {
    generateReformulation,
    generateQueryResponse,
    generateSummary,
    isProcessing: useGeminiStore(state => state.isProcessing),
    lastQuery: useGeminiStore(state => state.lastQuery),
    lastResponse: useGeminiStore(state => state.lastResponse),
  };
};
