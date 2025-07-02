import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  onSnapshot, 
  DocumentSnapshot, 
  Timestamp, 
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | Date | null;
  lastModified?: Timestamp | Date | null;
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
    messages: Message[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
    isLoading: boolean;
    lastFetch: number;
  lastRealtimeUpdate: number;
  isFullyLoaded: boolean;
}

interface UseMessagePaginationProps {
  taskId: string;
  pageSize?: number;
  cacheTimeout?: number;
  decryptMessage: (text: string) => string;
}

const MESSAGE_CACHE: { [taskId: string]: MessageCache } = {};
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_CACHE_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const LOCAL_STORAGE_PREFIX = 'task_messages_';
const LAST_MODIFIED_PREFIX = 'lastModified_';

// Protecciones contra llamadas excesivas - RELAJADAS PARA SOLUCIONAR PROBLEMA
const FIREBASE_CALL_LIMITS = {
  MAX_CALLS_PER_MINUTE: 1000, // Mucho más permisivo
  MIN_INTERVAL_BETWEEN_CALLS: 5, // Intervalo mínimo muy pequeño  
  MAX_MESSAGES_PER_REQUEST: 50,
  MAX_CACHE_SIZE: 1000, // Máximo 1000 mensajes en cache
};

// Contador global más inteligente para llamadas a Firestore
let globalCallTimestamps: number[] = [];

// Función mejorada para verificar límites de llamadas a Firestore - TEMPORALMENTE MUY PERMISIVA
const checkFirebaseCallLimits = (): boolean => {
  const now = Date.now();
  
  // Limpiar timestamps antiguos (más de 1 minuto)
  globalCallTimestamps = globalCallTimestamps.filter(timestamp => 
    (now - timestamp) < 60000
  );
  
  // TEMPORALMENTE: Permitir todas las llamadas para solucionar el problema de mensajes
  // Solo bloquear si hay demasiadas llamadas realmente excesivas (>500 por minuto)
  if (globalCallTimestamps.length >= 500) {
    console.warn('[MessagePagination] ⚠️ Límite extremo de llamadas excedido (>500/min), usando cache');
    return false;
  }
  
  // Incrementar contador
  globalCallTimestamps.push(now);
  
  // Siempre permitir para solucionar el problema
  return true;
};

// Función para serializar timestamps para localStorage
const serializeTimestamp = (timestamp: Timestamp | Date | null): string | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return null;
};

// Función para deserializar timestamps desde localStorage
// const deserializeTimestamp = (timestampStr: string | null): Date | null => {
//   if (!timestampStr) return null;
//   try {
//     return new Date(timestampStr);
//   } catch {
//     return null;
//   }
// };

// Función para guardar mensajes en localStorage
const saveMessagesToLocalStorage = (taskId: string, messages: Message[]) => {
  if (typeof window === 'undefined') return; // Solo en cliente
  
  try {
    const serializedMessages = messages.map(msg => ({
      ...msg,
      timestamp: serializeTimestamp(msg.timestamp),
      lastModified: serializeTimestamp(msg.lastModified),
    }));
    safeLocalStorage.setItem(`${LOCAL_STORAGE_PREFIX}${taskId}`, JSON.stringify(serializedMessages));
  } catch (error) {
    console.warn('[MessagePagination] Error saving to localStorage:', error);
  }
};

// Función para cargar mensajes desde localStorage
// const loadMessagesFromLocalStorage = (taskId: string): Message[] => {
//   try {
//     const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${taskId}`);
//     if (!stored) return [];
//     
//     const parsed = JSON.parse(stored);
//     return parsed.map((msg: { timestamp: string | null; lastModified?: string | null }) => ({
//       ...msg,
//       timestamp: deserializeTimestamp(msg.timestamp),
//       lastModified: deserializeTimestamp(msg.lastModified),
//     }));
//   } catch (error) {
//     console.warn('[MessagePagination] Error loading from localStorage:', error);
//     return [];
//   }
// };

// Helper para operaciones de localStorage seguras
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail if localStorage is not available
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail if localStorage is not available
    }
  }
};

