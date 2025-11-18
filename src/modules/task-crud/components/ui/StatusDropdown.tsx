'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import styles from './StatusDropdown.module.scss';

const statusOptions = [
  { label: 'Disponible', value: 'Disponible' },
  { label: 'Ocupado', value: 'Ocupado' },
  { label: 'Por terminar', value: 'Por terminar' },
  { label: 'Fuera', value: 'Fuera' },
];

const StatusDropdown = () => {
  const { user } = useUser();
  const [status, setStatus] = useState('Disponible');
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Crear contenedor para el portal
  useEffect(() => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    setPortalContainer(container);
    return () => {
      document.body.removeChild(container);
    };
  }, []);

  // Cargar el estado inicial desde Firestore
  useEffect(() => {
    if (!user?.id) return;

    const fetchStatus = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setStatus(userData.status || 'Disponible');
        }
      } catch {
        // Error fetching status
      }
    };

    fetchStatus();
  }, [user?.id]);

  // Actualizar el estado en Firestore
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!user?.id) return;

    try {
      await updateDoc(doc(db, 'users', user.id), { status: newStatus });
      setStatus(newStatus);
      setIsOpen(false);
    } catch {
      // Error updating status
    }
  }, [user?.id]);

  // Animaciones GSAP
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      gsap.fromTo(
        dropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(
        dropdownRef.current.querySelectorAll(`.${styles.statusOption}`),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.2, stagger: 0.05, ease: 'power2.out', delay: 0.1 }
      );
    } else if (!isOpen && dropdownRef.current) {
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          // Asegurar que el dropdown esté oculto después de la animación
          if (dropdownRef.current) {
            dropdownRef.current.style.display = 'none';
          }
        },
      });
    }
    // Restaurar display al abrir
    if (isOpen && dropdownRef.current) {
      dropdownRef.current.style.display = 'block';
    }
  }, [isOpen]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Manejo de hover
  const handleMouseEnterButton = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleMouseLeaveButton = useCallback(() => {
    // No cerrar inmediatamente, esperar a que el cursor salga del dropdown
  }, []);

  const handleMouseEnterDropdown = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleMouseLeaveDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOptionClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const newStatus = event.currentTarget.dataset.status;
    if (newStatus) {
        handleStatusChange(newStatus);
    }
  }, [handleStatusChange]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentStatus = statusOptions.find((opt) => opt.value === status) || statusOptions[0];

  // Calcular la posición del dropdown
  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 8, // 8px de margen
      left: rect.left + window.scrollX,
    };
  };

  const dropdownPosition = getDropdownPosition();

  return (
    <div className={styles.statusDropdownWrapper}>
      <button
        ref={buttonRef}
        className={styles.availableForBtn}
        onClick={toggleDropdown}
        onMouseEnter={handleMouseEnterButton}
        onMouseLeave={handleMouseLeaveButton}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className={styles.circle}>
          <div className={styles.dot} style={{ backgroundColor: currentStatus.value === 'Disponible' ? '#178d00' : currentStatus.value === 'Ocupado' ? '#d32f2f' : currentStatus.value === 'Por terminar' ? '#f57c00' : '#616161' }}></div>
          <div className={styles.outline}></div>
        </div>
        {currentStatus.label}
      </button>
      {isOpen &&
        portalContainer &&
        createPortal(
          <div
            ref={dropdownRef}
            className={styles.statusDropdown}
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: buttonRef.current?.offsetWidth || 'auto',
            }}
            onMouseEnter={handleMouseEnterDropdown}
            onMouseLeave={handleMouseLeaveDropdown}
          >
            {statusOptions.map((option) => (
              <div
                key={option.value}
                className={`${styles.statusOption} ${option.value.replace(' ', '_')}`}
                onClick={handleOptionClick}
                data-status={option.value}
                role="option"
                aria-selected={status === option.value}
              >
                {option.label}
              </div>
            ))}
          </div>,
          portalContainer
        )}
    </div>
  );
};

export default StatusDropdown;