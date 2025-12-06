"use client";

import React, { useState, useRef, useCallback, memo, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useSidebarStateStore } from "@/stores/sidebarStateStore";
import { useDataStore } from "@/stores/dataStore";
import { useShallow } from "zustand/react/shallow";
import styles from "../styles/ChatSidebar.module.scss";
import { ChatHeader } from "./organisms";
import { VirtualizedMessageList } from "./organisms/VirtualizedMessageList";
import { InputChat } from "./organisms/InputChat";
import { MessageItem } from "./molecules/MessageItem";
import { useEncryption } from "@/hooks/useEncryption";
import { useVirtuosoMessages } from "../hooks/useVirtuosoMessages";
import { useMessageActions } from "@/hooks/useMessageActions";
import { ManualTimeDialog } from "@/modules/dialogs";
import { toast } from "@/components/ui/use-toast";
import type { ChatSidebarProps } from "../types";

/**
 * ChatSidebarVirtualized - Versión optimizada con react-virtuoso
 *
 * Mejoras sobre ChatSidebar original:
 * - ✅ Virtualización: Solo renderiza mensajes visibles (mejor performance)
 * - ✅ Infinite scroll nativo: Paginación automática sin bugs de scroll
 * - ✅ Ordenamiento simple: ASC (antiguos → nuevos), sin column-reverse
 * - ✅ Sin cálculos manuales de scroll: Virtuoso maneja todo
 * - ✅ Scroll to bottom automático: Para nuevos mensajes
 */
