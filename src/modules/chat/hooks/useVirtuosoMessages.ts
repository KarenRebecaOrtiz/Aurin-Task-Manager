/**
 * useVirtuosoMessages Hook
 *
 * Hook simplificado para mensajes con react-virtuoso.
 * Elimina la complejidad del hook anterior con lógica más clara.
 *
 * Características:
 * - Ordenamiento simple: SIEMPRE ASC (antiguos → nuevos)
 * - Sin cálculos manuales de scroll (virtuoso lo maneja)
 * - Real-time listener integrado
 * - Cache de Firebase
 * - Paginación automática con startReached
 *
 * Diferencias con useMessagePagination:
 * - ✅ Sin column-reverse en CSS
 * - ✅ Sin groupedMessages (virtuoso usa groupCounts)
 * - ✅ Sin scroll position manual
 * - ✅ Ordenamiento consistente (solo ASC)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firebaseService } from '../services/firebaseService';
import type { Message } from '../types';

interface UseVirtuosoMessagesProps {
  taskId: string;
  pageSize?: number;
  decryptMessage?: (encrypted: {
    encryptedData: string;
    nonce: string;
    tag: string;
    salt: string;
  }) => Promise<string>;
  onNewMessage?: () => void;
  /** Tipo de colección: 'tasks' para tareas, 'teams' para equipos. Default: 'tasks' */
  collectionType?: 'tasks' | 'teams';
}

