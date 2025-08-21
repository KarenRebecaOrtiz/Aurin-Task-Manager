// src/hooks/useMessagePagination.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  onSnapshot, 
  DocumentSnapshot, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDataStore } from '@/stores/dataStore';
import { useChunkStore } from '@/stores/chunkStore';

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
  isDatePill?: boolean;
  encrypted?: {
    encryptedData: string;
    nonce: string;
    tag: string;
    salt: string;
  };
}

interface MessageGroup {
  date: Date;
  messages: Message[];
}

interface UseMessagePaginationProps {
  taskId: string;
  pageSize?: number;
  decryptMessage: (encrypted: { encryptedData: string; nonce: string; tag: string; salt: string }) => Promise<string>;
  onNewMessage?: (msg: Message) => void; // Callback para nuevos mensajes
}

const DEFAULT_PAGE_SIZE = 10;  // Cambiado de 20 a 10

let globalCallTimestamps: number[] = [];

const checkFirebaseCallLimits = (): boolean => {
  const now = Date.now();
  
  globalCallTimestamps = globalCallTimestamps.filter(timestamp => 
    (now - timestamp) < 60000
  );
  
  if (globalCallTimestamps.length >= 500) {
    console.warn('[MessagePagination] ⚠️ Límite extremo de llamadas excedido (>500/min), usando cache');
    return false;
  }
  
  globalCallTimestamps.push(now);
  return true;
};

