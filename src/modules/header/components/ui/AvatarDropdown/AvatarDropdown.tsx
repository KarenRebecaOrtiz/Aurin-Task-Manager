'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import { useFirestoreUser } from '../../../hooks';
import { useAuth } from '@/contexts/AuthContext';
import styles from './AvatarDropdown.module.scss';
import { motion, AnimatePresence } from 'framer-motion';
import { useAvailabilityStatus } from '@/hooks/useAvailabilityStatus';
import { ProfileCard } from '@/modules/profile-card';
import { Small, Muted } from '@/components/ui/Typography';
import { dropdownAnimations } from '@/modules/shared/components/molecules/Dropdown/animations';
import { ConfigDialog } from '@/modules/config';
import { LogOut } from '@/components/animate-ui/icons';
import { Sun } from '@/components/animate-ui/icons/sun';
import { Moon } from '@/components/animate-ui/icons/moon';
import { Settings } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useMediaQuery } from '@/modules/dialogs/hooks/useMediaQuery';
import { SettingsDrawer } from './SettingsDrawer';

// Clerk icon component for admin panel
const ClerkIcon = ({ className }: { className?: string }) => (
  <svg 
    role="img" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    width="16" 
    height="16"
    fill="currentColor"
  >
    <path d="m21.47 20.829 -2.881 -2.881a0.572 0.572 0 0 0 -0.7 -0.084 6.854 6.854 0 0 1 -7.081 0 0.576 0.576 0 0 0 -0.7 0.084l-2.881 2.881a0.576 0.576 0 0 0 -0.103 0.69 0.57 0.57 0 0 0 0.166 0.186 12 12 0 0 0 14.113 0 0.58 0.58 0 0 0 0.239 -0.423 0.576 0.576 0 0 0 -0.172 -0.453Zm0.002 -17.668 -2.88 2.88a0.569 0.569 0 0 1 -0.701 0.084A6.857 6.857 0 0 0 8.724 8.08a6.862 6.862 0 0 0 -1.222 3.692 6.86 6.86 0 0 0 0.978 3.764 0.573 0.573 0 0 1 -0.083 0.699l-2.881 2.88a0.567 0.567 0 0 1 -0.864 -0.063A11.993 11.993 0 0 1 6.771 2.7a11.99 11.99 0 0 1 14.637 -0.405 0.566 0.566 0 0 1 0.232 0.418 0.57 0.57 0 0 1 -0.168 0.448Zm-7.118 12.261a3.427 3.427 0 1 0 0 -6.854 3.427 3.427 0 0 0 0 6.854Z" />
  </svg>
);

// Payload CMS icon component for admin panel
const PayloadIcon = ({ className }: { className?: string }) => (
  <Image 
    src="https://pub-d17bbbdbf8e348c5a57c8168ad69c92f.r2.dev/PayloadIconWhite.svg"
    alt="Payload CMS"
    width={16}
    height={16}
    className={className}
    unoptimized
  />
);

const AvatarDropdown = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { firestoreUser } = useFirestoreUser();
  const { isAdmin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
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

  // Close dropdown on scroll with animation
  useEffect(() => {
    const handleScroll = () => {
      if (isDropdownOpen && !isClosing) {
        // Start close animation
        setIsClosing(true);
        // Wait for animation to complete before closing
        setTimeout(() => {
          setIsDropdownOpen(false);
          setIsClosing(false);
        }, 200);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isDropdownOpen, isClosing]);

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

  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
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
              initial={dropdownAnimations.menu.initial}
              animate={isClosing ? { opacity: 0, y: -12, scale: 0.95 } : dropdownAnimations.menu.animate}
              exit={dropdownAnimations.menu.exit}
              transition={{ duration: isClosing ? 0.15 : dropdownAnimations.menu.transition.duration, ease: 'easeInOut' }}
              role="menu"
            >
              {/* 1. Cabecera (Identidad) */}
              <div className={styles.dropdownHeader}>
                <Small className={styles.userName}>{displayName}</Small>
                <Muted className={styles.userEmail}>{user?.emailAddresses[0]?.emailAddress}</Muted>
              </div>

              {/* 2. Zona de Administración (Solo visible para Admins) */}
              {isAdmin && (
                <>
                  <div className={styles.dropdownMenu}>
                    <div className={styles.sectionLabel}>Administración</div>
                    <motion.a
                      href="https://dashboard.clerk.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.dropdownItem}
                      {...dropdownAnimations.item(0)}
                      role="menuitem"
                      onClick={handleCloseDropdown}
                    >
                      <ClerkIcon className={styles.dropdownIcon} />
                      Gestionar Usuarios
                    </motion.a>
                    <motion.a
                      href="https://aurin-payload-cms.vercel.app/admin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.dropdownItem}
                      {...dropdownAnimations.item(1)}
                      role="menuitem"
                      onClick={handleCloseDropdown}
                    >
                      <PayloadIcon className={styles.dropdownIcon} />
                      Payload CMS
                    </motion.a>
                  </div>
                  <div className={styles.separator} />
                </>
              )}

              {/* 3. Preferencias de la App */}
              <div className={styles.dropdownMenu}>
                <div className={styles.sectionLabel}>Preferencias</div>

                <motion.button
                  onClick={handleConfig}
                  className={styles.dropdownItem}
                  {...dropdownAnimations.item(isAdmin ? 2 : 0)}
                  role="menuitem"
                >
                  <Settings size={16} className={styles.dropdownIcon} />
                  Configuración
                </motion.button>

                <motion.button
                  onClick={handleToggleTheme}
                  className={styles.dropdownItem}
                  {...dropdownAnimations.item(isAdmin ? 3 : 1)}
                  role="menuitem"
                >
                  {isDarkMode ? (
                    <Sun size={16} animateOnHover loop className={styles.dropdownIcon} />
                  ) : (
                    <Moon size={16} animateOnHover loop className={styles.dropdownIcon} />
                  )}
                  {isDarkMode ? "Modo Claro" : "Modo Oscuro"}
                </motion.button>
              </div>

              <div className={styles.separator} />

              {/* 4. Zona de Salida (Danger Zone) */}
              <div className={styles.dropdownMenu}>
                <motion.button
                  onClick={handleLogout}
                  className={`${styles.dropdownItem} ${styles.logoutItem}`}
                  {...dropdownAnimations.item(isAdmin ? 4 : 2)}
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