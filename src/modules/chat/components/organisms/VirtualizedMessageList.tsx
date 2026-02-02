"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { GroupedVirtuoso, GroupedVirtuosoHandle } from "react-virtuoso";
import { MessageSquare, Loader2 } from "lucide-react";
import styles from "../../styles/VirtualizedMessageList.module.scss";
import type { Message } from "../../types";
import { getRelativeDateLabel } from "../../utils";

interface VirtualizedMessageListProps {
  messages: Message[];
  groupCounts: number[];
  groupDates: Date[];
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onInitialLoad: () => void;
  renderMessage: (message: Message, prevMessage: Message | null, nextMessage: Message | null) => React.ReactNode;
  scrollToMessageId?: string | null; // Para scroll to reply
}

/**
 * VirtualizedMessageList
 *
 * Lista virtualizada de mensajes usando react-virtuoso.
 *
 * Características:
 * - ✅ Virtualización: Solo renderiza mensajes visibles (~20-30 items)
 * - ✅ Infinite scroll: Carga automática al scroll hacia arriba
 * - ✅ Follow output: Scroll automático a nuevos mensajes
 * - ✅ Agrupación por fecha: Separadores de fecha automáticos
 * - ✅ Performance: Maneja miles de mensajes sin lag
 *
 * Orden de mensajes: ASC (antiguos arriba → nuevos abajo)
 * Similar a WhatsApp/Telegram/Slack
 */
export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  groupCounts,
  groupDates,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onInitialLoad,
  renderMessage,
  scrollToMessageId,
}) => {
  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);
  const hasInitializedRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null); // Track last message
  const isUserAtBottomRef = useRef(true); // Track user scroll position

  // ============================================================================
  // INITIAL LOAD
  // ============================================================================

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      onInitialLoad();
    }
  }, [onInitialLoad]);

  // ============================================================================
  // SCROLL TO BOTTOM ON NEW MESSAGES (FIXED)
  // ============================================================================

  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isNewMessage = lastMessage && lastMessage.id !== lastMessageIdRef.current;

    // Solo scroll si:
    // 1. Es un mensaje NUEVO (no carga de mensajes antiguos)
    // 2. El usuario está al final del chat
    if (isNewMessage && isUserAtBottomRef.current && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        align: "end",
        behavior: "smooth",
      });
      lastMessageIdRef.current = lastMessage.id;
    }
  }, [messages]);

  // ============================================================================
  // SCROLL TO REPLY (FEATURE 4)
  // ============================================================================

  useEffect(() => {
    if (!scrollToMessageId || !virtuosoRef.current) return;

    const messageIndex = messages.findIndex((msg) => msg.id === scrollToMessageId);
    if (messageIndex === -1) {
      console.warn(`[VirtualizedMessageList] Message ${scrollToMessageId} not found`);
      return;
    }

    // Scroll to message with highlight
    virtuosoRef.current.scrollToIndex({
      index: messageIndex,
      align: "start", // Mostrar al inicio del viewport
      behavior: "smooth",
    });
  }, [scrollToMessageId, messages]);

  // ============================================================================
  // CALLBACKS
  // ============================================================================

  /**
   * Callback cuando se hace scroll hacia arriba (cargar más)
   * Virtuoso llama esto automáticamente
   */
  const handleStartReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      console.log('[VirtualizedMessageList] Start reached - loading more');
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  /**
   * Render del header del grupo (DatePill)
   */
  const renderGroupHeader = useCallback(
    (groupIndex: number) => {
      const date = groupDates[groupIndex];
      if (!date) return null;

      return (
        <div className={styles.dateSeparator}>
          <span className={styles.dateLabel}>{getRelativeDateLabel(date)}</span>
        </div>
      );
    },
    [groupDates]
  );

  /**
   * Render del item (mensaje)
   */
  const renderItem = useCallback(
    (index: number) => {
      const message = messages[index];
      if (!message) return null;

      const prevMessage = index > 0 ? messages[index - 1] : null;
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

      // Highlight si es el mensaje target del scroll
      const isHighlighted = message.id === scrollToMessageId;

      return (
        <div
          className={`${styles.messageWrapper} ${isHighlighted ? styles.highlighted : ""}`}
          data-message-id={message.id}
        >
          {renderMessage(message, prevMessage, nextMessage)}
        </div>
      );
    },
    [messages, renderMessage, scrollToMessageId]
  );

  /**
   * Header con loader (cuando se están cargando mensajes antiguos)
   * Siempre renderiza un spacer para evitar que el primer mensaje quede recortado
   */
  const renderHeader = useCallback(() => {
    return (
      <div className={styles.loadingHeader}>
        {hasMore && isLoadingMore && (
          <>
            <Loader2 size={16} className={styles.spinner} />
            <span className={styles.loadingText}>Cargando mensajes antiguos...</span>
          </>
        )}
      </div>
    );
  }, [isLoadingMore, hasMore]);

  /**
   * Footer (scroll anchor para nuevos mensajes)
   */
  const renderFooter = useCallback(() => {
    return <div className={styles.scrollAnchor} />;
  }, []);

  /**
   * Callback condicional para followOutput
   * Solo hace auto-scroll si el usuario está al final
   */
  const handleFollowOutput = useCallback((isAtBottom: boolean) => {
    isUserAtBottomRef.current = isAtBottom;
    return isAtBottom ? "smooth" : false;
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (messages.length === 0 && !isLoadingMore) {
    return (
      <div className={styles.emptyState}>
        <MessageSquare size={64} className={styles.emptyIcon} strokeWidth={1.5} />
        <p className={styles.emptyText}>Aún no hay mensajes</p>
        <p className={styles.emptySubtext}>Inicia la conversación enviando un mensaje</p>
      </div>
    );
  }

  // Validación: Si no hay groupCounts, no renderizar Virtuoso
  if (!groupCounts || groupCounts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <MessageSquare size={64} className={styles.emptyIcon} strokeWidth={1.5} />
        <p className={styles.emptyText}>Cargando mensajes...</p>
      </div>
    );
  }

  return (
    <div className={styles.virtuosoContainer}>
      <GroupedVirtuoso
        ref={virtuosoRef}
        style={{ height: "100%", width: "100%" }}
        groupCounts={groupCounts}
        groupContent={renderGroupHeader}
        itemContent={renderItem}
        startReached={handleStartReached}
        components={{
          Header: renderHeader,
          Footer: renderFooter,
        }}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        followOutput={handleFollowOutput}
        overscan={200}
        increaseViewportBy={{ top: 200, bottom: 200 }}
        alignToBottom
      />
    </div>
  );
};
