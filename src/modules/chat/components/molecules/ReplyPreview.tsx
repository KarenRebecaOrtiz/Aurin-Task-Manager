"use client";

import React from "react";
import Image from "next/image";
import styles from "../../styles/ReplyPreview.module.scss";

interface ReplyPreviewProps {
  senderName: string;
  text: string | null;
  imageUrl?: string | null;
  onClose?: () => void;
}

/**
 * ReplyPreview - Vista previa de mensaje al que se está respondiendo
 * Muestra el autor y contenido del mensaje original
 */
export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  senderName,
  text,
  imageUrl,
  onClose,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.author}>{senderName}</div>
        <div className={styles.text}>
          {text || (imageUrl && "📷 Imagen") || "Mensaje"}
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className={styles.closeButton} aria-label="Cancelar respuesta">
          <Image src="/X.svg" alt="Close" width={14} height={14} />
        </button>
      )}
    </div>
  );
};
