// src/hooks/useGeminiIntegration.ts
import { useCallback } from 'react';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold, GenerateContentResult } from '@firebase/ai';
import { ai } from '@/lib/firebase';
import useGeminiStore from '@/stores/geminiStore';
import { useGeminiContext } from './useGeminiContext';

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



export const useGeminiIntegration = (taskId: string) => {
  const { addQuery, setProcessing, setLastQuery, setLastResponse } = useGeminiStore();
  const { getContextText, getContextMessages } = useGeminiContext(taskId);

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
        professional: `Transforma el texto a un tono más profesional y formal: "${text}". Contexto: ${context}`,
        concise: `Haz el texto más conciso manteniendo toda la información importante: "${text}". Contexto: ${context}`,
        summarize: `Crea un resumen conciso del texto: "${text}". Contexto: ${context}`,
        keypoints: `Extrae los puntos clave del texto: "${text}". Contexto: ${context}`,
        list: `Convierte el texto en una lista organizada: "${text}". Contexto: ${context}`,
      };

      const prompt = prompts[mode];
      if (!prompt) throw new Error(`❌ Modo de reformulación no válido: ${mode}`);

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

      let responseText: string;
      try {
        responseText = await result.response.text();
      } catch (textError) {
        debugError('[useGeminiIntegration] Error al extraer texto:', textError);
        throw new Error('⚠️ Error al procesar la respuesta de Gemini.');
      }

      if (!responseText || responseText.trim().length === 0) {
        throw new Error('📝 Gemini devolvió una respuesta vacía.');
      }

      setLastResponse(responseText);
      addQuery(text, responseText, mode);
      
      return responseText;
    } catch (error) {
      debugError('[useGeminiIntegration] Error en reformulación:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  }, [taskId, addQuery, setProcessing, setLastQuery, setLastResponse, getContextMessages, retry]);

  return {
    generateReformulation,
    generateQueryResponse,
    isProcessing: useGeminiStore(state => state.isProcessing),
    lastQuery: useGeminiStore(state => state.lastQuery),
    lastResponse: useGeminiStore(state => state.lastResponse),
  };
};
