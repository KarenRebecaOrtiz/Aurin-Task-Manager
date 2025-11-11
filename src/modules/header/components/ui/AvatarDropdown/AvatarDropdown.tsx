'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './AvatarDropdown.module.scss';
import { gsap } from 'gsap';
import { createPortal } from 'react-dom';
import { useAvailabilityStatus } from '@/hooks/useAvailabilityStatus';
import ThemeToggler from '@/components/ui/ThemeToggler';
import { useTheme } from '@/contexts/ThemeContext';
import ProfileCard from '@/components/ProfileCard';

const AvatarDropdown = ({ onChangeContainer }: { onChangeContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void }) => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [firestoreFullName, setFirestoreFullName] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  // Usar el hook de estado de disponibilidad
  const { currentStatus: onlineStatus } = useAvailabilityStatus();
  const { isDarkMode } = useTheme();

  // Create portal container
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'avatar-dropdown-portal';
    document.body.appendChild(container);
    setPortalContainer(container);
    return () => {
      document.body.removeChild(container);
    };
  }, []);

  // Listen to Firestore user document changes with onSnapshot
  useEffect(() => {
    if (!user?.id || !isLoaded) return;

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfilePhoto(data.profilePhoto || '');
        // También obtener el nombre completo de Firestore
        if (data.fullName) {
          setFirestoreFullName(data.fullName);
          // Actualizar el nombre en Clerk si es diferente
          if (user.fullName !== data.fullName) {
            user.update({ firstName: data.fullName.split(' ')[0], lastName: data.fullName.split(' ').slice(1).join(' ') }).catch(console.error);
          }
        } else {
          setFirestoreFullName(null);
        }
      } else {
        setProfilePhoto('');
      }
    }, () => {
      setProfilePhoto('');
    });

    return () => unsubscribe();
  }, [user?.id, isLoaded, user]);

  // GSAP animation for dropdown
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current && portalContainer) {
      dropdownRef.current.style.display = 'block';
      gsap.fromTo(
        dropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
        },
      );
      gsap.fromTo(
        dropdownRef.current.querySelectorAll(`.${styles.dropdownItem}`),
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.2,
          stagger: 0.05,
          ease: 'power2.out',
          delay: 0.1,
        },
      );
    } else if (!isDropdownOpen && dropdownRef.current) {
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          dropdownRef.current!.style.display = 'none';
        },
      });
    }
  }, [isDropdownOpen, portalContainer]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Menu item handlers
  const handleConfig = useCallback(() => {
    onChangeContainer('config');
    setIsDropdownOpen(false);
  }, [onChangeContainer]);

  const handleLogout = useCallback(() => {
    signOut();
    setIsDropdownOpen(false);
  }, [signOut]);

  const handleProfileClick = useCallback(() => {
    setIsProfileOpen(true);
    setIsDropdownOpen(false);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  const handleToggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  // Get status color based on current status
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Disponible':
        return '#178d00';
      case 'Ocupado':
        return '#d32f2f';
      case 'Por terminar':
        return '#f57c00';
      case 'Fuera':
        return '#616161';
      default:
        return '#178d00';
    }
  }, []);

  // Calculate dropdown position
  const getDropdownPosition = useCallback(() => {
    if (!buttonRef.current) {
      return { top: 0, right: 0 };
    }
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 8,
      right: window.innerWidth - rect.right,
    };
  }, []);

  const dropdownPosition = getDropdownPosition();

  const dropdownMenuContent = useMemo(() => {
    return (
      <div
        ref={dropdownRef}
        className={styles.dropdown}
        style={{
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
          width: '220px',
        }}
      >
        <div className={styles.dropdownHeader}>
          <span className={styles.userName}>{firestoreFullName || user?.fullName || 'Usuario'}</span>
          <span className={styles.userEmail}>{user?.emailAddresses[0]?.emailAddress}</span>
        </div>
        
        <div className={styles.dropdownMenu}>
          {/* Configuración Section */}
          <div className={styles.sectionLabel}>Configuración</div>
          
          {/* Theme Toggle */}
          <div className={styles.dropdownItem}>
            <div className={styles.dropdownItemContent}>
              <Image
                src={isDarkMode ? "/sun.svg" : "/moon.svg"}
                alt="Tema"
                width={16}
                height={16}
                className={styles.dropdownIcon}
                style={{
                  filter: isDarkMode ? 'brightness(0) invert(1)' : 'none',
                }}
              />
              <span>Tema</span>
            </div>
            <div className={styles.themeToggleContainer}>
              <ThemeToggler />
            </div>
          </div>
          
          <button onClick={handleConfig} className={styles.dropdownItem}>
            <Image
              src="/settings.svg"
              alt="Configuración"
              width={16}
              height={16}
              className={styles.dropdownIcon}
            />
            Configuración
          </button>
          <button onClick={handleLogout} className={styles.dropdownItem}>
            <Image
              src="/log-out.svg"
              alt="Cerrar Sesión"
              width={16}
              height={16}
              className={styles.dropdownIcon}
            />
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }, [dropdownPosition, handleConfig, handleLogout, isDarkMode, firestoreFullName, user?.fullName, user?.emailAddresses]);

  return (
    <>
      <div className={styles.avatarContainer}>
        <button
          ref={buttonRef}
          className={styles.avatarButton}
          onClick={handleToggleDropdown}
          onDoubleClick={handleProfileClick}
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
          aria-label="Abrir menú de usuario"
          title="Clic para menú, doble clic para ver perfil"
        >
          {profilePhoto ? (
            <Image
              src={profilePhoto}
              alt="Profile"
              width={40}
              height={40}
              className={styles.avatarImage}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>U</div>
          )}
          <div
            className={styles.statusDot}
            style={{ backgroundColor: getStatusColor(onlineStatus) }}
          />
        </button>
        {isDropdownOpen && portalContainer && createPortal(dropdownMenuContent, portalContainer)}
      </div>
      
      {/* ProfileCard Modal */}
      {isProfileOpen && user && (
        <ProfileCard
          userId={user.id}
          imageUrl={profilePhoto || ''}
          onClose={handleCloseProfile}
        />
      )}
    </>
  );
};

export default AvatarDropdown;