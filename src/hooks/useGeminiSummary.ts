// src/hooks/useGeminiSummary.ts
import { useState, useCallback, useEffect } from 'react';
import { decryptBatch } from '@/lib/encryption';
import { useSummaryStore, SummaryCache } from '@/stores/summaryStore';
import { doc, getDoc, setDoc, Timestamp, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useChatGPTIntegration } from './useChatGPTIntegration';

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
  isSummary?: boolean; // Indicates if this message is an AI summary
  isLoading?: boolean; // Indicates if this message is a loading state (for AI operations)
}

// ✅ INTERFACES COMPLETAS PARA LA INFORMACIÓN DE LA TAREA
interface TaskMetadata {
  id: string;
  name: string;
  description: string;
  objectives: string;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  status: string;
  priority: string;
  clientId: string;
  project: string;
  createdAt: Date | Timestamp;
  lastActivity: Date | Timestamp;
  CreatedBy: string;
  LeadedBy: string[];
  AssignedTo: string[];
}

interface UserInfo {
  id: string;
  fullName: string;
  firstName?: string;
  imageUrl: string;
  role?: string;
}

interface ClientInfo {
  id: string;
  name: string;
  imageUrl: string;
}

interface TimerEntry {
  id: string;
  userId: string;
  userName: string;
  startTime: Date | Timestamp;
  endTime?: Date | Timestamp;
  duration?: number;
  isRunning: boolean;
  comment?: string;
  accumulatedSeconds: number;
  lastFinalized: Date | Timestamp;
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

