'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { List } from '@/components/animate-ui/icons/list';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import { Unplug } from '@/components/animate-ui/icons/unplug';
import { Cog } from '@/components/animate-ui/icons';
import { SettingsDrawer } from '@/modules/header/components/ui/AvatarDropdown';
import styles from './MobileViewSwitcher.module.scss';

interface MobileViewSwitcherProps {
  currentView?: 'table' | 'kanban' | 'archive';
  onViewChange?: (view: 'table' | 'kanban' | 'archive') => void;
}

interface MobileControlProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const MobileControl: React.FC<MobileControlProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      className={twMerge(clsx(
        styles.navButton,
        isActive && styles.navButtonActive
      ))}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span className={styles.navIcon}>{icon}</span>
      <span className={styles.navLabel}>{label}</span>
    </button>
  );
};

export const MobileViewSwitcher: React.FC<MobileViewSwitcherProps> = ({ currentView, onViewChange }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Determine current view from pathname if not provided
  const getCurrentView = (): 'table' | 'kanban' | 'archive' => {
    if (currentView) return currentView;
    if (pathname.includes('/kanban')) return 'kanban';
    if (pathname.includes('/archive')) return 'archive';
    return 'table';
  };

  const [activeView, setActiveView] = useState<'table' | 'kanban' | 'archive'>(getCurrentView());

  // Sync with pathname changes
  useEffect(() => {
    const newView = getCurrentView();
    if (newView !== activeView) {
      setActiveView(newView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleViewChange = (view: 'table' | 'kanban' | 'archive') => {
    setActiveView(view);

    if (onViewChange) {
      onViewChange(view);
    } else {
      // Navigate to appropriate route
      switch (view) {
        case 'table':
          router.push('/dashboard/tasks');
          break;
        case 'kanban':
          router.push('/dashboard/kanban');
          break;
        case 'archive':
          router.push('/dashboard/archive');
          break;
      }
    }
  };

  const handleSettingsClick = () => {
    setIsSettingsDrawerOpen(true);
  };

  const handleCloseSettingsDrawer = () => {
    setIsSettingsDrawerOpen(false);
  };

  // Don't render on server or if not mounted
  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  const mobileNav = (
    <>
      <nav className={styles.mobileNav}>
        <div className={styles.navContainer}>
          <MobileControl
            icon={<List animateOnHover />}
            label="Tabla"
            isActive={activeView === 'table'}
            onClick={() => handleViewChange('table')}
          />
          <MobileControl
            icon={<LayoutDashboard animateOnHover />}
            label="Kanban"
            isActive={activeView === 'kanban'}
            onClick={() => handleViewChange('kanban')}
          />
          <MobileControl
            icon={<Unplug animateOnHover />}
            label="Archivo"
            isActive={activeView === 'archive'}
            onClick={() => handleViewChange('archive')}
          />
          <MobileControl
            icon={<Cog animateOnHover />}
            label="Configuración"
            isActive={false}
            onClick={handleSettingsClick}
          />
        </div>
      </nav>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsDrawerOpen}
        onClose={handleCloseSettingsDrawer}
        userId={user?.id}
      />
    </>
  );

  // Render as portal to body
  return createPortal(mobileNav, document.body);
};

export default MobileViewSwitcher;
