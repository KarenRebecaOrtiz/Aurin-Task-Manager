"use client";

import React, { useRef, useEffect } from "react";
import { MessageSquare, ChevronUp, Loader2 } from "lucide-react";
import styles from "../../styles/MessageList.module.scss";
import type { Message } from "../../types";
import { getRelativeDateLabel } from "../../utils";

interface MessageGroup {
  date: Date;
  messages: Message[];
}

interface MessageListProps {
  groupedMessages: MessageGroup[]; // ✅ Recibe groupedMessages del hook (como el original)
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onInitialLoad: () => void;
  renderMessage: (message: Message) => React.ReactNode;
}

export const MessageList: React.FC<MessageListProps> = ({
  groupedMessages,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onInitialLoad,
  renderMessage,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    onInitialLoad();
  }, [onInitialLoad]);

  // ============================================================================
  // RENDERIZADO EXACTO COMO EL ORIGINAL (ChatSidebar.tsx)
  // ============================================================================
  //
  // 1. Mensajes ordenados DESC (más recientes primero) - hecho en el hook
  // 2. Dentro de cada grupo ordenados DESC también - hecho en el hook
  // 3. LoadMoreButton AL FINAL (después de los mensajes)
  // 4. DatePill DESPUÉS de cada grupo de mensajes
  // 5. NO usa column-reverse - flex-direction: column normal
  // ============================================================================

  if (groupedMessages.length === 0 && !isLoadingMore) {
    return (
      <div className={styles.messageList}>
        <div className={styles.emptyState}>
          <MessageSquare size={64} className={styles.emptyIcon} strokeWidth={1.5} />
          <p className={styles.emptyText}>Aún no hay mensajes</p>
          <p className={styles.emptySubtext}>
            Inicia la conversación enviando un mensaje
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className={styles.messageList}
    >
      {/*
        ✅ WHATSAPP STYLE:
        1. LoadMoreButton AL PRINCIPIO (para cargar mensajes más antiguos hacia arriba)
        2. DatePill ANTES de cada grupo
        3. Mensajes ordenados ASC (antiguos primero, nuevos al final)
        4. Scroll automático al bottom muestra mensajes más recientes
      */}

      {/* Load More Button AL PRINCIPIO (para cargar mensajes antiguos) */}
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className={styles.loadMoreButton}
        >
          {isLoadingMore ? (
            <>
              <Loader2 size={16} className={styles.spinner} />
              <span className={styles.loadMoreText}>Cargando...</span>
            </>
          ) : (
            <>
              <ChevronUp size={16} />
              <span className={styles.loadMoreText}>Cargar más mensajes</span>
            </>
          )}
        </button>
      )}

      {groupedMessages.map((group, groupIndex) => {
        const dateKey = group.date instanceof Date && !isNaN(group.date.getTime())
          ? group.date.toISOString()
          : `invalid-date-${groupIndex}`;

        return (
          <React.Fragment key={`${dateKey}-${group.date?.toISOString() || 'unknown'}`}>
            {/* DatePill ANTES de los mensajes del grupo */}
            <div className={styles.dateSeparator}>
              <span className={styles.dateLabel}>
                {getRelativeDateLabel(group.date)}
              </span>
            </div>

            {/* Messages en este grupo (ordenados ASC - antiguos primero) */}
            {group.messages.map((message) => renderMessage(message))}
          </React.Fragment>
        );
      })}

      {/* Div invisible al final para scroll automático (como el chatbot de ejemplo) */}
      <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
    </div>
  );
};
