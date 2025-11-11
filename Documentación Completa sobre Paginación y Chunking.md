<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Documentación Completa sobre Paginación y Chunking de Mensajes en Chat UI

## Introducción a la Arquitectura de Chat con Paginación Inversa

La implementación de un sistema de chat moderno requiere una arquitectura sofisticada que maneje la carga progresiva de mensajes (chunking), scroll inverso (mensajes más recientes abajo), y auto-scroll inteligente. Este documento proporciona una guía exhaustiva basada en las mejores prácticas de aplicaciones como WhatsApp y Messenger.[^1][^2][^3]

## Conceptos Fundamentales

### Paginación Inversa (Reverse Pagination)

La paginación inversa es el patrón donde los mensajes más recientes se muestran en la parte inferior de la pantalla, y al hacer scroll hacia arriba, se cargan mensajes más antiguos. Este patrón es contrario a la paginación tradicional y presenta desafíos únicos.[^2][^4]

**Características clave:**

- Los mensajes nuevos se agregan al final (bottom) del contenedor
- El scroll inicial debe posicionarse en el fondo del contenedor
- Al cargar mensajes históricos (scroll up), se deben insertar al inicio sin causar "jumps"
- La posición del scroll debe mantenerse después de insertar nuevos mensajes antiguos[^5]


### Chunking de Mensajes

El chunking consiste en dividir la carga de mensajes en fragmentos manejables para evitar cargar todo el historial de conversación de una vez. Esto mejora significativamente el rendimiento y la experiencia del usuario.[^6][^3]

**Parámetros típicos:**

- **Page size inicial:** 20-50 mensajes
- **Page size para cargas subsecuentes:** 20-30 mensajes
- **Orden de consulta:** Descendente (DESC) por fecha/timestamp
- **Inversión en UI:** Los datos se muestran en orden inverso al recibido[^3][^2]


## Implementación con React/JavaScript

### 1. Estructura Base del Componente

```javascript
import React, { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

const ChatContainer = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const scrollAreaRef = useRef(null);
  const PAGE_SIZE = 20;

  // Cargar mensajes iniciales
  useEffect(() => {
    loadInitialMessages();
  }, []);

  const loadInitialMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetchMessages({
        page: 0,
        pageSize: PAGE_SIZE,
        order: 'desc' // Más recientes primero
      });
      
      setMessages(response.messages.reverse()); // Invertir para mostrar correctamente
      setHasMore(response.hasMore);
      setPage(1);
      
      // Scroll al fondo después de cargar
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Implementación del chat */}
    </div>
  );
};
```


### 2. Sistema de Auto-Scroll Inteligente

El auto-scroll debe ser contextual: automático para mensajes nuevos si el usuario está en el bottom, pero no debe interrumpir si el usuario está leyendo mensajes antiguos.[^7][^1]

```javascript
// Hook personalizado para detectar si estamos en el bottom
const useScrollDetection = (scrollAreaRef) => {
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    // Tolerancia de 1px para inconsistencias del navegador
    const atBottom = scrollHeight - clientHeight <= scrollTop + 1;
    
    setIsAtBottom(atBottom);
  }, [scrollAreaRef]);

  return { isAtBottom, handleScroll };
};

// Función para scroll al bottom
const scrollToBottom = (behavior = 'smooth') => {
  if (!scrollAreaRef.current) return;
  
  const scrollAreaElement = scrollAreaRef.current;
  scrollAreaElement.scrollTop = 
    scrollAreaElement.scrollHeight - scrollAreaElement.clientHeight;
};

// useEffect para auto-scroll en mensajes nuevos
useEffect(() => {
  if (isAtBottom && newMessageReceived) {
    scrollToBottom('smooth');
  }
}, [messages, isAtBottom]);
```


### 3. ChatScrollAnchor Component

Este componente invisible actúa como ancla en el bottom del chat y utiliza Intersection Observer para detectar visibilidad.[^1]

