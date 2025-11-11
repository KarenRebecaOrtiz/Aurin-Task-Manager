"use client";

import React, { useState, forwardRef, memo, useRef, useCallback } from "react";
import Image from "next/image";
import sanitizeHtml from "sanitize-html";
import styles from "../../styles/MessageItem.module.scss";
import type { Message, ChatUser } from "../../types";
import { markdownToHtml, formatMessageTime } from "../../utils";
import { MessageActionButton } from "../atoms/MessageActionButton";
import { MessageActionMenu } from "./MessageActionMenu";

interface MessageItemProps {
  message: Message;
  users: ChatUser[];
  isOwn: boolean;
  userId: string;
  onImagePreview?: (src: string) => void;
  onRetryMessage?: (message: Message) => void;
  onCopy?: (text: string) => void;
  onEdit?: (message: Message) => void;
  onEditTime?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onDownload?: (message: Message) => void;
}

/**
 * MessageItem - Componente de mensaje individual
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
        users,
        isOwn,
        userId,
        onImagePreview,
        onRetryMessage,
        onCopy,
        onEdit,
        onEditTime,
        onDelete,
        onReply,
        onDownload,
      },
      ref
    ) => {
      const actionButtonRef = useRef<HTMLButtonElement>(null);
      const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

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



      const handleImageClick = useCallback(() => {
        if (onImagePreview && message.imageUrl) {
          onImagePreview(message.imageUrl);
        }
      }, [message.imageUrl, onImagePreview]);

      const handleRetry = useCallback(() => {
        if (onRetryMessage) {
          onRetryMessage(message);
        }
      }, [onRetryMessage, message]);

      const renderMessageContent = () => {
        return (
          <>
            {/* Reply Preview */}
            {message.replyTo && (
              <div className={styles.replyPreview}>
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
                <span>{Math.round(message.hours)} {Math.round(message.hours) !== 1 ? 'horas' : 'hora'} registradas</span>
                {message.dateString && <span className={styles.timestamp}> • {message.dateString}</span>}
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
          className={`${styles.messageWrapper} ${message.isPending ? styles.pending : ""} ${
            message.hasError ? styles.error : ""
          }`}
        >
          <div className={styles.message}>
            {/* Avatar */}
            <div className={styles.avatar}>
              <Image
                src={users.find((u) => u.id === message.senderId)?.imageUrl || "/default-avatar.png"}
                alt={message.senderName}
                width={36}
                height={36}
              />
            </div>

            {/* Message Content */}
            <div className={styles.messageContent}>
              {/* Header */}
              <div className={styles.metadata}>
                <span className={styles.senderName}>{message.senderName}</span>
                <span className={styles.timestamp}>
                  {message.timestamp ? formatMessageTime(message.timestamp instanceof Date ? message.timestamp : message.timestamp.toDate()) : ""}
                </span>
              </div>

              {/* Bubble */}
              <div className={styles.bubble}>{renderMessageContent()}</div>

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

          {/* Action Menu */}
          <MessageActionMenu
            message={message}
            isOpen={isActionMenuOpen}
            onClose={() => setIsActionMenuOpen(false)}
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
