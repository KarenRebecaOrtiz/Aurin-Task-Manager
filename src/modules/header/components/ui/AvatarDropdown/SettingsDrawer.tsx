'use client';

import React, { useCallback } from 'react';
import { motion, Variants, Easing } from 'framer-motion';
import { useClerk } from '@clerk/nextjs';
import { useTheme } from '@/contexts/ThemeContext';
import { Cog, LogOut } from '@/components/animate-ui/icons';
import { Sun } from '@/components/animate-ui/icons/sun';
import { Moon } from '@/components/animate-ui/icons/moon';
import { ConfigDialog } from '@/modules/config';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { X } from 'lucide-react';
import styles from './SettingsDrawer.module.scss';

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

  return (
    <>
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className={styles.drawerContent}>
          <DrawerHeader className={styles.drawerHeader}>
            <DrawerTitle className={styles.drawerTitle}>Configuración</DrawerTitle>
            <DrawerClose asChild>
              <button className={styles.closeButton} aria-label="Cerrar">
                <X size={20} />
              </button>
            </DrawerClose>
          </DrawerHeader>

          <div className={styles.drawerBody}>
            <div className={styles.menuSection}>
              <motion.button
                onClick={handleConfig}
                className={styles.menuItem}
                custom={0}
                initial="hidden"
                animate="visible"
                variants={itemVariants}
              >
                <Cog size={20} animateOnHover loop className={styles.menuIcon} />
                <span className={styles.menuText}>Configuración</span>
              </motion.button>

              <motion.button
                onClick={handleToggleTheme}
                className={styles.menuItem}
                custom={1}
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
                  {isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                </span>
              </motion.button>

              <div className={styles.separator} />

              <motion.button
                onClick={handleLogout}
                className={`${styles.menuItem} ${styles.logoutItem}`}
                custom={2}
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
