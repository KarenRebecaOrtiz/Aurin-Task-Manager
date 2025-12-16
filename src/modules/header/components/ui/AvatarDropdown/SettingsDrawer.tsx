'use client';

import React, { useCallback } from 'react';
import Image from 'next/image';
import { motion, Variants, Easing } from 'framer-motion';
import { useClerk } from '@clerk/nextjs';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from '@/components/animate-ui/icons';
import { Sun } from '@/components/animate-ui/icons/sun';
import { Moon } from '@/components/animate-ui/icons/moon';
import { Settings } from 'lucide-react';
import { ConfigDialog } from '@/modules/config';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import styles from './SettingsDrawer.module.scss';

// Clerk icon component for admin panel
const ClerkIcon = ({ className }: { className?: string }) => (
  <svg 
    role="img" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    width="20" 
    height="20"
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
    width={20}
    height={20}
    className={className}
    unoptimized
  />
);

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const { signOut } = useClerk();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isAdmin } = useAuth();
  const [isConfigModalOpen, setIsConfigModalOpen] = React.useState(false);

  const handleConfig = useCallback(() => {
    setIsConfigModalOpen(true);
    onClose();
  }, [onClose]);

  const handleLogout = useCallback(() => {
    signOut();
    onClose();
  }, [signOut, onClose]);

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) onClose();
  }, [onClose]);

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        ease: 'easeOut' as Easing,
      },
    }),
  };

  // Calculate item index based on admin status
  let itemIndex = 0;

  return (
    <>
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent compact className={styles.drawerContent}>
          <DrawerHeader className={styles.drawerHeader}>
            <DrawerTitle className={styles.drawerTitle}>Configuración</DrawerTitle>
          </DrawerHeader>

          <div className={styles.drawerBody}>
            {/* Admin Section - Solo visible para admins */}
            {isAdmin && (
              <div className={styles.menuSection}>
                <div className={styles.sectionLabel}>Administración</div>
                <motion.a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.menuItem}
                  custom={itemIndex++}
                  initial="hidden"
                  animate="visible"
                  variants={itemVariants}
                  onClick={onClose}
                >
                  <ClerkIcon className={styles.menuIcon} />
                  <span className={styles.menuText}>Gestionar Usuarios</span>
                </motion.a>
                <motion.a
                  href="https://aurin-payload-cms.vercel.app/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.menuItem}
                  custom={itemIndex++}
                  initial="hidden"
                  animate="visible"
                  variants={itemVariants}
                  onClick={onClose}
                >
                  <PayloadIcon className={styles.menuIcon} />
                  <span className={styles.menuText}>Payload CMS</span>
                </motion.a>
                <div className={styles.separator} />
              </div>
            )}

            {/* Preferences Section */}
            <div className={styles.menuSection}>
              <div className={styles.sectionLabel}>Preferencias</div>
              <motion.button
                onClick={handleConfig}
                className={styles.menuItem}
                custom={itemIndex++}
                initial="hidden"
                animate="visible"
                variants={itemVariants}
              >
                <Settings size={20} className={styles.menuIcon} />
                <span className={styles.menuText}>Configuración</span>
              </motion.button>

              <motion.button
                onClick={handleToggleTheme}
                className={styles.menuItem}
                custom={itemIndex++}
                initial="hidden"
                animate="visible"
                variants={itemVariants}
              >
                {isDarkMode ? (
                  <Sun size={20} animateOnHover loop className={styles.menuIcon} />
                ) : (
                  <Moon size={20} animateOnHover loop className={styles.menuIcon} />
                )}
                <span className={styles.menuText}>
                  {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                </span>
              </motion.button>
            </div>

            <div className={styles.separator} />

            {/* Logout Section - Danger Zone */}
            <div className={styles.menuSection}>
              <motion.button
                onClick={handleLogout}
                className={`${styles.menuItem} ${styles.logoutItem}`}
                custom={itemIndex++}
                initial="hidden"
                animate="visible"
                variants={itemVariants}
              >
                <LogOut size={20} animateOnHover loop className={styles.menuIcon} />
                <span className={styles.menuText}>Cerrar Sesión</span>
              </motion.button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Config Dialog Modal */}
      {userId && (
        <ConfigDialog
          isOpen={isConfigModalOpen}
          onOpenChange={setIsConfigModalOpen}
          userId={userId}
        />
      )}
    </>
  );
};

export default SettingsDrawer;
