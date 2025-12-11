'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useUserDataStore } from '@/stores/userDataStore';
import Image from 'next/image';
import { PublicTask } from '@/modules/shareTask/schemas/validation.schemas';
import { ChatHeader } from '@/modules/chat/components/organisms';
import { VirtualizedMessageList } from '@/modules/chat/components/organisms/VirtualizedMessageList';
import { InputChat } from '@/modules/chat/components/organisms/InputChat';
import { MessageItem } from '@/modules/chat/components/molecules/MessageItem';
import { useVirtuosoMessages } from '@/modules/chat/hooks/useVirtuosoMessages';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useEncryption } from '@/hooks/useEncryption';
import { GuestAuthDialog } from '@/modules/dialogs/components/variants/GuestAuthDialog';
import type { Message, ChatUser } from '@/modules/chat/types';
import styles from './PublicTaskView.module.scss';

interface GuestSession {
  guestName: string;
  avatar: string;
  taskId: string;
}

interface PublicTaskViewProps {
  task: PublicTask;
  token: string;
  tokenStatus?: 'pending' | 'redeemed';
  guestSession?: GuestSession | null;
}

/**
 * PublicTaskView - Vista pública de tarea compartida
 *
 * Renderiza el chat en formato dialog centrado para vistas públicas.
 * Usa la misma estructura visual que ChatDialog pero como vista principal
 * (no como modal overlay).
 */
export function PublicTaskView({ task, token, tokenStatus, guestSession: initialGuestSession }: PublicTaskViewProps) {
  // User data from store
  const userId = useUserDataStore((state) => state.userData?.userId || '');
  const userName = useUserDataStore((state) => state.userData?.fullName || '');
  const isLoading = useUserDataStore((state) => state.isLoading);

  // Local states
  const [isMounted, setIsMounted] = useState(false);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(initialGuestSession || null);
  const [isGuestAuthOpen, setIsGuestAuthOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Mount effect and guest auth check
  useEffect(() => {
    setIsMounted(true);
    if (!isLoading && !userId) {
      if (tokenStatus === 'pending' && !guestSession) {
        setIsGuestAuthOpen(true);
      } else if (tokenStatus === 'redeemed' && !guestSession) {
        setAuthError('Este enlace de invitación ya ha sido utilizado.');
      }
    }
  }, [isLoading, userId, tokenStatus, guestSession]);

  // Handle guest auth success
  const handleGuestAuthSuccess = useCallback((session: GuestSession) => {
    setGuestSession(session);
    setIsGuestAuthOpen(false);
  }, []);

  // Build users list and map
  const users = useMemo<ChatUser[]>(() => {
    if (!task.participants) return [];
    return task.participants.map(p => ({
      id: p.id,
      fullName: p.name,
      imageUrl: p.avatar,
    }));
  }, [task.participants]);

  const usersMap = useMemo(() => {
    const map = new Map<string, ChatUser>();
    users.forEach(user => map.set(user.id, user));
    if (guestSession) {
      map.set('guest', {
        id: 'guest',
        fullName: guestSession.guestName,
        imageUrl: guestSession.avatar,
      });
    }
    return map;
  }, [users, guestSession]);

  // Encryption hook
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

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
    onNewMessage: useCallback(() => {}, []),
  });

  // Actions hook
  const {
    sendMessage,
    deleteMessage,
    resendMessage,
  } = useMessageActions({
    task: task as any,
    encryptMessage,
    addOptimisticMessage: () => {},
    updateOptimisticMessage: () => {},
  });

  // Handlers
  const handleSendMessage = useCallback(
    async (messageData: Partial<Message>) => {
      if (userId && !isLoading) {
        await sendMessage({
          ...messageData,
          senderId: userId,
          senderName: userName,
        });
      } else if (guestSession) {
        await sendMessage({
          ...messageData,
          senderId: 'guest',
          senderName: guestSession.guestName,
        });
      }
    },
    [sendMessage, userId, userName, isLoading, guestSession]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!userId || isLoading) return;
      if (confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
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

  // Render message item
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

  // Check if input should be disabled (guest without comments enabled)
  const canInteract = userId || (guestSession && task.commentsEnabled);

  // Auth error state
  if (authError) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.errorContainer}>
          <h2 className={styles.errorTitle}>Acceso Denegado</h2>
          <p className={styles.errorText}>{authError}</p>
        </div>
      </div>
    );
  }

  // Loading or waiting for auth
  if (!isMounted || (!isLoading && !userId && !guestSession)) {
    return (
      <GuestAuthDialog
        isOpen={isGuestAuthOpen}
        onOpenChange={setIsGuestAuthOpen}
        token={token}
        onSuccess={handleGuestAuthSuccess}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.chatContainer}>
        {/* Header */}
        <div className={styles.chatHeader}>
          <ChatHeader
            task={task as any}
            clientName={task.project || ''}
            users={users}
            messages={messages}
            userId={userId || 'guest'}
            userName={userName || guestSession?.guestName || 'Invitado'}
            onOpenManualTimeEntry={() => {}}
            isPublicView={true}
          />
        </div>

        {/* Messages */}
        <div className={styles.chatBody}>
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

        {/* Input */}
        <div className={styles.chatFooter}>
          {canInteract ? (
            <InputChat
              taskId={task.id}
              userId={userId || 'guest'}
              userName={userName || guestSession?.guestName || 'Invitado'}
              userFirstName={userName.split(' ')[0] || guestSession?.guestName}
              onSendMessage={handleSendMessage}
              replyingTo={replyingTo ? {
                ...replyingTo,
                text: replyingTo.text || null,
              } : null}
              onCancelReply={() => setReplyingTo(null)}
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
      </div>

      {/* Image Preview Overlay */}
      {imagePreviewSrc && (
        <div
          className={styles.imagePreviewOverlay}
          onClick={() => setImagePreviewSrc(null)}
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
    </div>
  );
}
