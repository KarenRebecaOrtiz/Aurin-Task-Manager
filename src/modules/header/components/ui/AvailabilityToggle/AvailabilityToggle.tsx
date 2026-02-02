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
  const { currentStatus, updateStatus, isLoading: hookLoading, isOnline } = useAvailabilityStatus(); // Add isOnline
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = async () => {
    if (isLoading || hookLoading || !mounted) return;

    setIsLoading(true);
    try {
      // Si está "Fuera" o "Por terminar", volver a "Disponible"
      // Si está "Disponible", cambiar a "Ocupado"
      // Si está "Ocupado", cambiar a "Disponible"
      const newStatus = currentStatus === 'Disponible' ? 'Ocupado' : 'Disponible';
      await updateStatus(newStatus);
      console.log('[AvailabilityToggle] Toggle called, newStatus:', newStatus);
    } catch (error) {
      console.error('[AvailabilityToggle] Error updating status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || hookLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="12" fill="#E0E0E0"/>
          </svg>
        </div>
      </div>
    );
  }

  const isAvailable = currentStatus === 'Disponible';
  // Permitir toggle incluso cuando está "Fuera" para que el usuario pueda recuperarse
  const isToggleDisabled = isLoading || hookLoading;

  return (
    <div className={styles.container}>
      <input
        type="checkbox"
        id="availability-toggle"
        className={styles.checkbox}
        checked={!isAvailable}
        onChange={handleToggle}
        disabled={isToggleDisabled}
        title="Cambiar entre Disponible y Ocupado"
      />
      <label htmlFor="availability-toggle" className={styles.switch}>
        <div className={styles.svgContainer}>
          {isAvailable ? (
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className={styles.svgAvailable}
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={styles.svgOccupied}
            >
              <path d="m2 2 20 20"/>
              <path d="M8.35 2.69A10 10 0 0 1 21.3 15.65"/>
              <path d="M19.08 19.08A10 10 0 1 1 4.92 4.92"/>
            </svg>
          )}
        </div>
      </label>
    </div>
  );
};

export default AvailabilityToggle; 