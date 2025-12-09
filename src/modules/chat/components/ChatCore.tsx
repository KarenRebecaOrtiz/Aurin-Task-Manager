"use client";

import React, { useState, useCallback, memo } from "react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import styles from "../styles/ChatSidebar.module.scss";
import { ChatHeader } from "./organisms";
import { VirtualizedMessageList } from "./organisms/VirtualizedMessageList";
import { InputChat } from "./organisms/InputChat";
import { MessageItem } from "./molecules/MessageItem";
import { useVirtuosoMessages } from "../hooks/useVirtuosoMessages";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useEncryption } from "@/hooks/useEncryption";
import type { Message, ChatUser } from "../types";
import type { Task } from "@/types";
import type { PublicTask } from "@/modules/shareTask/schemas/validation.schemas";

interface ChatCoreProps {
  task: Task | PublicTask;
  users: ChatUser[];
  usersMap?: Map<string, ChatUser>;
  clientName?: string;
  isPublicView?: boolean;
  guestName?: string;
  guestNameSet?: boolean;
  onOpenManualTimeEntry?: () => void;
}

/**
 * ChatCore - Componente central reutilizable del chat
 * 
 * Este componente contiene TODA la lógica y UI del chat.
 * Se reutiliza en:
 * - ChatSidebar (privado, sidebar desktop)
 * - PublicChatView (público, dialog centrado)
 * 
 * Ambos solo difieren en el WRAPPER (sidebar vs dialog).
 */
export const ChatCore: React.FC<ChatCoreProps> = memo(({
  task,
  users,
  usersMap,
  clientName = '',
  isPublicView = false,
  guestName = '',
  guestNameSet = true,
  onOpenManualTimeEntry,
}) => {
  const { user, isLoaded: isUserLoaded } = useUser();

  // Estados locales
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // ✅ Hook de encriptación
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

  // ✅ Callback para nuevos mensajes
  const handleNewMessage = useCallback(() => {
    // Marcar mensajes como leídos automáticamente
  }, []);

  // ✅ Hook de mensajes
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

  // ✅ Hook de acciones
  const {
    sendMessage,
    deleteMessage,
    resendMessage,
  } = useMessageActions({
    task: task as Task,
    encryptMessage,
    addOptimisticMessage: () => {},
    updateOptimisticMessage: () => {},
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSendMessage = useCallback(
    async (messageData: Partial<Message>) => {
      // Si hay usuario autenticado, enviar con su info
      if (user && isUserLoaded) {
        await sendMessage({
          ...messageData,
          senderId: user.id,
          senderName: user.fullName || user.firstName || 'Usuario',
        });
      } else if (isPublicView) {
        // Si es invitado en vista pública
        if (!guestNameSet) return;
        await sendMessage({
          ...messageData,
          senderId: 'guest',
          senderName: guestName,
        });
      }
    },
    [sendMessage, user, isUserLoaded, guestName, guestNameSet, isPublicView]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      // Solo usuarios autenticados pueden eliminar
      if (!user || !isUserLoaded) return;
      if (confirm("¿Estás seguro de que quieres eliminar este mensaje?")) {
        await deleteMessage(messageId);
      }
    },
    [deleteMessage, user, isUserLoaded]
  );

  const handleCopyMessage = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  const handleDownloadFile = useCallback((message: Message) => {
    if (message.fileUrl) {
      window.open(message.fileUrl, '_blank');
    }
  }, []);

  // Callback para cerrar preview
  const handleCloseImagePreview = useCallback(() => {
    setImagePreviewSrc(null);
  }, []);

  // Callback para cancelar reply
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Callback para renderizar mensaje
  const renderMessageItem = useCallback((
    message: Message,
    prevMessage: Message | null,
    nextMessage: Message | null
  ) => {
    const isOwn = message.senderId === (user?.id || 'guest');

    return (
      <MessageItem
        key={message.id}
        message={message}
        prevMessage={prevMessage}
        nextMessage={nextMessage}
        users={users}
        usersMap={usersMap}
        isOwn={isOwn}
        userId={user?.id || 'guest'}
        taskId={task.id}
        onImagePreview={setImagePreviewSrc}
        onRetryMessage={resendMessage}
        onCopy={handleCopyMessage}
        onDelete={handleDeleteMessage}
        onReply={setReplyingTo}
        onDownload={handleDownloadFile}
      />
    );
  }, [user, users, usersMap, task.id, resendMessage, handleCopyMessage, handleDeleteMessage, handleDownloadFile]);

  // Computed values
  const publicTaskData = isPublicView && 'commentsEnabled' in task
    ? { commentsEnabled: task.commentsEnabled, isActive: task.isActive }
    : { commentsEnabled: true, isActive: true };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!task) {
    return null;
  }

  return (
    <>
      {/* Header */}
      <div className={styles.header}>
        <ChatHeader
          task={task as Task}
          clientName={clientName}
          users={users}
          messages={messages}
          userId={user?.id || 'guest'}
          userName={user?.fullName || guestName || 'Invitado'}
          onOpenManualTimeEntry={onOpenManualTimeEntry || (() => {})}
          isPublicView={isPublicView}
        />
      </div>

      {/* Content (Messages) */}
      <div className={styles.content}>
        <VirtualizedMessageList
          messages={messages}
          groupCounts={groupCounts}
          groupDates={groupDates}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreMessages}
          onInitialLoad={initialLoad}
          renderMessage={renderMessageItem}
        />
      </div>

      {/* Footer (Input) */}
      <div className={styles.footer}>
        <InputChat
          taskId={task.id}
          userId={user?.id || 'guest'}
          userName={user?.fullName || guestName || 'Invitado'}
          userFirstName={user?.firstName || guestName}
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo ? {
            ...replyingTo,
            text: replyingTo.text || null,
          } : null}
          onCancelReply={handleCancelReply}
          disabled={
            isPublicView
              ? (user && isUserLoaded ? false : (!publicTaskData.commentsEnabled || !publicTaskData.isActive))
              : false
          }
        />
      </div>

      {/* Image Preview */}
      {imagePreviewSrc && (
        <div
          className={styles.imagePreviewOverlay}
          onClick={handleCloseImagePreview}
        >
          <Image
            src={imagePreviewSrc}
            alt="Preview"
            className={styles.imagePreview}
            width={800}
            height={600}
            unoptimized
          />
        </div>
      )}
    </>
  );
});

ChatCore.displayName = 'ChatCore';
