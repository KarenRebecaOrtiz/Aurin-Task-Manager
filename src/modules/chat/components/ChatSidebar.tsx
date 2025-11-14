"use client";

import React, { useState, useRef, useCallback, memo, useMemo, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useSidebarStateStore } from "@/stores/sidebarStateStore";
import { useDataStore } from "@/stores/dataStore";
import { useShallow } from "zustand/react/shallow";
import styles from "../styles/ChatSidebar.module.scss";
import { ChatHeader, MessageList } from "./organisms";
import { InputChat } from "./organisms/InputChat"; // ✅ Usando InputChat MODULAR que replica el original
import { MessageItem } from "./molecules/MessageItem";
import { useEncryption } from "@/hooks/useEncryption"; // ✅ USAR HOOK ORIGINAL
import { useMessagePagination } from "@/hooks/useMessagePagination"; // ✅ USAR HOOK ORIGINAL
import { useMessageActions } from "@/hooks/useMessageActions"; // ✅ USAR HOOK ORIGINAL
import type { ChatSidebarProps } from "../types";

/**
 * ChatSidebar - Componente Principal Modularizado
 *
 * Sidebar de chat completamente modularizado con:
 * - Soporte multi-task (cambiar entre tareas sin perder estado)
 * - Paginación de mensajes
 * - Encriptación end-to-end
 * - ✅ InputChat MODULAR con Timer integrado
 * - Estilos SCSS modules (no Tailwind)
 */
const ChatSidebar: React.FC<ChatSidebarProps> = memo(({
  isOpen,
  onClose,
  users = [],
}) => {
  const { user } = useUser();
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Obtener tarea actual del store global
  const chatSidebar = useSidebarStateStore(useShallow(state => state.chatSidebar));
  const task = chatSidebar.task;
  const clientName = chatSidebar.clientName;
  
  // Obtener información del cliente desde dataStore
  const clients = useDataStore(useShallow(state => state.clients));
  const clientImageUrl = useMemo(() => {
    if (!task?.clientId) return undefined;
    const client = clients.find(c => c.id === task.clientId);
    return client?.imageUrl || '/empty-image.png';
  }, [task?.clientId, clients]);


  // Estados locales
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);

  // ✅ Hooks ORIGINALES que ya funcionan
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

  const handleNewMessage = useCallback(() => {
    // Callback para nuevos mensajes en tiempo real
  }, []);

  // ✅ Hook original de paginación (tiene todo: Firebase, cache, real-time, etc.)
  const {
    messages,
    groupedMessages,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
  } = useMessagePagination({
    taskId: task?.id || '',
    pageSize: 10,
    decryptMessage,
    onNewMessage: handleNewMessage,
  });

  // ✅ Hook original de acciones (tiene Optimistic UI, encriptación, etc.)
  const {
    sendMessage,
    editMessage,
    deleteMessage,
    resendMessage,
    sendTimeMessage,
  } = useMessageActions({
    task: task as any, // Cast temporal
    encryptMessage,
    addOptimisticMessage,
    updateOptimisticMessage,
  });

  // Estados de reply/edit locales
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Handlers
  const handleClose = useCallback(() => {
    setReplyingTo(null);
    setEditingMessageId(null);
    onClose();
  }, [onClose]);

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
            clientImageUrl={clientImageUrl}
            users={users}
            messages={messages}
          />
        </div>

        {/* Content (Messages) */}
        <div className={styles.content}>
          <MessageList
            groupedMessages={groupedMessages || []} // ✅ Pasar groupedMessages en lugar de messages
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
            onInitialLoad={() => {}} // El hook original ya carga automáticamente
            renderMessage={(message) => {
              const isOwn = message.senderId === user?.id;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  users={users}
                  isOwn={isOwn}
                  userId={user?.id || ''}
                  onImagePreview={(url) => setImagePreviewSrc(url)}
                  onRetryMessage={(msg) => resendMessage(msg)}
                  onCopy={async (text) => {
                    await navigator.clipboard.writeText(text);
                  }}
                  onEdit={(msg) => {
                    setEditingMessageId(msg.id);
                  }}
                  onDelete={(msgId) => deleteMessage(msgId)}
                  onReply={(msg) => setReplyingTo(msg)}
                  onDownload={(msg) => {
                    // Handle download action
                  }}
                />
              );
            }}
          />
        </div>

        {/* Input Area - ✅ InputChat MODULAR con Timer integrado */}
        <div className={styles.inputArea}>
          <InputChat
            taskId={task.id}
            userId={user?.id || ''}
            userFirstName={user?.firstName || user?.fullName}
            onSendMessage={sendMessage}
            onEditMessage={editMessage}
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
    </>
  );
});

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
