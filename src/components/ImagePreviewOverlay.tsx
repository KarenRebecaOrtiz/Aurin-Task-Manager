'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import styles from './MessageSidebar.module.scss';

interface ImagePreviewOverlayProps {
  src: string;
  alt: string;
  onClose: () => void;
}

const ImagePreviewOverlay: React.FC<ImagePreviewOverlayProps> = ({ src, alt, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <div ref={overlayRef} className={styles.imagePreviewOverlay}>
      <div className={styles.imagePreviewContainer}>
        <Image src={src} alt={alt} width={800} height={600} objectFit="contain" />
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
      </div>
    </div>,
    document.getElementById('portal-root')!
  );
};

export default ImagePreviewOverlay;