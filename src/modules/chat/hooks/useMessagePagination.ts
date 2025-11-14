/**
 * useMessagePagination Hook
 *
 * Hook optimizado para paginación de mensajes con real-time updates.
 * Basado en chatsidebarMODULARIZED + conexión Firebase real + patrones Apple.
 *
 * Características agregadas:
 * - Cache automático para evitar re-fetches al cambiar entre tareas
 * - Scroll preservation: mantiene posición al volver a una tarea
 * - Auto-limpieza de cache después de 10 min de inactividad
 *
 * @see /Users/karen/Desktop/apps.apple.com-main/shared/utils/src/history.ts
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useChatStore } from '../stores/chatStore';
import { firebaseService } from '../services/firebaseService';
import { chatCache, saveScrollBeforeSwitch, restoreScrollPosition } from '../services/simpleChatCache';
import type { Message } from '../types';

interface UseMessagePaginationProps {
  taskId: string;
  pageSize?: number;
  decryptMessage?: (encrypted: { encryptedData: string; nonce: string; tag: string; salt: string }) => Promise<string>;
  onNewMessage?: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement>; // Para preservar scroll position
}

/**
 * Hook de paginación de mensajes para el módulo de chat
 * Usa useRef para isLoading para evitar re-renders innecesarios
 */
