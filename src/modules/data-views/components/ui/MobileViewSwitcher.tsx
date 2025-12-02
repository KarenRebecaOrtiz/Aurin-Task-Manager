'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CirclePlus, Bot } from 'lucide-react';
import { List } from '@/components/animate-ui/icons/list';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import { Unplug } from '@/components/animate-ui/icons/unplug';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useChatbotControl } from '@/modules/n8n-chatbot';
import styles from './MobileViewSwitcher.module.scss';

// Route mapping for prefetch
const VIEW_ROUTES = {
  table: '/dashboard/tasks',
  kanban: '/dashboard/kanban',
  archive: '/dashboard/archive',
} as const;

interface MobileViewSwitcherProps {
  currentView?: 'table' | 'kanban' | 'archive';
  onViewChange?: (view: 'table' | 'kanban' | 'archive') => void;
}

interface MobileControlProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

const MobileControl: React.FC<MobileControlProps> = ({ icon, label, isActive, onClick, className }) => {
  return (
    <button
      className={twMerge(clsx(
        styles.navButton,
        isActive && styles.navButtonActive,
        className
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
  const openCreateTask = useTasksPageStore((state) => state.openCreateTask);
  const { openChat } = useChatbotControl();
  const [mounted, setMounted] = useState(false);

  // Mount portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 🚀 PREFETCH: Preload all view routes on mount for instant navigation
  useEffect(() => {
    router.prefetch(VIEW_ROUTES.table);
    router.prefetch(VIEW_ROUTES.kanban);
    router.prefetch(VIEW_ROUTES.archive);
  }, [router]);

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
      // Navigate using prefetched routes
      const route = VIEW_ROUTES[view];
      if (route) {
        router.push(route);
      }
    }
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
            icon={<Bot />}
            label="AI Chat"
            isActive={false}
            onClick={openChat}
          />
          <MobileControl
            icon={<CirclePlus />}
            label=""
            isActive={false}
            onClick={openCreateTask}
            className={styles.createTaskButton}
          />
        </div>
      </nav>
    </>
  );

  // Render as portal to body
  return createPortal(mobileNav, document.body);
};

export default MobileViewSwitcher;
