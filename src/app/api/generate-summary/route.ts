/**
 * Generate Summary API Route (GPT-4o-mini)
 *
 * POST /api/generate-summary - Generate task activity summaries using AI
 * Requires authentication
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { apiSuccess, apiBadRequest, apiServerError, handleApiError } from '@/lib/api/response';
import { generateSummarySchema } from '@/lib/api/schemas';

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

export async function POST(request: NextRequest) {
  // ✅ AUTENTICACIÓN REQUERIDA
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    console.log('[API/generate-summary] Request from user:', userId);

    // ✅ VALIDAR REQUEST CON ZOD
    const body = await request.json();
    const validation = generateSummarySchema.safeParse({
      ...body,
      userId,
    });

    if (!validation.success) {
      console.error('[API/generate-summary] Validation failed:', validation.error.format());
      return apiBadRequest('Invalid summary request', validation.error.format());
    }

    const { taskContext, activityContext, timersContext, interval } = validation.data;

    // ✅ DEBUG: Verificar qué se está recibiendo
    console.log('[API/generate-summary] Validated data:', {
      taskContextLength: taskContext.length,
      activityContextLength: activityContext.length,
      timersContextLength: timersContext.length,
      interval,
      userId,
    });

    // ✅ VERIFICAR API KEY
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[API/generate-summary] OPENAI_API_KEY not configured');
      return apiServerError('OpenAI API key not configured');
    }

    // ✅ CONSTRUIR MENSAJES PARA CHATGPT (compatible con gpt-4o-mini)
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
4. **🎯 Próximos Pasos** (lista de 2-3 acciones específicas y útiles)
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
- "¡Seguimos construyendo algo increíble! 🚀"`,
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
- 😊 Amigable y motivacional
- 📊 Estructurado y fácil de leer (usa markdown para formato)
- 💡 Accionable (con recomendaciones claras)

Sé constructivo, motivacional y siempre termina con un mensaje positivo sobre el futuro del proyecto.`,
    };

    // ✅ LLAMAR A CHATGPT
    console.log('[API/generate-summary] Calling ChatGPT for summary generation...');
    console.log('[API/generate-summary] Model: gpt-4o-mini');

    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [systemMessage, userMessage],
      max_completion_tokens: 2000,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API/generate-summary] OpenAI error:', response.status, errorData);
      return apiServerError(
        `OpenAI API error: ${response.status}`,
        errorData.error?.message || 'Unknown error'
      );
    }

    const data: ChatGPTResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return apiServerError('ChatGPT returned no response');
    }

    const summaryText = data.choices[0].message.content;

    if (!summaryText || summaryText.trim().length === 0) {
      return apiServerError('ChatGPT returned empty response');
    }

    console.log('[API/generate-summary] Summary generated successfully');

    // ✅ RETORNAR RESPUESTA EXITOSA
    return apiSuccess({
      summary: summaryText.trim(),
      timestamp: new Date().toISOString(),
      userId, // Para tracking
    });
  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/generate-summary');
  }
}
