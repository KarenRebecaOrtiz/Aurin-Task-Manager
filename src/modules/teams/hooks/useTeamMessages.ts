/**
 * useTeamMessages Hook
 *
 * Hook simplificado para mensajes de equipos con react-virtuoso.
 * Basado en useVirtuosoMessages pero adaptado para la colección teams.
 *
 * Características:
 * - Ordenamiento simple: SIEMPRE ASC (antiguos → nuevos)
 * - Sin cálculos manuales de scroll (virtuoso lo maneja)
 * - Real-time listener integrado
 * - Cache de Firebase
 * - Paginación automática con startReached
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message } from '@/modules/chat/types';

interface UseTeamMessagesProps {
  teamId: string;
  pageSize?: number;
  onNewMessage?: () => void;
}

export const useTeamMessages = ({
  teamId,
  pageSize = 50,
  onNewMessage,
}: UseTeamMessagesProps) => {
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

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Convierte datos de Firestore a Message
   */
  const mapToMessage = useCallback((doc: any): Message => {
    const data = doc.data ? doc.data() : doc;
    return {
      id: doc.id || data.id,
      senderId: data.senderId || 'unknown',
      senderName: data.senderName || 'Anónimo',
      text: data.text || null,
      timestamp: data.timestamp,
      read: data.read || false,
      readBy: data.readBy || [],
      reactions: data.reactions || [],
      clientId: data.clientId || doc.id,
      imageUrl: data.imageUrl || null,
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      fileType: data.fileType || null,
      filePath: data.filePath || null,
      replyTo: data.replyTo || null,
      hours: data.hours,
      dateString: data.dateString,
    } as Message;
  }, []);

  /**
   * Ordena mensajes ASC (antiguos → nuevos)
   */
  const sortMessagesAsc = useCallback((msgs: Message[]): Message[] => {
    return [...msgs].sort((a, b) => {
      const aTime = a.timestamp
        ? a.timestamp instanceof Date
          ? a.timestamp.getTime()
          : a.timestamp.toDate().getTime()
        : 0;
      const bTime = b.timestamp
        ? b.timestamp instanceof Date
          ? b.timestamp.getTime()
          : b.timestamp.toDate().getTime()
        : 0;
      return aTime - bTime; // ASC: antiguos primero
    });
  }, []);

  /**
   * Genera grupos de mensajes por fecha para Virtuoso
   */
  const getGroupData = useCallback((msgs: Message[]) => {
    if (!msgs || msgs.length === 0) {
      return { groupCounts: [], groupDates: [] };
    }

    const groups: { date: Date; count: number }[] = [];
    let currentDate: Date | null = null;
    let currentCount = 0;

    msgs.forEach((message) => {
      const messageDate = message.timestamp
        ? message.timestamp instanceof Date
          ? message.timestamp
          : message.timestamp.toDate()
        : new Date();

      const messageDateStr = messageDate.toDateString();

      if (!currentDate || messageDateStr !== currentDate.toDateString()) {
        if (currentDate) {
          groups.push({ date: currentDate, count: currentCount });
        }
        currentDate = messageDate;
        currentCount = 1;
      } else {
        currentCount++;
      }
    });

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
    if (!teamId || !isInitialLoad) return;

    setIsLoadingMore(true);

    try {
      const messagesRef = collection(db, `teams/${teamId}/messages`);
      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);

      const initialMessages = snapshot.docs.map((doc) => mapToMessage(doc));
      const initialLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

      // Ordenar ASC (antiguos → nuevos)
      const sorted = sortMessagesAsc(initialMessages);

      setMessages(sorted);
      setLastDoc(initialLastDoc);
      setHasMore(initialMessages.length >= pageSize);

      // Track processed IDs
      sorted.forEach((msg) => processedIdsRef.current.add(msg.id));
    } catch (error) {
      console.error('[useTeamMessages] Error loading initial messages:', error);
    } finally {
      setIsLoadingMore(false);
      setIsInitialLoad(false);
    }
  }, [teamId, pageSize, mapToMessage, sortMessagesAsc, isInitialLoad]);

  /**
   * Carga más mensajes (paginación hacia atrás)
   */
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingRef.current || !hasMore || !teamId) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoadingMore(true);

    try {
      const messagesRef = collection(db, `teams/${teamId}/messages`);
      const q = lastDoc
        ? query(
            messagesRef,
            orderBy('timestamp', 'desc'),
            startAfter(lastDoc),
            limit(pageSize)
          )
        : query(messagesRef, orderBy('timestamp', 'desc'), limit(pageSize));

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setHasMore(false);
        return;
      }

      const olderMessages = snapshot.docs.map((doc) => mapToMessage(doc));
      const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

      // Deduplicación
      const existingIds = processedIdsRef.current;
      const uniqueMessages = olderMessages.filter(
        (msg) => !existingIds.has(msg.id)
      );

      if (uniqueMessages.length > 0) {
        setMessages((prev) => {
          const combined = [...uniqueMessages, ...prev];
          return sortMessagesAsc(combined);
        });

        uniqueMessages.forEach((msg) => processedIdsRef.current.add(msg.id));
        setLastDoc(newLastDoc);
      }

      if (olderMessages.length < pageSize) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('[useTeamMessages] Error loading more messages:', error);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, lastDoc, teamId, pageSize, mapToMessage, sortMessagesAsc]);

  // ============================================================================
  // REAL-TIME LISTENER
  // ============================================================================

  useEffect(() => {
    if (!teamId || isInitialLoad) {
      return;
    }

    // Limpiar listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const messagesRef = collection(db, `teams/${teamId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const changes = snapshot.docChanges();

        for (const change of changes) {
          const messageData = mapToMessage(change.doc);

          if (change.type === 'added') {
            if (processedIdsRef.current.has(messageData.id)) {
              continue;
            }

            setMessages((prev) => {
              if (prev.some((msg) => msg.id === messageData.id)) {
                return prev;
              }

              processedIdsRef.current.add(messageData.id);
              return [...prev, messageData];
            });

            if (onNewMessage) {
              onNewMessage();
            }
          } else if (change.type === 'modified') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageData.id ? messageData : msg
              )
            );
          } else if (change.type === 'removed') {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== messageData.id)
            );
            processedIdsRef.current.delete(messageData.id);
          }
        }
      },
      (error) => {
        console.error('[useTeamMessages] Error in listener:', error);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [teamId, mapToMessage, onNewMessage, isInitialLoad]);

  // ============================================================================
  // CLEANUP ON TEAM CHANGE
  // ============================================================================

  useEffect(() => {
    return () => {
      setMessages([]);
      setIsInitialLoad(true);
      setHasMore(true);
      setLastDoc(null);
      processedIdsRef.current.clear();
    };
  }, [teamId]);

  // ============================================================================
  // RETURN
  // ============================================================================

  const groupData = getGroupData(messages);

  return {
    messages,
    groupCounts: groupData.groupCounts,
    groupDates: groupData.groupDates,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    initialLoad,
  };
};
