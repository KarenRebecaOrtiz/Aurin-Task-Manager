'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CirclePlus, Users } from 'lucide-react';
import { List } from '@/components/animate-ui/icons/list';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import { Unplug } from '@/components/animate-ui/icons/unplug';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import styles from './DesktopFloatingNav.module.scss';

// Route mapping for prefetch
const VIEW_ROUTES = {
  table: '/dashboard/tasks',
  kanban: '/dashboard/kanban',
  archive: '/dashboard/archive',
  teams: '/dashboard/teams',
} as const;

type ViewType = 'table' | 'kanban' | 'archive' | 'teams';

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
        <TooltipContent side="top" sideOffset={12}>
          <p>{tooltip}</p>
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
    router.prefetch(VIEW_ROUTES.teams);
  }, [router]);

  // Determine current view from pathname if not provided
  const getViewFromPathname = useCallback((): ViewType => {
    if (currentView) return currentView;
    if (pathname.includes('/kanban')) return 'kanban';
    if (pathname.includes('/archive')) return 'archive';
    if (pathname.includes('/teams')) return 'teams';
    return 'table';
  }, [currentView, pathname]);

  const [activeView, setActiveView] = useState<ViewType>(() => getViewFromPathname());

  // Sync with pathname changes
  useEffect(() => {
    const newView = getViewFromPathname();
    setActiveView(newView);
  }, [getViewFromPathname]);

  const handleViewChange = (view: ViewType) => {
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
  };

  // Don't render on server or if not mounted
  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  const floatingNav = (
    <motion.nav
      className={styles.floatingNav}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.1,
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
        {/* Table View */}
        <NavButton
          icon={<List animateOnHover className={styles.navIcon} />}
          label="Tabla"
          isActive={activeView === 'table'}
          onClick={() => handleViewChange('table')}
          tooltip="Vista de Tabla"
        />

        {/* Kanban View */}
        <NavButton
          icon={<LayoutDashboard animateOnHover className={styles.navIcon} />}
          label="Kanban"
          isActive={activeView === 'kanban'}
          onClick={() => handleViewChange('kanban')}
          tooltip="Vista Kanban"
        />

        {/* Create Task - Primary Action */}
        <NavButton
          icon={<CirclePlus className={styles.primaryIcon} />}
          label="Crear Tarea"
          onClick={openCreateTask}
          variant="primary"
          tooltip="Crear Nueva Tarea"
        />

        {/* Teams */}
        <NavButton
          icon={<Users className={styles.navIcon} />}
          label="Teams"
          isActive={activeView === 'teams'}
          onClick={() => handleViewChange('teams')}
          tooltip="Teams"
        />

        {/* Archive View */}
        <NavButton
          icon={<Unplug animateOnHover className={styles.navIcon} />}
          label="Archivo"
          isActive={activeView === 'archive'}
          onClick={() => handleViewChange('archive')}
          tooltip="Archivo Muerto"
        />
      </motion.div>
    </motion.nav>
  );

  // Render as portal to body
  return createPortal(floatingNav, document.body);
};

export default DesktopFloatingNav;
