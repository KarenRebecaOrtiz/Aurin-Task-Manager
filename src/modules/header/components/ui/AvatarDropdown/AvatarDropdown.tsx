'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import { useFirestoreUser } from '../../../hooks'; // Ajustado
import styles from './AvatarDropdown.module.scss';
import { motion, AnimatePresence } from 'framer-motion';
import { useAvailabilityStatus } from '@/hooks/useAvailabilityStatus';
import { ProfileCard } from '@/modules/profile-card';
import { Small, Muted } from '@/components/ui/Typography';
import { dropdownAnimations } from '@/modules/shared/components/molecules/Dropdown/animations';
import { ConfigDialog } from '@/modules/config';
import { Cog, LogOut } from '@/components/animate-ui/icons';
import { Sun } from '@/components/animate-ui/icons/sun';
import { Moon } from '@/components/animate-ui/icons/moon';
import { useTheme } from '@/contexts/ThemeContext';
import { useMediaQuery } from '@/modules/dialogs/hooks/useMediaQuery';
import { SettingsDrawer } from './SettingsDrawer';

const AvatarDropdown = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { firestoreUser } = useFirestoreUser(); // Hook centralizado
  const { isDarkMode, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { currentStatus: onlineStatus } = useAvailabilityStatus();
  const isMobile = useMediaQuery('(max-width: 767px)');

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
    setIsConfigModalOpen(true);
    setIsDropdownOpen(false);
  }, []);

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
    if (isMobile) {
      setIsSettingsDrawerOpen(true);
    } else {
      setIsDropdownOpen((prev) => !prev);
    }
  }, [isMobile]);

  const handleCloseSettingsDrawer = useCallback(() => {
    setIsSettingsDrawerOpen(false);
  }, []);

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
    setIsDropdownOpen(false);
  }, [toggleTheme]);

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

                <motion.button
                  onClick={handleConfig}
                  className={styles.dropdownItem}
                  {...dropdownAnimations.item(0)}
                  role="menuitem"
                >
                  <Cog size={16} animateOnHover loop className={styles.dropdownIcon} />
                  Configuración
                </motion.button>

                <motion.button
                  onClick={handleToggleTheme}
                  className={styles.dropdownItem}
                  {...dropdownAnimations.item(1)}
                  role="menuitem"
                >
                  {isDarkMode ? (
                    <Sun size={16} animateOnHover loop className={styles.dropdownIcon} />
                  ) : (
                    <Moon size={16} animateOnHover loop className={styles.dropdownIcon} />
                  )}
                  {isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                </motion.button>

                <motion.button
                  onClick={handleLogout}
                  className={styles.dropdownItem}
                  {...dropdownAnimations.item(2)}
                  role="menuitem"
                >
                  <LogOut size={16} animateOnHover loop className={styles.dropdownIcon} />
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

      {/* Config Dialog Modal */}
      {user && (
        <ConfigDialog
          isOpen={isConfigModalOpen}
          onOpenChange={setIsConfigModalOpen}
          userId={user.id}
        />
      )}

      {/* Settings Drawer for Mobile */}
      <SettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={handleCloseSettingsDrawer}
        userId={user?.id}
      />
    </>
  );
};

export default AvatarDropdown;