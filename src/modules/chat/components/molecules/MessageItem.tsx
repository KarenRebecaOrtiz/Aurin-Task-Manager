"use client";

import React, { useState, forwardRef, memo, useRef, useCallback } from "react";
import Image from "next/image";
import sanitizeHtml from "sanitize-html";
import { useDataStore } from "@/stores/dataStore";
import { GradientAvatar } from "@/components/ui/GradientAvatar";
import styles from "../../styles/MessageItem.module.scss";
import type { Message, ChatUser } from "../../types";
import { markdownToHtml, formatMessageTime } from "../../utils";
import { formatDecimalHoursToReadable } from "../../timer/utils/timerFormatters";
import { MessageActionButton } from "../atoms/MessageActionButton";
import { MessageActionMenu } from "./MessageActionMenu";
import { MessageReactions } from "./MessageReactions";
import { reactionsService } from "../../services/reactionsService";
import { getMessagePosition, type MessagePosition } from "../../utils/messageGrouping";

interface MessageItemProps {
  message: Message;
  prevMessage?: Message | null; // Para grouping
  nextMessage?: Message | null; // Para grouping
  users?: ChatUser[]; // ✅ Ahora opcional - fallback a dataStore
  usersMap?: Map<string, ChatUser>; // ✅ Opcional: Map para búsqueda O(1)
  isOwn: boolean;
  userId: string;
  taskId: string; // Necesario para reactions
  onImagePreview?: (src: string) => void;
  onRetryMessage?: (message: Message) => void;
  onCopy?: (text: string) => void;
  onEdit?: (message: Message) => void;
  onEditTime?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onDownload?: (message: Message) => void;
  onReplyClick?: (messageId: string) => void; // Scroll to reply
}

/**
 * MessageItem - Componente de mensaje individual migrado a dataStore
 *
 * Cambios:
 * - users ahora es opcional - usa dataStore como fallback
 * - Busca avatares en dataStore si no se pasan users
 * - Backward compatible con código existente
 *
 * Muestra un mensaje con:
 * - Avatar del usuario
 * - Contenido (texto, imagen, archivo)
 * - Acciones (copiar, editar, eliminar, responder)
 * - Estados (pending, error)
 * - Drag-to-reply
 */
