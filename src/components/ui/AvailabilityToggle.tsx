/**
 * AvailabilityToggle Component
 * 
 * Componente de toggle para cambiar entre estados "Disponible" y "Ocupado".
 * Forma parte de una aplicación web React/Next.js que gestiona disponibilidad de usuarios.
 * 
 * Funcionalidades:
 * - Toggle visual entre Disponible (verde) y Ocupado (rojo)
 * - Sincronización automática con Firestore
 * - Estados de carga y disabled apropiados
 * - Responsive design con SCSS
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAvailabilityStatus } from '@/hooks/useAvailabilityStatus';
import styles from './AvailabilityToggle.module.scss';

const AvailabilityToggle = () => {
  const { currentStatus, updateStatus, isLoading: hookLoading } = useAvailabilityStatus();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Evitar errores de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = async () => {
    if (isLoading || hookLoading || !mounted) return;

    setIsLoading(true);
    try {
      // Solo permitir toggle entre Disponible y Ocupado
      const newStatus = currentStatus === 'Disponible' ? 'Ocupado' : 'Disponible';
      await updateStatus(newStatus);
    } catch (error) {
      console.error('[AvailabilityToggle] Error updating status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // No renderizar hasta que esté montado en el cliente o esté cargando
  if (!mounted || hookLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.switch}>
          <svg
            className={styles.icon}
            viewBox="0 0 512 512"
            height="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V256c0 17.7 14.3 32 32 32s32-14.3 32-32V32zM143.5 120.6c13.6-11.3 15.4-31.5 4.1-45.1s-31.5-15.4-45.1-4.1C49.7 115.4 16 181.8 16 256c0 132.5 107.5 240 240 240s240-107.5 240-240c0-74.2-33.8-140.6-86.6-184.6c-13.6-11.3-33.8-9.4-45.1 4.1s-9.4 33.8 4.1 45.1c38.9 32.3 63.5 81 63.5 135.4c0 97.2-78.8 176-176 176s-176-78.8-176-176c0-54.4 24.7-103.1 63.5-135.4z"
            />
          </svg>
        </div>
      </div>
    );
  }

  const isAvailable = currentStatus === 'Disponible';
  const isToggleDisabled = isLoading || hookLoading || currentStatus === 'Fuera';

  return (
    <div className={styles.container}>
      <input
        type="checkbox"
        id="availability-toggle"
        className={styles.checkbox}
        checked={!isAvailable}
        onChange={handleToggle}
        disabled={isToggleDisabled}
        title={isToggleDisabled ? 'No disponible cuando está fuera de línea' : 'Cambiar entre Disponible y Ocupado'}
      />
      <label htmlFor="availability-toggle" className={styles.switch}>
        <svg
          className={styles.icon}
          viewBox="0 0 512 512"
          height="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V256c0 17.7 14.3 32 32 32s32-14.3 32-32V32zM143.5 120.6c13.6-11.3 15.4-31.5 4.1-45.1s-31.5-15.4-45.1-4.1C49.7 115.4 16 181.8 16 256c0 132.5 107.5 240 240 240s240-107.5 240-240c0-74.2-33.8-140.6-86.6-184.6c-13.6-11.3-33.8-9.4-45.1 4.1s-9.4 33.8 4.1 45.1c38.9 32.3 63.5 81 63.5 135.4c0 97.2-78.8 176-176 176s-176-78.8-176-176c0-54.4 24.7-103.1 63.5-135.4z"
          />
        </svg>
      </label>
    </div>
  );
};

export default AvailabilityToggle; 