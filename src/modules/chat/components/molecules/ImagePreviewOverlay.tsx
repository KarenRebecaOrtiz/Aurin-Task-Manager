"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import styles from "../../styles/ImagePreviewOverlay.module.scss";

interface ImagePreviewOverlayProps {
  imageUrl: string;
  onClose: () => void;
  fileName?: string;
}

/**
 * ImagePreviewOverlay - Overlay para previsualizar imágenes
 * Renderizado en portal con fondo oscuro
 */
export const ImagePreviewOverlay: React.FC<ImagePreviewOverlayProps> = ({
  imageUrl,
  onClose,
  fileName,
}) => {
  // Cerrar con tecla Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevenir scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const overlayContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button onClick={onClose} className={styles.closeButton} aria-label="Cerrar vista previa">
          <Image src="/X.svg" alt="Close" width={24} height={24} />
        </button>

        {/* Image */}
        <div className={styles.imageWrapper}>
          <img src={imageUrl} alt={fileName || "Vista previa"} className={styles.image} />
        </div>

        {/* File Name */}
        {fileName && <div className={styles.fileName}>{fileName}</div>}
      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
};
