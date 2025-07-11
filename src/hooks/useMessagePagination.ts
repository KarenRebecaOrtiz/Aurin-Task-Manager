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
}

const DEFAULT_PAGE_SIZE = 20;

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

  const sortedMessages = [...messages].sort((a, b) => {
    const aTime = a.timestamp ? (a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
    const bTime = b.timestamp ? (b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
    return bTime - aTime;
  });

  sortedMessages.forEach((message) => {
    if (message.isDatePill) return;

    const messageDate = message.timestamp ? (message.timestamp instanceof Timestamp ? message.timestamp.toDate() : new Date(message.timestamp)) : new Date();

    if (!currentDate || messageDate.toDateString() !== currentDate.toDateString()) {
      if (currentGroup.length > 0 && currentDate) {
        grouped.push({
          date: currentDate,
          messages: currentGroup,
        });
      }
      currentDate = messageDate;
      currentGroup = [message];
    } else {
      currentGroup.push(message);
    }
  });

  if (currentGroup.length > 0 && currentDate) {
    grouped.push({
      date: currentDate,
      messages: currentGroup,
    });
  }

  return grouped;
};

const EMPTY_MESSAGES: Message[] = [];

export const useMessagePagination = ({
  taskId,
  pageSize = DEFAULT_PAGE_SIZE,
  decryptMessage,
}: UseMessagePaginationProps) => {
  const selectMessages = useMemo(() => (state: { messages: Record<string, Message[]> }) => state.messages[taskId] || EMPTY_MESSAGES, [taskId]);
  const messages = useDataStore(selectMessages);
  const { addMessage, updateMessage, setMessages: setTaskMessages } = useDataStore();
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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
      if (!checkFirebaseCallLimits()) {
        throw new Error('Límite de llamadas excedido');
      }
      const q = query(collection(db, `tasks/${taskId}/messages`), orderBy('timestamp', 'desc'), limit(pageSize));
      const snapshot = await getDocs(q);
      const newMessages = await Promise.all(snapshot.docs.map(async (doc) => await processMessage(doc.data(), doc.id)));
      setTaskMessages(taskId, newMessages);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      setError('Error al cargar mensajes iniciales');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, pageSize, processMessage, setTaskMessages]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || isLoadingMore || !lastDocRef.current) return;
    setIsLoadingMore(true);
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
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      setError('Error al cargar más mensajes');
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, taskId, pageSize, processMessage, addMessage]);

  const addOptimisticMessage = useCallback((message: Message) => {
    addMessage(taskId, message);
  }, [taskId, addMessage]);

  const updateOptimisticMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    updateMessage(taskId, messageId, updates);
  }, [taskId, updateMessage]);

  useEffect(() => {
    // Evitar múltiples listeners
    if (unsubscribeRef.current) {
      console.log('[useMessagePagination] Cleaning up existing listener for taskId:', taskId);
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Cargar mensajes iniciales primero
    loadInitialMessages();
    
    // Configurar listener para cambios en tiempo real
    const q = query(collection(db, `tasks/${taskId}/messages`), orderBy('timestamp', 'desc'));
    
    // Debounce para batching de updates
    let pendingChanges: Array<{ type: 'added' | 'modified' | 'removed'; doc: DocumentSnapshot }> = [];
    let timeoutId: NodeJS.Timeout | null = null;
    let isProcessing = false;
    
    const processBatchChanges = async () => {
      if (pendingChanges.length === 0 || isProcessing) return;
      
      isProcessing = true;
      console.log('[useMessagePagination] Processing batch changes:', pendingChanges.length);
      
      const store = useDataStore.getState();
      const currentMessages = store.messages[taskId] || [];
      console.log('[useMessagePagination] Processing batch changes. Current messages count:', currentMessages.length);
      
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
            const existing = currentMessages.find(m => m.id === newMessage.id);
            if (existing) {
              // Solo actualizar si hay cambios reales
              const hasChanges = JSON.stringify(existing) !== JSON.stringify(newMessage);
              if (hasChanges) {
                console.log('[useMessagePagination] Updating existing message:', newMessage.id);
                store.updateMessage(taskId, existing.id, newMessage);
              } else {
                console.log('[useMessagePagination] Message unchanged, skipping:', newMessage.id);
              }
            } else {
              console.log('[useMessagePagination] Adding new message:', newMessage.id);
              store.addMessage(taskId, newMessage);
            }
          } else if (change.type === 'modified') {
            const updatedMessage = await processMessage(change.doc.data(), change.doc.id);
            const existing = currentMessages.find(m => m.id === updatedMessage.id);
            if (existing) {
              const hasChanges = JSON.stringify(existing) !== JSON.stringify(updatedMessage);
              if (hasChanges) {
                console.log('[useMessagePagination] Modifying message:', updatedMessage.id);
                store.updateMessage(taskId, updatedMessage.id, updatedMessage);
              }
            }
          } else if (change.type === 'removed') {
            console.log('[useMessagePagination] Removing message:', change.doc.id);
            store.deleteMessage(taskId, change.doc.id);
          }
          
          processedIds.add(change.doc.id);
        } catch (error) {
          console.error('[useMessagePagination] Error processing change:', error);
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
      timeoutId = setTimeout(processBatchChanges, 100); // Aumentar a 100ms para reducir frecuencia
    });
    
    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [taskId, loadInitialMessages, processMessage]);

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