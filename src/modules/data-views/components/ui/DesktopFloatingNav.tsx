'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CirclePlus, Users, ClipboardList } from 'lucide-react';
import { Unplug } from '@/components/animate-ui/icons/unplug';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import styles from './DesktopFloatingNav.module.scss';

// Route mapping for prefetch
const VIEW_ROUTES = {
  tasks: '/dashboard/tasks',
  archive: '/dashboard/archive',
  teams: '/dashboard/teams',
} as const;

type ViewType = 'tasks' | 'archive' | 'teams';

interface DesktopFloatingNavProps {
  currentView?: ViewType;
  onViewChange?: (view: ViewType) => void;
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'ghost';
  tooltip?: string;
}

const NavButton: React.FC<NavButtonProps> = ({
  icon,
  label,
  isActive = false,
  onClick,
  variant = 'ghost',
  tooltip,
}) => {
  const buttonContent = (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Button
        variant={variant === 'primary' ? 'default' : 'ghost'}
        size="icon"
        className={twMerge(
          clsx(
            'relative transition-all duration-200',
            variant === 'primary' && styles.primaryButton,
            variant === 'ghost' && isActive && styles.activeButton,
            variant === 'ghost' && !isActive && styles.ghostButton
          )
        )}
        onClick={onClick}
        aria-label={label}
      >
        <span className={styles.iconWrapper}>{icon}</span>
      </Button>
    </motion.div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent side="top" sideOffset={12} className={styles.tooltipContent}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
};

export const DesktopFloatingNav: React.FC<DesktopFloatingNavProps> = ({
  currentView,
  onViewChange,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const openCreateTask = useTasksPageStore((state) => state.openCreateTask);
  const isSidebarOpen = useSidebarStateStore((state) => state.isOpen);
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
  const getViewFromPathname = useCallback((): ViewType => {
    if (currentView) return currentView;
    if (pathname.includes('/archive')) return 'archive';
    if (pathname.includes('/teams')) return 'teams';
    // Both /tasks and /kanban are part of "tasks" section now
    return 'tasks';
  }, [currentView, pathname]);

  const [activeView, setActiveView] = useState<ViewType>(() => getViewFromPathname());

  // Sync with pathname changes
  useEffect(() => {
    const newView = getViewFromPathname();
    setActiveView(newView);
  }, [getViewFromPathname]);

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

  const floatingNav = (
    <motion.nav
      className={styles.floatingNav}
      initial={{ y: 100, opacity: 0 }}
      animate={isSidebarOpen
        ? { y: 100, opacity: 0, pointerEvents: 'none' as const }
        : { y: 0, opacity: 1, pointerEvents: 'auto' as const }
      }
      exit={{ y: 100, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
    >
      <motion.div
        className={styles.navContainer}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: 0.2,
        }}
      >
        {/* Tasks Section (includes table/kanban views) */}
        <NavButton
          icon={<ClipboardList className={styles.navIcon} />}
          label="Tareas"
          isActive={activeView === 'tasks'}
          onClick={handleTasksClick}
          tooltip="Tareas"
        />

        {/* Teams */}
        <NavButton
          icon={<Users className={styles.navIcon} />}
          label="Teams"
          isActive={activeView === 'teams'}
          onClick={handleTeamsClick}
          tooltip="Teams"
        />

        {/* Archive View */}
        <NavButton
          icon={<Unplug animateOnHover className={styles.navIcon} />}
          label="Archivo"
          isActive={activeView === 'archive'}
          onClick={handleArchiveClick}
          tooltip="Archivo Muerto"
        />

        {/* Create Task - Primary Action */}
        <NavButton
          icon={<CirclePlus className={styles.primaryIcon} />}
          label="Crear Tarea"
          onClick={openCreateTask}
          variant="primary"
          tooltip="Crear Nueva Tarea"
        />
      </motion.div>
    </motion.nav>
  );

  // Render as portal to body
  return createPortal(floatingNav, document.body);
};

export default DesktopFloatingNav;
