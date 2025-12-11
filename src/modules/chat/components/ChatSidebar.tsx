"use client";

import React, { useState, useRef, useCallback, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserDataStore } from "@/stores/userDataStore";
import { useSidebarStateStore } from "@/stores/sidebarStateStore";
import { useDataStore } from "@/stores/dataStore";
import { useShallow } from "zustand/react/shallow";
import { useClientData } from "@/hooks/useClientData";
import {
  sidebarContainerVariants,
  overlayVariants,
  sidebarHeaderVariants,
  sidebarContentVariants,
  sidebarInputVariants,
  imagePreviewOverlayVariants,
  imagePreviewContentVariants,
} from "../animations";
import styles from "../styles/ChatSidebar.module.scss";
import { ChatHeader } from "./organisms";
import { VirtualizedMessageList } from "./organisms/VirtualizedMessageList";
import { InputChat } from "./organisms/InputChat";
import { MessageItem } from "./molecules/MessageItem";
import { useEncryption } from "@/hooks/useEncryption";
import { useVirtuosoMessages } from "../hooks/useVirtuosoMessages";
import { useMessageActions } from "@/hooks/useMessageActions";
import { ManualTimeDialog } from "@/modules/dialogs";
import { toast } from "@/components/ui/use-toast";
import type { ChatSidebarProps } from "../types";

/**
 * ChatSidebar - Componente Principal con Animaciones Motion Dev
 *
 * Sidebar de chat con animaciones suaves de entrada y salida:
 * - Container: Desliza desde la derecha con spring physics
 * - Overlay: Fade in/out con blur animado
 * - Header: Desliza hacia abajo con blur
 * - Content: Fade in con scale sutil
 * - Input: Desliza hacia arriba con spring
 *
 * IMPORTANTE: Este componente debe estar envuelto en AnimatePresence
 * en el nivel del layout para que las exit animations funcionen.
 */
const ChatSidebar: React.FC<ChatSidebarProps> = memo(({
  isOpen,
  onClose,
  users = [],
}) => {
  // Obtener datos del usuario desde userDataStore (Single Source of Truth)
  const userId = useUserDataStore((state) => state.userData?.userId || '');
  const userName = useUserDataStore((state) => state.userData?.fullName || 'Usuario');
  const userFirstName = useUserDataStore((state) => {
    const fullName = state.userData?.fullName || '';
    return fullName.split(' ')[0] || fullName;
  });

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Obtener taskId del store global
  const chatSidebar = useSidebarStateStore(useShallow(state => state.chatSidebar));
  const taskId = chatSidebar.taskId;
  const clientName = chatSidebar.clientName;

  // Obtener la tarea actualizada desde dataStore (para tener timeTracking actualizado)
  const tasks = useDataStore(useShallow(state => state.tasks));
  const task = useMemo(() => {
    if (!taskId) return chatSidebar.task;
    return tasks.find(t => t.id === taskId) || chatSidebar.task;
  }, [taskId, tasks, chatSidebar.task]);

  // Obtener información del cliente desde clientsDataStore centralizado - O(1) access
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
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [isManualTimeModalOpen, setIsManualTimeModalOpen] = useState(false);

  // Manual time entry handlers
  const handleOpenManualTimeEntry = useCallback(() => {
    setIsManualTimeModalOpen(true);
  }, []);

  // Memoize taskId for stable hook dependencies
  const stableTaskId = taskId || '';

  // Hooks de encriptación y mensajes
  const { encryptMessage, decryptMessage } = useEncryption(stableTaskId);

  const handleNewMessage = useCallback(() => {
    // Callback para nuevos mensajes en tiempo real
  }, []);

  // Hook con virtuoso (infinite scroll + ordenamiento correcto)
  const {
    messages,
    groupCounts,
    groupDates,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    initialLoad,
  } = useVirtuosoMessages({
    taskId: stableTaskId,
    pageSize: 50,
    decryptMessage,
    onNewMessage: handleNewMessage,
  });

  // Hook de acciones de mensajes - pass null-safe task
  // Create a stable empty task object to prevent null errors during unmount animations
  const safeTask = useMemo(() => task || { id: '', name: '', description: '' }, [task]);

  const {
    sendMessage,
    editMessage,
    deleteMessage,
    resendMessage,
    sendTimeMessage,
  } = useMessageActions({
    task: safeTask as any,
    encryptMessage,
    addOptimisticMessage: () => {},
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
      {/* Animated Overlay - siempre visible cuando el sidebar está montado */}
      <motion.div
        className={styles.overlay}
        onClick={handleClose}
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      />

      {/* Animated Sidebar Container */}
      <motion.div
        ref={sidebarRef}
        className={styles.container}
        variants={sidebarContainerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Animated Header */}
        <motion.div
          className={styles.header}
          variants={sidebarHeaderVariants}
        >
          <ChatHeader
            task={task}
            clientName={clientName}
            users={users}
            messages={messages}
            userId={userId}
            userName={userName}
            onOpenManualTimeEntry={handleOpenManualTimeEntry}
          />
        </motion.div>

        {/* Animated Content (Messages) */}
        <motion.div
          className={styles.content}
          variants={sidebarContentVariants}
        >
          <VirtualizedMessageList
            messages={messages}
            groupCounts={groupCounts}
            groupDates={groupDates}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
            onInitialLoad={initialLoad}
            renderMessage={(message) => {
              const isOwn = message.senderId === userId;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  users={users}
                  isOwn={isOwn}
                  userId={userId}
                  taskId={stableTaskId}
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
        </motion.div>

        {/* Animated Input Area */}
        <motion.div
          className={styles.inputArea}
          variants={sidebarInputVariants}
        >
          <InputChat
            taskId={stableTaskId}
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
        </motion.div>
      </motion.div>

      {/* Animated Image Preview Overlay */}
      <AnimatePresence>
        {imagePreviewSrc && (
          <motion.div
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
            variants={imagePreviewOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.img
              src={imagePreviewSrc}
              alt="Preview"
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
              }}
              variants={imagePreviewContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Time Entry Dialog */}
      <ManualTimeDialog
        open={isManualTimeModalOpen}
        onOpenChange={setIsManualTimeModalOpen}
        taskId={safeTask.id}
        taskName={safeTask.name}
        taskDescription={safeTask.description || ''}
        userId={userId}
        userName={userName}
      />
    </>
  );
});

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
