'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CirclePlus, Bot, ClipboardList, Users } from 'lucide-react';
import { Unplug } from '@/components/animate-ui/icons/unplug';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useChatbotControl } from '@/modules/n8n-chatbot';
import { useAuth } from '@/contexts/AuthContext';
import styles from './MobileViewSwitcher.module.scss';

// Route mapping for prefetch
const VIEW_ROUTES = {
  tasks: '/dashboard/tasks',
  archive: '/dashboard/archive',
  teams: '/dashboard/teams',
} as const;

type ViewType = 'tasks' | 'archive' | 'teams';

interface MobileViewSwitcherProps {
  currentView?: ViewType;
  onViewChange?: (view: ViewType) => void;
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
  const { isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Mount portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 🚀 PREFETCH: Preload all view routes on mount for instant navigation
  useEffect(() => {
    router.prefetch(VIEW_ROUTES.tasks);
    router.prefetch(VIEW_ROUTES.archive);
    router.prefetch(VIEW_ROUTES.teams);
  }, [router]);

  // Determine current view from pathname if not provided
  const getCurrentView = useCallback((): ViewType => {
    if (currentView) return currentView;
    if (pathname.includes('/archive')) return 'archive';
    if (pathname.includes('/teams')) return 'teams';
    // Both /tasks and /kanban are part of "tasks" section now
    return 'tasks';
  }, [currentView, pathname]);

  const [activeView, setActiveView] = useState<ViewType>(getCurrentView());

  // Sync with pathname changes
  useEffect(() => {
    const newView = getCurrentView();
    if (newView !== activeView) {
      setActiveView(newView);
    }
  }, [pathname, getCurrentView, activeView]);

  const handleViewChange = useCallback((view: ViewType) => {
    setActiveView(view);

    if (onViewChange) {
      onViewChange(view);
    } else {
      const route = VIEW_ROUTES[view];
      if (route) {
        // Teams is a separate page, use router.push for full navigation
        // Also use router.push when navigating FROM teams to other views
        const isNavigatingToOrFromTeams = view === 'teams' || activeView === 'teams';
        if (isNavigatingToOrFromTeams) {
          router.push(route);
        } else {
          // 🚀 PERFORMANCE: Use window.history.pushState for instant navigation without remount
          window.history.pushState(null, '', route);
          // Trigger popstate event for DataViewsContainer to detect change
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }
    }
  }, [onViewChange, activeView, router]);

  const handleTasksClick = useCallback(() => {
    handleViewChange('tasks');
  }, [handleViewChange]);

  const handleTeamsClick = useCallback(() => {
    handleViewChange('teams');
  }, [handleViewChange]);

  const handleArchiveClick = useCallback(() => {
    handleViewChange('archive');
  }, [handleViewChange]);

  // Don't render on server or if not mounted
  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  const mobileNav = (
    <>
      <nav className={styles.mobileNav}>
        <div className={styles.navContainer}>
          <MobileControl
            icon={<ClipboardList />}
            label="Tareas"
            isActive={activeView === 'tasks'}
            onClick={handleTasksClick}
          />
          <MobileControl
            icon={<Users />}
            label="Teams"
            isActive={activeView === 'teams'}
            onClick={handleTeamsClick}
          />
          <MobileControl
            icon={<Unplug animateOnHover />}
            label="Archivo"
            isActive={activeView === 'archive'}
            onClick={handleArchiveClick}
          />
          {isAdmin && (
            <MobileControl
              icon={<Bot />}
              label="AI Chat"
              isActive={false}
              onClick={openChat}
            />
          )}
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
