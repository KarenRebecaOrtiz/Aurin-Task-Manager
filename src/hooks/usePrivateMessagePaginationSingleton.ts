// src/hooks/usePrivateMessagePaginationSingleton.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, startAfter, onSnapshot, DocumentSnapshot, QuerySnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Message } from '@/types';

// Debug mode
const DEBUG = process.env.NODE_ENV === 'development';

interface MessageCache {
  [conversationId: string]: {
    messages: Message[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
    isLoading: boolean;
    lastFetch: number;
  };
}

interface UsePrivateMessagePaginationSingletonProps {
  conversationId: string;
  pageSize?: number;
  cacheTimeout?: number;
  decryptMessage: (encrypted: { encryptedData: string; nonce: string; tag: string; salt: string } | string) => Promise<string>;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutos

// Singleton para manejar listeners globalmente
export class PrivateMessagePaginationManager {
  private static instance: PrivateMessagePaginationManager | null = null;
  private listeners: Map<string, () => void> = new Map();
  private subscribers: Map<string, Set<(messages: Message[]) => void>> = new Map();
  private currentMessages: Map<string, Message[]> = new Map();
  private cache: MessageCache = {};
  private debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): PrivateMessagePaginationManager {
    if (!PrivateMessagePaginationManager.instance) {
      PrivateMessagePaginationManager.instance = new PrivateMessagePaginationManager();
    }
    return PrivateMessagePaginationManager.instance;
  }

  private constructor() {}

  subscribe(conversationId: string, callback: (messages: Message[]) => void): () => void {
    if (!this.subscribers.has(conversationId)) {
      this.subscribers.set(conversationId, new Set());
    }
    
    const conversationSubscribers = this.subscribers.get(conversationId)!;
    conversationSubscribers.add(callback);

    // Enviar estado actual inmediatamente (cache persistente)
    const currentMessages = this.currentMessages.get(conversationId) || [];
    if (DEBUG) console.log('[PrivateMessagePaginationManager] Sending cached messages to subscriber:', conversationId, 'count:', currentMessages.length);
    callback(currentMessages);

    // Retornar función de unsubscribe (NO CLEANUP LISTENER)
    return () => {
      conversationSubscribers.delete(callback);
      if (conversationSubscribers.size === 0) {
        this.subscribers.delete(conversationId);
        // NO cleanupListener aquí - mantener listener vivo
        if (DEBUG) console.log('[PrivateMessagePaginationManager] Unsubscribed from conversation:', conversationId, 'but keeping listener alive');
      }
    };
  }

  private cleanupListener(conversationId: string) {
    const unsubscribe = this.listeners.get(conversationId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(conversationId);
      // NO eliminar currentMessages - mantener cache persistente
      // this.currentMessages.delete(conversationId);
      
      // Limpiar debounce timeout
      const timeout = this.debounceTimeouts.get(conversationId);
      if (timeout) {
        clearTimeout(timeout);
        this.debounceTimeouts.delete(conversationId);
      }
      
      if (DEBUG) console.log('[PrivateMessagePaginationManager] Cleaned up listener for conversation:', conversationId);
    }
  }

  setupListener(conversationId: string, decryptMessage: (encrypted: { encryptedData: string; nonce: string; tag: string; salt: string } | string) => Promise<string>) {
    if (this.listeners.has(conversationId)) {
      if (DEBUG) console.log('[PrivateMessagePaginationManager] Listener already exists for conversation:', conversationId);
      return;
    }

    if (DEBUG) console.log('[PrivateMessagePaginationManager] Setting up listener for conversation:', conversationId);

    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      orderBy('timestamp', 'desc'),
      limit(DEFAULT_PAGE_SIZE)
    );

    let pendingChanges: Array<{ type: 'added' | 'modified' | 'removed'; doc: DocumentSnapshot }> = [];
    let isProcessing = false;
    const processedIds = new Set<string>();

    const decryptMessageSafely = async (encrypted: { encryptedData: string; nonce: string; tag: string; salt: string } | string): Promise<string> => {
      try {
        if (typeof encrypted === 'string') return encrypted;
        if (encrypted && typeof encrypted === 'object') {
          return await decryptMessage(encrypted);
        }
        return '';
      } catch (error) {
        console.error('[PrivateMessagePaginationManager] Error decrypting message:', error);
        return '';
      }
    };

    const processBatchChanges = async () => {
      if (isProcessing || pendingChanges.length === 0) return;
      
      isProcessing = true;
      if (DEBUG) console.log('[PrivateMessagePaginationManager] Processing batch changes:', pendingChanges.length);

      for (const change of pendingChanges) {
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

            const currentMessages = this.currentMessages.get(conversationId) || [];
            const existing = currentMessages.find(m => m.id === newMessage.id);
            
            if (existing) {
              const hasChanges = JSON.stringify(existing) !== JSON.stringify(newMessage);
              if (hasChanges) {
                if (DEBUG) console.log('[PrivateMessagePaginationManager] Updating existing message:', newMessage.id);
                const updatedMessages = currentMessages.map(m => m.id === newMessage.id ? newMessage : m);
                this.currentMessages.set(conversationId, updatedMessages);
                this.notifySubscribers(conversationId, updatedMessages);
              } else {
                if (DEBUG) console.log('[PrivateMessagePaginationManager] Message unchanged, skipping:', newMessage.id);
              }
            } else {
              if (DEBUG) console.log('[PrivateMessagePaginationManager] Adding new message:', newMessage.id);
              // Verificar que no esté duplicado
              const isDuplicate = currentMessages.some(m => m.id === newMessage.id);
              if (isDuplicate) {
                if (DEBUG) console.log('[PrivateMessagePaginationManager] Duplicate message detected, skipping:', newMessage.id);
                continue;
              }
              const updatedMessages = [newMessage, ...currentMessages];
              this.currentMessages.set(conversationId, updatedMessages);
              this.notifySubscribers(conversationId, updatedMessages);
            }
          } else if (change.type === 'removed') {
            if (DEBUG) console.log('[PrivateMessagePaginationManager] Removing message:', change.doc.id);
            const currentMessages = this.currentMessages.get(conversationId) || [];
            const updatedMessages = currentMessages.filter(m => m.id !== change.doc.id);
            this.currentMessages.set(conversationId, updatedMessages);
            this.notifySubscribers(conversationId, updatedMessages);
          }
          
          processedIds.add(change.doc.id);
        } catch (error) {
          console.error('[PrivateMessagePaginationManager] Error processing change:', error);
        }
      }
      
