'use client';

import { useUser } from '@clerk/nextjs';
import AdviceInput from '@/components/ui/AdviceInput';
import ToDoDynamic from '@/components/ToDoDynamic';
import AvailabilityToggle from '@/components/ui/AvailabilityToggle';
import GeoClock from '@/components/ui/GeoClock';
import styles from './Header.module.scss';
import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import AvatarDropdown from '../AvatarDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { TextShimmer } from './TextShimmer';
import { motion } from 'framer-motion';


interface HeaderProps {
  selectedContainer: 'tareas' | 'cuentas' | 'miembros' | 'config';
  isArchiveTableOpen?: boolean;
  onChangeContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void;
  isCreateTaskOpen?: boolean;
  isEditTaskOpen?: boolean;
  hasUnsavedChanges?: boolean;
  personalLocations?: {
    home?: { name: string; address: string; lat: number; lng: number; radius: number };
    secondary?: { name: string; address: string; lat: number; lng: number; radius: number };
  };
}

const Header: React.FC<HeaderProps> = ({
  selectedContainer,
  isArchiveTableOpen,
  onChangeContainer,
  isCreateTaskOpen = false,
  isEditTaskOpen = false,
  hasUnsavedChanges = false,
  personalLocations,
}) => {
  const { user, isLoaded } = useUser();
  const { isAdmin } = useAuth();
  const { isDarkMode } = useTheme();
  const userName = isLoaded && user ? user.firstName || 'Usuario' : 'Usuario';

  // Notification system removed - using NodeMailer instead

  /* ────────────────────────────────────────────
     REFS
  ──────────────────────────────────────────── */
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  // Notification refs removed


  /* ────────────────────────────────────────────
     STATE
  ──────────────────────────────────────────── */
  // Notification state removed

  // Notification system removed - using NodeMailer instead

  // All notification effects removed - using NodeMailer instead



  /* ────────────────────────────────────────────
     EFFECTS – SUN/MOON ICON ENTRANCE
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.6)' },
      );
    }
  }, []);

  // Notification dropdown effects removed - using NodeMailer instead





  /* ────────────────────────────────────────────
     HELPERS
  ──────────────────────────────────────────── */
  const getSubtitle = () => {
    // Si el archivo está abierto, mostrar texto específico para archivo
    if (isArchiveTableOpen) {
      return 'Aquí puedes ver y gestionar todas las tareas archivadas';
    }
    
    switch (selectedContainer) {
      case 'tareas':
        return 'Esta es una lista de tus tareas actuales';
      case 'cuentas':
        return 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización';
      case 'miembros':
        return 'Aquí puedes consultar y gestionar todos los miembros de tu organización';
      case 'config':
        return 'Configura tus preferencias y ajustes personales';
      default:
        return 'Esta es una lista de tus tareas actuales';
    }
  };

  /* ────────────────────────────────────────────
     CONTAINER CHANGE HANDLER WITH UNSAVED CHANGES CHECK
  ──────────────────────────────────────────── */
  const handleContainerChange = useCallback((newContainer: 'tareas' | 'cuentas' | 'miembros' | 'config') => {
    // Si estamos en CreateTask o EditTask, verificar cambios no guardados
    if (isCreateTaskOpen || isEditTaskOpen) {
      if (hasUnsavedChanges) {
        // Si hay cambios no guardados, almacenar el container pendiente y abrir el popup de confirmación
        const { openConfirmExitPopup, setPendingContainer } = useTasksPageStore.getState();
        setPendingContainer(newContainer);
        openConfirmExitPopup();
      } else {
        // Si no hay cambios no guardados, cambiar container directamente
        onChangeContainer(newContainer);
      }
    } else {
      // Comportamiento normal cuando no estamos en modales
      onChangeContainer(newContainer);
    }
  }, [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges, onChangeContainer]);

  // Notification handlers removed - using NodeMailer instead

  // Handlers para eventos del logo
  const handleLogoClick = useCallback(() => {
    handleContainerChange('tareas');
  }, [handleContainerChange]);

  const handleLogoMouseEnter = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.filter = isDarkMode 
      ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5)) brightness(1.1)' 
      : 'drop-shadow(0 6px 12px rgba(255, 255, 255, 0.5)) brightness(1.1)';
  }, [isDarkMode]);

  const handleLogoMouseLeave = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.filter = isDarkMode 
      ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
      : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))';
  }, [isDarkMode]);

  /* ────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────── */
  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.logoAndWelcomeContainer}>
        <div 
          className={styles.logoContainer}
          onClick={handleLogoClick}
          onMouseEnter={handleLogoMouseEnter}
          onMouseLeave={handleLogoMouseLeave}
        >
          <Image
            src={isDarkMode ? '/logoDark.svg' : '/logoLight.svg'}
            alt="Logo"
            width={180}
            height={68}
            priority
            style={{
              transition: 'all 0.3s ease',
              filter: isDarkMode 
                ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
                : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))'
            }}
          />
        </div>
        <div className={styles.lefContainer}style={{justifyContent: 'start'}}>
          <div className={styles.AvatarMobile}>
            <AvatarDropdown onChangeContainer={handleContainerChange} />
          </div>
          <div className={styles.frame14}>
            <div className={styles.title}>
              <div className={styles.welcome}>
                <span className={styles.welcomeText}>
                  Te damos la bienvenida de nuevo,{' '}
                  <TextShimmer as="span" className={styles.userNameShimmer}>
                    {userName}
                  </TextShimmer>
                </span>
                {isAdmin && (
                  <motion.div 
                    className={styles.adminBadge}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.5
                    }}
                    whileHover={{ 
                      scale: 1.15, 
                      rotate: 5,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className={styles.adminBadgeInner}>
                      <Image
                        src="/verified.svg"
                        alt="Admin Verified"
                        width={16}
                        height={16}
                        className={styles.adminBadgeIcon}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            <div className={styles.text}>
              <div className={styles.subtitle}>{getSubtitle()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.headerContainer}>
        <div className={styles.superiorHeader}>
          <GeoClock personalLocations={personalLocations} />

          <div className={styles.todoContainer}>
            <ToDoDynamic />
          </div>

          <div className={styles.availabilityContainer}>
            <AvailabilityToggle />
          </div>

          {/* Notification system removed - using NodeMailer instead */}

          <div className={styles.AvatarDesktop}>
            <AvatarDropdown onChangeContainer={handleContainerChange} />
          </div>
        </div>
        <div className={styles.adviceContainer}>
          <AdviceInput isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
};

export default Header;