export const useVirtuosoMessages = ({
  taskId,
  pageSize = 50,
  decryptMessage,
  onNewMessage,
  collectionType = 'tasks',
}: UseVirtuosoMessagesProps) => {
  // IMPORTANTE: No usar función getMessagesPath() para evitar stale closures
  // Calcular el path directamente donde se necesite usando collectionType

  // ============================================================================
  // STATE
  // ============================================================================
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  // ============================================================================
  // REFS
  // ============================================================================
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const isLoadingRef = useRef(false);
  const isFirstSnapshotRef = useRef(true); // Para ignorar el snapshot inicial del listener

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Desencripta un mensaje si es necesario
   */
  const processMessage = useCallback(
    async (msg: any): Promise<Message> => {
      let decryptedText = msg.text;

      if (msg.encrypted && decryptMessage) {
        try {
          decryptedText = await decryptMessage(msg.encrypted);
        } catch {
        }
      }

      return {
        ...msg,
        text: decryptedText,
      } as Message;
    },
    [decryptMessage]
  );

  /**
   * Ordena mensajes ASC (antiguos → nuevos)
   * IMPORTANTE: Mensajes sin timestamp (pendientes de Firestore) van al final
   */
  const sortMessagesAsc = useCallback((msgs: Message[]): Message[] => {
    const now = Date.now();
    return [...msgs].sort((a, b) => {
      // Si no hay timestamp, usar tiempo actual (mensaje nuevo pendiente va al final)
      const aTime = a.timestamp
        ? a.timestamp instanceof Date
          ? a.timestamp.getTime()
          : typeof a.timestamp.toDate === 'function'
            ? a.timestamp.toDate().getTime()
            : now
        : now;
      const bTime = b.timestamp
        ? b.timestamp instanceof Date
          ? b.timestamp.getTime()
          : typeof b.timestamp.toDate === 'function'
            ? b.timestamp.toDate().getTime()
            : now
        : now;
      return aTime - bTime; // ASC: antiguos primero
    });
  }, []);

  /**
   * Genera grupos de mensajes por fecha para Virtuoso
   * Retorna: [groupCounts, groupDates]
   * Ejemplo: [3, 5, 2] significa 3 mensajes del primer día, 5 del segundo, 2 del tercero
   */
  const getGroupData = useCallback((msgs: Message[]) => {
    if (!msgs || msgs.length === 0) {
      return { groupCounts: [], groupDates: [] };
    }

    const groups: { date: Date; count: number }[] = [];
    let currentDate: Date | null = null;
    let currentCount = 0;

    // Los mensajes YA vienen ordenados ASC
    msgs.forEach((message) => {
      let messageDate: Date;
      if (message.timestamp) {
        if (message.timestamp instanceof Date) {
          messageDate = message.timestamp;
        } else if (typeof message.timestamp.toDate === 'function') {
          messageDate = message.timestamp.toDate();
        } else {
          messageDate = new Date();
        }
      } else {
        messageDate = new Date();
      }

      const messageDateStr = messageDate.toDateString();

      if (!currentDate || messageDateStr !== currentDate.toDateString()) {
        // Nuevo grupo de fecha
        if (currentDate) {
          groups.push({ date: currentDate, count: currentCount });
        }
        currentDate = messageDate;
        currentCount = 1;
      } else {
        currentCount++;
      }
    });

    // Último grupo
    if (currentDate) {
      groups.push({ date: currentDate, count: currentCount });
    }

    return {
      groupCounts: groups.map((g) => g.count),
      groupDates: groups.map((g) => g.date),
    };
  }, []);

  // ============================================================================
  // LOAD MESSAGES (PAGINATION)
  // ============================================================================

  /**
   * Carga inicial de mensajes
   */
  const initialLoad = useCallback(async () => {
    if (!taskId || !isInitialLoad) return;

  // ...
    setIsLoadingMore(true);

    try {
      const { messages: initialMessages, lastDoc: initialLastDoc } =
        await firebaseService.loadMessages(taskId, pageSize, undefined, collectionType);

      const processed = await Promise.all(
        initialMessages.map((msg) => processMessage(msg))
      );

      // Ordenar ASC (antiguos → nuevos)
      const sorted = sortMessagesAsc(processed);

      setMessages(sorted);
      setLastDoc(initialLastDoc);
      setHasMore(initialMessages.length >= pageSize);

      // Track processed IDs
      sorted.forEach((msg) => processedIdsRef.current.add(msg.id));
    } catch {
      // ...
    } finally {
      setIsLoadingMore(false);
      setIsInitialLoad(false);
    }
  }, [taskId, pageSize, processMessage, sortMessagesAsc, isInitialLoad, collectionType]);

  /**
   * Carga más mensajes (paginación hacia atrás)
   * Llamado por Virtuoso cuando se hace scroll hacia arriba
   */
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || !taskId) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoadingMore(true);

  // ...

    try {
      const { messages: olderMessages, lastDoc: newLastDoc } =
        await firebaseService.loadMessages(taskId, pageSize, lastDoc || undefined, collectionType);

      if (olderMessages.length === 0) {
        setHasMore(false);
        return;
      }

      const processed = await Promise.all(
        olderMessages.map((msg) => processMessage(msg))
      );

      // Deduplicación
      const existingIds = processedIdsRef.current;
      const uniqueMessages = processed.filter((msg) => !existingIds.has(msg.id));

      if (uniqueMessages.length > 0) {
        // Prepend older messages (mantener orden ASC)
        setMessages((prev) => {
          const combined = [...uniqueMessages, ...prev];
          return sortMessagesAsc(combined);
        });

        // Track new IDs
        uniqueMessages.forEach((msg) => processedIdsRef.current.add(msg.id));
        setLastDoc(newLastDoc);
      }

      if (olderMessages.length < pageSize) {
        setHasMore(false);
      }
    } catch {
      // ...
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, lastDoc, taskId, pageSize, processMessage, sortMessagesAsc, collectionType]);

  // ============================================================================
  // REAL-TIME LISTENER
  // ============================================================================

  useEffect(() => {
    if (!taskId || isInitialLoad) {
      // No establecer listener hasta que initialLoad termine
      return;
    }

  // ...

    // Limpiar listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // IMPORTANTE: Calcular path directamente aquí, NO usar función externa
    const path = `${collectionType}/${taskId}/messages`;

    const messagesRef = collection(db, path);
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    // Resetear flag del primer snapshot cuando se establece nuevo listener
    isFirstSnapshotRef.current = true;

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const changes = snapshot.docChanges();

        // Ignorar el primer snapshot completo del listener
        // porque initialLoad ya cargó los mensajes
        if (isFirstSnapshotRef.current) {
          isFirstSnapshotRef.current = false;
          // Solo procesar si hay IDs que no conocemos (mensajes nuevos durante el gap)
          const newMessages: Message[] = [];
          for (const change of changes) {
            if (change.type === 'added' && !processedIdsRef.current.has(change.doc.id)) {
              const messageData = { id: change.doc.id, ...change.doc.data() };
              const processedMessage = await processMessage(messageData);
              newMessages.push(processedMessage);
              processedIdsRef.current.add(change.doc.id);
            }
          }
          if (newMessages.length > 0) {
            // Agregar mensajes nuevos y reordenar
            setMessages((prev) => sortMessagesAsc([...prev, ...newMessages]));
            if (onNewMessage) {
              onNewMessage();
            }
          }
          return;
        }

        for (const change of changes) {
          const messageData = { id: change.doc.id, ...change.doc.data() };

          const processedMessage = await processMessage(messageData);

          if (change.type === 'added') {
            // Verificar duplicación TANTO en ref como en array actual
            if (processedIdsRef.current.has(messageData.id)) {
              continue;
            }

            // Nuevo mensaje - agregar y reordenar para garantizar orden correcto
            processedIdsRef.current.add(messageData.id);
            setMessages((prev) => {
              if (prev.some(msg => msg.id === messageData.id)) {
                return prev;
              }
              // Agregar y reordenar para asegurar ASC
              return sortMessagesAsc([...prev, processedMessage]);
            });

            if (onNewMessage) {
              onNewMessage();
            }
          } else if (change.type === 'modified') {
            // Mensaje actualizado - reemplazar y reordenar (timestamp puede haber cambiado)
            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === processedMessage.id ? processedMessage : msg
              );
              return sortMessagesAsc(updated);
            });
          } else if (change.type === 'removed') {
            // Mensaje eliminado
            setMessages((prev) => prev.filter((msg) => msg.id !== messageData.id));
            processedIdsRef.current.delete(messageData.id);
          }
        }
      },
      (_error) => {
        // ...
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [taskId, processMessage, onNewMessage, isInitialLoad, collectionType, sortMessagesAsc]);

  // ============================================================================
  // CLEANUP ON TASK CHANGE
  // ============================================================================

  useEffect(() => {
    // Reset state cuando cambia la tarea
    return () => {
      setMessages([]);
      setIsInitialLoad(true);
      setHasMore(true);
      setLastDoc(null);
      processedIdsRef.current.clear();
      isFirstSnapshotRef.current = true; // Reset flag del primer snapshot
    };
  }, [taskId]);

  // ============================================================================
  // RETURN
  // ============================================================================

  const groupData = getGroupData(messages);

  return {
    // Messages (siempre ordenados ASC)
    messages,

    // Group data para Virtuoso
    groupCounts: groupData.groupCounts,
    groupDates: groupData.groupDates,

    // Loading states
    isLoadingMore,
    hasMore,

    // Actions
    loadMoreMessages,
    initialLoad,
  };
};
