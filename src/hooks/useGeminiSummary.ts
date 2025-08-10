// src/hooks/useGeminiSummary.ts
import { useCallback } from 'react';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from '@firebase/ai';
import { ai } from '@/lib/firebase';
import { decryptBatch } from '@/lib/encryption';
import { useSummaryStore } from '@/stores/summaryStore';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: number | Date;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  clientId: string;
}

const intervalLabels = {
  '1day': 'último día',
  '3days': 'últimos 3 días',
  '1week': 'última semana',
  '1month': 'último mes',
  '6months': 'últimos 6 meses',
  '1year': 'último año'
};

export const useGeminiSummary = (taskId: string) => {
  const { setSummary } = useSummaryStore();

  const generateSummary = useCallback(async (
    interval: string, 
    messages: Message[], 
    forceRefresh = false
  ) => {
    if (!ai) {
      throw new Error('🤖 El servicio de Gemini AI no está disponible en este momento.');
    }

    const cacheKey = `${taskId}_${interval}`;
    
    // Verificar caché local primero
    if (!forceRefresh) {
      const summaries = useSummaryStore.getState().summaries;
      const localCached = summaries[cacheKey];
      if (localCached && Date.now() - localCached.timestamp < 3600000) { // 1 hora
        console.log('[useGeminiSummary] Using cached summary from local store');
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
        startDate = new Date(now.getTime() - 6 * 30 * 24 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const filteredMessages = messages.filter(msg => {
      if (!msg.timestamp) return false;
      const msgDate = msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp.toDate();
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
        const date = msg.timestamp instanceof Date ? msg.timestamp : msg.timestamp.toDate();
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

    const result = await model.generateContent(prompt);
    if (!result || !result.response) {
      throw new Error('🚫 No se recibió respuesta del servidor de Gemini.');
    }

    let summaryText: string;
    try {
      summaryText = await result.response.text();
    } catch (textError) {
      console.error('[useGeminiSummary] Error al extraer texto:', textError);
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

    console.log('[useGeminiSummary] Summary generated and cached successfully');
    
    return fullSummaryText;
  }, [taskId, setSummary]);

  return {
    generateSummary,
    isGenerating: false, // Se puede expandir para tracking de estado
  };
};
