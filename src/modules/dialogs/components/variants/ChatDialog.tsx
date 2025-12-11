"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { useUserDataStore } from "@/stores/userDataStore";
import Image from "next/image";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
} from "../DialogPrimitives";
import { ChatHeader } from "@/modules/chat/components/organisms";
import { VirtualizedMessageList } from "@/modules/chat/components/organisms/VirtualizedMessageList";
import { InputChat } from "@/modules/chat/components/organisms/InputChat";
import { MessageItem } from "@/modules/chat/components/molecules/MessageItem";
import { useVirtuosoMessages } from "@/modules/chat/hooks/useVirtuosoMessages";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useEncryption } from "@/hooks/useEncryption";
import type { Message, ChatUser } from "@/modules/chat/types";
import type { Task } from "@/types";
import type { PublicTask } from "@/modules/shareTask/schemas/validation.schemas";
import styles from "./ChatDialog.module.scss";

interface ChatDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
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
 * ChatDialog - Chat en formato dialog centrado
 *
 * Variant del chat para usar como dialog modal centrado.
 * Ideal para la vista pública del chat (publichat).
 *
 * Usa la infraestructura de dialogs del proyecto (ResponsiveDialog)
 * que automáticamente se convierte en drawer en móvil.
 *
 * @example
 * ```tsx
 * <ChatDialog
 *   isOpen={isOpen}
 *   onOpenChange={setIsOpen}
 *   task={task}
 *   users={users}
 *   isPublicView={true}
 *   guestName="Invitado"
 * />
 * ```
 */
export const ChatDialog: React.FC<ChatDialogProps> = memo(({
  isOpen,
  onOpenChange,
  task,
  users,
  usersMap: externalUsersMap,
  clientName = '',
  isPublicView = false,
  guestName = '',
  guestNameSet = true,
  onOpenManualTimeEntry,
}) => {
  // User data from store
  const userId = useUserDataStore((state) => state.userData?.userId || '');
  const userName = useUserDataStore((state) => state.userData?.fullName || 'Usuario');
  const isLoading = useUserDataStore((state) => state.isLoading);

  // Local states
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Encryption hook
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

  // Callback for new messages
  const handleNewMessage = useCallback(() => {
    // Mark messages as read automatically
  }, []);

  // Messages hook
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

  // Actions hook
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

  // Build users map if not provided
  const usersMap = useMemo(() => {
    if (externalUsersMap) return externalUsersMap;

    const map = new Map<string, ChatUser>();
    users.forEach(user => map.set(user.id, user));

    // Add guest user if in public view
    if (isPublicView && guestName) {
      map.set('guest', {
        id: 'guest',
        fullName: guestName,
        imageUrl: undefined,
      });
    }

    return map;
  }, [externalUsersMap, users, isPublicView, guestName]);

  // Handlers
  const handleSendMessage = useCallback(
    async (messageData: Partial<Message>) => {
      if (userId && !isLoading) {
        await sendMessage({
          ...messageData,
          senderId: userId,
          senderName: userName,
        });
      } else if (isPublicView) {
        if (!guestNameSet) return;
        await sendMessage({
          ...messageData,
          senderId: 'guest',
          senderName: guestName,
        });
      }
    },
    [sendMessage, userId, userName, isLoading, guestName, guestNameSet, isPublicView]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!userId || isLoading) return;
      if (confirm("¿Estás seguro de que quieres eliminar este mensaje?")) {
        await deleteMessage(messageId);
      }
    },
    [deleteMessage, userId, isLoading]
  );

  const handleCopyMessage = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  const handleDownloadFile = useCallback((message: Message) => {
    if (message.fileUrl) {
      window.open(message.fileUrl, '_blank');
    }
  }, []);

  const handleCloseImagePreview = useCallback(() => {
    setImagePreviewSrc(null);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Render message item callback
  const renderMessageItem = useCallback((
    message: Message,
    prevMessage: Message | null,
    nextMessage: Message | null
  ) => {
    const isOwn = message.senderId === (userId || 'guest');

    return (
      <MessageItem
        key={message.id}
        message={message}
        prevMessage={prevMessage}
        nextMessage={nextMessage}
        users={users}
        usersMap={usersMap}
        isOwn={isOwn}
        userId={userId || 'guest'}
        taskId={task.id}
        onImagePreview={setImagePreviewSrc}
        onRetryMessage={resendMessage}
        onCopy={handleCopyMessage}
        onDelete={handleDeleteMessage}
        onReply={setReplyingTo}
        onDownload={handleDownloadFile}
      />
    );
  }, [userId, users, usersMap, task.id, resendMessage, handleCopyMessage, handleDeleteMessage, handleDownloadFile]);

  // Computed values for public view
  const publicTaskData = isPublicView && 'commentsEnabled' in task
    ? { commentsEnabled: task.commentsEnabled, isActive: (task as PublicTask).isActive }
    : { commentsEnabled: true, isActive: true };

  // Determine if input should be disabled
  const isInputDisabled = isPublicView
    ? (userId && !isLoading ? false : (!publicTaskData.commentsEnabled || !publicTaskData.isActive))
    : false;

  if (!task) {
    return null;
  }

  return (
    <>
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent
          size="lg"
          className={styles.chatDialogContent}
          showCloseButton={true}
          closeOnOverlayClick={false}
        >
          {/* Header */}
          <ResponsiveDialogHeader className={styles.chatDialogHeader}>
            <ChatHeader
              task={task as Task}
              clientName={clientName}
              users={users}
              messages={messages}
              userId={userId || 'guest'}
              userName={userName || guestName || 'Invitado'}
              onOpenManualTimeEntry={onOpenManualTimeEntry || (() => {})}
              isPublicView={isPublicView}
            />
          </ResponsiveDialogHeader>

          {/* Body - Messages */}
          <ResponsiveDialogBody className={styles.chatDialogBody}>
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
          </ResponsiveDialogBody>

          {/* Footer - Input */}
          <div className={styles.chatDialogFooter}>
            {!isInputDisabled ? (
              <InputChat
                taskId={task.id}
                userId={userId || 'guest'}
                userName={userName || guestName || 'Invitado'}
                userFirstName={userName.split(' ')[0] || guestName}
                onSendMessage={handleSendMessage}
                replyingTo={replyingTo ? {
                  ...replyingTo,
                  text: replyingTo.text || null,
                } : null}
                onCancelReply={handleCancelReply}
                disabled={false}
              />
            ) : (
              <div className={styles.readOnlyMessage}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Esta tarea está en modo solo lectura. No puedes enviar mensajes.</span>
              </div>
            )}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Image Preview Overlay */}
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

ChatDialog.displayName = 'ChatDialog';

export default ChatDialog;
