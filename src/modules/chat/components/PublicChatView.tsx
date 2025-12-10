"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useUserDataStore } from "@/stores/userDataStore";
import styles from "../styles/ChatSidebar.module.scss";
import { ChatHeader } from "./organisms";
import { VirtualizedMessageList } from "./organisms/VirtualizedMessageList";
import { InputChat } from "./organisms/InputChat";
import { MessageItem } from "./molecules/MessageItem";
import { useEncryption } from "@/hooks/useEncryption";
import { useVirtuosoMessages } from "../hooks/useVirtuosoMessages";
import { useMessageActions } from "@/hooks/useMessageActions";
import type { PublicTask } from "@/modules/shareTask/schemas/validation.schemas";
import type { ChatUser } from "../types";
import { GuestAuthDialog } from "@/modules/dialogs/components/variants/GuestAuthDialog";

interface GuestSession {
  guestName: string;
  avatar: string;
  taskId: string;
}

interface PublicChatViewProps {
  task: PublicTask;
  token: string;
  initialTokenStatus?: 'pending' | 'redeemed';
  initialGuestSession?: GuestSession | null;
}

export const PublicChatView: React.FC<PublicChatViewProps> = ({
  task,
  token,
  initialTokenStatus,
  initialGuestSession,
}) => {
  // ✅ Obtener datos del usuario desde userDataStore
  const userId = useUserDataStore((state) => state.userData?.userId || '');
  const userName = useUserDataStore((state) => state.userData?.fullName || '');
  const isLoading = useUserDataStore((state) => state.isLoading);

  const [isMounted, setIsMounted] = useState(false);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(initialGuestSession || null);
  const [isGuestAuthOpen, setIsGuestAuthOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    // ✅ Verificar si no hay usuario autenticado
    if (!isLoading && !userId) {
      if (initialTokenStatus === 'pending' && !guestSession) {
        setIsGuestAuthOpen(true);
      } else if (initialTokenStatus === 'redeemed' && !guestSession) {
        setAuthError('Este enlace de invitación ya ha sido utilizado.');
      }
    }
  }, [isLoading, userId, initialTokenStatus, guestSession]);

  const handleGuestAuthSuccess = (session: GuestSession) => {
    setGuestSession(session);
    // The session is now managed by the cookie, no need for sessionStorage
    setIsGuestAuthOpen(false);
  };

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

  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

  const handleNewMessage = useCallback(() => {},
  []);

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

  const [replyingTo, setReplyingTo] = useState<any | null>(null);

  if (authError) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'red' }}>Acceso Denegado</h2>
        <p>{authError}</p>
      </div>
    );
  }

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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <div className={styles.container} style={{ position: 'relative', height: '80vh' }}>
        <div className={styles.header}>
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
              const isOwn = message.senderId === (userId || 'guest');
              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  users={users}
                  usersMap={usersMap}
                  isOwn={isOwn}
                  userId={userId || 'guest'}
                  taskId={task.id}
                  onImagePreview={(url) => setImagePreviewSrc(url)}
                  onRetryMessage={(msg) => resendMessage(msg)}
                  onCopy={async (text) => await navigator.clipboard.writeText(text)}
                  onDelete={(msgId) => {
                    if (confirm("¿Eliminar mensaje?")) {
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

        <div className={styles.inputArea}>
          {/* ✅ Control de interacción: usuarios autenticados siempre pueden escribir, invitados solo si commentsEnabled */}
          {(userId || (guestSession && task.commentsEnabled)) ? (
            <InputChat
              taskId={task.id}
              userId={userId || 'guest'}
              userName={userName || guestSession?.guestName || 'Invitado'}
              userFirstName={userName.split(' ')[0] || guestSession?.guestName}
              onSendMessage={sendMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              disabled={false}
            />
          ) : (
            // ✅ Mostrar mensaje read-only SOLO para invitados cuando commentsEnabled está desactivado
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
    </div>
  );
};

export default PublicChatView;