const ChatSidebarVirtualized: React.FC<ChatSidebarProps> = memo(({
  isOpen,
  onClose,
  users = [],
}) => {
  const { user } = useUser();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Obtener taskId del store global
  const chatSidebar = useSidebarStateStore(useShallow(state => state.chatSidebar));
  const taskId = chatSidebar.taskId;
  const clientName = chatSidebar.clientName;

  // Obtener la tarea actualizada desde dataStore (para tener timeTracking actualizado)
  const tasks = useDataStore(useShallow(state => state.tasks));
  const task = useMemo(() => {
    if (!taskId) return chatSidebar.task; // Fallback to sidebar task if no taskId
    return tasks.find(t => t.id === taskId) || chatSidebar.task;
  }, [taskId, tasks, chatSidebar.task]);

  // Obtener información del cliente desde dataStore
  const clients = useDataStore(useShallow(state => state.clients));
  const clientImageUrl = useMemo(() => {
    if (!task?.clientId) return undefined;
    const client = clients.find(c => c.id === task.clientId);
    return client?.imageUrl || '/empty-image.png';
  }, [task?.clientId, clients]);

  // Estados locales
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isManualTimeModalOpen, setIsManualTimeModalOpen] = useState(false);

  // Manual time entry handlers
  const handleOpenManualTimeEntry = useCallback(() => {
    setIsManualTimeModalOpen(true);
  }, []);

  // ✅ Hook de encriptación
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

  // ✅ Callback para nuevos mensajes
  const handleNewMessage = useCallback(() => {
    // Aquí puedes agregar lógica adicional cuando llegue un mensaje nuevo
    // Por ejemplo: reproducir sonido, mostrar notificación, etc.
  }, []);

  // ✅ NUEVO HOOK: useVirtuosoMessages (simplificado, sin optimistic UI)
  const {
    messages,
    groupCounts,
    groupDates,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    initialLoad,
  } = useVirtuosoMessages({
    taskId: task?.id || '',
    pageSize: 50,
    decryptMessage,
    onNewMessage: handleNewMessage,
  });

  // ✅ Hook de acciones (para enviar, editar, eliminar)
  // NOTA: Este hook usa Optimistic UI, pero no está integrado con useVirtuosoMessages
  // Los mensajes nuevos aparecerán cuando Firebase los devuelva via real-time listener
  const {
    sendMessage,
    editMessage,
    deleteMessage,
    resendMessage,
  } = useMessageActions({
    task: task as any,
    encryptMessage,
    // No pasamos addOptimisticMessage/updateOptimisticMessage
    // El real-time listener de useVirtuosoMessages manejará los nuevos mensajes
    addOptimisticMessage: () => {},
    updateOptimisticMessage: () => {},
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleClose = useCallback(() => {
    setReplyingTo(null);
    setEditingMessageId(null);
    onClose();
  }, [onClose]);

  const handleSendMessage = useCallback(
    async (messageData: any) => {
      await sendMessage(messageData);
      // El real-time listener agregará el mensaje automáticamente
    },
    [sendMessage]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newData: any) => {
      await editMessage(messageId, newData);
      setEditingMessageId(null);
      setEditingText('');
    },
    [editMessage]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (confirm("¿Estás seguro de que quieres eliminar este mensaje?")) {
        await deleteMessage(messageId);
      }
    },
    [deleteMessage]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  // No renderizar si no hay tarea
  if (!task) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={handleClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 100000,
          }}
        />
      )}

      {/* Sidebar Container */}
      <div
        ref={sidebarRef}
        className={`${styles.container} ${isOpen ? styles.open : ''}`}
      >
        {/* Header */}
        <div className={styles.header}>
          <ChatHeader
            task={task}
            clientName={clientName}
            users={users}
            messages={messages}
            userId={user?.id || ''}
            userName={user?.fullName || 'Usuario'}
            onOpenManualTimeEntry={handleOpenManualTimeEntry}
          />
        </div>

        {/* Content (Messages) - ✅ NUEVO: VirtualizedMessageList */}
        <div className={styles.content}>
          <VirtualizedMessageList
            messages={messages}
            groupCounts={groupCounts}
            groupDates={groupDates}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
            onInitialLoad={initialLoad}
            renderMessage={(message) => {
              const isOwn = message.senderId === user?.id;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  users={users}
                  isOwn={isOwn}
                  userId={user?.id || ''}
                  taskId={task?.id || ''}
                  onImagePreview={(url) => setImagePreviewSrc(url)}
                  onRetryMessage={(msg) => resendMessage(msg)}
                  onCopy={async (text) => {
                    await navigator.clipboard.writeText(text);
                  }}
                  onEdit={(msg) => {
                    setEditingMessageId(msg.id);
                    setEditingText(msg.text || '');
                  }}
                  onDelete={(msgId) => handleDeleteMessage(msgId)}
                  onReply={(msg) => setReplyingTo(msg)}
                  onDownload={(msg) => {
                    // Handle download action
                    if (msg.fileUrl) {
                      window.open(msg.fileUrl, '_blank');
                    }
                  }}
                />
              );
            }}
          />
        </div>

        {/* Input Area - ✅ InputChat con Timer integrado */}
        <div className={styles.inputArea}>
          <InputChat
            taskId={task.id}
            userId={user?.id || ''}
            userName={user?.fullName || 'Usuario'}
            userFirstName={user?.firstName || user?.fullName}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessageId={editingMessageId}
            editingText={editingText}
            onCancelEdit={() => {
              setEditingMessageId(null);
              setEditingText('');
            }}
          />
        </div>
      </div>

      {/* Image Preview Overlay */}
      {imagePreviewSrc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 100002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setImagePreviewSrc(null)}
        >
          <img
            src={imagePreviewSrc}
            alt="Preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
            }}
          />
        </div>
      )}

      {/* Manual Time Entry Dialog */}
      <ManualTimeDialog
        open={isManualTimeModalOpen}
        onOpenChange={setIsManualTimeModalOpen}
        taskId={task.id}
        taskName={task.name}
        taskDescription={task.description}
        userId={user?.id || ''}
        userName={user?.fullName || 'Usuario'}
      />
    </>
  );
});

ChatSidebarVirtualized.displayName = 'ChatSidebarVirtualized';

export default ChatSidebarVirtualized;
