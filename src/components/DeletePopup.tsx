'use client';

import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import styles from './DeletePopup.module.scss';

interface DeletePopupProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

const DeletePopup: React.FC<DeletePopupProps> = ({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const deletePopupRef = useRef<HTMLDivElement>(null);

  // Animation effect
  useEffect(() => {
    const currentDeletePopupRef = deletePopupRef.current;
    if (isOpen && currentDeletePopupRef) {
      gsap.fromTo(
        currentDeletePopupRef,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
      );
    }
    return () => {
      if (currentDeletePopupRef) {
        gsap.killTweensOf(currentDeletePopupRef);
      }
    };
  }, [isOpen]);

  // Block scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset confirm input when popup opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDeleteConfirm('');
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        deletePopupRef.current &&
        !deletePopupRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onCancel();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (deleteConfirm.toLowerCase() === 'eliminar') {
      onConfirm();
    }
  };

  return (
    <div className={styles.deletePopupOverlay}>
      <div className={styles.deletePopup} ref={deletePopupRef}>
        <div className={styles.deletePopupContent}>
          <div className={styles.deletePopupText}>
            <h2 className={styles.deletePopupTitle}>{title}</h2>
            <p className={styles.deletePopupDescription}>
              {description} <strong>Esta acción no se puede deshacer.</strong>
            </p>
          </div>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Escribe 'Eliminar' para confirmar"
            className={styles.deleteConfirmInput}
            autoFocus
          />
          <div className={styles.deletePopupActions}>
            <button
              className={styles.deleteConfirmButton}
              onClick={handleConfirm}
              disabled={deleteConfirm.toLowerCase() !== 'eliminar' || isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
            </button>
            <button
              className={styles.deleteCancelButton}
              onClick={onCancel}
              disabled={isDeleting}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeletePopup;