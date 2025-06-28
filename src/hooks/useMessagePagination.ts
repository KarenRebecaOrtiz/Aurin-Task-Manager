import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, onSnapshot, Timestamp, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | Date | null;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
  hasError?: boolean;
  clientId: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string | null;
  } | null;
}

interface MessageCache {
  [taskId: string]: {
    messages: Message[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
    isLoading: boolean;
    lastFetch: number;
  };
}

interface UseMessagePaginationProps {
  taskId: string;
  pageSize?: number;
  cacheTimeout?: number; // en milisegundos
  decryptMessage: (text: string) => string;
}

const MESSAGE_CACHE: MessageCache = {};
const DEFAULT_PAGE_SIZE = 5;
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutos

export const useMessagePagination = ({
  taskId,
  pageSize = DEFAULT_PAGE_SIZE,
  cacheTimeout = DEFAULT_CACHE_TIMEOUT,
  decryptMessage,
}: UseMessagePaginationProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // Actualizar la referencia de mensajes cuando cambien
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Función para limpiar cache expirado
  const cleanupExpiredCache = useCallback(() => {
    const now = Date.now();
    Object.keys(MESSAGE_CACHE).forEach(taskId => {
      const cache = MESSAGE_CACHE[taskId];
      if (now - cache.lastFetch > cacheTimeout) {
        delete MESSAGE_CACHE[taskId];
      }
    });
  }, [cacheTimeout]);

  // Función para obtener mensajes del cache
  const getCachedMessages = useCallback((taskId: string): Message[] => {
    const cache = MESSAGE_CACHE[taskId];
    if (cache && Date.now() - cache.lastFetch < cacheTimeout) {
      return cache.messages;
    }
    return [];
  }, [cacheTimeout]);

  // Función para guardar mensajes en cache
  const setCachedMessages = useCallback((taskId: string, messages: Message[], lastDoc: DocumentSnapshot | null, hasMore: boolean) => {
    MESSAGE_CACHE[taskId] = {
      messages,
      lastDoc,
      hasMore,
      isLoading: false,
      lastFetch: Date.now(),
    };
  }, []);

  // Función para cargar mensajes iniciales (más recientes)
  const loadInitialMessages = useCallback(async () => {
    if (!taskId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Limpiar cache expirado
      cleanupExpiredCache();

      // Intentar cargar desde cache primero
      const cachedMessages = getCachedMessages(taskId);
      if (cachedMessages.length > 0) {
        setMessages(cachedMessages);
        setIsLoading(false);
        return;
      }

      // Cargar mensajes más recientes desde Firestore
      const messagesQuery = query(
        collection(db, `tasks/${taskId}/messages`),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );

      const snapshot = await getDocs(messagesQuery);
      const newMessages: Message[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.timestamp) {
          console.warn(`Mensaje con ID ${doc.id} tiene timestamp inválido: ${data.timestamp}`);
          return;
        }

        // Descifrar el texto del mensaje
        const decryptedText = data.text ? decryptMessage(data.text) : data.text;

        newMessages.push({
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          text: decryptedText,
          timestamp: data.timestamp,
          read: data.read || false,
          hours: data.hours,
          imageUrl: data.imageUrl || null,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileType: data.fileType || null,
          filePath: data.filePath || null,
          clientId: doc.id,
          isPending: false,
          hasError: false,
          replyTo: data.replyTo || null,
        });
      });

      // Ordenar mensajes por timestamp (más recientes primero para column-reverse)
      const sortedMessages = newMessages.sort((a, b) => {
        const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : a.timestamp?.getTime() || 0;
        const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : b.timestamp?.getTime() || 0;
        return bTime - aTime; // Invertir el orden para column-reverse
      });

      // Filtrar mensajes duplicados
      const uniqueMessages = sortedMessages.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );

      setMessages(uniqueMessages);
      setHasMore(snapshot.docs.length === pageSize);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;

      // Guardar en cache
      setCachedMessages(taskId, uniqueMessages, lastDocRef.current, snapshot.docs.length === pageSize);

    } catch (err) {
      console.error('Error loading initial messages:', err);
      setError('Error al cargar los mensajes');
    } finally {
      setIsLoading(false);
    }
  }, [taskId, pageSize, decryptMessage, cleanupExpiredCache, getCachedMessages, setCachedMessages]);

  // Función para cargar más mensajes (más antiguos)
  const loadMoreMessages = useCallback(async () => {
    if (!taskId || !hasMore || isLoadingMore || !lastDocRef.current) return Promise.resolve();

    setIsLoadingMore(true);
    setError(null);

    try {
      const messagesQuery = query(
        collection(db, `tasks/${taskId}/messages`),
        orderBy('timestamp', 'desc'),
        startAfter(lastDocRef.current),
        limit(pageSize)
      );

      const snapshot = await getDocs(messagesQuery);
      const newMessages: Message[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.timestamp) {
          console.warn(`Mensaje con ID ${doc.id} tiene timestamp inválido: ${data.timestamp}`);
          return;
        }

        // Descifrar el texto del mensaje
        const decryptedText = data.text ? decryptMessage(data.text) : data.text;

        newMessages.push({
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          text: decryptedText,
          timestamp: data.timestamp,
          read: data.read || false,
          hours: data.hours,
          imageUrl: data.imageUrl || null,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileType: data.fileType || null,
          filePath: data.filePath || null,
          clientId: doc.id,
          isPending: false,
          hasError: false,
          replyTo: data.replyTo || null,
        });
      });

      // Ordenar mensajes por timestamp (más recientes primero para column-reverse)
      const sortedNewMessages = newMessages.sort((a, b) => {
        const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : a.timestamp?.getTime() || 0;
        const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : b.timestamp?.getTime() || 0;
        return bTime - aTime; // Invertir el orden para column-reverse
      });

      // Agregar nuevos mensajes al final (son más antiguos) para column-reverse
      setMessages((prev) => {
        // Filtrar mensajes duplicados basándose en el ID
        const existingIds = new Set(prev.map(msg => msg.id));
        const uniqueNewMessages = sortedNewMessages.filter(msg => !existingIds.has(msg.id));
        const updatedMessages = [...prev, ...uniqueNewMessages];
        
        // Ordenar por timestamp para mantener consistencia
        return updatedMessages.sort((a, b) => {
          const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : a.timestamp?.getTime() || 0;
          const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : b.timestamp?.getTime() || 0;
          return bTime - aTime;
        });
      });
      
      // Actualizar hasMore correctamente
      const hasMoreMessages = snapshot.docs.length === pageSize;
      setHasMore(hasMoreMessages);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;

      // Actualizar cache con los mensajes actualizados
      const currentMessages = messagesRef.current;
      setCachedMessages(taskId, currentMessages, lastDocRef.current, hasMoreMessages);

      console.log(`Loaded ${newMessages.length} more messages, hasMore: ${hasMoreMessages}`);
      return Promise.resolve();
    } catch (err) {
      console.error('Error loading more messages:', err);
      setError('Error al cargar más mensajes');
      return Promise.reject(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [taskId, hasMore, isLoadingMore, pageSize, decryptMessage, setCachedMessages]);

  // Función para configurar listener en tiempo real para nuevos mensajes
  const setupRealtimeListener = useCallback(() => {
    if (!taskId) return;

    // Limpiar listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const realtimeQuery = query(
      collection(db, `tasks/${taskId}/messages`),
      orderBy('timestamp', 'desc'),
      limit(10) // Solo los 10 más recientes
    );

    const unsubscribe = onSnapshot(
      realtimeQuery,
      (snapshot) => {
        const changes = snapshot.docChanges();
        if (changes.length > 0) {
          // Usar debounce para prevenir saltos de scroll
          setTimeout(() => {
            const newMessages: Message[] = [];
            const updatedMessages: Message[] = [];

            changes.forEach((change) => {
              const data = change.doc.data();
              if (!data.timestamp) return;

              // Descifrar el texto del mensaje
              const decryptedText = data.text ? decryptMessage(data.text) : data.text;

              const message: Message = {
                id: change.doc.id,
                senderId: data.senderId,
                senderName: data.senderName,
                text: decryptedText,
                timestamp: data.timestamp,
                read: data.read || false,
                hours: data.hours,
                imageUrl: data.imageUrl || null,
                fileUrl: data.fileUrl || null,
                fileName: data.fileName || null,
                fileType: data.fileType || null,
                filePath: data.filePath || null,
                clientId: change.doc.id,
                isPending: false,
                hasError: false,
                replyTo: data.replyTo || null,
              };

              if (change.type === 'added') {
                // Verificar si es un mensaje nuevo comparando con los mensajes actuales
                const currentMessages = messagesRef.current;
                const lastMessage = currentMessages[currentMessages.length - 1];
                
                if (lastMessage?.timestamp) {
                  const lastMessageTime = lastMessage.timestamp instanceof Timestamp 
                    ? lastMessage.timestamp.toDate().getTime() 
                    : lastMessage.timestamp?.getTime() || 0;
                  const newMessageTime = data.timestamp instanceof Timestamp 
                    ? data.timestamp.toDate().getTime() 
                    : data.timestamp?.getTime() || 0;

                  if (newMessageTime > lastMessageTime) {
                    newMessages.push(message);
                  }
                } else {
                  // Si no hay mensajes previos, agregar el nuevo
                  newMessages.push(message);
                }
              } else if (change.type === 'modified') {
                updatedMessages.push(message);
              }
            });

            // Actualizar mensajes solo si hay cambios
            if (newMessages.length > 0 || updatedMessages.length > 0) {
              setMessages(prev => {
                let updated = [...prev];

                // Agregar nuevos mensajes al final, evitando duplicados
                if (newMessages.length > 0) {
                  const existingIds = new Set(updated.map(msg => msg.id));
                  const uniqueNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
                  updated = [...updated, ...uniqueNewMessages];
                }

                // Actualizar mensajes modificados
                if (updatedMessages.length > 0) {
                  updatedMessages.forEach(updatedMsg => {
                    const index = updated.findIndex(msg => msg.id === updatedMsg.id);
                    if (index !== -1) {
                      updated[index] = updatedMsg;
                    }
                  });
                }

                // Ordenar por timestamp para mantener consistencia
                return updated.sort((a, b) => {
                  const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : a.timestamp?.getTime() || 0;
                  const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : b.timestamp?.getTime() || 0;
                  return bTime - aTime;
                });
              });
            }
          }, 100); // Debounce de 100ms para prevenir saltos de scroll
        }
      },
      (err) => {
        console.error('Error in realtime listener:', err);
        setError('Error en la conexión en tiempo real');
      }
    );

    unsubscribeRef.current = unsubscribe;
  }, [taskId, decryptMessage]);

  // Función para agregar mensaje optimista
  const addOptimisticMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Función para actualizar mensaje optimista
  const updateOptimisticMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Función para remover mensaje optimista
  const removeOptimisticMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // Función para limpiar cache de una tarea específica
  const clearTaskCache = useCallback((taskId: string) => {
    delete MESSAGE_CACHE[taskId];
  }, []);

  // Función para limpiar todo el cache
  const clearAllCache = useCallback(() => {
    Object.keys(MESSAGE_CACHE).forEach(key => {
      delete MESSAGE_CACHE[key];
    });
  }, []);

  // Efecto para cargar mensajes iniciales
  useEffect(() => {
    if (taskId) {
      loadInitialMessages();
    }
  }, [taskId, loadInitialMessages]);

  // Efecto para configurar listener en tiempo real
  useEffect(() => {
    if (taskId) {
      setupRealtimeListener();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [taskId, setupRealtimeListener]);

  // Memoizar estadísticas de mensajes
  const messageStats = useMemo(() => {
    const totalMessages = messages.length;
    const unreadMessages = messages.filter(msg => !msg.read).length;
    const timeMessages = messages.filter(msg => typeof msg.hours === 'number' && msg.hours > 0);
    const fileMessages = messages.filter(msg => msg.imageUrl || msg.fileUrl);
    
    return {
      totalMessages,
      unreadMessages,
      timeMessages: timeMessages.length,
      fileMessages: fileMessages.length,
    };
  }, [messages]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    messageStats,
    loadMoreMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
    removeOptimisticMessage,
    clearTaskCache,
    clearAllCache,
    refreshMessages: loadInitialMessages,
  };
}; 