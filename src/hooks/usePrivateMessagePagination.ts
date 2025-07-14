import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, onSnapshot, Timestamp, DocumentSnapshot } from 'firebase/firestore';
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
  decryptMessage: (encrypted: { encryptedData: string; nonce: string; tag: string; salt: string }) => Promise<string>;
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

  // Función para descifrar mensaje con manejo de errores
  const decryptMessageSafely = useCallback(async (encryptedData: string | { encryptedData: string; nonce: string; tag: string; salt: string } | null): Promise<string> => {
    try {
      // Si es el formato antiguo (texto simple)
      if (typeof encryptedData === 'string') {
        return encryptedData;
      }
      
      // Si es el nuevo formato (objeto con encryptedData, nonce, tag, salt)
      if (encryptedData && typeof encryptedData === 'object' && 'encryptedData' in encryptedData) {
        return await decryptMessage(encryptedData as { encryptedData: string; nonce: string; tag: string; salt: string });
      }
      
      return '';
    } catch (error) {
      console.error('[usePrivateMessagePagination] Error decrypting message:', error);
      return '';
    }
  }, [decryptMessage]);

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
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.timestamp) continue;
        
        let decryptedText = '';
        if (data.encrypted) {
          decryptedText = await decryptMessageSafely(data.encrypted);
        } else if (data.text) {
          decryptedText = await decryptMessageSafely(data.text);
        }
        
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
      }
      
      const sortedMessages = newMessages.sort((a, b) => {
        const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : a.timestamp?.getTime() || 0;
        const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : b.timestamp?.getTime() || 0;
        return bTime - aTime;
      });
      setMessages(sortedMessages);
      setHasMore(snapshot.docs.length === pageSize);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setCachedMessages(conversationId, sortedMessages, lastDocRef.current, snapshot.docs.length === pageSize);
    } catch (error) {
      console.error('[usePrivateMessagePagination] Error loading initial messages:', error);
      setError('Error al cargar los mensajes');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, pageSize, decryptMessageSafely, cleanupExpiredCache, getCachedMessages, setCachedMessages]);

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
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.timestamp) continue;
        
        let decryptedText = '';
        if (data.encrypted) {
          decryptedText = await decryptMessageSafely(data.encrypted);
        } else if (data.text) {
          decryptedText = await decryptMessageSafely(data.text);
        }
        
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
      }
      
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
    } catch (error) {
      console.error('[usePrivateMessagePagination] Error loading more messages:', error);
      setError('Error al cargar más mensajes');
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, hasMore, isLoadingMore, pageSize, decryptMessageSafely]);

  // Listener de tiempo real para actualizaciones automáticas
  useEffect(() => {
    if (!conversationId) return;

    console.log('[usePrivateMessagePagination] Setting up real-time listener for conversation:', conversationId);
    
    const q = query(collection(db, `conversations/${conversationId}/messages`), orderBy('timestamp', 'desc'));
    
    // Debounce para batching de updates
    let pendingChanges: Array<{ type: 'added' | 'modified' | 'removed'; doc: DocumentSnapshot }> = [];
    let timeoutId: NodeJS.Timeout | null = null;
    let isProcessing = false;
    
    const processBatchChanges = async () => {
      if (pendingChanges.length === 0 || isProcessing) return;
      
      isProcessing = true;
      console.log('[usePrivateMessagePagination] Processing batch changes:', pendingChanges.length);
      
      // Deduplicar cambios para evitar actualizaciones múltiples del mismo mensaje
      const uniqueChanges = pendingChanges.reduce((acc, change) => {
        const key = `${change.type}-${change.doc.id}`;
        if (!acc.has(key)) {
          acc.set(key, change);
        }
        return acc;
      }, new Map());
      
      // Procesar cambios únicos en batch
      const processedIds = new Set<string>();
      
      for (const change of uniqueChanges.values()) {
        if (processedIds.has(change.doc.id)) continue;
        
        try {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (!data.timestamp) continue;
            
            let decryptedText = '';
            if (data.encrypted) {
              decryptedText = await decryptMessageSafely(data.encrypted);
            } else if (data.text) {
              decryptedText = await decryptMessageSafely(data.text);
            }
            
            const newMessage: Message = {
              id: change.doc.id,
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
              clientId: change.doc.id,
              replyTo: data.replyTo || null,
            };
            
            setMessages(prev => {
              const existing = prev.find(m => m.id === newMessage.id);
              if (existing) {
                // Solo actualizar si hay cambios reales
                const hasChanges = JSON.stringify(existing) !== JSON.stringify(newMessage);
                if (hasChanges) {
                  console.log('[usePrivateMessagePagination] Updating existing message:', newMessage.id);
                  return prev.map(m => m.id === newMessage.id ? newMessage : m);
                } else {
                  console.log('[usePrivateMessagePagination] Message unchanged, skipping:', newMessage.id);
                  return prev;
                }
              } else {
                console.log('[usePrivateMessagePagination] Adding new message:', newMessage.id);
                return [newMessage, ...prev];
              }
            });
          } else if (change.type === 'modified') {
            const data = change.doc.data();
            if (!data.timestamp) continue;
            
            let decryptedText = '';
            if (data.encrypted) {
              decryptedText = await decryptMessageSafely(data.encrypted);
            } else if (data.text) {
              decryptedText = await decryptMessageSafely(data.text);
            }
            
            const updatedMessage: Message = {
              id: change.doc.id,
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
              clientId: change.doc.id,
              replyTo: data.replyTo || null,
            };
            
            setMessages(prev => {
              const existing = prev.find(m => m.id === updatedMessage.id);
              if (existing) {
                const hasChanges = JSON.stringify(existing) !== JSON.stringify(updatedMessage);
                if (hasChanges) {
                  console.log('[usePrivateMessagePagination] Modifying message:', updatedMessage.id);
                  return prev.map(m => m.id === updatedMessage.id ? updatedMessage : m);
                }
              }
              return prev;
            });
          } else if (change.type === 'removed') {
            console.log('[usePrivateMessagePagination] Removing message:', change.doc.id);
            setMessages(prev => prev.filter(m => m.id !== change.doc.id));
          }
          
          processedIds.add(change.doc.id);
        } catch (error) {
          console.error('[usePrivateMessagePagination] Error processing change:', error);
        }
      }
      
      pendingChanges = [];
      isProcessing = false;
    };
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Agregar cambios al batch
      snapshot.docChanges().forEach((change) => {
        pendingChanges.push({ type: change.type, doc: change.doc });
      });
      
      // Debounce el procesamiento
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(processBatchChanges, 100);
    });
    
    return () => {
      console.log('[usePrivateMessagePagination] Cleaning up real-time listener for conversation:', conversationId);
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [conversationId, decryptMessageSafely]);

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