```javascript
import { useInView } from 'react-intersection-observer';

export function ChatScrollAnchor({ 
  trackVisibility, 
  isAtBottom, 
  scrollAreaRef 
}) {
  const { ref, inView, entry } = useInView({
    trackVisibility,
    delay: 100, // Mínimo delay cuando trackVisibility es true
  });

  useEffect(() => {
    // Solo hacer auto-scroll si:
    // 1. El usuario está en el bottom
    // 2. Estamos trackeando (hay mensajes nuevos llegando)
    // 3. El ancla no está visible (mensajes nuevos lo empujaron fuera)
    if (isAtBottom && trackVisibility && !inView) {
      if (!scrollAreaRef.current) return;
      
      const scrollAreaElement = scrollAreaRef.current;
      scrollAreaElement.scrollTop = 
        scrollAreaElement.scrollHeight - scrollAreaElement.clientHeight;
    }
  }, [inView, entry, isAtBottom, trackVisibility, scrollAreaRef]);

  return <div ref={ref} className="h-px w-full" />;
}
```

**Uso del componente:**

```javascript
<div 
  ref={scrollAreaRef}
  onScroll={handleScroll}
  className="chat-scroll-area"
>
  <MessageList messages={messages} />
  
  <ChatScrollAnchor
    scrollAreaRef={scrollAreaRef}
    isAtBottom={isAtBottom}
    trackVisibility={isStreaming || isReceivingMessages}
  />
</div>
```


### 4. Infinite Scroll para Mensajes Históricos

Implementación de carga progresiva al hacer scroll hacia arriba.[^2][^3]

```javascript
const ChatWithInfiniteScroll = () => {
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const scrollAreaRef = useRef(null);
  const topObserverRef = useRef(null);
  const previousScrollHeightRef = useRef(0);

  // Intersection Observer para detectar cuando llegamos al top
  useEffect(() => {
    const options = {
      root: scrollAreaRef.current,
      rootMargin: '50px', // Cargar 50px antes de llegar al top
      threshold: 0.1,
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !isLoadingMore) {
        loadMoreMessages();
      }
    }, options);

    if (topObserverRef.current) {
      observer.observe(topObserverRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore]);

  const loadMoreMessages = async () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    // Guardar scroll height antes de cargar
    previousScrollHeightRef.current = scrollAreaRef.current?.scrollHeight || 0;
    
    try {
      const response = await fetchMessages({
        page: page + 1,
        pageSize: 20,
        order: 'desc',
        before: messages[^0]?.id // ID del mensaje más antiguo actual
      });
      
      const olderMessages = response.messages.reverse();
      
      // Agregar mensajes antiguos AL INICIO del array
      setMessages(prev => [...olderMessages, ...prev]);
      setPage(prev => prev + 1);
      setHasMore(response.hasMore);
      
      // Mantener posición del scroll después de insertar
      requestAnimationFrame(() => {
        if (scrollAreaRef.current) {
          const newScrollHeight = scrollAreaRef.current.scrollHeight;
          const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
          scrollAreaRef.current.scrollTop += scrollDiff;
        }
      });
      
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div 
      ref={scrollAreaRef} 
      className="chat-scroll-container"
      style={{ 
        height: '100%', 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Indicador de carga superior */}
      {isLoadingMore && (
        <div className="loading-indicator">
          Cargando mensajes anteriores...
        </div>
      )}
      
      {/* Observer target en el top */}
      <div ref={topObserverRef} style={{ height: '1px' }} />
      
      {/* Lista de mensajes */}
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {/* Anchor para auto-scroll */}
      <ChatScrollAnchor
        scrollAreaRef={scrollAreaRef}
        isAtBottom={isAtBottom}
        trackVisibility={isReceivingNewMessages}
      />
    </div>
  );
};
```


## Agrupación de Mensajes por Fecha

La agrupación por fecha mejora la legibilidad y navegación del historial.[^8][^9]

### Implementación de Headers de Fecha

```javascript
// Utilidad para agrupar mensajes por fecha
const groupMessagesByDate = (messages) => {
  const groups = [];
  let currentGroup = null;
  
  messages.forEach(message => {
    const messageDate = new Date(message.timestamp);
    const dateKey = formatDateKey(messageDate);
    
    if (!currentGroup || currentGroup.dateKey !== dateKey) {
      currentGroup = {
        dateKey,
        dateLabel: formatDateLabel(messageDate),
        messages: []
      };
      groups.push(currentGroup);
    }
    
    currentGroup.messages.push(message);
  });
  
  return groups;
};

// Formatear fecha como key (YYYY-MM-DD)
const formatDateKey = (date) => {
  return date.toISOString().split('T')[^0];
};

// Formatear label legible (Hoy, Ayer, fecha específica)
const formatDateLabel = (date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (formatDateKey(date) === formatDateKey(today)) {
    return 'Hoy';
  } else if (formatDateKey(date) === formatDateKey(yesterday)) {
    return 'Ayer';
  } else {
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
};

// Componente de renderizado
const MessageListWithDateHeaders = ({ messages }) => {
  const groupedMessages = useMemo(
    () => groupMessagesByDate(messages), 
    [messages]
  );
  
  return (
    <div className="messages-container">
      {groupedMessages.map((group, groupIndex) => (
        <div key={group.dateKey} className="message-group">
          {/* Header de fecha */}
          <div className="date-header">
            <span className="date-label">{group.dateLabel}</span>
          </div>
          
          {/* Mensajes del grupo */}
          {group.messages.map(message => (
            <MessageBubble 
              key={message.id} 
              message={message}
              showTime={true}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
```


