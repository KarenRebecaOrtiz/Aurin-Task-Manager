"use client";

import React, { useState, useRef, useCallback, memo, useMemo } from "react";
import { useUserDataStore } from "@/stores/userDataStore";
import { useSidebarStateStore } from "@/stores/sidebarStateStore";
import { useDataStore } from "@/stores/dataStore";
import { useShallow } from "zustand/react/shallow";
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
import type { Message } from "../types";

/**
 * ChatSidebarVirtualized - Versión optimizada con react-virtuoso
 *
 * Mejoras sobre ChatSidebar original:
 * - ✅ Virtualización: Solo renderiza mensajes visibles (mejor performance)
 * - ✅ Infinite scroll nativo: Paginación automática sin bugs de scroll
 * - ✅ Ordenamiento simple: ASC (antiguos → nuevos), sin column-reverse
 * - ✅ Sin cálculos manuales de scroll: Virtuoso maneja todo
 * - ✅ Scroll to bottom automático: Para nuevos mensajes
 */
const ChatSidebarVirtualized: React.FC<ChatSidebarProps> = memo(({
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

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Obtener tipo de sidebar y datos del store global
  const sidebarType = useSidebarStateStore(useShallow(state => state.sidebarType));
  const chatSidebar = useSidebarStateStore(useShallow(state => state.chatSidebar));
  const teamSidebar = useSidebarStateStore(useShallow(state => state.teamSidebar));

  // Determinar si es chat de equipo o de tarea
  const isTeamChat = sidebarType === 'team';

  // Obtener ID y clientName según el tipo
  const entityId = isTeamChat ? teamSidebar.teamId : chatSidebar.taskId;
  const clientName = isTeamChat ? teamSidebar.clientName : chatSidebar.clientName;

  // Obtener la tarea actualizada desde dataStore (solo para tareas)
  const tasks = useDataStore(useShallow(state => state.tasks));

  // Para chats de equipo, crear un objeto compatible con Task para reutilizar la UI
  const task = useMemo(() => {
    if (isTeamChat) {
      // Usar directamente el team del sidebar
      const team = teamSidebar.team;
      if (!team) return null;
      // Convertir Team a formato compatible con Task para reutilizar ChatHeader/Input
      return {
        id: team.id,
        clientId: team.clientId,
        project: '', // Equipos no tienen proyecto
        name: team.name,
        description: team.description || '',
        status: 'active',
        priority: 'medium',
        startDate: team.createdAt,
        endDate: null,
        LeadedBy: [],
        AssignedTo: team.memberIds,
        CreatedBy: team.createdBy,
      };
    }
    // Para tareas, buscar la tarea actualizada en el store
    if (!entityId) return chatSidebar.task;
    return tasks.find(t => t.id === entityId) || chatSidebar.task;
  }, [isTeamChat, entityId, tasks, chatSidebar.task, teamSidebar.team]);

  // Estados locales
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isManualTimeModalOpen, setIsManualTimeModalOpen] = useState(false);

  // Manual time entry handlers
  const handleOpenManualTimeEntry = useCallback(() => {
    setIsManualTimeModalOpen(true);
  }, []);

  // ✅ Hook de encriptación
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

  // ✅ Callback para nuevos mensajes
  const handleNewMessage = useCallback(() => {
    // Aquí puedes agregar lógica adicional cuando llegue un mensaje nuevo
    // Por ejemplo: reproducir sonido, mostrar notificación, etc.
  }, []);

  // ✅ NUEVO HOOK: useVirtuosoMessages (simplificado, sin optimistic UI)
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

  // ✅ Hook de acciones (para enviar, editar, eliminar)
  // NOTA: Este hook usa Optimistic UI, pero no está integrado con useVirtuosoMessages
  // Los mensajes nuevos aparecerán cuando Firebase los devuelva via real-time listener
  const {
    sendMessage,
    deleteMessage,
    resendMessage,
  } = useMessageActions({
    task: task as any,
    encryptMessage,
    // No pasamos addOptimisticMessage/updateOptimisticMessage
    // El real-time listener de useVirtuosoMessages manejará los nuevos mensajes
    addOptimisticMessage: () => {},
    updateOptimisticMessage: () => {},
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleClose = useCallback(() => {
    setReplyingTo(null);
    onClose();
  }, [onClose]);

  const handleSendMessage = useCallback(
    async (messageData: Partial<Message>) => {
      await sendMessage(messageData);
      // El real-time listener agregará el mensaje automáticamente
    },
    [sendMessage]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (confirm("¿Estás seguro de que quieres eliminar este mensaje?")) {
        await deleteMessage(messageId);
      }
    },
    [deleteMessage]
  );

  const handleCopyMessage = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copiado al portapapeles" });
  }, []);

  const handleDownloadFile = useCallback((message: Message) => {
    if (message.fileUrl) {
      window.open(message.fileUrl, '_blank');
    }
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  // No renderizar si no hay tarea
  if (!task) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={handleClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 100000,
          }}
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
            userId={userId}
            userName={userName}
            onOpenManualTimeEntry={isTeamChat ? undefined : handleOpenManualTimeEntry}
            isTeamChat={isTeamChat}
          />
        </div>

        {/* Content (Messages) - ✅ NUEVO: VirtualizedMessageList */}
        <div className={styles.content}>
          <VirtualizedMessageList
            messages={messages}
            groupCounts={groupCounts}
            groupDates={groupDates}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
            onInitialLoad={initialLoad}
            renderMessage={(message, prevMessage, nextMessage) => {
              const isOwn = message.senderId === userId;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  prevMessage={prevMessage}
                  nextMessage={nextMessage}
                  users={users}
                  isOwn={isOwn}
                  userId={userId}
                  taskId={task?.id || ''}
                  onImagePreview={setImagePreviewSrc}
                  onRetryMessage={resendMessage}
                  onCopy={handleCopyMessage}
                  onDelete={handleDeleteMessage}
                  onReply={setReplyingTo}
                  onDownload={handleDownloadFile}
                />
              );
            }}
          />
        </div>

        {/* Input Area - ✅ InputChat con Timer integrado */}
        <div className={styles.inputArea}>
          <InputChat
            taskId={task.id}
            userId={userId}
            userName={userName}
            userFirstName={userFirstName}
            onSendMessage={handleSendMessage}
            replyingTo={replyingTo as any}
            onCancelReply={() => setReplyingTo(null)}
            disabled={false}
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

      {/* Manual Time Entry Dialog - Solo para tareas, no equipos */}
      {!isTeamChat && (
        <ManualTimeDialog
          open={isManualTimeModalOpen}
          onOpenChange={setIsManualTimeModalOpen}
          taskId={task.id}
          taskName={task.name}
          taskDescription={task.description}
          userId={userId}
          userName={userName}
        />
      )}
    </>
  );
});

ChatSidebarVirtualized.displayName = 'ChatSidebarVirtualized';

export default ChatSidebarVirtualized;
