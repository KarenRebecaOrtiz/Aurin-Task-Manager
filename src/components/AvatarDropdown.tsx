'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useAvailabilityStatus } from '@/hooks/useAvailabilityStatus';
import styles from './AvatarDropdown.module.scss';

const AvatarDropdown = ({ onChangeContainer }: { onChangeContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void }) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentStatus: onlineStatus, isOnline } = useAvailabilityStatus();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Computa status color
  const getStatusColor = useCallback((status: string, isOnline: boolean) => {
    if (isOnline) {
      switch (status) {
        case 'Disponible': return '#178d00';
        case 'Ocupado': return '#d32f2f';
        case 'Por terminar': return '#f57c00';
        default: return '#178d00';
      }
    } else {
      return '#616161'; // Offline
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTareas = useCallback(() => {
    onChangeContainer('tareas');
    setIsOpen(false);
  }, [onChangeContainer]);

  const handleCuentas = useCallback(() => {
    onChangeContainer('cuentas');
    setIsOpen(false);
  }, [onChangeContainer]);

  const handleMiembros = useCallback(() => {
    onChangeContainer('miembros');
    setIsOpen(false);
  }, [onChangeContainer]);

  const handleConfig = useCallback(() => {
    onChangeContainer('config');
    setIsOpen(false);
  }, [onChangeContainer]);

  if (!mounted) return null;

  return (
    <div className={styles.avatarContainer}>
      <button
        className={styles.avatarButton}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Abrir menú de usuario"
        title="Clic para menú"
      >
        <div className={styles.avatar}>
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || 'Avatar'}
              className={styles.avatarImage}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || 'U'}
            </div>
          )}
          <div
            className={styles.statusDot}
            style={{ backgroundColor: getStatusColor(onlineStatus, isOnline) }}
          />
        </div>
      </button>
      
      {isOpen && (
        <div ref={dropdownRef} className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.userName}>{user?.fullName || 'Usuario'}</span>
            <span className={styles.userEmail}>{user?.emailAddresses[0]?.emailAddress}</span>
          </div>
          
          <div className={styles.dropdownMenu}>
            <button onClick={handleTareas} className={styles.menuItem}>
              Tareas
            </button>
            <button onClick={handleCuentas} className={styles.menuItem}>
              Cuentas
            </button>
            <button onClick={handleMiembros} className={styles.menuItem}>
              Miembros
            </button>
            <button onClick={handleConfig} className={styles.menuItem}>
              Configuración
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarDropdown;