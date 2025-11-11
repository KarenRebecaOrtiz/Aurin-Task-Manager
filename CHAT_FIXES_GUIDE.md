# Guía de Correcciones - ChatSidebar Modularizado

## 🐛 Problemas Detectados y Soluciones

### **Problema 1: Mensajes No se Cargan (Hardcoded)**

**Causa**: El `MessageList` no está renderizando los `children` correctamente con los mensajes mapeados.

**Ubicación**: `src/modules/chat/components/organisms/MessageList.tsx` línea 135

**Problema actual**:
```tsx
{/* Messages in this group */}
{children}  // ❌ Esto renderiza TODOS los children, no los del grupo
```

**Solución**:
```tsx
{/* Messages in this group */}
{group.messages.map((message) => (
  <React.Fragment key={message.id}>
    {children}  {/* Pasar message como prop al children */}
  </React.Fragment>
))}
```

Pero mejor aún, modificar el componente `MessageList` para aceptar `renderMessage` como prop:

```tsx
interface MessageListProps {
  messages: Message[];
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onInitialLoad: () => void;
  renderMessage: (message: Message) => React.ReactNode;  // ✅ Nuevo prop
}

// Uso:
{group.messages.map((message) => renderMessage(message))}
```

### **Problema 2: ChatHeader No Muestra Datos Reales**

**Causa**: El `ChatHeader` recibe los datos pero no tiene el `AvatarGroup` correcto integrado.

**Solución**: El código ya está correcto (líneas 152-181 en `ChatHeader.tsx`), pero el `AvatarGroup` no existe como componente reutilizable. Usar `UserAvatar` como ya está implementado.

**Verificar en ChatSidebar.tsx**:
```tsx
<ChatHeader
  task={task}
  clientName={clientName}
  onBack={handleBack}
  onSummary={handleSummary}
  users={users}          // ✅ Asegurar que se pasan los usuarios
  messages={messages}    // ✅ Asegurar que se pasan los mensajes
/>
```

### **Problema 3: Container Vacío del TimerPanel Desplaza Contenido**

**Causa**: El `WizardStep` tiene `display` visible incluso cuando no está activo, desplazando el contenido.

**Ubicación**: Probablemente en `src/components/ui/InputChat.tsx` o `src/modules/chat/components/molecules/TimerPanel.tsx`

**Solución**: Agregar estilos condicionales al wizard:

```scss
// En el CSS del Wizard
.wizardStep {
  &:not(.active) {
    display: none;  // ✅ Ocultar steps inactivos completamente
  }

  &.active {
    display: block;
  }
}
```

O en el componente:
```tsx
<div
  className={`wizardStep ${currentStep === step ? 'active' : ''}`}
  style={{
    display: currentStep === step ? 'block' : 'none'  // ✅ Control explícito
  }}
>
```

---

## 🔧 Fixes Prioritarios

### Fix 1: Renderizar Mensajes Correctamente

**Archivo**: `src/modules/chat/components/ChatSidebar.tsx` (línea 146-172)

**Cambio Actual (Incorrecto)**:
```tsx
<MessageList
  messages={messages}
  isLoadingMore={isLoadingMore}
  hasMore={hasMoreMessages}
  onLoadMore={loadMoreMessages}
  onInitialLoad={initialLoad}
>
  {messages.map((message) => (  {/* ❌ Mapea TODOS los mensajes fuera de agrupación */}
    <MessageItem
      key={message.id}
      message={message}
      ...
    />
  ))}
</MessageList>
```

**Cambio Correcto**:
```tsx
<MessageList
  messages={messages}
  isLoadingMore={isLoadingMore}
  hasMore={hasMoreMessages}
  onLoadMore={loadMoreMessages}
  onInitialLoad={initialLoad}
  renderMessage={(message) => (  {/* ✅ Pasar función render */}
    <MessageItem
      key={message.id}
      message={message}
      currentUserId={user?.id || ''}
      users={users}
      onEdit={(msg) => {
        console.log('Edit message:', msg.id);
      }}
      onDelete={(msgId) => deleteMessage(msgId)}
      onReply={(msg) => setReplyingTo(msg)}
      onRetry={(msg) => retryMessage(msg)}
      onImageClick={(url) => setImagePreviewSrc(url)}
    />
  )}
/>
```

**Actualizar MessageList.tsx**:
```tsx
interface MessageListProps {
  messages: Message[];
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onInitialLoad: () => void;
  renderMessage: (message: Message) => React.ReactNode;  // ✅ Nuevo prop
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onInitialLoad,
  renderMessage,  // ✅ Recibir prop
}) => {
  // ... resto del código ...

  return (
    <div ref={listRef} className={styles.messageList}>
      {/* Load More Button */}
      {hasMore && (
        <button onClick={onLoadMore} disabled={isLoadingMore} className={styles.loadMoreButton}>
          {isLoadingMore ? 'Loading...' : 'Load more messages'}
        </button>
      )}

      {/* Grouped Messages */}
      {groupedMessages.map((group) => (
        <React.Fragment key={group.date}>
          {/* Date Separator */}
          <div className={styles.dateSeparator}>
            <span className={styles.dateLabel}>{group.date}</span>
          </div>

          {/* Messages in this group */}
          {group.messages.map((message) => renderMessage(message))}  {/* ✅ Renderizar mensajes del grupo */}
        </React.Fragment>
      ))}

      {/* Ref para auto-scroll */}
      <div ref={messagesEndRef} />
    </div>
  );
};
```

### Fix 2: Corregir Props de MessageItem

**Archivo**: `src/modules/chat/components/ChatSidebar.tsx` (línea 154-169)

**Problema**: MessageItem no tiene la prop `currentUserId`, tiene `isOwn`

