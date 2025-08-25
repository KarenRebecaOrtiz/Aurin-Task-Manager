// src/hooks/useChatGPTIntegration.ts
import { useCallback } from 'react';

// ✅ TIPOS PARA LA INTEGRACIÓN CON CHATGPT
interface ChatGPTMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatGPTResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export const useChatGPTIntegration = () => {
  // ✅ FUNCIÓN PRINCIPAL PARA GENERAR CONTENIDO
  const generateContent = useCallback(async (
    messages: ChatGPTMessage[],
    model: string = 'o1-mini'
  ): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('🔑 API key de OpenAI no configurada. Verifica tu variable de entorno OPENAI_API_KEY.');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 2000,
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`🚫 Error de OpenAI: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data: ChatGPTResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('📝 ChatGPT no devolvió ninguna respuesta.');
      }

      const content = data.choices[0].message.content;
      
      if (!content || content.trim().length === 0) {
        throw new Error('📝 ChatGPT devolvió una respuesta vacía.');
      }

      return content.trim();
    } catch (error) {
      console.error('[useChatGPTIntegration] Error generando contenido:', error);
      throw error;
    }
  }, []);

  // ✅ FUNCIÓN ESPECÍFICA PARA RESUMENES
  const generateSummary = useCallback(async (
    taskContext: string,
    activityContext: string,
    timersContext: string,
    interval: string
  ): Promise<string> => {
    const systemMessage: ChatGPTMessage = {
      role: 'system',
      content: `Eres un analista experto en gestión de proyectos con más de 10 años de experiencia. Tu especialidad es crear resúmenes ejecutivos claros, motivacionales y accionables.

CARACTERÍSTICAS DE TUS RESÚMENES:
- 🎯 Concisos y directos (máximo 3-4 párrafos)
- 😊 Amigables y motivacionales (tono positivo y alentador)
- 📊 Estructurados y fáciles de leer (formato markdown claro)
- 💡 Accionables (con recomendaciones específicas y útiles)
- 🚀 Inspiradores (siempre terminan con motivación para el equipo)

FORMATO REQUERIDO:
1. **📋 Resumen Ejecutivo** (1 párrafo máximo, tono motivacional)
2. **💬 Comunicación del Equipo** (bullet points concisos con emojis)
3. **⏱️ Tiempo Registrado** (formato visual atractivo con emojis)
4. **🎯 Próximos Pasos** (lista de 2-3 acciones específicas y motivacionales)
5. **📈 Estado del Proyecto** (con emoji y tono positivo)

TONO Y ESTILO:
- Usa **negritas** para títulos de sección
- Usa *cursivas* para énfasis
- Usa • para listas (no números)
- Agrega emojis relevantes en cada sección
- Mantén párrafos cortos (2-3 líneas máximo)
- Sé constructivo, motivacional y siempre termina con un mensaje positivo

EJEMPLOS DE TONO:
- "¡Excelente trabajo equipo! 🎉 Hemos avanzado significativamente..."
- "Para continuar el momentum, recomiendo..."
- "El proyecto está en buen camino hacia la finalización..."
- "¡Seguimos construyendo algo increíble! 🚀"`
    };

    const userMessage: ChatGPTMessage = {
      role: 'user',
      content: `Genera un resumen ejecutivo y detallado de la actividad en esta tarea durante ${interval}.

**CONTEXTO COMPLETO DE LA TAREA:**
${taskContext}

**ACTIVIDAD RECIENTE (${interval}):**
${activityContext}

**⏱️ TIEMPO TOTAL REGISTRADO:**
${timersContext}

**IMPORTANTE:** Genera un resumen que sea:
- 🎯 Conciso y directo (máximo 3-4 párrafos)
- 😊 Amigable y motivacional (sin emojis)
- 📊 Estructurado y fácil de leer (usa markdown para formato)
- 💡 Accionable (con recomendaciones claras)

**Formato requerido:**
1. **📋 Resumen Ejecutivo** (1 párrafo máximo, tono motivacional)
2. **💬 Comunicación del Equipo** (bullet points concisos con emojis)
3. **⏱️ Tiempo Registrado** (formato visual atractivo con emojis, incluye el total real de horas)
4. **🎯 Próximos Pasos** (lista de 2-3 acciones específicas y motivacionales)
5. **📈 Estado del Proyecto** (con emoji y tono positivo)

**Ejemplo de tono:**
- "¡Excelente trabajo equipo! 🎉 Hemos avanzado significativamente..."
- "Para continuar el momentum, recomiendo..."
- "El proyecto está en buen camino hacia la finalización..."
- "¡Seguimos construyendo algo increíble! 🚀"

**Formato markdown específico:**
- Usa **negritas** para títulos de sección
- Usa *cursivas* para énfasis
- Usa • para listas (no números)
- Agrega emojis relevantes en cada sección
- Mantén párrafos cortos (2-3 líneas máximo)

Sé constructivo, motivacional y siempre termina con un mensaje positivo sobre el futuro del proyecto.`
    };

    try {
      const summary = await generateContent([systemMessage, userMessage], 'o1-mini');
      return summary;
    } catch (error) {
      console.error('[useChatGPTIntegration] Error generando resumen:', error);
      throw error;
    }
  }, [generateContent]);

  return {
    generateContent,
    generateSummary,
  };
};