  // Helper function to convert timestamp to Date
  const timestampToDate = useCallback((timestamp: Date | Timestamp): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    return new Date(timestamp);
  }, []);

  // ✅ FUNCIÓN PARA OBTENER INFORMACIÓN COMPLETA DE LA TAREA DESDE FIRESTORE
  const getCompleteTaskInfo = useCallback(async (): Promise<{
    task: TaskMetadata;
    users: UserInfo[];
    client: ClientInfo;
    messages: Message[];
    timers: TimerEntry[];
    totalTimeInfo: {
      accumulatedSeconds: number;
      totalHours: number;
      timersCount: number;
      timeMessagesCount: number;
    };
  }> => {
    console.log('[useGeminiSummary] 🔍 Iniciando getCompleteTaskInfo para taskId:', taskId);
    
    try {
      // 1. Obtener metadatos de la tarea
      console.log('[useGeminiSummary] 📋 Obteniendo metadatos de la tarea...');
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      if (!taskDoc.exists()) {
        console.error('[useGeminiSummary] ❌ Tarea no encontrada:', taskId);
        throw new Error('Tarea no encontrada');
      }
      
      const taskData = taskDoc.data() as TaskMetadata;
      const task: TaskMetadata = {
        ...taskData,
        id: taskDoc.id,
        startDate: taskData.startDate,
        endDate: taskData.endDate,
        createdAt: taskData.createdAt,
        lastActivity: taskData.lastActivity,
      };
      
      console.log('[useGeminiSummary] ✅ Metadatos obtenidos:', { 
        name: task.name, 
        status: task.status, 
        priority: task.priority,
        clientId: task.clientId,
        project: task.project
      });

      // 2. Obtener información de usuarios (LeadedBy, AssignedTo, CreatedBy)
      const allUserIds = new Set([
        ...task.LeadedBy,
        ...task.AssignedTo,
        task.CreatedBy
      ]);
      
      const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(allUserIds)));
      const usersSnapshot = await getDocs(usersQuery);
      const users: UserInfo[] = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        fullName: doc.data().fullName || 'Usuario Desconocido',
        firstName: doc.data().firstName,
        imageUrl: doc.data().imageUrl || '/default-avatar.png',
        role: doc.data().role || 'Colaborador'
      }));

      // 3. Obtener información del cliente
      const clientDoc = await getDoc(doc(db, 'clients', task.clientId));
      const client: ClientInfo = clientDoc.exists() ? {
        id: clientDoc.id,
        name: clientDoc.data().name || 'Cliente Desconocido',
        imageUrl: clientDoc.data().imageUrl || '/default-client.png'
      } : {
        id: task.clientId,
        name: 'Cliente Desconocido',
        imageUrl: '/default-client.png'
      };

      // 4. Obtener mensajes de la subcolección
      const messagesQuery = query(
        collection(db, 'tasks', taskId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(100) // Limitar a los últimos 100 mensajes para el resumen
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messages: Message[] = messagesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp,
      } as Message));

      // 5. Obtener timers de la subcolección (si existe)
      let timers: TimerEntry[] = [];
      let totalAccumulatedSeconds = 0;
      try {
        console.log('[useGeminiSummary] ⏱️ Buscando timers en subcolección...');
        const timersQuery = query(
          collection(db, 'tasks', taskId, 'timers'),
          orderBy('lastFinalized', 'desc'),
          limit(100)
        );
        const timersSnapshot = await getDocs(timersQuery);
        
        timers = timersSnapshot.docs.map(doc => {
          const data = doc.data();
          const accumulatedSeconds = data.accumulatedSeconds || 0;
          totalAccumulatedSeconds += accumulatedSeconds;
          
          return {
            id: doc.id,
            userId: data.userId,
            userName: '', // Se llenará después con la información del usuario
            startTime: data.startTime,
            endTime: data.lastFinalized,
            duration: accumulatedSeconds,
            isRunning: data.isRunning || false,
            comment: '',
            accumulatedSeconds: accumulatedSeconds,
            lastFinalized: data.lastFinalized
          } as TimerEntry;
        });
        
        console.log('[useGeminiSummary] ✅ Timers encontrados:', timers.length);
        console.log('[useGeminiSummary] 📊 Total de segundos acumulados:', totalAccumulatedSeconds);
        console.log('[useGeminiSummary] 📊 Total de horas acumuladas:', (totalAccumulatedSeconds / 3600).toFixed(2));
        
        if (timers.length > 0) {
          console.log('[useGeminiSummary] 📊 Ejemplo de timer:', {
            id: timers[0].id,
            userId: timers[0].userId,
            accumulatedSeconds: timers[0].accumulatedSeconds,
            lastFinalized: timers[0].lastFinalized
          });
        }
      } catch (error) {
        console.log('[useGeminiSummary] ⚠️ No se encontraron timers en subcolección timers:', error);
      }

      // 6. Obtener mensajes con horas registradas
      let timeMessages: Message[] = [];
      let totalHoursFromMessages = 0;
      try {
        console.log('[useGeminiSummary] 🔍 Buscando mensajes con horas registradas...');
        const timeMessagesQuery = query(
          collection(db, 'tasks', taskId, 'messages'),
          where('hours', '>', 0),
          orderBy('hours', 'desc'),
          limit(100)
        );
        const timeMessagesSnapshot = await getDocs(timeMessagesQuery);
        
        timeMessages = timeMessagesSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          timestamp: doc.data().timestamp,
        } as Message));
        
        totalHoursFromMessages = timeMessages.reduce((sum, msg) => sum + (msg.hours || 0), 0);
        
        console.log('[useGeminiSummary] ✅ Mensajes con tiempo encontrados:', timeMessages.length);
        console.log('[useGeminiSummary] 📊 Total de horas en mensajes:', totalHoursFromMessages.toFixed(2));
        
        if (timeMessages.length > 0) {
          console.log('[useGeminiSummary] 📊 Ejemplo de mensaje con tiempo:', {
            id: timeMessages[0].id,
            senderName: timeMessages[0].senderName,
            hours: timeMessages[0].hours,
            timestamp: timeMessages[0].timestamp
          });
        }
      } catch (error) {
        console.log('[useGeminiSummary] ⚠️ No se pudieron obtener mensajes con tiempo:', error);
      }

      // 7. Combinar información de tiempo
      const totalTimeInfo = {
        accumulatedSeconds: totalAccumulatedSeconds,
        totalHours: totalHoursFromMessages + (totalAccumulatedSeconds / 3600),
        timersCount: timers.length,
        timeMessagesCount: timeMessages.length
      };
      
      console.log('[useGeminiSummary] 📊 Resumen de tiempo total:', totalTimeInfo);

      return { 
        task, 
        users, 
        client, 
        messages, 
        timers,
        totalTimeInfo 
      };
    } catch (error) {
      console.error('[useGeminiSummary] Error obteniendo información completa de la tarea:', error);
      throw new Error(`No se pudo obtener la información completa de la tarea: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }, [taskId]);

  const generateSummary = useCallback(async (
    interval: string, 
    messages: Message[], 
    forceRefresh = false
  ) => {
    console.log('[useGeminiSummary] 🚀 generateSummary iniciado:', { interval, messagesCount: messages.length, forceRefresh, taskId });
    
    // ✅ VALIDAR INTERVALO PRIMERO
    if (!intervalLabels[interval as keyof typeof intervalLabels]) {
      console.error('[useGeminiSummary] ❌ Intervalo inválido:', interval);
      throw new Error(`❌ Intervalo inválido: ${interval}. Intervalos válidos: ${Object.keys(intervalLabels).join(', ')}`);
    }

    const cacheKey = `${taskId}_${interval}`;
    console.log('[useGeminiSummary] 🔑 Cache key:', cacheKey);
    
    // ✅ VERIFICAR CACHÉ LOCAL Y FIRESTORE
    if (!forceRefresh) {
      // 1. Verificar caché local
      const summaries = useSummaryStore.getState().summaries;
      const localCached = summaries[cacheKey];
      
      if (localCached && Date.now() - localCached.timestamp < 3600000) {
        console.log('[useGeminiSummary] Using cached summary from local store');
        return localCached.text;
      }
      
      // 2. Verificar caché en Firestore
      try {
        const firestoreDoc = await getDoc(doc(db, 'summaries', cacheKey));
        if (firestoreDoc.exists()) {
          const firestoreData = firestoreDoc.data() as SummaryCache;
          if (Date.now() - firestoreData.timestamp < 3600000) {
            // Sincronizar con caché local
            setSummary(cacheKey, firestoreData);
            console.log('[useGeminiSummary] Using cached summary from Firestore');
            return firestoreData.text;
          }
        }
      } catch (firestoreError) {
        console.log('[useGeminiSummary] Firestore cache check failed, proceeding with generation');
      }
    }

    // ✅ OBTENER INFORMACIÓN COMPLETA DE LA TAREA DESDE FIRESTORE
    console.log('[useGeminiSummary] Obteniendo información completa de la tarea desde Firestore...');
    const { task, users, client, messages: allMessages, timers, totalTimeInfo } = await getCompleteTaskInfo();
    
    console.log('[useGeminiSummary] Información obtenida:', {
      taskName: task.name,
      clientName: client.name,
      projectName: task.project,
      usersCount: users.length,
      messagesCount: allMessages.length,
      timersCount: timers.length
    });

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

    // ✅ FILTRAR MENSAJES Y TIMERS POR INTERVALO
    const filteredMessages = allMessages.filter(msg => {
      if (!msg.timestamp) return false;
      const msgDate = timestampToDate(msg.timestamp);
      return msgDate >= startDate;
    });

    const filteredTimers = timers.filter(timer => {
      const timerDate = timestampToDate(timer.startTime);
      return timerDate >= startDate;
    });

    // ✅ VERIFICAR SI HAY ALGUNA ACTIVIDAD PARA PROCESAR
    if (filteredMessages.length === 0 && filteredTimers.length === 0 && totalTimeInfo.totalHours === 0) {
      const intervalLabel = intervalLabels[interval as keyof typeof intervalLabels] || interval;
      return `📊 No hay actividad registrada en los últimos ${intervalLabel.toLowerCase()}. El resumen estaría vacío.`;
    }

    // ✅ DECRYPT BATCH DE MENSAJES PARA PRIVACIDAD
    const decryptedMessages = await decryptBatch(filteredMessages, 10, taskId);
    
    // ✅ CREAR CONTEXTO COMPLETO PARA CHATGPT
    const taskContext = `
**INFORMACIÓN DE LA TAREA:**
- **Nombre:** ${task.name}
- **Descripción:** ${task.description}
- **Objetivos:** ${task.objectives || 'No especificados'}
- **Cliente:** ${client.name}
- **Proyecto:** ${task.project}
- **Estado:** ${task.status}
- **Prioridad:** ${task.priority}
- **Fechas:** ${timestampToDate(task.startDate).toLocaleDateString('es-MX')} - ${timestampToDate(task.endDate).toLocaleDateString('es-MX')}
- **Creada:** ${timestampToDate(task.createdAt).toLocaleDateString('es-MX')}
- **Última actividad:** ${timestampToDate(task.lastActivity).toLocaleDateString('es-MX')}

**EQUIPO:**
- **Creador:** ${users.find(u => u.id === task.CreatedBy)?.fullName || 'Desconocido'}
- **Líderes:** ${task.LeadedBy.map(id => users.find(u => u.id === id)?.fullName || 'Desconocido').join(', ')}
- **Asignados:** ${task.AssignedTo.map(id => users.find(u => u.id === id)?.fullName || 'Desconocido').join(', ')}
`;

    // ✅ CONSTRUIR CONTEXTO DE CHAT CON MENSAJES Y ACTIVIDAD
    let chatContext = decryptedMessages
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
    
    // ✅ AGREGAR INFORMACIÓN DE TIEMPO SI NO HAY MENSAJES
    if (!chatContext || chatContext.trim().length === 0) {
      const timeInfo = [];
      
      if (totalTimeInfo.totalHours > 0) {
        timeInfo.push(`⏱️ **Tiempo Total Acumulado:** ${totalTimeInfo.totalHours.toFixed(2)} horas`);
      }
      
      if (totalTimeInfo.timersCount > 0) {
        timeInfo.push(`📊 **Sesiones de Trabajo:** ${totalTimeInfo.timersCount} timers registrados`);
      }
      
      if (totalTimeInfo.timeMessagesCount > 0) {
        timeInfo.push(`💬 **Registros de Tiempo:** ${totalTimeInfo.timeMessagesCount} mensajes con tiempo`);
      }
      
      if (timeInfo.length > 0) {
        chatContext = `**ACTIVIDAD DE TIEMPO REGISTRADA:**\n${timeInfo.join('\n')}`;
      }
    }

    // ✅ ASEGURAR QUE chatContext SIEMPRE TENGA UN VALOR VÁLIDO
    let finalChatContext = chatContext;
    
    // Si no hay mensajes, crear un contexto de actividad basado en la información disponible
    if (!finalChatContext || finalChatContext.trim().length === 0) {
      const intervalLabel = intervalLabels[interval as keyof typeof intervalLabels];
      
      // Crear contexto de actividad basado en timers o información general
      if (filteredTimers.length > 0) {
        finalChatContext = `**ACTIVIDAD RECIENTE (${intervalLabel}):** Se registraron ${filteredTimers.length} sesiones de trabajo con timers activos.`;
      } else if (totalTimeInfo.totalHours > 0) {
        finalChatContext = `**ACTIVIDAD RECIENTE (${intervalLabel}):** Se han acumulado ${totalTimeInfo.totalHours.toFixed(2)} horas de trabajo en esta tarea.`;
      } else {
        finalChatContext = `**ACTIVIDAD RECIENTE (${intervalLabel}):** No se registró actividad específica en este período, pero la tarea está activa y en progreso.`;
      }
    }

    const timersContext = filteredTimers.length > 0 ? `
**TIMERS REGISTRADOS:**
${filteredTimers.map(timer => {
  const startTime = timestampToDate(timer.startTime);
  const duration = timer.duration || 0;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  return `- ${timer.userName}: ${hours}h ${minutes}m (${startTime.toLocaleDateString('es-MX')})`;
}).join('\n')}
` : '**TIMERS REGISTRADOS:** No hay timers activos en este período.';

    // ✅ DEBUG: Verificar que los contextos se construyan correctamente
    console.log('[useGeminiSummary] 🔍 Contextos construidos:', {
      taskContextLength: taskContext?.length || 0,
      chatContextLength: chatContext?.length || 0,
      finalChatContextLength: finalChatContext?.length || 0,
      timersContextLength: timersContext?.length || 0,
      filteredTimersCount: filteredTimers.length,
      decryptedMessagesCount: decryptedMessages.length,
      totalTimeInfo: totalTimeInfo,
      hasActivity: !!(chatContext && chatContext.trim().length > 0),
    });

    // ✅ GENERAR RESUMEN CON CHATGPT VÍA API ROUTE
    try {
      console.log('[useGeminiSummary] 🤖 Generando resumen con ChatGPT...');
      
      // ✅ VALIDAR QUE TENEMOS TODOS LOS CAMPOS REQUERIDOS
      if (!finalChatContext || finalChatContext.trim().length === 0) {
        throw new Error('❌ No se pudo generar contexto de actividad válido para el resumen');
      }
      
      // ✅ DEBUG: Verificar datos antes de enviar
      const requestData = {
        taskContext,
        activityContext: finalChatContext,
        timersContext,
        interval: intervalLabels[interval as keyof typeof intervalLabels],
      };
      
      console.log('[useGeminiSummary] 📤 Datos a enviar a la API:', {
        taskContextLength: taskContext?.length || 0,
        activityContextLength: finalChatContext?.length || 0,
        timersContextLength: timersContext?.length || 0,
        interval: intervalLabels[interval as keyof typeof intervalLabels],
        taskContext: taskContext?.substring(0, 100) + '...',
        activityContext: finalChatContext?.substring(0, 100) + '...',
        timersContext: timersContext?.substring(0, 100) + '...',
        isValid: !!(taskContext && finalChatContext && intervalLabels[interval as keyof typeof intervalLabels]),
      });
      
      // ✅ LLAMAR A NUESTRA API ROUTE
      const apiResponse = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        throw new Error(`🚫 Error de la API: ${apiResponse.status} - ${errorData.error || 'Error desconocido'}`);
      }

      const apiData = await apiResponse.json();
      
      if (!apiData.success || !apiData.summary) {
        throw new Error('📝 La API no devolvió un resumen válido');
      }

      const summaryText = apiData.summary;

      if (!summaryText || summaryText.trim().length === 0) {
        throw new Error('📝 ChatGPT devolvió un resumen vacío.');
      }

      const fullSummaryText = ` ${intervalLabels[interval as keyof typeof intervalLabels]}\n\n${summaryText}`;
      
      // ✅ MEJORAR EL FORMATO DEL RESUMEN
      const enhancedSummaryText = enhanceSummaryFormat(fullSummaryText, interval);
      
      // Guardar en caché (local y Firestore)
      const cacheData = { text: enhancedSummaryText, timestamp: Date.now() };
      
      try {
        // Guardar en Firestore primero
        await setDoc(doc(db, 'summaries', cacheKey), cacheData);
        console.log('[useGeminiSummary] Summary saved to Firestore successfully');
        
        // Luego actualizar caché local
        setSummary(cacheKey, cacheData);
        console.log('[useGeminiSummary] Summary cached locally successfully');
      } catch (firestoreError) {
        console.error('[useGeminiSummary] Failed to save to Firestore, but keeping local cache:', firestoreError);
        // Al menos mantener en caché local
        setSummary(cacheKey, cacheData);
      }

      console.log('[useGeminiSummary] Summary generated and cached successfully');
      
      return enhancedSummaryText;
    } catch (error) {
      console.error('[useGeminiSummary] Error generando resumen con ChatGPT:', error);
      throw error;
    }
  }, [taskId, setSummary]);

  // ✅ FUNCIÓN HELPER PARA MEJORAR EL FORMATO DEL RESUMEN
  const enhanceSummaryFormat = useCallback((summaryText: string, interval: string): string => {
    // Agregar variaciones aleatorias para hacer los mensajes más amigables
    const randomGreetings = [
      '¡Hola equipo! 👋',
      '¡Buenos días! ☀️',
      '¡Hola a todos! 🎯',
      '¡Saludos equipo! 🚀',
      '¡Hola! ✨'
    ];
    
    const randomEncouragements = [
      '¡Excelente trabajo! 🎉',
      '¡Seguimos avanzando! 💪',
      '¡Muy bien equipo! 🌟',
      '¡Continuemos así! 🔥',
      '¡Fantástico progreso! 🎊'
    ];
    
    const randomClosing = [
      '¡Sigan así equipo! 🚀',
      '¡Excelente momentum! 💫',
      '¡Continuemos el buen trabajo! 🌟',
      '¡El equipo está brillando! ✨',
      '¡Seguimos hacia adelante! 🎯'
    ];
    
    // Seleccionar elementos aleatorios
    const greeting = randomGreetings[Math.floor(Math.random() * randomGreetings.length)];
    const encouragement = randomEncouragements[Math.floor(Math.random() * randomEncouragements.length)];
    const closing = randomClosing[Math.floor(Math.random() * randomClosing.length)];
    
    // ✅ AGREGAR TÍTULO PRINCIPAL GRANDE
    let enhanced = `<h3 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 20px 0; text-align: center; border-bottom: 3px solid #8b5cf6; padding-bottom: 10px;"> Resumen de Actividad</h3>\n\n`;
    
    // Mejorar el formato del resumen
    enhanced += summaryText;
    
    // Agregar saludo personalizado al inicio (después del título)
    enhanced = enhanced.replace(/^📊/, `${greeting}\n\n📊`);
    
    // Mejorar formato de listas
    enhanced = enhanced.replace(/^\* /gm, '• ');
    enhanced = enhanced.replace(/^\d+\./gm, '• ');
    
    // Agregar emojis a secciones específicas
    enhanced = enhanced.replace(/^📋/, '**Resumen:**');
    enhanced = enhanced.replace(/^💬/, '**Comunicación:**');
    enhanced = enhanced.replace(/^⏱️/, '**Tiempo Registrado:**');
    enhanced = enhanced.replace(/^🎯/, '**Próximos Pasos:**');
    enhanced = enhanced.replace(/^📈/, '**Estado del Proyecto:**');
    
    // Agregar mensaje motivacional al final
    enhanced += `\n\n${closing}`;
    
    return enhanced;
  }, []);

  return {
    generateSummary,
    getCompleteTaskInfo,
    isGenerating: false, // Se puede expandir para tracking de estado
  };
};
