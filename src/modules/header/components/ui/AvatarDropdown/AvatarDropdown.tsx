'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestoreUser } from '../../../hooks'; // Ajustado
import styles from './AvatarDropdown.module.scss';
import { motion, AnimatePresence } from 'framer-motion';
import { useAvailabilityStatus } from '@/hooks/useAvailabilityStatus';
import ThemeToggler from '../../theme-toggler';
import { useTheme } from '@/contexts/ThemeContext';
import { ProfileCard } from '@/modules/profile-card';
import { Small, Muted } from '@/components/ui/Typography';
import { dropdownAnimations } from '@/modules/shared/components/molecules/Dropdown/animations';

const AvatarDropdown = ({ onChangeContainer }: { onChangeContainer?: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void }) => {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { firestoreUser } = useFirestoreUser(); // Hook centralizado
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { currentStatus: onlineStatus } = useAvailabilityStatus();
  const { isDarkMode } = useTheme();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Menu item handlers
  const handleConfig = useCallback(() => {
    if (onChangeContainer) {
      onChangeContainer('config');
    } else {
      router.push('/dashboard/settings');
    }
    setIsDropdownOpen(false);
  }, [onChangeContainer, router]);

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

  const profilePhoto = firestoreUser?.profilePhoto;
  const displayName = firestoreUser?.fullName || user?.fullName || 'Usuario';

  return (
    <>
      <div ref={dropdownRef} className={styles.avatarContainer}>
        <motion.button
          className={styles.avatarButton}
          onClick={handleToggleDropdown}
          onDoubleClick={handleProfileClick}
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
          aria-label="Abrir menú de usuario"
          title="Clic para menú, doble clic para ver perfil"
          {...dropdownAnimations.trigger}
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
        </motion.button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              className={styles.dropdown}
              {...dropdownAnimations.menu}
              role="menu"
            >
              <div className={styles.dropdownHeader}>
                <Small className={styles.userName}>{displayName}</Small>
                <Muted className={styles.userEmail}>{user?.emailAddresses[0]?.emailAddress}</Muted>
              </div>

              <div className={styles.dropdownMenu}>
                <div className={styles.sectionLabel}>Configuración</div>

                <motion.div
                  className={styles.dropdownItem}
                  {...dropdownAnimations.item(0)}
                  role="menuitem"
                >
                  <div className={styles.dropdownItemContent}>
                    <Image
                      src={isDarkMode ? '/sun.svg' : '/moon.svg'}
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
                    <ThemeToggler variant="dropdown" size="sm" />
                  </div>
                </motion.div>

                <motion.button
                  onClick={handleConfig}
                  className={styles.dropdownItem}
                  {...dropdownAnimations.item(1)}
                  role="menuitem"
                >
                  <Image
                    src="/settings.svg"
                    alt="Configuración"
                    width={16}
                    height={16}
                    className={styles.dropdownIcon}
                  />
                  Configuración
                </motion.button>

                <motion.button
                  onClick={handleLogout}
                  className={styles.dropdownItem}
                  {...dropdownAnimations.item(2)}
                  role="menuitem"
                >
                  <Image
                    src="/log-out.svg"
                    alt="Cerrar Sesión"
                    width={16}
                    height={16}
                    className={styles.dropdownIcon}
                  />
                  Cerrar Sesión
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ProfileCard Modal */}
      {isProfileOpen && user && (
        <ProfileCard
          isOpen={isProfileOpen}
          userId={user.id}
          onClose={handleCloseProfile}
        />
      )}
    </>
  );
};

export default AvatarDropdown;