### CSS para Headers de Fecha

```css
.date-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 16px 0;
  position: relative;
}

.date-header::before,
.date-header::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: #e0e0e0;
}

.date-label {
  padding: 4px 12px;
  margin: 0 12px;
  background-color: #f0f0f0;
  border-radius: 12px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}
```


## Botón "Scroll to Bottom"

Implementación del botón que aparece cuando el usuario no está en el bottom.[^7][^1]

```javascript
const ScrollToBottomButton = ({ 
  visible, 
  onClick, 
  unreadCount = 0 
}) => {
  return (
    <div 
      className={`scroll-to-bottom-container ${visible ? 'visible' : 'hidden'}`}
    >
      <button 
        onClick={onClick}
        className="scroll-to-bottom-btn"
        aria-label="Scroll to bottom"
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <path 
            d="M7 10l5 5 5-5" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </button>
    </div>
  );
};

// Uso en el componente principal
const ChatComponent = () => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Incrementar contador cuando lleguen mensajes y no estemos en bottom
  useEffect(() => {
    if (!isAtBottom && newMessageReceived) {
      setUnreadCount(prev => prev + 1);
    }
  }, [newMessageReceived, isAtBottom]);
  
  const handleScrollToBottom = () => {
    scrollToBottom('smooth');
    setUnreadCount(0);
  };
  
  return (
    <div className="chat-wrapper">
      <div className="chat-messages" ref={scrollAreaRef}>
        {/* Mensajes */}
      </div>
      
      <ScrollToBottomButton
        visible={!isAtBottom}
        onClick={handleScrollToBottom}
        unreadCount={unreadCount}
      />
    </div>
  );
};
```


### Estilos del Botón

```css
.scroll-to-bottom-container {
  position: absolute;
  bottom: 80px;
  right: 20px;
  transition: opacity 0.3s, transform 0.3s;
  z-index: 10;
}

.scroll-to-bottom-container.visible {
  opacity: 1;
  transform: translateY(0);
}

.scroll-to-bottom-container.hidden {
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
}

.scroll-to-bottom-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform 0.2s;
}

.scroll-to-bottom-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #ff4444;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
}
```


## Virtualización para Grandes Volúmenes

Para chats con miles de mensajes, la virtualización es esencial.[^10][^5]

### Implementación con TanStack Virtual

```javascript
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualizedChatList = ({ messages }) => {
  const parentRef = useRef(null);
  const [measurementCache] = useState(() => new Map());
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback((index) => {
      // Usar cache si existe, sino estimar
      return measurementCache.get(index) || 80;
    }, [measurementCache]),
    overscan: 5, // Renderizar 5 items extra arriba/abajo
    measureElement: (el) => {
      // Medir elementos reales y cachear
      if (el) {
        const height = el.getBoundingClientRect().height;
        const index = Number(el.dataset.index);
        if (!isNaN(index)) {
          measurementCache.set(index, height);
        }
      }
    },
  });

  const items = virtualizer.getVirtualItems();

  useEffect(() => {
    // Scroll al bottom en mount
    virtualizer.scrollToIndex(messages.length - 1, {
      align: 'end',
    });
  }, []);

  return (
    <div
      ref={parentRef}
      className="virtual-scroll-container"
      style={{
        height: '600px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const message = messages[virtualRow.index];
          
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageBubble message={message} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```


## Backend: Estrategia de Consultas

### Estructura de Query para Paginación

