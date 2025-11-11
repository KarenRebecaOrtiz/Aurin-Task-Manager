"use client";

import React, { useState, useRef, useCallback, memo, useMemo, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useSidebarStateStore } from "@/stores/sidebarStateStore";
import { useDataStore } from "@/stores/dataStore";
import { useShallow } from "zustand/react/shallow";
import styles from "../styles/ChatSidebar.module.scss";
import { ChatHeader } from "./organisms/ChatHeader";
import { MessageList } from "./organisms/MessageList";
import { MessageItem } from "./molecules/MessageItem";
import InputChat from "@/components/ui/InputChat"; // Reutilizamos el InputChat original temporalmente
import { useEncryption } from "@/hooks/useEncryption"; // ✅ USAR HOOK ORIGINAL
import { useMessagePagination } from "@/hooks/useMessagePagination"; // ✅ USAR HOOK ORIGINAL
import { useMessageActions } from "@/hooks/useMessageActions"; // ✅ USAR HOOK ORIGINAL
import type { ChatSidebarProps } from "../types";

/**
 * ChatSidebar - Componente Principal Modularizado
 * 
 * Sidebar de chat completamente modularizado con:
 * - Soporte multi-task (cambiar entre tareas sin perder estado)
 * - Paginación de mensajes
 * - Encriptación end-to-end
 * - Integración con InputChat original (temporal)
 * - Estilos SCSS modules (no Tailwind)
 */
