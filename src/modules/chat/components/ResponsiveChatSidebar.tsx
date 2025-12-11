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
import { useUserDataStore } from "@/stores/userDataStore";
import { useSidebarStateStore } from "@/stores/sidebarStateStore";
import { useDataStore } from "@/stores/dataStore";
import { useShallow } from "zustand/react/shallow";
import { useClientData } from "@/hooks/useClientData";
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
  // ✅ Obtener datos del usuario desde userDataStore (Single Source of Truth)
  const userId = useUserDataStore((state) => state.userData?.userId || '');
  const userName = useUserDataStore((state) => state.userData?.fullName || 'Usuario');
  const userFirstName = useUserDataStore((state) => {
    const fullName = state.userData?.fullName || '';
    return fullName.split(' ')[0] || fullName;
  });

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

  // ✅ Obtener información del cliente desde clientsDataStore centralizado - O(1) access
  const clientFromStore = useClientData(task?.clientId || '');
  const clientData = useMemo(() => {
    if (!task?.clientId || !clientFromStore) return null;
    return {
      id: clientFromStore.id,
      name: clientFromStore.name,
      imageUrl: clientFromStore.imageUrl || '/empty-image.png'
    };
  }, [task?.clientId, clientFromStore]);

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
              userId={userId}
              userName={userName}
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
                const isOwn = message.senderId === userId;
                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    users={users}
                    isOwn={isOwn}
                    userId={userId}
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
              userId={userId}
              userName={userName}
              userFirstName={userFirstName}
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
        userId={userId}
        userName={userName}
      />
    </>
  );
});

MobileChatDrawer.displayName = 'MobileChatDrawer';

export default ResponsiveChatSidebar;