```javascript
// API endpoint para obtener mensajes
app.get('/api/chats/:chatId/messages', async (req, res) => {
  const { chatId } = req.params;
  const { 
    page = 0, 
    pageSize = 20, 
    before, // Timestamp o ID del mensaje más antiguo que tenemos
    after   // Timestamp o ID del mensaje más nuevo que tenemos
  } = req.query;

  try {
    let query = {
      chatId: chatId,
    };

    // Si queremos mensajes antes de un punto (scroll up)
    if (before) {
      query.timestamp = { $lt: before };
    }
    
    // Si queremos mensajes después de un punto (nuevos mensajes)
    if (after) {
      query.timestamp = { $gt: after };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 }) // Más recientes primero
      .limit(parseInt(pageSize))
      .skip(parseInt(page) * parseInt(pageSize));

    const totalCount = await Message.countDocuments(query);
    const hasMore = (parseInt(page) + 1) * parseInt(pageSize) < totalCount;

    res.json({
      messages,
      hasMore,
      page: parseInt(page),
      totalCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```


### Optimización de Índices en MongoDB

```javascript
// Índices recomendados para performance
db.messages.createIndex({ 
  chatId: 1, 
  timestamp: -1 
});

db.messages.createIndex({ 
  chatId: 1, 
  _id: -1 
});

// Para búsquedas por usuario
db.messages.createIndex({ 
  chatId: 1, 
  userId: 1, 
  timestamp: -1 
});
```


## Implementación en Android/RecyclerView

Para aplicaciones móviles nativas.[^11][^12]

```kotlin
class ChatAdapter(
    private val messages: MutableList<Message>
) : RecyclerView.Adapter<ChatAdapter.MessageViewHolder>() {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_message, parent, false)
        return MessageViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        holder.bind(messages[position])
    }
    
    override fun getItemCount() = messages.size
    
    fun addOlderMessages(olderMessages: List<Message>) {
        val insertPosition = 0
        messages.addAll(insertPosition, olderMessages)
        notifyItemRangeInserted(insertPosition, olderMessages.size)
    }
    
    fun addNewMessage(message: Message) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }
    
    class MessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        fun bind(message: Message) {
            // Bind message data
        }
    }
}

// En tu Activity/Fragment
class ChatActivity : AppCompatActivity() {
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: ChatAdapter
    private lateinit var layoutManager: LinearLayoutManager
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chat)
        
        setupRecyclerView()
        loadInitialMessages()
    }
    
    private fun setupRecyclerView() {
        layoutManager = LinearLayoutManager(this).apply {
            // Crucial para chat: reverso y stackFromEnd
            reverseLayout = true
            stackFromEnd = true
        }
        
        recyclerView = findViewById<RecyclerView>(R.id.chatRecyclerView).apply {
            this.layoutManager = this@ChatActivity.layoutManager
            adapter = ChatAdapter(mutableListOf())
            
            // Listener para infinite scroll
            addOnScrollListener(object : RecyclerView.OnScrollListener() {
                override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                    super.onScrolled(recyclerView, dx, dy)
                    
                    val visibleItemCount = layoutManager.childCount
                    val totalItemCount = layoutManager.itemCount
                    val firstVisibleItem = layoutManager.findFirstVisibleItemPosition()
                    
                    // Cargar más cuando estemos cerca del top
                    if (!isLoading && hasMore && 
                        firstVisibleItem + visibleItemCount >= totalItemCount - 5) {
                        loadMoreMessages()
                    }
                }
            })
        }
    }
}
```


### XML Layout para RecyclerView

```xml
<androidx.recyclerview.widget.RecyclerView
    android:id="@+id/chatRecyclerView"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:clipToPadding="false"
    android:scrollbars="vertical"
    app:layoutManager="androidx.recyclerview.widget.LinearLayoutManager"
    app:reverseLayout="true"
    app:stackFromEnd="true" />
```


## Manejo de Websockets para Mensajes en Tiempo Real

```javascript
// Cliente WebSocket
class ChatWebSocketService {
  constructor(chatId) {
    this.chatId = chatId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageHandlers = new Set();
  }

  connect() {
    this.ws = new WebSocket(`wss://your-server.com/chat/${this.chatId}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'new_message':
            this.handleNewMessage(data.message);
            break;
          case 'message_update':
            this.handleMessageUpdate(data.message);
            break;
          case 'typing_indicator':
            this.handleTypingIndicator(data);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  handleNewMessage(message) {
    this.messageHandlers.forEach(handler => handler(message));
  }
  
  onNewMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }
  
  sendMessage(content) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'send_message',
        content,
        chatId: this.chatId,
        timestamp: Date.now()
      }));
    }
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connect();
      }, delay);
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Uso en componente React
const ChatWithWebSocket = ({ chatId }) => {
  const [messages, setMessages] = useState([]);
  const wsService = useRef(null);
  
  useEffect(() => {
    wsService.current = new ChatWebSocketService(chatId);
    wsService.current.connect();
    
    const unsubscribe = wsService.current.onNewMessage((newMessage) => {
      setMessages(prev => [...prev, newMessage]);
    });
    
    return () => {
      unsubscribe();
      wsService.current.disconnect();
    };
  }, [chatId]);
  
  return (
    // UI del chat
  );
};
```


## Optimizaciones de Performance

### 1. Debouncing del Scroll Handler

```javascript
import { debounce } from 'lodash';

