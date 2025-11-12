/**
 * ToastContainer - Contenedor de toasts
 * Renderiza todos los toasts del store
 */

'use client';

import React from 'react';
import { useToastStore } from '../store/toastStore';
import { Toast } from './Toast';
import styles from './ToastContainer.module.scss';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  // Agrupar toasts por posición
  const toastsByPosition = toasts.reduce(
    (acc, toast) => {
      const position = toast.position || 'top-right';
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push(toast);
      return acc;
    },
    {} as Record<string, typeof toasts>
  );

  return (
    <>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div
          key={position}
          className={`${styles.toastGroup} ${styles[`position-${position}`]}`}
          role="region"
          aria-label="Notificaciones"
          aria-live="polite"
          aria-atomic="false"
        >
          {positionToasts.map((toast) => (
            <Toast
              key={toast.id}
              config={toast}
              onClose={removeToast}
            />
          ))}
        </div>
      ))}
    </>
  );
};