export const MessageItem = memo(
  forwardRef<HTMLDivElement, MessageItemProps>(
    (
      {
        message,
        prevMessage,
        nextMessage,
        users,
        usersMap,
        isOwn,
        userId,
        taskId,
        onImagePreview,
        onRetryMessage,
        onCopy,
        onEdit,
        onEditTime,
        onDelete,
        onDownload,
        onReplyClick,
      },
      ref
    ) => {
      const actionButtonRef = useRef<HTMLButtonElement>(null);
      const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

      // ✅ Si no se pasan users, obtenerlos del dataStore
      const storeUsers = useDataStore((state) => state.users);
      const effectiveUsers = users || storeUsers;

      // Calcular posición en el grupo
      const position: MessagePosition = getMessagePosition(
        message,
        prevMessage || null,
        nextMessage || null
      );

      const showAvatar = position === "single" || position === "last";
      const showName = position === "single" || position === "first";
      const showTimestamp = position === "single" || position === "last";

      // ✅ Buscar datos del usuario con fallback a dataStore
      const senderData = React.useMemo(() => {
        let user: any = null;

        // Si hay usersMap (búsqueda O(1)), usarlo
        if (usersMap) {
          user = usersMap.get(message.senderId);
        } else {
          // Fallback: búsqueda O(n) en array efectivo (con dataStore como fallback)
          user = effectiveUsers.find((u) => u.id === message.senderId);
        }

        return {
          imageUrl: user?.imageUrl || "/default-avatar.svg",
          status: user?.status,
          lastActive: user?.lastActive,
        };
      }, [usersMap, effectiveUsers, message.senderId]);

      const senderAvatar = senderData.imageUrl;

      // Umbral de inactividad (5 minutos)
      const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;

      // Calcular color del status dot
      const getStatusColor = React.useCallback((): string => {
        const { status, lastActive } = senderData;

        // Si está inactivo, mostrar gris
        if (lastActive) {
          const lastActiveTime = new Date(lastActive).getTime();
          const isInactive = Date.now() - lastActiveTime > INACTIVITY_THRESHOLD_MS;
          if (isInactive) return '#616161';
        }

        // Usar status manual
        switch (status) {
          case 'Disponible':
            return '#178d00';
          case 'Ocupado':
            return '#d32f2f';
          case 'Por terminar':
            return '#f57c00';
          case 'Fuera':
          default:
            return '#616161';
        }
      }, [senderData]);

      const handleActionButtonClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsActionMenuOpen(prev => !prev);
      }, []);

      const handleCopy = useCallback((text: string) => {
        if (onCopy) {
          onCopy(text);
        } else {
          navigator.clipboard.writeText(text);
        }
      }, [onCopy]);

      const handleEdit = useCallback((msg: Message) => {
        if (onEdit) {
          onEdit(msg);
        }
      }, [onEdit]);

      const handleDelete = useCallback((messageId: string) => {
        if (confirm("¿Estás seguro de que quieres eliminar este mensaje?")) {
          if (onDelete) {
            onDelete(messageId);
          }
        }
      }, [onDelete]);

      const handleAddReaction = useCallback(async (emoji: string) => {
        try {
          await reactionsService.toggleReaction(taskId, message.id, emoji, userId);
        } catch {
          // Silently fail - reactions are non-critical
        }
      }, [taskId, message.id, userId]);

      const handleRemoveReaction = useCallback(async (emoji: string) => {
        try {
          await reactionsService.toggleReaction(taskId, message.id, emoji, userId);
        } catch {
          // Silently fail - reactions are non-critical
        }
      }, [taskId, message.id, userId]);

      const handleImageClick = useCallback(() => {
        if (onImagePreview && message.imageUrl) {
          onImagePreview(message.imageUrl);
        }
      }, [message.imageUrl, onImagePreview]);

      const handleDownload = useCallback(() => {
        if (onDownload) {
          onDownload(message);
        }
      }, [onDownload, message]);

      const handleRetry = useCallback(() => {
        if (onRetryMessage) {
          onRetryMessage(message);
        }
      }, [onRetryMessage, message]);

      const handleReplyClick = useCallback(() => {
        if (onReplyClick && message.replyTo) {
          onReplyClick(message.replyTo.id);
        }
      }, [onReplyClick, message.replyTo]);

      const handleCloseActionMenu = useCallback(() => {
        setIsActionMenuOpen(false);
      }, []);

      const renderMessageContent = () => {
        return (
          <>
            {/* Reply Preview */}
            {message.replyTo && (
              <div
                className={styles.replyPreview}
                onClick={handleReplyClick}
                style={{ cursor: onReplyClick ? "pointer" : "default" }}
              >
                <div className={styles.replyAuthor}>{message.replyTo.senderName}</div>
                <div className={styles.replyText}>
                  {message.replyTo.text || (message.replyTo.imageUrl && "📷 Imagen")}
                </div>
              </div>
            )}

            {/* Text & Markdown */}
            {message.text && (
              <div
                className={styles.messageText}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(markdownToHtml(message.text), {
                    allowedTags: ["b", "strong", "em", "i", "ul", "li", "br", "h1", "h2", "h3", "p"],
                    allowedAttributes: {},
                  }),
                }}
              />
            )}

            {/* Image */}
            {message.imageUrl && (
              <div className={styles.imageContainer} onClick={handleImageClick}>
                <Image
                  src={message.imageUrl}
                  alt="Archivo adjunto"
                  width={300}
                  height={200}
                  style={{ objectFit: "cover" }}
                />
              </div>
            )}

            {/* File */}
            {message.fileUrl && (
              <div className={styles.fileAttachment} onClick={handleDownload}>
                <div className={styles.fileIcon}>
                  <Image src="/File.svg" alt="File" width={16} height={16} />
                </div>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{message.fileName || "Descargar archivo"}</div>
                  <div className={styles.fileSize}>{message.fileType}</div>
                </div>
              </div>
            )}

            {/* Time Log */}
            {message.hours && (
              <div className={styles.timeLog}>
                <Image src="/Clock.svg" alt="Tiempo" width={16} height={16} />
                <span>{formatDecimalHoursToReadable(message.hours)} registrados</span>
                {message.dateString && (
                  <span className={styles.timestamp}>
                    {' • '}
                    {(() => {
                      if (typeof message.dateString === 'string') {
                        return message.dateString;
                      }
                      const dateObj = (message.dateString as any)?.toDate?.();
                      if (dateObj instanceof Date) {
                        return dateObj.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
                      }
                      return '';
                    })()}
                  </span>
                )}
              </div>
            )}
          </>
        );
      };

      const renderStatus = () => {
        if (message.isPending) {
          return (
            <div className={`${styles.statusIcon} ${styles.pending}`}>
              <span className={styles.timestamp}>Enviando...</span>
            </div>
          );
        }

        if (message.hasError && isOwn) {
          return (
            <div className={styles.errorBanner}>
              <Image src="/AlertCircle.svg" alt="Error" width={14} height={14} />
              <span>Error al enviar</span>
              <button onClick={handleRetry} className={styles.retryButton}>
                Reintentar
              </button>
            </div>
          );
        }

        return null;
      };

      return (
        <div
          ref={ref}
          className={`${styles.messageWrapper} ${styles[position]} ${message.isPending ? styles.pending : ""} ${
            message.hasError ? styles.error : ""
          }`}
        >
          <div className={styles.message}>
            {/* Avatar - solo en single/last */}
            {showAvatar ? (
              <div className={styles.avatar}>
                {senderAvatar && senderAvatar !== "/default-avatar.svg" ? (
                  <Image
                    src={senderAvatar}
                    alt={message.senderName}
                    width={36}
                    height={36}
                  />
                ) : (
                  <GradientAvatar
                    seed={message.senderName || message.senderId}
                    size="md"
                    animated={false}
                  />
                )}
                {/* Status indicator dot */}
                <span
                  className={styles.statusDot}
                  style={{ backgroundColor: getStatusColor() }}
                />
              </div>
            ) : (
              <div className={styles.avatarPlaceholder} />
            )}

            {/* Message Content */}
            <div className={styles.messageContent}>
              {/* Header - solo en single/first */}
              {showName && (
                <div className={styles.metadata}>
                  <span className={styles.senderName}>{message.senderName}</span>
                  {showTimestamp && (
                    <span className={styles.timestamp}>
                      {message.timestamp ? formatMessageTime(message.timestamp instanceof Date ? message.timestamp : message.timestamp.toDate()) : ""}
                    </span>
                  )}
                </div>
              )}

              {/* Bubble */}
              <div className={styles.bubble}>{renderMessageContent()}</div>

              {/* Timestamp - solo en single/last si no se mostró arriba */}
              {!showName && showTimestamp && (
                <span className={styles.timestamp}>
                  {message.timestamp ? formatMessageTime(message.timestamp instanceof Date ? message.timestamp : message.timestamp.toDate()) : ""}
                </span>
              )}

              {/* Status */}
              {renderStatus()}
            </div>

            {/* Action Button */}
            <MessageActionButton
              ref={actionButtonRef}
              onClick={handleActionButtonClick}
              isActive={isActionMenuOpen}
            />
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <MessageReactions
              reactions={message.reactions}
              currentUserId={userId}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          )}

          {/* Action Menu */}
          <MessageActionMenu
            message={message}
            isOpen={isActionMenuOpen}
            onClose={handleCloseActionMenu}
            triggerRef={actionButtonRef}
            userId={userId}
            onCopy={handleCopy}
            onEdit={handleEdit}
            onEditTime={onEditTime}
            onDelete={handleDelete}
            onDownload={onDownload}
          />
        </div>
      );
    }
  )
);

MessageItem.displayName = "MessageItem";
