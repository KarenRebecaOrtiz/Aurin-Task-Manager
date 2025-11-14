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
  renderMessage: (message: Message) => React.ReactNode;
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
}) => {
  const virtuosoRef = useRef<GroupedVirtuosoHandle>(null);
  const hasInitializedRef = useRef(false);

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
  // SCROLL TO BOTTOM ON NEW MESSAGES
  // ============================================================================

  useEffect(() => {
    // Cuando llegan nuevos mensajes, scroll to bottom
    if (messages.length > 0 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        align: "end",
        behavior: "smooth",
      });
    }
  }, [messages.length]);

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

      return <div className={styles.messageWrapper}>{renderMessage(message)}</div>;
    },
    [messages, renderMessage]
  );

  /**
   * Header con loader (cuando se están cargando mensajes antiguos)
   */
  const renderHeader = useCallback(() => {
    if (!hasMore) return null;

    return (
      <div className={styles.loadingHeader}>
        {isLoadingMore && (
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
        followOutput="smooth"
        overscan={200}
        increaseViewportBy={{ top: 200, bottom: 200 }}
        alignToBottom
      />
    </div>
  );
};