      pendingChanges = [];
      isProcessing = false;
    };

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot: QuerySnapshot) => {
      // IGNORAR CACHE SNAPSHOTS - solo procesar cambios reales
      if (snapshot.metadata.fromCache) {
        if (DEBUG) console.log('[PrivateMessagePaginationManager] Ignoring cache snapshot for conversation:', conversationId);
        return;
      }

      // Limpiar timeout anterior
      const existingTimeout = this.debounceTimeouts.get(conversationId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Solo procesar cambios reales, no cache
      const changes = snapshot.docChanges();
      changes.forEach((change) => {
        // Ignorar 'added' si viene de cache o pending writes
        if (change.type === 'added' && (snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache)) {
          console.log('[PrivateMessagePaginationManager] Ignoring cached/pending add for:', change.doc.id);
          return;
        }
        pendingChanges.push({ type: change.type, doc: change.doc });
      });
      
      // Debounce el procesamiento
      const timeoutId = setTimeout(processBatchChanges, 500); // 500ms debounce
      this.debounceTimeouts.set(conversationId, timeoutId);
    }, (error) => {
      console.error('[PrivateMessagePaginationManager] Error fetching messages:', error);
      this.currentMessages.set(conversationId, []);
    });

    this.listeners.set(conversationId, unsubscribe);
  }

  private notifySubscribers(conversationId: string, messages: Message[]) {
    const conversationSubscribers = this.subscribers.get(conversationId);
    if (conversationSubscribers) {
      conversationSubscribers.forEach(callback => {
        try {
          callback(messages);
        } catch (error) {
          console.error('[PrivateMessagePaginationManager] Error in subscriber callback:', error);
        }
      });
    }
  }

  async loadMoreMessages(conversationId: string, decryptMessage: (encrypted: { encryptedData: string; nonce: string; tag: string; salt: string } | string) => Promise<string>): Promise<void> {
    const cache = this.cache[conversationId];
    if (!cache || !cache.hasMore || cache.isLoading) return;

    cache.isLoading = true;
    
    try {
      const q = query(
        collection(db, `conversations/${conversationId}/messages`),
        orderBy('timestamp', 'desc'),
        startAfter(cache.lastDoc),
        limit(DEFAULT_PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const newMessages: Message[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.timestamp) continue;

        let decryptedText = '';
        if (data.encrypted) {
          decryptedText = await decryptMessage(data.encrypted);
        } else if (data.text) {
          decryptedText = await decryptMessage(data.text);
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

      const currentMessages = this.currentMessages.get(conversationId) || [];
      const updatedMessages = [...currentMessages, ...newMessages];
      this.currentMessages.set(conversationId, updatedMessages);
      this.notifySubscribers(conversationId, updatedMessages);

      cache.lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      cache.hasMore = snapshot.docs.length === DEFAULT_PAGE_SIZE;
      cache.lastFetch = Date.now();
    } catch (error) {
      console.error('[PrivateMessagePaginationManager] Error loading more messages:', error);
    } finally {
      cache.isLoading = false;
    }
  }

  hasListener(conversationId: string): boolean {
    return this.listeners.has(conversationId);
  }

  // Método público para cleanup global (solo en logout/app close)
  cleanupAllListeners(): void {
    if (DEBUG) console.log('[PrivateMessagePaginationManager] Cleaning up all listeners');
    this.listeners.forEach((unsubscribe, conversationId) => {
      unsubscribe();
    });
    this.listeners.clear();
    this.subscribers.clear();
    this.currentMessages.clear();
    this.debounceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.debounceTimeouts.clear();
  }
}

// Hook que usa el singleton
export const usePrivateMessagePaginationSingleton = ({
  conversationId,
  pageSize = DEFAULT_PAGE_SIZE,
  cacheTimeout = DEFAULT_CACHE_TIMEOUT,
  decryptMessage,
}: UsePrivateMessagePaginationSingletonProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const managerRef = useRef<PrivateMessagePaginationManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    managerRef.current = PrivateMessagePaginationManager.getInstance();

    // Setup listener si no existe
    if (!managerRef.current.hasListener(conversationId)) {
      managerRef.current.setupListener(conversationId, decryptMessage);
    }

    // Subscribe to updates
    unsubscribeRef.current = managerRef.current.subscribe(conversationId, (newMessages) => {
      if (DEBUG) console.log('[usePrivateMessagePaginationSingleton] Received messages update:', conversationId, 'count:', newMessages.length);
      setMessages(newMessages);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [conversationId, decryptMessage]);

  const loadMoreMessages = useCallback(async () => {
    if (!managerRef.current) return;
    
    setIsLoadingMore(true);
    await managerRef.current.loadMoreMessages(conversationId, decryptMessage);
    setIsLoadingMore(false);
  }, [conversationId, decryptMessage]);

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