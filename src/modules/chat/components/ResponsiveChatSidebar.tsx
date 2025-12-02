"use client";

import React, { memo, useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { VisuallyHidden } from "@/components/ui";
import { useMediaQuery } from "@/modules/dialogs/hooks/useMediaQuery";
import ChatSidebar from "./ChatSidebar";
import { ChatHeader } from "./organisms/ChatHeader";
import { VirtualizedMessageList } from "./organisms/VirtualizedMessageList";
import { InputChat } from "./organisms/InputChat";
import { MessageItem } from "./molecules/MessageItem";
import { ManualTimeDialog } from "@/modules/dialogs";
import { toast } from "@/components/ui/use-toast";
import type { ChatSidebarProps } from "../types";
import { useUser } from "@clerk/nextjs";
import { useSidebarStateStore } from "@/stores/sidebarStateStore";
import { useDataStore } from "@/stores/dataStore";
import { useShallow } from "zustand/react/shallow";
import { useEncryption } from "@/hooks/useEncryption";
import { useVirtuosoMessages } from "../hooks/useVirtuosoMessages";
import { useMessageActions } from "@/hooks/useMessageActions";
import { useCallback, useState as useStateReact, useMemo } from "react";

/**
 * ResponsiveChatSidebar - Wrapper responsive para el chat
 *
 * - Desktop (≥768px): Renderiza ChatSidebar normal (sidebar from right)
 * - Mobile (<768px): Renderiza como Drawer (from bottom)
 */
export const ResponsiveChatSidebar: React.FC<ChatSidebarProps> = memo(({
  isOpen,
  onClose,
  users = [],
}) => {
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Desktop: usa ChatSidebar original
  if (!isMobile) {
    return (
      <ChatSidebar
        isOpen={isOpen}
        onClose={onClose}
        users={users}
      />
    );
  }

  // Mobile: renderiza como Drawer
  return (
    <MobileChatDrawer
      isOpen={isOpen}
      onClose={onClose}
      users={users}
    />
  );
});

ResponsiveChatSidebar.displayName = 'ResponsiveChatSidebar';

/**
 * MobileChatDrawer - Versión drawer del chat para mobile
 */
const MobileChatDrawer: React.FC<ChatSidebarProps> = memo(({
  isOpen,
  onClose,
  users = [],
}) => {
  const { user } = useUser();

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
  const [imagePreviewSrc, setImagePreviewSrc] = useStateReact<string | null>(null);
  const [isManualTimeModalOpen, setIsManualTimeModalOpen] = useStateReact(false);

  // Manual time entry handlers
  const handleOpenManualTimeEntry = useCallback(() => {
    setIsManualTimeModalOpen(true);
  }, []);

  // Hooks
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

  const handleNewMessage = useCallback(() => {
    // Callback para nuevos mensajes en tiempo real
  }, []);

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
    editMessage,
    deleteMessage,
    resendMessage,
    sendTimeMessage,
  } = useMessageActions({
    task: task as any,
    encryptMessage,
    addOptimisticMessage: () => {},
    updateOptimisticMessage: () => {},
  });

  // Estados de reply/edit locales
  const [replyingTo, setReplyingTo] = useStateReact<any | null>(null);
  const [editingMessageId, setEditingMessageId] = useStateReact<string | null>(null);
  const [editingText, setEditingText] = useStateReact<string>('');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!task) {
    return null;
  }

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DrawerContent className="flex flex-col">
          {/* Accessible Title - Hidden visually */}
          <VisuallyHidden>
            <DrawerTitle>Chat: {task.name}</DrawerTitle>
          </VisuallyHidden>

          {/* Header */}
          <DrawerHeader className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 pb-0">
            <ChatHeader
              task={task}
              clientName={clientName || clientData?.name || 'Cliente'}
              users={[]}
              userId={user?.id || ''}
              userName={user?.fullName || 'Usuario'}
              onOpenManualTimeEntry={handleOpenManualTimeEntry}
            />
          </DrawerHeader>

          {/* Messages Body - Virtuoso handles its own scroll */}
          <div
            className="flex-1 overflow-hidden"
            style={{
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <VirtualizedMessageList
              messages={messages}
              groupCounts={groupCounts}
              groupDates={groupDates}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMoreMessages}
              onInitialLoad={initialLoad}
              renderMessage={(message, prevMessage, nextMessage) => {
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

          {/* Input Footer */}
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
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
            />
          </div>
        </DrawerContent>
      </Drawer>

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

MobileChatDrawer.displayName = 'MobileChatDrawer';

export default ResponsiveChatSidebar;
