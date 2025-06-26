export interface PersistedMessage {
  id: string;
  text: string;
  timestamp: number;
  hasError?: boolean;
  file?: {
    name: string;
    type: string;
    size: number;
    previewUrl?: string;
  };
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string;
  };
}

export interface CachedMessages {
  [conversationId: string]: {
    messages: Record<string, unknown>[];
    lastFetched: number;
  };
}

// Claves para localStorage
const UNSENT_MESSAGES_KEY = 'aurin_unsent_messages';
const ERROR_MESSAGES_KEY = 'aurin_error_messages';
const CACHED_MESSAGES_KEY = 'aurin_cached_messages';

// Persistencia de mensajes no enviados
export const saveUnsentMessage = (conversationId: string, message: PersistedMessage) => {
  try {
    const existing = getUnsentMessages();
    existing[conversationId] = message;
    localStorage.setItem(UNSENT_MESSAGES_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('[MessagePersistence] Error saving unsent message:', error);
  }
};

export const getUnsentMessage = (conversationId: string): PersistedMessage | null => {
  try {
    const existing = getUnsentMessages();
    return existing[conversationId] || null;
  } catch (error) {
    console.warn('[MessagePersistence] Error getting unsent message:', error);
    return null;
  }
};

export const removeUnsentMessage = (conversationId: string) => {
  try {
    const existing = getUnsentMessages();
    delete existing[conversationId];
    localStorage.setItem(UNSENT_MESSAGES_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('[MessagePersistence] Error removing unsent message:', error);
  }
};

const getUnsentMessages = (): Record<string, PersistedMessage> => {
  try {
    const stored = localStorage.getItem(UNSENT_MESSAGES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('[MessagePersistence] Error parsing unsent messages:', error);
    return {};
  }
};

// Persistencia de mensajes con error
export const saveErrorMessage = (conversationId: string, message: PersistedMessage) => {
  try {
    const existing = getErrorMessages();
    existing[conversationId] = message;
    localStorage.setItem(ERROR_MESSAGES_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('[MessagePersistence] Error saving error message:', error);
  }
};

export const getErrorMessage = (conversationId: string): PersistedMessage | null => {
  try {
    const existing = getErrorMessages();
    return existing[conversationId] || null;
  } catch (error) {
    console.warn('[MessagePersistence] Error getting error message:', error);
    return null;
  }
};

export const removeErrorMessage = (conversationId: string) => {
  try {
    const existing = getErrorMessages();
    delete existing[conversationId];
    localStorage.setItem(ERROR_MESSAGES_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('[MessagePersistence] Error removing error message:', error);
  }
};

const getErrorMessages = (): Record<string, PersistedMessage> => {
  try {
    const stored = localStorage.getItem(ERROR_MESSAGES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('[MessagePersistence] Error parsing error messages:', error);
    return {};
  }
};

// Caching de mensajes descargados
export const saveCachedMessages = (conversationId: string, messages: Record<string, unknown>[]) => {
  try {
    const existing = getCachedMessagesData();
    existing[conversationId] = {
      messages,
      lastFetched: Date.now(),
    };
    localStorage.setItem(CACHED_MESSAGES_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('[MessagePersistence] Error saving cached messages:', error);
  }
};

export const getCachedMessages = (conversationId: string): Record<string, unknown>[] | null => {
  try {
    const existing = getCachedMessagesData();
    const cached = existing[conversationId];
    
    if (!cached) return null;
    
    // Cache válido por 5 minutos
    const cacheAge = Date.now() - cached.lastFetched;
    const maxAge = 5 * 60 * 1000; // 5 minutos
    
    if (cacheAge > maxAge) {
      // Cache expirado, eliminarlo
      delete existing[conversationId];
      localStorage.setItem(CACHED_MESSAGES_KEY, JSON.stringify(existing));
      return null;
    }
    
    return cached.messages;
  } catch (error) {
    console.warn('[MessagePersistence] Error getting cached messages:', error);
    return null;
  }
};

export const clearCachedMessages = (conversationId?: string) => {
  try {
    if (conversationId) {
      const existing = getCachedMessagesData();
      delete existing[conversationId];
      localStorage.setItem(CACHED_MESSAGES_KEY, JSON.stringify(existing));
    } else {
      localStorage.removeItem(CACHED_MESSAGES_KEY);
    }
  } catch (error) {
    console.warn('[MessagePersistence] Error clearing cached messages:', error);
  }
};

const getCachedMessagesData = (): CachedMessages => {
  try {
    const stored = localStorage.getItem(CACHED_MESSAGES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('[MessagePersistence] Error parsing cached messages:', error);
    return {};
  }
};

// Limpieza automática de mensajes antiguos (más de 24 horas)
export const cleanupOldMessages = () => {
  try {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    // Limpiar mensajes no enviados antiguos
    const unsentMessages = getUnsentMessages();
    let hasChanges = false;
    
    Object.keys(unsentMessages).forEach(conversationId => {
      if (now - unsentMessages[conversationId].timestamp > maxAge) {
        delete unsentMessages[conversationId];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      localStorage.setItem(UNSENT_MESSAGES_KEY, JSON.stringify(unsentMessages));
    }
    
    // Limpiar mensajes con error antiguos
    const errorMessages = getErrorMessages();
    hasChanges = false;
    
    Object.keys(errorMessages).forEach(conversationId => {
      if (now - errorMessages[conversationId].timestamp > maxAge) {
        delete errorMessages[conversationId];
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      localStorage.setItem(ERROR_MESSAGES_KEY, JSON.stringify(errorMessages));
    }
  } catch (error) {
    console.warn('[MessagePersistence] Error cleaning up old messages:', error);
  }
};

// Ejecutar limpieza al cargar el módulo
if (typeof window !== 'undefined') {
  cleanupOldMessages();
} 