// Función para limpiar cache expirado
const cleanupExpiredCache = () => {
  if (typeof window === 'undefined') return; // Solo en cliente
  
  const now = Date.now();
  Object.keys(MESSAGE_CACHE).forEach(taskId => {
    const cache = MESSAGE_CACHE[taskId];
    if (now - cache.lastFetch > DEFAULT_CACHE_TIMEOUT) {
      delete MESSAGE_CACHE[taskId];
      safeLocalStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${taskId}`);
      safeLocalStorage.removeItem(`${LAST_MODIFIED_PREFIX}${taskId}`);
    }
  });
};

export const useMessagePagination = ({
  taskId,
  pageSize = DEFAULT_PAGE_SIZE,
  cacheTimeout = DEFAULT_CACHE_TIMEOUT,
  decryptMessage,
}: UseMessagePaginationProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLastModified] = useState<Date | null>(null);
  
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Función para obtener mensajes del cache
  const getCachedMessages = useCallback((taskId: string): Message[] => {
    const cache = MESSAGE_CACHE[taskId];
    if (cache && Date.now() - cache.lastFetch < cacheTimeout) {
      return cache.messages;
    }
    return [];
  }, [cacheTimeout]);

  // Función para guardar mensajes en cache
  const setCachedMessages = useCallback((taskId: string, messages: Message[], lastDoc: DocumentSnapshot | null, hasMore: boolean, isFullyLoaded: boolean = false) => {
    // Limitar el tamaño del cache para proteger la memoria
    if (messages.length > FIREBASE_CALL_LIMITS.MAX_CACHE_SIZE) {
      console.warn('[MessagePagination] Cache size limit exceeded, truncating messages');
      messages = messages.slice(0, FIREBASE_CALL_LIMITS.MAX_CACHE_SIZE);
    }
    
    MESSAGE_CACHE[taskId] = {
      messages,
      lastDoc,
      hasMore,
      isLoading: false,
      lastFetch: Date.now(),
      lastRealtimeUpdate: Date.now(),
      isFullyLoaded,
    };
    
    // Guardar en localStorage
    saveMessagesToLocalStorage(taskId, messages);
    safeLocalStorage.setItem(`${LOCAL_STORAGE_PREFIX}${taskId}_lastAccess`, Date.now().toString());
  }, []);

  // Función para validar cache contra servidor
  const validateCache = useCallback(async (lastCachedModified: string) => {
    if (!taskId) return;
    
    try {
      const lastModifiedDate = new Date(lastCachedModified);
      const updateQuery = query(
        collection(db, `tasks/${taskId}/messages`),
        where('lastModified', '>', Timestamp.fromDate(lastModifiedDate)),
        orderBy('lastModified', 'desc')
      );
      
             const snapshot = await getDocs(updateQuery);
       const updatedMessages: Message[] = snapshot.docs.map(doc => {
         const data = doc.data();
         return {
           id: doc.id,
           senderId: data.senderId,
           senderName: data.senderName,
           text: data.text ? decryptMessage(data.text) : data.text,
           timestamp: data.timestamp,
           lastModified: data.lastModified || data.timestamp,
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
         };
       });

       if (updatedMessages.length > 0) {
         setMessages(prev => {
           const existingIds = new Set(prev.map(m => m.id));
           const newMessages = updatedMessages.filter(m => !existingIds.has(m.id));
           const merged = [...prev, ...newMessages].sort((a, b) => {
             const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
             const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
             return bTime - aTime;
           });
           setCachedMessages(taskId, merged, lastDocRef.current, hasMore);
           return merged;
         });

         const mostRecent = updatedMessages.reduce((latest, msg) => {
           const msgTime = msg.lastModified instanceof Timestamp ? msg.lastModified.toDate() : new Date(msg.lastModified);
           return !latest || msgTime > latest ? msgTime : latest;
         }, null as Date | null);
         
         if (mostRecent) {
           setLastModified(mostRecent);
           safeLocalStorage.setItem(`${LAST_MODIFIED_PREFIX}${taskId}`, mostRecent.toISOString());
         }
       }
    } catch (error) {
      console.error('[MessagePagination] Error validating cache:', error);
    }
  }, [taskId, decryptMessage, setCachedMessages, hasMore]);

  // Función para cargar mensajes iniciales
  const loadInitialMessages = useCallback(async () => {
    if (!taskId) return;

    setIsLoading(true);
    setError(null);

    try {
      cleanupExpiredCache();

      // Intentar cargar desde cache local primero
      const cachedMessages = getCachedMessages(taskId);
      if (cachedMessages.length > 0) {
        console.log('[MessagePagination] Loading from cache:', cachedMessages.length, 'messages');
        setMessages(cachedMessages);
        setIsLoading(false);
        
        // Validar cache contra servidor en background
        const lastCachedModified = safeLocalStorage.getItem(`${LAST_MODIFIED_PREFIX}${taskId}`);
        if (lastCachedModified) {
          setTimeout(() => validateCache(lastCachedModified), 1000);
        }
        return;
      }

      // Verificar límites antes de llamar a Firestore
      if (!checkFirebaseCallLimits()) {
        console.warn('[MessagePagination] Límite de llamadas excedido, usando cache local');
        setError('Demasiadas solicitudes. Usando datos en cache.');
        return;
      }

      // Cargar mensajes desde Firestore si no hay cache local
      const messagesQuery = query(
        collection(db, `tasks/${taskId}/messages`),
        orderBy('timestamp', 'desc'),
        limit(Math.min(pageSize, FIREBASE_CALL_LIMITS.MAX_MESSAGES_PER_REQUEST))
      );

      const snapshot = await getDocs(messagesQuery);

      const newMessages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          text: data.text ? decryptMessage(data.text) : data.text,
          timestamp: data.timestamp,
          lastModified: data.lastModified || data.timestamp,
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
        };
      });

      // Actualizar lastModified
      const mostRecent = newMessages.reduce((latest, msg) => {
        const msgTime = msg.lastModified instanceof Timestamp ? msg.lastModified.toDate() : new Date(msg.lastModified);
        return !latest || msgTime > latest ? msgTime : latest;
      }, null as Date | null);
      
      if (mostRecent) {
        setLastModified(mostRecent);
        safeLocalStorage.setItem(`${LAST_MODIFIED_PREFIX}${taskId}`, mostRecent.toISOString());
      }

      setMessages(newMessages.sort((a, b) => {
        const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return bTime - aTime;
      }));

      setHasMore(snapshot.docs.length === pageSize);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setCachedMessages(taskId, newMessages, lastDocRef.current, snapshot.docs.length === pageSize);

      console.log('[MessagePagination] Loaded from server:', newMessages.length, 'messages');

    } catch (err) {
      console.error('[MessagePagination] Error loading initial messages:', err);
      setError('Error al cargar los mensajes');
    } finally {
      setIsLoading(false);
    }
  }, [taskId, pageSize, decryptMessage, getCachedMessages, setCachedMessages, validateCache]);

  // Función para cargar más mensajes
  const loadMoreMessages = useCallback(async () => {
    if (!taskId || !hasMore || isLoadingMore || !lastDocRef.current) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      // Verificar límites antes de llamar a Firestore
      if (!checkFirebaseCallLimits()) {
        console.warn('[MessagePagination] Límite de llamadas excedido en loadMoreMessages');
        setError('Demasiadas solicitudes. Intenta más tarde.');
        return;
      }

      const messagesQuery = query(
        collection(db, `tasks/${taskId}/messages`),
        orderBy('timestamp', 'desc'),
        startAfter(lastDocRef.current),
        limit(Math.min(pageSize, FIREBASE_CALL_LIMITS.MAX_MESSAGES_PER_REQUEST))
      );
      // NO filtrar por lastModified en pagination - usar solo timestamp para evitar errores
      // Los mensajes antiguos pueden no tener el campo lastModified

      const snapshot = await getDocs(messagesQuery);

      const newMessages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          text: data.text ? decryptMessage(data.text) : data.text,
          timestamp: data.timestamp,
          lastModified: data.lastModified || data.timestamp,
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
        };
      });

      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
        const updated = [...prev, ...uniqueNewMessages].sort((a, b) => {
          const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
          const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
          return bTime - aTime;
        });
        setCachedMessages(taskId, updated, snapshot.docs[snapshot.docs.length - 1] || null, snapshot.docs.length === pageSize);
        return updated;
      });
      
      setHasMore(snapshot.docs.length === pageSize);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;

      const mostRecent = newMessages.reduce((latest, msg) => {
        const msgTime = msg.lastModified instanceof Timestamp ? msg.lastModified.toDate() : new Date(msg.lastModified);
        return !latest || msgTime > latest ? msgTime : latest;
      }, null as Date | null);
      
      if (mostRecent) {
        setLastModified(mostRecent);
        safeLocalStorage.setItem(`${LAST_MODIFIED_PREFIX}${taskId}`, mostRecent.toISOString());
      }
      
      console.log('[MessagePagination] Loaded more messages:', newMessages.length);
      
    } catch (err) {
      console.error('[MessagePagination] Error loading more messages:', err);
      setError('Error al cargar más mensajes');
    } finally {
      setIsLoadingMore(false);
    }
  }, [taskId, hasMore, isLoadingMore, pageSize, decryptMessage, setCachedMessages]);

  // Función para configurar listener en tiempo real para nuevos mensajes
  const setupRealtimeListener = useCallback(() => {
    if (!taskId) return;

    // Verificar límites antes de configurar listener
    if (!checkFirebaseCallLimits()) {
      console.warn('[MessagePagination] Límite de llamadas excedido al configurar listener');
      return;
    }

    // Limpiar listener anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const lastModified = safeLocalStorage.getItem(`${LAST_MODIFIED_PREFIX}${taskId}`);
    let realtimeQuery = query(
      collection(db, `tasks/${taskId}/messages`),
      orderBy('timestamp', 'desc'),
      limit(10) // Solo los 10 más recientes para reducir tráfico
    );
    
    // Filtrar por lastModified si existe
    if (lastModified) {
      realtimeQuery = query(
        collection(db, `tasks/${taskId}/messages`),
        where('lastModified', '>', Timestamp.fromDate(new Date(lastModified))),
        orderBy('lastModified', 'desc'),
        limit(10)
      );
    }

    const unsubscribe = onSnapshot(realtimeQuery, (snapshot) => {
        const changes = snapshot.docChanges();
        if (changes.length > 0) {
        // Debounce para evitar múltiples actualizaciones
          setTimeout(() => {
          const newMessages: Message[] = changes
            .filter(change => change.type === 'added' || change.type === 'modified')
            .map(change => {
              const data = change.doc.data();
              return {
                id: change.doc.id,
                senderId: data.senderId,
                senderName: data.senderName,
                text: data.text ? decryptMessage(data.text) : data.text,
                timestamp: data.timestamp,
                lastModified: data.lastModified || data.timestamp,
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
            });

              setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const updated = [...prev, ...newMessages.filter(m => !existingIds.has(m.id))].sort(
              (a, b) => {
                const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
                const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
                return bTime - aTime;
              }
            );
            setCachedMessages(taskId, updated, lastDocRef.current, hasMore);
            return updated;
          });

          const mostRecent = newMessages.reduce((latest, msg) => {
            const msgTime = msg.lastModified instanceof Timestamp ? msg.lastModified.toDate() : new Date(msg.lastModified);
            return !latest || msgTime > latest ? msgTime : latest;
          }, null as Date | null);
          
          if (mostRecent) {
            setLastModified(mostRecent);
            safeLocalStorage.setItem(`${LAST_MODIFIED_PREFIX}${taskId}`, mostRecent.toISOString());
        }
        }, 100);
      }
    }, (error) => {
      console.error('[MessagePagination] Error in realtime listener:', error);
        setError('Error en la conexión en tiempo real');
    });

    unsubscribeRef.current = unsubscribe;
  }, [taskId, decryptMessage, setCachedMessages, hasMore]);

  // Función para añadir mensaje optimista
  const addOptimisticMessage = useCallback((message: Message) => {
    setMessages(prev => [message, ...prev]);
  }, []);

  // Función para actualizar mensaje optimista
  const updateOptimisticMessage = useCallback((clientId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.clientId === clientId ? { ...msg, ...updates } : msg
    ));
  }, []);

  // Efecto principal que maneja tanto la carga inicial como el listener en tiempo real
  useEffect(() => {
    if (!taskId) return;

    let isMounted = true;
    const effectId = `${taskId}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[MessagePagination] Starting effect for task:', taskId, 'Effect ID:', effectId);
    
    // Función para inicializar datos
    const initializeMessages = async () => {
      // Verificar si ya existe cache y usarlo
      const cachedMessages = getCachedMessages(taskId);
      if (cachedMessages.length > 0 && isMounted) {
        console.log('[MessagePagination] Using cached messages:', cachedMessages.length, 'Effect ID:', effectId);
        setMessages(cachedMessages);
        setIsLoading(false);

        // Solo configurar listener si hay cache, no cargar datos frescos
        setTimeout(() => {
          if (isMounted) {
            console.log('[MessagePagination] Setting up realtime listener from cache, Effect ID:', effectId);
            setupRealtimeListener();
          }
        }, 300);
        return;
      }

      // Solo cargar datos frescos si no hay cache y respeta límites
      if (isMounted && checkFirebaseCallLimits()) {
        console.log('[MessagePagination] Loading fresh messages, Effect ID:', effectId);
        await loadInitialMessages();
        
        // Configurar listener después de cargar datos iniciales
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) {
              console.log('[MessagePagination] Setting up realtime listener after fresh load, Effect ID:', effectId);
      setupRealtimeListener();
    }
          }, 200);
        }
      } else {
        console.log('[MessagePagination] Skipping fresh load due to rate limits, Effect ID:', effectId);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeMessages();

    return () => {
      console.log('[MessagePagination] Cleaning up effect, Effect ID:', effectId);
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]); // Solo depende de taskId para evitar re-ejecuciones

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMoreMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
  };
}; 