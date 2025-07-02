import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, Timestamp, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';

interface MessageCache {
  [conversationId: string]: {
    messages: Message[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
    isLoading: boolean;
    lastFetch: number;
  };
}

interface UsePrivateMessagePaginationProps {
  conversationId: string;
  pageSize?: number;
  cacheTimeout?: number;
  decryptMessage: (text: string) => string;
}

const MESSAGE_CACHE: MessageCache = {};
const DEFAULT_PAGE_SIZE = 15;
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000;

export const usePrivateMessagePagination = ({
  conversationId,
  pageSize = DEFAULT_PAGE_SIZE,
  cacheTimeout = DEFAULT_CACHE_TIMEOUT,
  decryptMessage,
}: UsePrivateMessagePaginationProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastDocRef = useRef<DocumentSnapshot | null>(null);

  // Limpiar cache expirado
  const cleanupExpiredCache = useCallback(() => {
    const now = Date.now();
    Object.keys(MESSAGE_CACHE).forEach(cid => {
      const cache = MESSAGE_CACHE[cid];
      if (now - cache.lastFetch > cacheTimeout) {
        delete MESSAGE_CACHE[cid];
      }
    });
  }, [cacheTimeout]);

  // Obtener mensajes del cache
  const getCachedMessages = useCallback((cid: string): Message[] => {
    const cache = MESSAGE_CACHE[cid];
    if (cache && Date.now() - cache.lastFetch < cacheTimeout) {
      return cache.messages;
    }
    return [];
  }, [cacheTimeout]);

  // Guardar mensajes en cache
  const setCachedMessages = useCallback((cid: string, messages: Message[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => {
    MESSAGE_CACHE[cid] = {
      messages,
      lastDoc,
      hasMore,
      isLoading: false,
      lastFetch: Date.now(),
    };
  }, []);

  // Cargar mensajes iniciales (más recientes)
  const loadInitialMessages = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    setError(null);
    try {
      cleanupExpiredCache();
      const cachedMessages = getCachedMessages(conversationId);
      if (cachedMessages.length > 0) {
        setMessages(cachedMessages);
        setIsLoading(false);
        return;
      }
      const messagesQuery = query(
        collection(db, `conversations/${conversationId}/messages`),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );
      const snapshot = await getDocs(messagesQuery);
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.timestamp) return;
        const decryptedText = data.text ? decryptMessage(data.text) : data.text;
        newMessages.push({
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          senderName: data.senderName,
          text: decryptedText,
          timestamp: data.timestamp,
          read: data.read || false,
          imageUrl: data.imageUrl || null,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileType: data.fileType || null,
          filePath: data.filePath || null,
          isPending: false,
          hasError: false,
          clientId: doc.id,
          replyTo: data.replyTo || null,
        });
      });
      const sortedMessages = newMessages.sort((a, b) => {
        const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : a.timestamp?.getTime() || 0;
        const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : b.timestamp?.getTime() || 0;
        return bTime - aTime;
      });
      setMessages(sortedMessages);
      setHasMore(snapshot.docs.length === pageSize);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setCachedMessages(conversationId, sortedMessages, lastDocRef.current, snapshot.docs.length === pageSize);
    } catch {
      setError('Error al cargar los mensajes');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, pageSize, decryptMessage, cleanupExpiredCache, getCachedMessages, setCachedMessages]);

  // Cargar más mensajes (más antiguos)
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || isLoadingMore || !lastDocRef.current) return Promise.resolve();
    setIsLoadingMore(true);
    setError(null);
    try {
      const messagesQuery = query(
        collection(db, `conversations/${conversationId}/messages`),
        orderBy('timestamp', 'desc'),
        startAfter(lastDocRef.current),
        limit(pageSize)
      );
      const snapshot = await getDocs(messagesQuery);
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.timestamp) return;
        const decryptedText = data.text ? decryptMessage(data.text) : data.text;
        newMessages.push({
          id: doc.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          senderName: data.senderName,
          text: decryptedText,
          timestamp: data.timestamp,
          read: data.read || false,
          imageUrl: data.imageUrl || null,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileType: data.fileType || null,
          filePath: data.filePath || null,
          isPending: false,
          hasError: false,
          clientId: doc.id,
          replyTo: data.replyTo || null,
        });
      });
      const sortedNewMessages = newMessages.sort((a, b) => {
        const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : a.timestamp?.getTime() || 0;
        const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : b.timestamp?.getTime() || 0;
        return bTime - aTime;
      });
      setMessages((prev) => {
        const existingIds = new Set(prev.map(msg => msg.id));
        const uniqueNewMessages = sortedNewMessages.filter(msg => !existingIds.has(msg.id));
        return [...prev, ...uniqueNewMessages];
      });
      setHasMore(snapshot.docs.length === pageSize);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
    } catch {
      setError('Error al cargar más mensajes');
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, hasMore, isLoadingMore, pageSize, decryptMessage]);

  useEffect(() => {
    loadInitialMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    error,
    addOptimisticMessage: () => {},
    updateOptimisticMessage: () => {},
  };
}; 