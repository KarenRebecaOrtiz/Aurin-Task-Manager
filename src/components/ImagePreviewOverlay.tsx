'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MessageSidebar.module.scss';

interface ImagePreviewOverlayProps {
  src: string;
  alt: string;
  fileName?: string;
  onClose: () => void;
}

const ImagePreviewOverlay: React.FC<ImagePreviewOverlayProps> = ({ src, alt, fileName, onClose }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName || 'imagen';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div 
        className={styles.imagePreviewOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <motion.div 
          className={styles.imagePreviewContainer}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ 
            duration: 0.4, 
            ease: "easeOut",
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            className={styles.imageWrapper}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: 0.1,
              ease: "easeOut"
            }}
          >
            <Image 
              src={src} 
              alt={alt} 
              width={800} 
              height={600} 
              sizes="90vw" 
              draggable="false"
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '90vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto',
                borderRadius: '12px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
              }}
            />
          </motion.div>
          
          <motion.div
            className={styles.overlayControls}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ 
              duration: 0.3, 
              delay: 0.2,
              ease: "easeOut"
            }}
          >
            <button 
              className={styles.downloadButton} 
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              title="Descargar imagen"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button 
              className={styles.closeButton} 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Cerrar"
            >
              ×
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.getElementById('portal-root')!
  );
};

export default ImagePreviewOverlay;