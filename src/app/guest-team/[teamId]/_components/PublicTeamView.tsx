'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useUserDataStore } from '@/stores/userDataStore';
import Image from 'next/image';
import { PublicTeam } from '@/modules/shareTask/schemas/validation.schemas';
import { VirtualizedMessageList } from '@/modules/chat/components/organisms/VirtualizedMessageList';
import { InputChat } from '@/modules/chat/components/organisms/InputChat';
import { MessageItem } from '@/modules/chat/components/molecules/MessageItem';
import { useTeamMessages } from '@/modules/teams/hooks/useTeamMessages';
import { publicChatService } from '@/modules/chat/services/publicChatService';
import { GuestAuthDialog } from '@/modules/dialogs/components/variants/GuestAuthDialog';
import type { Message, ChatUser } from '@/modules/chat/types';
import styles from './PublicTeamView.module.scss';

interface GuestSession {
  guestName: string;
  avatar: string;
  teamId: string;
}

interface PublicTeamViewProps {
  team: PublicTeam;
  token: string;
  tokenStatus?: 'pending' | 'redeemed';
  guestSession?: GuestSession | null;
}

/**
 * PublicTeamView - Vista pública de equipo compartido
 *
 * Renderiza el chat del equipo en formato dialog centrado para vistas públicas.
 */
export function PublicTeamView({ team, token, tokenStatus, guestSession: initialGuestSession }: PublicTeamViewProps) {
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

  // Build users list and map from team members
  const users = useMemo<ChatUser[]>(() => {
    if (!team.members) return [];
    return team.members.map(m => ({
      id: m.id,
      fullName: m.name,
      imageUrl: m.avatar,
    }));
  }, [team.members]);

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

  // Messages hook for teams
  const {
    messages,
    groupCounts,
    groupDates,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    initialLoad,
  } = useTeamMessages({
    teamId: team?.id || '',
    pageSize: 50,
  });

  // Handler for sending messages
  const handleSendMessage = useCallback(
    async (messageData: Partial<Message>) => {
      if (!team?.id) return;

      if (userId && !isLoading) {
        // Authenticated user - use regular team message service
        // This would need the team message service but for now we use publicChatService
        // adjusted for teams
        await publicChatService.sendGuestMessage(
          team.id,
          userName,
          messageData.text || ''
        );
      } else if (guestSession) {
        // Guest user
        await publicChatService.sendGuestMessage(
          team.id,
          guestSession.guestName,
          messageData.text || ''
        );
      }
    },
    [team?.id, userId, userName, isLoading, guestSession]
  );

  // Handlers
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!userId || isLoading) return;
      // Team message deletion would be handled here
      console.log('Delete message:', messageId);
    },
    [userId, isLoading]
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
        taskId={team.id}
        onImagePreview={setImagePreviewSrc}
        onRetryMessage={() => {}}
        onCopy={handleCopyMessage}
        onDelete={handleDeleteMessage}
        onReply={setReplyingTo}
        onDownload={handleDownloadFile}
      />
    );
  }, [userId, users, usersMap, team.id, handleCopyMessage, handleDeleteMessage, handleDownloadFile]);

  // Check if input should be disabled (guest without comments enabled)
  const canInteract = userId || (guestSession && team.commentsEnabled);

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
          <div className={styles.teamHeader}>
            <div className={styles.teamIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className={styles.teamInfo}>
              <h1 className={styles.teamName}>{team.name}</h1>
              {team.description && (
                <p className={styles.teamDescription}>{team.description}</p>
              )}
              <div className={styles.teamMeta}>
                <span className={styles.memberCount}>
                  {team.members.length} {team.members.length === 1 ? 'miembro' : 'miembros'}
                </span>
                <span className={styles.sharedBadge}>
                  Equipo Compartido
                </span>
              </div>
            </div>
          </div>
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
              taskId={team.id}
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
              <span>Este equipo está en modo solo lectura. No puedes enviar mensajes.</span>
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