**Solución**: Agregar prop `isOwn` antes de pasar a MessageItem:

```tsx
renderMessage={(message) => {
  const isOwn = message.senderId === user?.id;

  return (
    <MessageItem
      key={message.id}
      message={message}
      users={users}
      isOwn={isOwn}  {/* ✅ Calcular isOwn */}
      onImagePreview={(url) => setImagePreviewSrc(url)}
      onRetryMessage={(msg) => retryMessage(msg)}
      onCopy={async (text) => {
        await navigator.clipboard.writeText(text);
      }}
      onEdit={(msg) => {
        console.log('Edit message:', msg.id);
      }}
      onDelete={(msgId) => deleteMessage(msgId)}
      onReply={(msg) => setReplyingTo(msg)}
      onDownload={(msg) => {
        console.log('Download:', msg.fileName);
      }}
    />
  );
}}
```

### Fix 3: Props del InputChat Original

**Archivo**: `src/modules/chat/components/ChatSidebar.tsx` (línea 175-184)

**Problema**: InputChat original no recibe las props correctas

**Verificar props esperadas** en `src/components/ui/InputChat.tsx` y ajustar:

```tsx
<InputChat
  taskId={task.id}
  userId={user?.id}
  userFirstName={user?.firstName || 'Usuario'}
  onSendMessage={async (messageData) => {
    await sendMessage(messageData);
  }}
  isSending={false}  // TODO: Agregar estado isSending
  setIsSending={() => {}}  // TODO: Implementar

  // Timer props
  timerSeconds={0}  // TODO: Integrar timer
  isTimerRunning={false}
  onToggleTimer={() => {}}
  onFinalizeTimer={async () => {}}
  onResetTimer={async () => {}}
  onToggleTimerPanel={() => {}}
  isTimerPanelOpen={false}
  setIsTimerPanelOpen={() => {}}
  timerInput="00:00"
  setTimerInput={() => {}}
  dateInput={new Date()}
  setDateInput={() => {}}
  commentInput=""
  setCommentInput={() => {}}
  onAddTimeEntry={async () => {}}
  totalHours="0:00"

  // Reply/Edit props
  replyingTo={replyingTo}
  onCancelReply={() => setReplyingTo(null)}
  editingMessageId={null}  // TODO: Implementar
  editingText=""
  onEditMessage={async (id, text) => {}}
  onCancelEdit={() => {}}

  // Pagination props
  messages={messages}
  hasMore={hasMoreMessages}
  loadMoreMessages={loadMoreMessages}
  onNewMessage={handleNewMessage}

  // Users para menciones
  users={users.map(u => ({ id: u.id, fullName: u.fullName }))}
/>
```

---

## 📋 Checklist de Corrección

### Paso 1: MessageList renderMessage
- [ ] Agregar prop `renderMessage` a `MessageListProps`
- [ ] Cambiar `{children}` por `{group.messages.map((message) => renderMessage(message))}`
- [ ] Actualizar `ChatSidebar.tsx` para pasar `renderMessage`

### Paso 2: MessageItem isOwn
- [ ] Calcular `isOwn` en ChatSidebar antes de pasar a MessageItem
- [ ] Verificar que todas las props de MessageItem se pasen correctamente

### Paso 3: InputChat Props
- [ ] Revisar props esperadas en InputChat original
- [ ] Agregar todos los props faltantes (timer, reply, edit, etc.)
- [ ] Implementar handlers temporales para props faltantes

### Paso 4: TimerPanel Wizard
- [ ] Revisar estilos del Wizard
- [ ] Agregar `display: none` a steps inactivos
- [ ] Verificar que el container vacío no desplace contenido

### Paso 5: Fetching de Datos Real
- [ ] Verificar que `useMessagePagination` se llame con `initialLoad()` al montar
- [ ] Verificar que `task?.id` no sea undefined
- [ ] Agregar console.logs para debug:
  ```tsx
  console.log('[ChatSidebar] taskId:', task?.id);
  console.log('[ChatSidebar] messages:', messages.length);
  console.log('[ChatSidebar] isLoadingMore:', isLoadingMore);
  ```

---

## 🚨 Errores Comunes a Evitar

1. **No renderizar children con datos**: Pasar `children` sin mapear los mensajes del grupo
2. **Props mismatch**: MessageItem espera `isOwn`, no `currentUserId`
3. **InputChat incompleto**: Faltan muchos props requeridos por el InputChat original
4. **TimerPanel vacío**: Wizard steps no ocultos correctamente desplazan contenido
5. **initialLoad no se llama**: MessageList debe llamar `onInitialLoad()` en `useEffect`

---

## 🎯 Prioridad de Fixes

1. **CRÍTICO**: Fix 1 - Renderizar mensajes correctamente (sin esto no hay chat funcional)
2. **ALTO**: Fix 2 - Props de MessageItem (evita crashes)
3. **ALTO**: Fix 5 - Fetching real de datos (mensajes hardcoded)
4. **MEDIO**: Fix 3 - Props completos de InputChat
5. **BAJO**: Fix 4 - TimerPanel wizard (UI bug menor)

---

## 📞 Siguiente Paso

Una vez aplicados estos fixes, probar:

1. Abrir el ChatSidebar
2. Verificar que se cargan mensajes reales de Firestore
3. Verificar que el ChatHeader muestra team y horas correctas
4. Verificar que el TimerPanel no desplaza el contenido
5. Enviar un mensaje de prueba

Si después de estos fixes sigue habiendo problemas, revisar:
- Console de browser para errores de Firebase
- Network tab para ver si las queries a Firestore se ejecutan
- React DevTools para ver el estado del chatStore