export const groupMessagesByDate = (messages: Message[]): MessageGroup[] => {
  const grouped: MessageGroup[] = [];
  let currentDate: Date | null = null;
  let currentGroup: Message[] = [];

  // Solo loggear si hay mensajes de hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hasTodayMessages = messages.some(m => {
    if (!m.timestamp) return false;
    const messageDate = m.timestamp instanceof Timestamp ? m.timestamp.toDate() : new Date(m.timestamp);
    return messageDate >= today;
  });

  if (hasTodayMessages) {
    console.log('[groupMessagesByDate] 🔍 Debugging mensajes de HOY');
    console.log('[groupMessagesByDate] Mensajes originales:', messages.map(m => ({
      id: m.id,
      timestamp: m.timestamp,
      text: m.text?.substring(0, 30) || 'No text',
      hours: m.hours
    })));
  }

  const sortedMessages = [...messages].sort((a, b) => {
    const aTime = a.timestamp ? (a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
    const bTime = b.timestamp ? (b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
    return bTime - aTime;
  });

  if (hasTodayMessages) {
    console.log('[groupMessagesByDate] Mensajes ordenados:', sortedMessages.map(m => ({
      id: m.id,
      timestamp: m.timestamp,
      text: m.text?.substring(0, 30) || 'No text',
      hours: m.hours
    })));
  }

  sortedMessages.forEach((message) => {
    if (message.isDatePill) return;

    const messageDate = message.timestamp ? (message.timestamp instanceof Timestamp ? message.timestamp.toDate() : new Date(message.timestamp)) : new Date();
    
    // Solo loggear mensajes de hoy
    if (messageDate >= today) {
      console.log('[groupMessagesByDate] 📅 Procesando mensaje de HOY:', {
        id: message.id,
        timestamp: message.timestamp,
        messageDate: messageDate.toISOString(),
        currentDate: currentDate?.toISOString(),
        isNewGroup: !currentDate || messageDate.toDateString() !== currentDate.toDateString()
      });
    }

    // Comparar fechas usando YYYY-MM-DD para evitar problemas de zona horaria
    const messageDateStr = messageDate.toISOString().split('T')[0];
    const currentDateStr = currentDate ? currentDate.toISOString().split('T')[0] : null;
    
    if (!currentDate || messageDateStr !== currentDateStr) {
      if (currentGroup.length > 0 && currentDate) {
        // Ordenar mensajes dentro del grupo cronológicamente (más antiguos primero)
        const sortedGroup = [...currentGroup].sort((a, b) => {
          // Simplificar la comparación de timestamps
          let aTime = 0;
          let bTime = 0;
          
          if (a.timestamp) {
            aTime = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
          }
          
          if (b.timestamp) {
            bTime = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
          }
          
          return aTime - bTime; // Orden cronológico: más antiguo primero
        });
        
        // Solo loggear grupos que contengan mensajes de hoy
        if (currentDate >= today) {
          console.log('[groupMessagesByDate] 📋 Agregando grupo de HOY:', {
            date: currentDate.toISOString(),
            messageCount: sortedGroup.length,
            messages: sortedGroup.map(m => ({ id: m.id, timestamp: m.timestamp }))
          });
        }
        
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

  if (currentGroup.length > 0 && currentDate) {
    // Ordenar el último grupo también
    const sortedGroup = [...currentGroup].sort((a, b) => {
      // Simplificar la comparación de timestamps
      let aTime = 0;
      let bTime = 0;
      
      if (a.timestamp) {
        aTime = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
      }
      
      if (b.timestamp) {
        bTime = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
      }
      
      return aTime - bTime; // Orden cronológico: más antiguo primero
    });
    
    // Solo loggear si el último grupo es de hoy
    if (currentDate >= today) {
      console.log('[groupMessagesByDate] 📋 Agregando último grupo de HOY:', {
        date: currentDate.toISOString(),
        messageCount: sortedGroup.length,
        messages: sortedGroup.map(m => ({ id: m.id, timestamp: m.timestamp }))
      });
    }
    
    grouped.push({
      date: currentDate,
      messages: sortedGroup,
    });
  }

  // Solo loggear resultado final si hay mensajes de hoy
  if (hasTodayMessages) {
    console.log('[groupMessagesByDate] 🎯 Resultado final (solo grupos con mensajes de HOY):', 
      grouped.filter(g => g.date >= today).map(g => ({
        date: g.date.toISOString(),
        messageCount: g.messages.length,
        messages: g.messages.map(m => ({ id: m.id, timestamp: m.timestamp }))
      }))
    );
  }

  return grouped;
};

const EMPTY_MESSAGES: Message[] = [];

export const useMessagePagination = ({
  taskId,
  pageSize = DEFAULT_PAGE_SIZE,
  decryptMessage,
  onNewMessage,
}: UseMessagePaginationProps) => {
  // ✅ OPTIMIZACIÓN: Usar selectores optimizados para evitar re-renders
  const selectMessages = useMemo(() => (state: { messages: Record<string, Message[]> }) => state.messages[taskId] || EMPTY_MESSAGES, [taskId]);
  const messages = useDataStore(selectMessages);
  
  // ✅ OPTIMIZACIÓN: Usar getState() para funciones que no necesitan ser reactivas
  const dataStore = useDataStore.getState();
  const { addMessage, updateMessage, setMessages: setTaskMessages } = dataStore;
  const { addChunk, getChunks } = useChunkStore();
  
  // ✅ OPTIMIZACIÓN: Memoizar groupedMessages solo cuando messages cambie realmente
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return groupMessagesByDate(messages);
  }, [messages]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Debug: Log cuando hasMore cambia
  useEffect(() => {
    // Debug logging disabled to reduce console spam
  }, [hasMore]);
  const [error, setError] = useState<string>('');
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const processMessage = useCallback(async (data: Partial<Message> & { encrypted?: { encryptedData: string; nonce: string; tag: string; salt: string } }, docId: string) => {
    let text = data.text || null;
    if (data.encrypted) {
      try {
        text = await decryptMessage(data.encrypted);
      } catch (error) {
        console.error('[useMessagePagination] Error decrypting message:', error);
        text = '[Mensaje encriptado no disponible]';
      }
    } else if (data.text && data.text.startsWith('encrypted:')) {
      text = data.text;
    }
    return {
      id: docId,
      senderId: data.senderId,
      senderName: data.senderName,
      text,
      timestamp: data.timestamp,
      lastModified: data.lastModified || data.timestamp,
      read: data.read || false,
      hours: data.hours,
      imageUrl: data.imageUrl || null,
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      fileType: data.fileType || null,
      filePath: data.filePath || null,
      clientId: data.clientId || docId,
      isPending: false,
      hasError: false,
      replyTo: data.replyTo || null,
    } as Message;
  }, [decryptMessage]);

  const loadInitialMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      // Verificar cache primero
      const cachedChunks = getChunks(taskId);
      if (cachedChunks && cachedChunks.length > 0 && !checkFirebaseCallLimits()) {
        // Debug logging disabled to reduce console spam
        cachedChunks.forEach(chunk => chunk.forEach(msg => addMessage(taskId, msg)));
        
        // Necesitamos establecer lastDocRef y hasMore para chunks cacheados
        // Obtener el total de mensajes para determinar si hay más chunks
        const allMessagesQuery = query(
          collection(db, `tasks/${taskId}/messages`), 
          orderBy('timestamp', 'desc')
        );
        const allMessagesSnapshot = await getDocs(allMessagesQuery);
        const totalMessages = allMessagesSnapshot.docs.length;
        // Debug logging disabled to reduce console spam
        
        // Determinar si hay más chunks disponibles
        const hasMoreMessages = totalMessages > pageSize;
        
        // Establecer lastDocRef
        if (allMessagesSnapshot.docs.length > 0) {
          lastDocRef.current = allMessagesSnapshot.docs[0];
          // Debug logging disabled to reduce console spam
          setHasMore(hasMoreMessages);
        }
        return;
      }
      
      if (!checkFirebaseCallLimits()) {
        throw new Error('Límite de llamadas excedido');
      }
      
      // Cargar todos los mensajes para determinar correctamente si hay más chunks
      const allMessagesQuery = query(
        collection(db, `tasks/${taskId}/messages`), 
        orderBy('timestamp', 'desc')
      );
      const allMessagesSnapshot = await getDocs(allMessagesQuery);
      const totalMessages = allMessagesSnapshot.docs.length;
              // Debug logging disabled to reduce console spam
      
      // Determinar si hay más chunks disponibles
      const hasMoreMessages = totalMessages > pageSize;
      
      // Cargar solo el primer chunk
      const q = query(collection(db, `tasks/${taskId}/messages`), orderBy('timestamp', 'desc'), limit(pageSize));
      const snapshot = await getDocs(q);
      const newMessages = await Promise.all(snapshot.docs.map(async (doc) => await processMessage(doc.data(), doc.id)));
      setTaskMessages(taskId, newMessages);
      addChunk(taskId, newMessages);  // Guarda el chunk inicial en chunkStore
              // Debug logging disabled to reduce console spam
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
              // Debug logging disabled to reduce console spam
      setHasMore(hasMoreMessages);
    } catch (err) {
      setError('Error al cargar mensajes iniciales');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, pageSize, processMessage, setTaskMessages, addChunk, getChunks, addMessage]);

  const loadMoreMessages = useCallback(async () => {
          // Debug logging disabled to reduce console spam
    if (!hasMore || isLoadingMore || !lastDocRef.current) {
              // Debug logging disabled to reduce console spam
      return;
    }
    setIsLoadingMore(true);
    
    // Verificación adicional: verificar si realmente hay más mensajes
    try {
      const checkQuery = query(
        collection(db, `tasks/${taskId}/messages`),
        orderBy('timestamp', 'desc'),
        startAfter(lastDocRef.current),
        limit(1)
      );
      const checkSnapshot = await getDocs(checkQuery);
      if (checkSnapshot.docs.length === 0) {
        // Debug logging disabled to reduce console spam
        setHasMore(false);
        setIsLoadingMore(false);
        return;
      }
    } catch (error) {
      console.error('[ChunkDebug:Hook] Error checking for more messages:', error);
    }
    try {
      if (!checkFirebaseCallLimits()) {
        throw new Error('Límite de llamadas excedido');
      }
      const q = query(
        collection(db, `tasks/${taskId}/messages`),
        orderBy('timestamp', 'desc'),
        startAfter(lastDocRef.current),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      const newMessages = await Promise.all(snapshot.docs.map(async (doc) => await processMessage(doc.data(), doc.id)));
      newMessages.forEach((msg) => addMessage(taskId, msg));
      addChunk(taskId, newMessages);  // Guarda nuevo chunk
              // Debug logging disabled to reduce console spam
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      const newHasMore = snapshot.docs.length === pageSize;
              // Debug logging disabled to reduce console spam
      setHasMore(newHasMore);
    } catch (err) {
      setError('Error al cargar más mensajes');
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, taskId, pageSize, processMessage, addMessage, addChunk, setHasMore]);

  const addOptimisticMessage = useCallback((message: Message) => {
    addMessage(taskId, message);
  }, [taskId, addMessage]);

  const updateOptimisticMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    updateMessage(taskId, messageId, updates);
  }, [taskId, updateMessage]);

  useEffect(() => {
          // Debug logging disabled to reduce console spam
    // Evitar múltiples listeners
    if (unsubscribeRef.current) {
              // Debug logging disabled to reduce console spam
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Solo cargar mensajes iniciales si no hay mensajes ya cargados
    const currentMessages = messages.length;
            // Debug logging disabled to reduce console spam
    if (currentMessages === 0) {
              // Debug logging disabled to reduce console spam
      loadInitialMessages();
    } else {
              // Debug logging disabled to reduce console spam
    }
    
    // Configurar listener para cambios en tiempo real
    const q = query(collection(db, `tasks/${taskId}/messages`), orderBy('timestamp', 'desc'));
    
    // Debounce para batching de updates
    let pendingChanges: Array<{ type: 'added' | 'modified' | 'removed'; doc: DocumentSnapshot }> = [];
    let timeoutId: NodeJS.Timeout | null = null;
    let isProcessing = false;
    
    const processBatchChanges = async () => {
      if (pendingChanges.length === 0 || isProcessing) return;
      
      isProcessing = true;
              // Debug logging disabled to reduce console spam
      
      const store = useDataStore.getState();
      const currentMessages = store.messages[taskId] || [];
              // Debug logging disabled to reduce console spam
      
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
            const newMessage = await processMessage(change.doc.data(), change.doc.id);
            
            // Buscar mensaje existente tanto por ID como por clientId
            const existingById = currentMessages.find(m => m.id === newMessage.id);
            const existingByClientId = currentMessages.find(m => m.clientId === newMessage.clientId);
            
            if (existingById) {
              // Solo actualizar si hay cambios reales
              const hasChanges = JSON.stringify(existingById) !== JSON.stringify(newMessage);
              if (hasChanges) {
                // Debug logging disabled to reduce console spam
                store.updateMessage(taskId, existingById.id, newMessage);
              } else {
                // Debug logging disabled to reduce console spam
              }
            } else if (existingByClientId) {
              // Si encontramos un mensaje optimista con el mismo clientId, reemplazarlo
                          // Debug logging disabled to reduce console spam
              
              // Eliminar el mensaje optimista y agregar el real
              store.deleteMessage(taskId, existingByClientId.id);
              store.addMessage(taskId, newMessage);
            } else {
              // Debug logging disabled to reduce console spam
              store.addMessage(taskId, newMessage);
            }
            
            // Callback para nuevos mensajes (real-time context refresh)
            onNewMessage?.(newMessage);
          } else if (change.type === 'modified') {
            const updatedMessage = await processMessage(change.doc.data(), change.doc.id);
            const existing = currentMessages.find(m => m.id === updatedMessage.id);
            if (existing) {
              const hasChanges = JSON.stringify(existing) !== JSON.stringify(updatedMessage);
              if (hasChanges) {
                // Debug logging disabled to reduce console spam
                store.updateMessage(taskId, updatedMessage.id, updatedMessage);
              }
            }
          } else if (change.type === 'removed') {
            // Debug logging disabled to reduce console spam
            store.deleteMessage(taskId, change.doc.id);
          }
          
          processedIds.add(change.doc.id);
        } catch (error) {
          console.error('[useMessagePagination] Error processing change:', error);
        }
      }
      
              // Debug logging disabled to reduce console spam
      
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
      timeoutId = setTimeout(processBatchChanges, 100); // Aumentar a 100ms para reducir frecuencia
    });
    
    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [taskId, loadInitialMessages, processMessage, messages.length, onNewMessage]);

  return {
    messages,
    groupedMessages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMoreMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
  };
};