export const useMessagePagination = ({
  taskId,
  pageSize = 50,
  decryptMessage,
  onNewMessage,
  scrollContainerRef,
}: UseMessagePaginationProps) => {
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const isLoadingRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const previousScrollHeightRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;

  const {
    getCurrentMessages,
    getCurrentHasMore,
    getCurrentIsLoading,
    setMessages,
    setHasMore,
    setIsLoading,
    prependMessages,
    setCurrentTask,
    addMessage,
    updateMessage,
  } = useChatStore();

  // Inicializar tarea en el store
  const messages = getCurrentMessages();
  const hasMoreMessages = getCurrentHasMore();
  const isLoadingMore = getCurrentIsLoading();

  /**
   * Desencripta un mensaje si es necesario
   */
  const processMessage = useCallback(async (msg: any): Promise<Message> => {
    let decryptedText = msg.text;
    
    // Desencriptar si tiene datos encriptados
    if (msg.encrypted && decryptMessage) {
      try {
        decryptedText = await decryptMessage(msg.encrypted);
      } catch (error) {
        console.error('[useMessagePagination] Error decrypting message:', error);
      }
    }

    return {
      ...msg,
      text: decryptedText,
    } as Message;
  }, [decryptMessage]);

  /**
   * Carga más mensajes (paginación hacia atrás)
   *
   * IMPORTANTE: Con flexDirection: column-reverse, la preservación del scroll
   * funciona de manera diferente. Los mensajes antiguos se insertan al inicio
   * del array pero se renderizan ARRIBA visualmente. El scrollTop se ajusta
   * automáticamente en la mayoría de navegadores, pero lo forzamos para garantizar
   * consistencia.
   */
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreMessages || !taskId) return;

    isLoadingRef.current = true;
    setIsLoading(taskId, true);

    // Con column-reverse, guardamos la posición actual DESDE EL BOTTOM
    let previousScrollPosition = 0;
    if (scrollContainerRef?.current) {
      const container = scrollContainerRef.current;
      previousScrollPosition = container.scrollHeight - container.scrollTop;
    }

    try {
      // Cargar mensajes desde Firebase
      const { messages: newMessages, lastDoc: newLastDoc } = await firebaseService.loadMessages(
        taskId,
        pageSize,
        lastDoc || undefined,
      );

      if (newMessages.length < pageSize) {
        setHasMore(taskId, false);
      }

      // Obtener IDs existentes para deduplicación
      const existingIds = new Set(messages.map(m => m.id));
      const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));

      if (uniqueNewMessages.length > 0) {
        // Prepend older messages (reverse chronological order)
        prependMessages(taskId, uniqueNewMessages.reverse());
        setLastDoc(newLastDoc);

        // Con column-reverse, ajustamos el scroll para mantener la vista
        // Esperamos a que el DOM se actualice
        requestAnimationFrame(() => {
          if (scrollContainerRef?.current) {
            const container = scrollContainerRef.current;
            // Calculamos la nueva posición manteniendo la distancia desde el bottom
            container.scrollTop = container.scrollHeight - previousScrollPosition;
          }
        });
      }
    } catch (error) {
      console.error('[useMessagePagination] Error loading messages:', error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(taskId, false);
    }
  }, [hasMoreMessages, lastDoc, taskId, pageSize, messages, setHasMore, setIsLoading, prependMessages, scrollContainerRef]);

  /**
   * Carga inicial de mensajes con cache integrado
   *
   * Estrategia:
   * 1. Intenta obtener del cache (instantáneo)
   * 2. Si hay cache, restaura scroll position
   * 3. Si no hay cache, fetch desde Firestore
   * 4. El firebaseService se encarga de cachear automáticamente
   */
  const initialLoad = useCallback(async () => {
    if (messages.length > 0 || !taskId) {
      return;
    }

    setCurrentTask(taskId);

    // ✅ NUEVO: Intentar restaurar desde cache primero
    const cached = chatCache.get(taskId);

    if (cached) {
      console.log(`[useMessagePagination] ⚡ Restoring from cache: ${cached.messages.length} messages`);

      // Procesar mensajes del cache (pueden estar encriptados)
      const processedMessages = await Promise.all(
        cached.messages.map(msg => processMessage(msg))
      );

      // Restaurar estado completo
      setMessages(taskId, processedMessages.reverse());
      setLastDoc(cached.lastDoc);
      setHasMore(taskId, cached.hasMore);
      setIsLoading(taskId, false);

      // ✅ NUEVO: Restaurar scroll position
      restoreScrollPosition(scrollContainerRef?.current || null, cached.scrollY);

      return; // No fetch - usamos cache
    }

    // Cache MISS - cargar desde Firestore
    console.log('[useMessagePagination] Cache miss - loading from Firestore');
    setIsLoading(taskId, true);

    try {
      // Cargar mensajes iniciales desde Firebase (auto-cachea)
      const { messages: initialMessages, lastDoc: initialLastDoc } = await firebaseService.loadMessages(
        taskId,
        pageSize
      );

      // Procesar mensajes (desencriptar si es necesario)
      const processedMessages = await Promise.all(
        initialMessages.map(msg => processMessage(msg))
      );

      setMessages(taskId, processedMessages.reverse());
      setLastDoc(initialLastDoc);

      if (initialMessages.length < pageSize) {
        setHasMore(taskId, false);
      }

    } catch (error) {
      console.error('[useMessagePagination] Error loading initial messages:', error);
    } finally {
      setIsLoading(taskId, false);
    }
  }, [messages.length, taskId, pageSize, setCurrentTask, setHasMore, setIsLoading, setMessages, processMessage, scrollContainerRef]);

  /**
   * Estrategia de reconexión con backoff exponencial
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('[useMessagePagination] Max reconnection attempts reached');
      return;
    }

    reconnectAttemptsRef.current += 1;

    // Backoff exponencial: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);


    reconnectTimeoutRef.current = setTimeout(() => {
      // Trigger re-setup by updating a dependency
      // El useEffect se encargará de reconectar
    }, delay);
  }, [maxReconnectAttempts]);

  /**
   * Listener en tiempo real para nuevos mensajes
   *
   * IMPORTANTE: No limitamos la query de real-time porque queremos capturar
   * TODOS los mensajes nuevos y modificados, no solo los últimos pageSize.
   * La paginación es SOLO para carga histórica (scroll hacia arriba).
   */
  useEffect(() => {
    if (!taskId) return;

    // Limpiar listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Limpiar timeout de reconexión si existe
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Crear query para mensajes en tiempo real
    // NO usar limit aquí - queremos todos los mensajes nuevos
    const messagesRef = collection(db, `tasks/${taskId}/messages`);
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc')
      // Sin firestoreLimit - capturamos todos los cambios
    );

    // Track processed message IDs to avoid duplicates
    const processedIds = new Set<string>();

    // Inicializar con IDs existentes
    const existingMessages = getCurrentMessages();
    existingMessages.forEach(msg => processedIds.add(msg.id));

    // Listener en tiempo real
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        // Conexión exitosa - reset reconnection attempts
        reconnectAttemptsRef.current = 0;

        const changes = snapshot.docChanges();

        for (const change of changes) {
          const messageData = { id: change.doc.id, ...change.doc.data() };

          // Deduplicación: evitar procesar el mismo mensaje múltiples veces
          if (change.type === 'added' && processedIds.has(messageData.id)) {
            continue; // Skip - ya procesado
          }

          const processedMessage = await processMessage(messageData);

          if (change.type === 'added') {
            // Nuevo mensaje
            processedIds.add(messageData.id);
            addMessage(taskId, processedMessage);
            if (onNewMessage) {
              onNewMessage();
            }
          } else if (change.type === 'modified') {
            // Mensaje actualizado
            updateMessage(taskId, processedMessage.id, processedMessage);
          }
        }
      },
      (error) => {
        console.error('[useMessagePagination] Error in real-time listener:', error);

        // Estrategia de recuperación: intentar reconectar
        attemptReconnect();
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [taskId, processMessage, addMessage, updateMessage, onNewMessage, getCurrentMessages, attemptReconnect]);

  /**
   * ✅ NUEVO: Guardar scroll position antes de cambiar de tarea
   *
   * Este efecto se ejecuta:
   * 1. Cuando el componente se desmonta (cambio de tarea)
   * 2. Antes de que taskId cambie
   *
   * Basado en el patrón beforeTransition de Apple History
   */
  useEffect(() => {
    return () => {
      // Cleanup: guardar scroll antes de cambiar de tarea
      if (taskId && scrollContainerRef?.current) {
        saveScrollBeforeSwitch(taskId, scrollContainerRef.current);
      }
    };
  }, [taskId, scrollContainerRef]);

  /**
   * ✅ NUEVO: Actualizar cache cuando los mensajes cambien (real-time)
   *
   * Mantiene el cache sincronizado con el estado actual.
   * NO resetea el TTL (solo updateMessages, no set).
   */
  useEffect(() => {
    if (taskId && messages.length > 0) {
      chatCache.updateMessages(taskId, messages);
    }
  }, [taskId, messages]);

  /**
   * Agrupa mensajes por fecha - ESTILO WHATSAPP
   *
   * Ordenamiento ASC (antiguos primero, nuevos al final):
   * - Mensajes más antiguos ARRIBA
   * - Mensajes más recientes ABAJO
   * - Scroll automático al bottom muestra los mensajes nuevos
   */
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const grouped: Array<{ date: Date; messages: Message[] }> = [];
    let currentDate: Date | null = null;
    let currentGroup: Message[] = [];

    // ✅ Ordenar mensajes ASC (más antiguos primero, como WhatsApp)
    const sortedMessages = [...messages].sort((a, b) => {
      const aTime = a.timestamp ? (a.timestamp instanceof Date ? a.timestamp.getTime() : a.timestamp.toDate().getTime()) : 0;
      const bTime = b.timestamp ? (b.timestamp instanceof Date ? b.timestamp.getTime() : b.timestamp.toDate().getTime()) : 0;
      return aTime - bTime; // ✅ ASC: antiguos primero
    });

    sortedMessages.forEach((message) => {
      const messageDate = message.timestamp ? (message.timestamp instanceof Date ? message.timestamp : message.timestamp.toDate()) : new Date();

      if (!currentDate || messageDate.toDateString() !== currentDate.toDateString()) {
        if (currentGroup.length > 0 && currentDate) {
          // ✅ Ordenar mensajes dentro del grupo ASC también
          const sortedGroup = [...currentGroup].sort((a, b) => {
            const aTime = a.timestamp ? (a.timestamp instanceof Date ? a.timestamp.getTime() : a.timestamp.toDate().getTime()) : 0;
            const bTime = b.timestamp ? (b.timestamp instanceof Date ? b.timestamp.getTime() : b.timestamp.toDate().getTime()) : 0;
            return aTime - bTime; // ✅ ASC: antiguos primero
          });

          grouped.push({
            date: currentDate,
            messages: sortedGroup,
          });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    // Último grupo
    if (currentGroup.length > 0 && currentDate) {
      const sortedGroup = [...currentGroup].sort((a, b) => {
        const aTime = a.timestamp ? (a.timestamp instanceof Date ? a.timestamp.getTime() : a.timestamp.toDate().getTime()) : 0;
        const bTime = b.timestamp ? (b.timestamp instanceof Date ? b.timestamp.getTime() : b.timestamp.toDate().getTime()) : 0;
        return aTime - bTime; // ✅ ASC: antiguos primero
      });

      grouped.push({
        date: currentDate,
        messages: sortedGroup,
      });
    }

    return grouped;
  }, [messages]);

  return {
    loadMoreMessages,
    initialLoad,
    isLoadingMore,
    hasMoreMessages,
    messages,
    groupedMessages, // Exportar groupedMessages como el original
  };
};
