"use client";

import React, { useState, useRef, useCallback, memo, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useSidebarStateStore } from "@/stores/sidebarStateStore";
import { useDataStore } from "@/stores/dataStore";
import { useShallow } from "zustand/react/shallow";
import styles from "../styles/ChatSidebar.module.scss";
import { ChatHeader } from "./organisms";
import { VirtualizedMessageList } from "./organisms/VirtualizedMessageList";
import { InputChat } from "./organisms/InputChat"; // ✅ Usando InputChat MODULAR que replica el original
import { MessageItem } from "./molecules/MessageItem";
import { useEncryption } from "@/hooks/useEncryption"; // ✅ USAR HOOK ORIGINAL
import { useVirtuosoMessages } from "../hooks/useVirtuosoMessages"; // ✅ NUEVO HOOK con virtuoso
import { useMessageActions } from "@/hooks/useMessageActions"; // ✅ USAR HOOK ORIGINAL
import { ManualTimeDialog } from "@/modules/dialogs";
import { toast } from "@/components/ui/use-toast";
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
  const clientData = useMemo(() => {
    if (!task?.clientId) return null;
    const client = clients.find(c => c.id === task.clientId);
    return client ? {
      id: client.id,
      name: client.name,
      imageUrl: client.imageUrl || '/empty-image.png'
    } : null;
  }, [task?.clientId, clients]);


  // Estados locales
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [isManualTimeModalOpen, setIsManualTimeModalOpen] = useState(false);

  // Manual time entry handlers
  const handleOpenManualTimeEntry = useCallback(() => {
    setIsManualTimeModalOpen(true);
  }, []);

  // ✅ Hooks ORIGINALES que ya funcionan
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

  const handleNewMessage = useCallback(() => {
    // Callback para nuevos mensajes en tiempo real
  }, []);

  // ✅ Hook nuevo con virtuoso (infinite scroll + ordenamiento correcto)
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

  // ✅ Hook original de acciones (sin optimistic UI, usa real-time listener)
  const {
    sendMessage,
    editMessage,
    deleteMessage,
    resendMessage,
    sendTimeMessage,
  } = useMessageActions({
    task: task as any, // Cast temporal
    encryptMessage,
    addOptimisticMessage: () => {}, // No usado - real-time listener maneja nuevos mensajes
    updateOptimisticMessage: () => {},
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
      {/* Overlay - Debe estar detrás del sidebar */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={handleClose}
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

        {/* Content (Messages) - ✅ Lista virtualizada con infinite scroll */}
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
                  onDelete={(msgId) => {
                    if (confirm("¿Estás seguro de que quieres eliminar este mensaje?")) {
                      deleteMessage(msgId);
                    }
                  }}
                  onReply={(msg) => setReplyingTo(msg)}
                  onDownload={(msg) => {
                    if (msg.fileUrl) {
                      window.open(msg.fileUrl, '_blank');
                    }
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
            userName={user?.fullName || 'Usuario'}
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
            onOpenManualEntry={handleOpenManualTimeEntry}
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

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
