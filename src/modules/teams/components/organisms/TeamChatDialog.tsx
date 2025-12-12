'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useUserDataStore } from '@/stores/userDataStore';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import Image from 'next/image';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
} from '@/modules/dialogs/components/DialogPrimitives';
import { VisuallyHidden } from '@/components/ui';
import { VirtualizedMessageList } from '@/modules/chat/components/organisms/VirtualizedMessageList';
import { InputChat } from '@/modules/chat/components/organisms/InputChat';
import { MessageItem } from '@/modules/chat/components/molecules/MessageItem';
import { useVirtuosoMessages } from '@/modules/chat/hooks/useVirtuosoMessages';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useEncryption } from '@/hooks/useEncryption';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getGradientStyle } from '../../config';
import { Users, Globe, Lock, X } from 'lucide-react';
import type { Message, ChatUser } from '@/modules/chat/types';
import type { Team } from '../../types';
import styles from './TeamChatDialog.module.scss';

interface TeamChatDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
}

/**
 * TeamChatDialog - Chat dialog for team conversations
 *
 * Reuses the chat module infrastructure (messages, encryption, etc.)
 * but with a team-specific header and styling.
 *
 * The teamId is used as the "taskId" for the chat system since
 * it's just an identifier for the conversation room.
 */
export const TeamChatDialog: React.FC<TeamChatDialogProps> = memo(({
  isOpen,
  onOpenChange,
  team,
}) => {
  // User data from store
  const userId = useUserDataStore((state) => state.userData?.userId || '');
  const userName = useUserDataStore((state) => state.userData?.fullName || 'Usuario');
  const isLoading = useUserDataStore((state) => state.isLoading);

  // Get users for member display
  const allUsers = useDataStore(useShallow((state) => state.users));

  // Local states
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Encryption hook - use teamId as the encryption key
  const { encryptMessage, decryptMessage } = useEncryption(team?.id || '');

  // Callback for new messages
  const handleNewMessage = useCallback(() => {
    // Could update lastMessageAt on team here
  }, []);

  // Messages hook - use teamId as taskId
  const {
    messages,
    groupCounts,
    groupDates,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    initialLoad,
  } = useVirtuosoMessages({
    taskId: team?.id || '', // Teams use the same message system
    pageSize: 50,
    decryptMessage,
    onNewMessage: handleNewMessage,
  });

  // Create a pseudo-task object for useMessageActions compatibility
  const pseudoTask = useMemo(() => ({
    id: team.id,
    clientId: team.clientId,
    project: '',
    name: team.name,
    description: team.description || '',
    status: 'active',
    priority: 'medium',
    startDate: team.createdAt,
    endDate: '',
    LeadedBy: [],
    AssignedTo: team.memberIds,
  }), [team]);

  // Actions hook
  const {
    sendMessage,
    deleteMessage,
    resendMessage,
  } = useMessageActions({
    task: pseudoTask as any,
    encryptMessage,
    addOptimisticMessage: () => {},
    updateOptimisticMessage: () => {},
  });

  // Build users map for the chat
  const usersMap = useMemo(() => {
    const map = new Map<string, ChatUser>();
    allUsers.forEach(user => map.set(user.id, {
      id: user.id,
      fullName: user.fullName || '',
      imageUrl: user.imageUrl || '',
    }));
    return map;
  }, [allUsers]);

  // Get member users for header display
  const memberUsers = useMemo(() => {
    return team.memberIds
      .map(id => allUsers.find(u => u.id === id))
      .filter(Boolean)
      .slice(0, 5);
  }, [team.memberIds, allUsers]);

  // Get team initials
  const teamInitials = useMemo(() => {
    const name = team.name.trim();
    if (!name) return 'T';
    const words = name.split(' ').filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [team.name]);

  // Handlers
  const handleSendMessage = useCallback(
    async (messageData: Partial<Message>) => {
      if (userId && !isLoading) {
        await sendMessage({
          ...messageData,
          senderId: userId,
          senderName: userName,
        });
      }
    },
    [sendMessage, userId, userName, isLoading]
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
    const isOwn = message.senderId === userId;

    return (
      <MessageItem
        key={message.id}
        message={message}
        prevMessage={prevMessage}
        nextMessage={nextMessage}
        users={allUsers.map(u => ({
          id: u.id,
          fullName: u.fullName || '',
          imageUrl: u.imageUrl || '',
        }))}
        usersMap={usersMap}
        isOwn={isOwn}
        userId={userId}
        taskId={team.id}
        onImagePreview={setImagePreviewSrc}
        onRetryMessage={resendMessage}
        onCopy={handleCopyMessage}
        onDelete={handleDeleteMessage}
        onReply={setReplyingTo}
        onDownload={handleDownloadFile}
      />
    );
  }, [userId, allUsers, usersMap, team.id, resendMessage, handleCopyMessage, handleDeleteMessage, handleDownloadFile]);

  if (!team) {
    return null;
  }

  return (
    <>
      <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent
          size="lg"
          className={styles.dialogContent}
          showCloseButton={false}
          closeOnOverlayClick={false}
        >
          {/* Accessible title for screen readers */}
          <VisuallyHidden>
            <ResponsiveDialogTitle>Chat del equipo {team.name}</ResponsiveDialogTitle>
          </VisuallyHidden>

          {/* Custom Header with Team Info */}
          <ResponsiveDialogHeader className={styles.dialogHeader}>
            <div
              className={styles.headerGradient}
              style={getGradientStyle(team.gradientId)}
            >
              {/* Close button */}
              <button
                onClick={() => onOpenChange(false)}
                className={styles.closeButton}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>

              {/* Team Avatar */}
              <div className={styles.teamAvatar}>
                <span className={styles.teamInitials}>{teamInitials}</span>
              </div>

              {/* Team Info */}
              <div className={styles.teamInfo}>
                <h2 className={styles.teamName}>{team.name}</h2>
                <div className={styles.teamMeta}>
                  {team.isPublic ? (
                    <Globe className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>{team.memberIds.length} miembros</span>
                </div>
              </div>

              {/* Member Avatars */}
              <div className={styles.memberAvatars}>
                {memberUsers.map((member, index) => (
                  <Avatar
                    key={member!.id}
                    className={styles.memberAvatar}
                    style={{ zIndex: memberUsers.length - index }}
                  >
                    <AvatarImage src={member!.imageUrl} alt={member!.fullName || ''} />
                    <AvatarFallback className={styles.avatarFallback}>
                      {(member!.fullName || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {team.memberIds.length > 5 && (
                  <div className={styles.moreMembers}>
                    +{team.memberIds.length - 5}
                  </div>
                )}
              </div>
            </div>
          </ResponsiveDialogHeader>

          {/* Body - Messages */}
          <ResponsiveDialogBody className={styles.dialogBody}>
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
          <div className={styles.dialogFooter}>
            <InputChat
              taskId={team.id}
              userId={userId}
              userName={userName}
              userFirstName={userName.split(' ')[0]}
              onSendMessage={handleSendMessage}
              replyingTo={replyingTo ? {
                ...replyingTo,
                text: replyingTo.text || null,
              } : null}
              onCancelReply={handleCancelReply}
              disabled={false}
            />
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

TeamChatDialog.displayName = 'TeamChatDialog';

export default TeamChatDialog;