const handleScroll = useMemo(
  () => debounce(() => {
    if (!scrollAreaRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    const atBottom = scrollHeight - clientHeight <= scrollTop + 1;
    
    setIsAtBottom(atBottom);
  }, 100),
  []
);

useEffect(() => {
  return () => handleScroll.cancel();
}, [handleScroll]);
```


### 2. Memoización de Componentes de Mensaje

```javascript
const MessageBubble = React.memo(({ message, isOwn }) => {
  return (
    <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
      <div className="message-content">{message.content}</div>
      <div className="message-time">
        {formatTime(message.timestamp)}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Solo re-renderizar si el mensaje cambió
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.status === nextProps.message.status;
});
```


### 3. Lazy Loading de Imágenes en Mensajes

```javascript
const MessageImage = ({ src, alt }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = imgRef.current;
          if (img && img.dataset.src) {
            img.src = img.dataset.src;
            img.onload = () => setIsLoaded(true);
            observer.unobserve(img);
          }
        }
      },
      { rootMargin: '50px' }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div className="message-image-container">
      {!isLoaded && <div className="image-placeholder" />}
      <img
        ref={imgRef}
        data-src={src}
        alt={alt}
        className={`message-image ${isLoaded ? 'loaded' : ''}`}
      />
    </div>
  );
};
```


## Manejo de Estados de Mensaje

```javascript
const MessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

const StatusIndicator = ({ status }) => {
  const getIcon = () => {
    switch(status) {
      case MessageStatus.SENDING:
        return <ClockIcon className="status-icon pending" />;
      case MessageStatus.SENT:
        return <CheckIcon className="status-icon sent" />;
      case MessageStatus.DELIVERED:
        return <DoubleCheckIcon className="status-icon delivered" />;
      case MessageStatus.READ:
        return <DoubleCheckIcon className="status-icon read" />;
      case MessageStatus.FAILED:
        return <ErrorIcon className="status-icon failed" />;
      default:
        return null;
    }
  };
  
  return <span className="message-status">{getIcon()}</span>;
};
```


## Testing

### Test de Auto-Scroll

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatContainer } from './ChatContainer';

describe('ChatContainer Auto-Scroll', () => {
  it('should auto-scroll to bottom when new message arrives and user is at bottom', async () => {
    const { container } = render(<ChatContainer initialMessages={[]} />);
    const scrollArea = container.querySelector('.chat-scroll-area');
    
    // Simular que estamos en el bottom
    Object.defineProperty(scrollArea, 'scrollTop', { value: 1000 });
    Object.defineProperty(scrollArea, 'scrollHeight', { value: 1100 });
    Object.defineProperty(scrollArea, 'clientHeight', { value: 100 });
    
    // Disparar nuevo mensaje
    fireEvent(window, new CustomEvent('new-message', {
      detail: { id: '123', content: 'Nuevo mensaje' }
    }));
    
    await waitFor(() => {
      expect(scrollArea.scrollTop).toBe(scrollArea.scrollHeight - scrollArea.clientHeight);
    });
  });
  
  it('should NOT auto-scroll when user is reading old messages', async () => {
    const { container } = render(<ChatContainer initialMessages={[]} />);
    const scrollArea = container.querySelector('.chat-scroll-area');
    
    // Simular que NO estamos en el bottom
    Object.defineProperty(scrollArea, 'scrollTop', { value: 500 });
    Object.defineProperty(scrollArea, 'scrollHeight', { value: 1100 });
    Object.defineProperty(scrollArea, 'clientHeight', { value: 100 });
    
    const initialScrollTop = scrollArea.scrollTop;
    
    // Disparar nuevo mensaje
    fireEvent(window, new CustomEvent('new-message', {
      detail: { id: '124', content: 'Otro mensaje' }
    }));
    
    await waitFor(() => {
      expect(scrollArea.scrollTop).toBe(initialScrollTop);
    });
  });
});
```