const ChatSidebar: React.FC<ChatSidebarProps> = memo(({
  isOpen,
  onClose,
  users = [],
}) => {
  const { user } = useUser();
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Obtener tarea actual del store global
  const chatSidebar = useSidebarStateStore(useShallow(state => state.chatSidebar));
  const task = chatSidebar.task;
  const clientName = chatSidebar.clientName;
  
  // Obtener información del cliente desde dataStore
  const clients = useDataStore(useShallow(state => state.clients));
  const clientImageUrl = useMemo(() => {
    if (!task?.clientId) return undefined;
    const client = clients.find(c => c.id === task.clientId);
    return client?.imageUrl || '/empty-image.png';
  }, [task?.clientId, clients]);

  // Debug logs
  console.log('[ChatSidebar] task:', task);
  console.log('[ChatSidebar] taskId:', task?.id);
  console.log('[ChatSidebar] isOpen:', isOpen);

  // Estados locales
  const [imagePreviewSrc, setImagePreviewSrc] = useState<string | null>(null);

  // ✅ Hooks ORIGINALES que ya funcionan
  const { encryptMessage, decryptMessage } = useEncryption(task?.id || '');

  const handleNewMessage = useCallback(() => {
    // Callback para nuevos mensajes en tiempo real
    console.log('[ChatSidebar] New message received');
  }, []);

  // ✅ Hook original de paginación (tiene todo: Firebase, cache, real-time, etc.)
  const {
    messages,
    groupedMessages,
    isLoadingMore,
    hasMore,
    loadMoreMessages,
    addOptimisticMessage,
    updateOptimisticMessage,
  } = useMessagePagination({
    taskId: task?.id || '',
    pageSize: 10,
    decryptMessage,
    onNewMessage: handleNewMessage,
  });

  // ✅ Hook original de acciones (tiene Optimistic UI, encriptación, etc.)
  const {
    sendMessage,
    editMessage,
    deleteMessage,
    resendMessage,
    sendTimeMessage,
  } = useMessageActions({
    task: task as any, // Cast temporal
    encryptMessage,
    addOptimisticMessage,
    updateOptimisticMessage,
  });

  // Estados de reply/edit locales (el hook original no los maneja en store)
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Estados del TimerPanel
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false);
  const [timerInput, setTimerInput] = useState('00:00');
  const [dateInput, setDateInput] = useState<Date>(new Date());
  const [commentInput, setCommentInput] = useState('');
  const timerPanelRef = useRef<HTMLDivElement>(null);

  // Calcular total de horas
  const totalHours = React.useMemo(() => {
    const timeMessages = messages.filter((msg: any) => typeof msg.hours === 'number' && msg.hours > 0);
    let totalSeconds = 0;
    timeMessages.forEach((msg: any) => {
      totalSeconds += Math.round(msg.hours! * 3600);
    });
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }, [messages]);

  // Asegurar que el TimerPanel siempre esté cerrado al inicio o cuando cambie la tarea
  useEffect(() => {
    setIsTimerPanelOpen(false);
  }, [task?.id, isOpen]);

  // Handlers
  const handleClose = useCallback(() => {
    setReplyingTo(null);
    setEditingMessageId(null);
    setIsTimerPanelOpen(false);
    onClose();
  }, [onClose]);

  const handleBack = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleToggleTimerPanel = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsTimerPanelOpen(prev => !prev);
  }, []);

  const handleAddTimeEntry = useCallback(async () => {
    if (!user?.id) {
      alert('No se puede añadir la entrada de tiempo: usuario no autenticado.');
      return;
    }

    const [hours, minutes] = timerInput.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      alert('Por favor, introduce un formato de tiempo válido (HH:mm).');
      return;
    }

    const totalHoursNum = hours + minutes / 60;
    const timeEntry = `${hours}h ${minutes}m`;
    const dateString = dateInput.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });

    try {
      await sendTimeMessage(user.id, user.firstName || 'Usuario', totalHoursNum, timeEntry, dateString, commentInput);
      setTimerInput('00:00');
      setDateInput(new Date());
      setCommentInput('');
      setIsTimerPanelOpen(false);
    } catch (error) {
      alert(`Error al añadir la entrada de tiempo: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
    }
  }, [user?.id, user?.firstName, timerInput, dateInput, commentInput, sendTimeMessage]);

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
            clientImageUrl={clientImageUrl}
            users={users}
            messages={messages}
          />
        </div>

        {/* Content (Messages) */}
        <div className={styles.content}>
          <MessageList
            groupedMessages={groupedMessages || []} // ✅ Pasar groupedMessages en lugar de messages
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
            onInitialLoad={() => {}} // El hook original ya carga automáticamente
            renderMessage={(message) => {
              const isOwn = message.senderId === user?.id;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  users={users}
                  isOwn={isOwn}
                  userId={user?.id || ''}
                  onImagePreview={(url) => setImagePreviewSrc(url)}
                  onRetryMessage={(msg) => resendMessage(msg)}
                  onCopy={async (text) => {
                    await navigator.clipboard.writeText(text);
                  }}
                  onEdit={(msg) => {
                    setEditingMessageId(msg.id);
                    console.log('Edit message:', msg.id);
                  }}
                  onDelete={(msgId) => deleteMessage(msgId)}
                  onReply={(msg) => setReplyingTo(msg)}
                  onDownload={(msg) => {
                    console.log('Download:', msg.fileName);
                  }}
                />
              );
            }}
          />
        </div>

        {/* Input Area - Usando InputChat original temporalmente */}
        <div className={styles.inputArea}>
          <InputChat
            taskId={task.id}
            userId={user?.id}
            userFirstName={user?.firstName || user?.fullName}
            onSendMessage={sendMessage}
            isSending={false}
            setIsSending={() => {}}
            timerSeconds={0}
            isTimerRunning={false}
            onToggleTimer={() => {}}
            onFinalizeTimer={async () => {}}
            onResetTimer={async () => {}}
            onToggleTimerPanel={handleToggleTimerPanel}
            isTimerPanelOpen={isTimerPanelOpen}
            setIsTimerPanelOpen={setIsTimerPanelOpen}
            containerRef={sidebarRef}
            timerPanelRef={timerPanelRef}
            timerInput={timerInput}
            setTimerInput={setTimerInput}
            dateInput={dateInput}
            setDateInput={setDateInput}
            commentInput={commentInput}
            setCommentInput={setCommentInput}
            onAddTimeEntry={handleAddTimeEntry}
            totalHours={totalHours}
            isRestoringTimer={false}
            isInitializing={false}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessageId={editingMessageId}
            editingText={editingText}
            onEditMessage={editMessage}
            onCancelEdit={() => {
              setEditingMessageId(null);
              setEditingText('');
            }}
            messages={messages}
            hasMore={hasMore}
            loadMoreMessages={loadMoreMessages}
            onNewMessage={handleNewMessage}
            users={users.map((u: any) => ({ id: u.id, fullName: u.fullName }))}
          />
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
      </div>
    </>
  );
});

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
