// src/app/api/generate-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';

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

interface GenerateSummaryRequest {
  taskContext: string;
  activityContext: string;
  timersContext: string;
  interval: string;
}

export async function POST(request: NextRequest) {
  try {
    // ✅ VALIDAR REQUEST
    if (!request.body) {
      return NextResponse.json(
        { error: '❌ Cuerpo de la solicitud requerido' },
        { status: 400 }
      );
    }

    const body: GenerateSummaryRequest = await request.json();
    
    // ✅ DEBUG: Verificar qué se está recibiendo
    console.log('[API] 📥 Datos recibidos:', {
      hasTaskContext: !!body.taskContext,
      hasActivityContext: !!body.activityContext,
      hasTimersContext: !!body.timersContext,
      hasInterval: !!body.interval,
      taskContextLength: body.taskContext?.length || 0,
      activityContextLength: body.activityContext?.length || 0,
      timersContextLength: body.timersContext?.length || 0,
      interval: body.interval,
      bodyKeys: Object.keys(body),
    });
    
    // ✅ VALIDAR CAMPOS REQUERIDOS
    if (!body.taskContext || !body.activityContext || !body.interval) {
      console.error('[API] ❌ Validación fallida:', {
        taskContext: !!body.taskContext,
        activityContext: !!body.activityContext,
        interval: !!body.interval,
      });
      return NextResponse.json(
        { error: '❌ Campos requeridos: taskContext, activityContext, interval' },
        { status: 400 }
      );
    }

    // ✅ VERIFICAR API KEY
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[API] OPENAI_API_KEY no configurada');
      return NextResponse.json(
        { error: '🔑 Error de configuración del servidor' },
        { status: 500 }
      );
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
- "¡Seguimos construyendo algo increíble! 🚀"`
    };

    const userMessage: ChatGPTMessage = {
      role: 'user',
      content: `Genera un resumen ejecutivo y detallado de la actividad en esta tarea durante ${body.interval}.

**CONTEXTO COMPLETO DE LA TAREA:**
${body.taskContext}

**ACTIVIDAD RECIENTE (${body.interval}):**
${body.activityContext}

**⏱️ TIEMPO TOTAL REGISTRADO:**
${body.timersContext}

**IMPORTANTE:** Genera un resumen que sea:
- 🎯 Conciso y directo (máximo 3-4 párrafos)
- 😊 Amigable y motivacional
- 📊 Estructurado y fácil de leer (usa markdown para formato)
- 💡 Accionable (con recomendaciones claras)

Sé constructivo, motivacional y siempre termina con un mensaje positivo sobre el futuro del proyecto.`
    };

    // ✅ LLAMAR A CHATGPT
    console.log('[API] 🤖 Llamando a ChatGPT para generar resumen...');
    console.log('[API] 🔑 API Key configurada:', !!apiKey);
    console.log('[API] 📝 Mensajes a enviar:', {
      systemMessageLength: systemMessage.content.length,
      userMessageLength: userMessage.content.length,
      model: 'gpt-4o-mini',
    });
    
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [systemMessage, userMessage],
      max_completion_tokens: 2000,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    };
    
    console.log('[API] 📤 Request body:', JSON.stringify(requestBody, null, 2));
    
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
      console.error('[API] Error de OpenAI:', response.status, errorData);
      return NextResponse.json(
        { error: `🚫 Error de OpenAI: ${response.status} - ${errorData.error?.message || 'Error desconocido'}` },
        { status: 500 }
      );
    }

    const data: ChatGPTResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      return NextResponse.json(
        { error: '📝 ChatGPT no devolvió ninguna respuesta' },
        { status: 500 }
      );
    }

    const summaryText = data.choices[0].message.content;
    
    if (!summaryText || summaryText.trim().length === 0) {
      return NextResponse.json(
        { error: '📝 ChatGPT devolvió una respuesta vacía' },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Resumen generado exitosamente');
    
    // ✅ RETORNAR RESPUESTA EXITOSA
    return NextResponse.json({
      success: true,
      summary: summaryText.trim(),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API] Error generando resumen:', error);
    
    // ✅ LOGGING DETALLADO DEL ERROR
    if (error instanceof Error) {
      console.error('[API] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error('[API] Error desconocido:', error);
    }
    
    return NextResponse.json(
      { 
        error: '❌ Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