## Tips y Best Practices

### 1. Manejo de Scroll Position al Cargar Mensajes Antiguos

```javascript
const preserveScrollPosition = async (loadFn) => {
  const scrollArea = scrollAreaRef.current;
  if (!scrollArea) return;
  
  // Guardar posición actual
  const previousScrollHeight = scrollArea.scrollHeight;
  const previousScrollTop = scrollArea.scrollTop;
  
  // Cargar datos
  await loadFn();
  
  // Restaurar posición relativa
  requestAnimationFrame(() => {
    const newScrollHeight = scrollArea.scrollHeight;
    const scrollDiff = newScrollHeight - previousScrollHeight;
    scrollArea.scrollTop = previousScrollTop + scrollDiff;
  });
};
```


### 2. Throttle de Indicadores de Escritura

```javascript
const useTypingIndicator = (chatId) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  
  const sendTypingIndicator = useMemo(
    () => throttle(() => {
      wsService.send({
        type: 'typing_start',
        chatId
      });
      
      // Auto-clear después de 3 segundos
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        wsService.send({
          type: 'typing_stop',
          chatId
        });
      }, 3000);
    }, 1000),
    [chatId]
  );
  
  return { sendTypingIndicator };
};
```


### 3. Optimización de Re-renders

```javascript
// Context para evitar prop drilling
const ChatContext = createContext();

export const ChatProvider = ({ children, chatId }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, message]);
  }, []);
  
  const value = useMemo(() => ({
    messages,
    isLoading,
    addMessage,
  }), [messages, isLoading, addMessage]);
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
```


### 4. Skeleton Loading para Mensajes

```javascript
const MessageSkeleton = () => (
  <div className="message-skeleton">
    <div className="skeleton-avatar" />
    <div className="skeleton-content">
      <div className="skeleton-line short" />
      <div className="skeleton-line long" />
      <div className="skeleton-line medium" />
    </div>
  </div>
);

const MessageList = ({ messages, isLoading }) => (
  <div className="message-list">
    {isLoading && (
      <>
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
      </>
    )}
    
    {messages.map(message => (
      <MessageBubble key={message.id} message={message} />
    ))}
  </div>
);
```


## Conclusión

La implementación correcta de paginación y chunking en una UI de chat requiere considerar múltiples aspectos: scroll inverso, carga progresiva, auto-scroll inteligente, agrupación por fecha, y optimizaciones de performance. Las técnicas presentadas en este documento están basadas en patrones de aplicaciones de mensajería líderes de la industria y proporcionan una base sólida para construir experiencias de chat robustas y escalables.[^3][^5][^1][^2][^7]

**Puntos clave a recordar:**

- Usar paginación inversa con orden DESC en backend y reversión en frontend
- Implementar auto-scroll contextual basado en la posición del usuario
- Mantener la posición del scroll al insertar mensajes antiguos
- Virtualizar para grandes volúmenes de mensajes
- Agrupar mensajes por fecha para mejor UX
- Optimizar re-renders con memoización
- Implementar WebSockets para actualizaciones en tiempo real

Esta documentación proporciona una guía completa para implementar un sistema de chat moderno y performante.[^9][^6][^8]
<span style="display:none">[^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44][^45][^46][^47][^48][^49][^50][^51][^52][^53][^54][^55][^56][^57][^58]</span>

<div align="center">⁂</div>

[^1]: https://tuffstuff9.hashnode.dev/intuitive-scrolling-for-chatbot-message-streaming

[^2]: https://stackoverflow.com/questions/44223931/how-to-implement-pagination-like-whatsapp-messenger-chat-page-reverse-scroll-t

[^3]: https://developer.vonage.com/en/blog/chat-pagination-with-infinite-scrolling-dr

[^4]: https://github.com/bigskysoftware/htmx/discussions/1494

[^5]: https://www.reddit.com/r/reactjs/comments/1ns3v2a/current_developer_choices_experiences/

[^6]: https://community.flutterflow.io/ask-the-community/post/chat-message-with-infinite-scroll-pagination-and-real-time-refresh-nHT7o0hz6dRhFif

[^7]: https://stackoverflow.com/questions/37620694/how-to-scroll-to-bottom-in-react

[^8]: https://github.com/MessageKit/MessageKit/issues/374

[^9]: https://stackoverflow.com/questions/72788476/arrange-chat-messages-by-date

[^10]: https://tanstack.com/virtual/v3/docs/framework/react/examples/window

[^11]: https://www.youtube.com/watch?v=er-hKSt1r7E

[^12]: https://stackoverflow.com/questions/46168245/recyclerview-reverse-order

[^13]: https://ieeexplore.ieee.org/document/10520387/

[^14]: https://aclanthology.org/2022.emnlp-main.449.pdf

[^15]: http://arxiv.org/pdf/2402.05930.pdf

[^16]: http://arxiv.org/pdf/2205.11029.pdf

[^17]: http://arxiv.org/pdf/2404.03648.pdf

[^18]: http://arxiv.org/pdf/2307.07924.pdf

[^19]: https://arxiv.org/html/2409.10741v1

[^20]: http://arxiv.org/pdf/2410.00006.pdf

[^21]: https://dl.acm.org/doi/pdf/10.1145/3637528.3671620

[^22]: https://www.youtube.com/watch?v=Rj98dfDn2t8

[^23]: https://www.reddit.com/r/ChatGPT/comments/1hdzosg/quick_rundown_on_the_projects_feature_in_short_it/

[^24]: https://www.scribd.com/document/498547534/Chat

[^25]: https://www.scribd.com/document/772547515/Hoja-de-Resumen-y-Empezar-a-Utilizar-Google-Chat

[^26]: https://uxdesign.cc/designing-a-chatbot-conversation-how-to-keep-users-in-the-loop-4d3a29e44de4

[^27]: https://www.reddit.com/r/androiddev/comments/15fd21z/pagination_for_messaging_app_using_pagin_3_library/

[^28]: https://www.semanticscholar.org/paper/28471feff6266a0dfa2e8684e3586bda9975a385

[^29]: https://www.semanticscholar.org/paper/84b4345f0926d318ce8ed41d667e516d1266954c

[^30]: https://www.semanticscholar.org/paper/e7997289a6efc29c5c5767eba8dc328952a18218

[^31]: http://arxiv.org/pdf/2501.04877.pdf

[^32]: https://arxiv.org/ftp/arxiv/papers/2106/2106.14704.pdf

[^33]: http://arxiv.org/pdf/2502.04983.pdf

[^34]: https://arxiv.org/pdf/2305.05662.pdf

[^35]: https://arxiv.org/pdf/2308.08239.pdf

[^36]: http://arxiv.org/pdf/2411.10659.pdf

[^37]: https://arxiv.org/pdf/2312.05516.pdf

[^38]: https://www.swiftwithvincent.com/blog/building-the-inverted-scroll-of-a-messaging-app

[^39]: https://github.com/chatscope/chat-ui-kit-react/issues/6

[^40]: https://www.ijfmr.com/research-paper.php?id=35065

[^41]: https://www.semanticscholar.org/paper/3cb8a4b232db8e36a57d9cf1867b6a485adacebe

[^42]: https://journals.sagepub.com/doi/10.1177/1090198121990389

[^43]: https://onlinelibrary.wiley.com/doi/10.1111/j.1471-1842.2012.00984.x

[^44]: https://ieeexplore.ieee.org/document/9990670/

[^45]: https://www.semanticscholar.org/paper/9c2c548dd4c15d6cdf2ac46cf303476d0ddd37cd

[^46]: https://link.springer.com/10.1007/s43441-023-00587-1

[^47]: https://iopscience.iop.org/article/10.1088/1742-6596/1845/1/012014

[^48]: https://www.semanticscholar.org/paper/02fb3eaa22d8fcc3203b3bb17229ba2684bfe3b4

[^49]: https://www.liebertpub.com/doi/10.1089/tmj.2018.0272

[^50]: https://aclanthology.org/2021.starsem-1.14.pdf

[^51]: https://linkinghub.elsevier.com/retrieve/pii/S2666920X23000024

[^52]: https://www.aclweb.org/anthology/P19-1374.pdf

[^53]: https://aclanthology.org/2023.emnlp-main.838.pdf

[^54]: https://aclanthology.org/2020.sigdial-1.8.pdf

[^55]: https://aclanthology.org/2021.acl-srw.14.pdf

[^56]: https://aclanthology.org/2022.findings-emnlp.247.pdf

[^57]: https://nitropack.io/blog/post/what-is-lazy-loading

[^58]: https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback

