'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CirclePlus, Users, ClipboardList } from 'lucide-react';
import { Unplug } from '@/components/animate-ui/icons/unplug';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useScrollDirectionStore } from '@/stores/scrollDirectionStore';
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
  const scrollDirection = useScrollDirectionStore((s) => s.scrollDirection);
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const visibleRef = useRef(true);

  // Mount portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // GSAP: hide/show based on scroll direction
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || isSidebarOpen) return;

    if (scrollDirection === 'down' && visibleRef.current) {
      visibleRef.current = false;
      gsap.to(nav, {
        y: '120%',
        autoAlpha: 0,
        duration: 0.45,
        ease: 'power3.inOut',
        overwrite: true,
      });
    } else if (scrollDirection === 'up' && !visibleRef.current) {
      visibleRef.current = true;
      gsap.to(nav, {
        y: '0%',
        autoAlpha: 1,
        duration: 0.45,
        ease: 'power3.out',
        overwrite: true,
      });
    }
  }, [scrollDirection, isSidebarOpen]);

  // GSAP: hide when sidebar opens, show when it closes
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    if (isSidebarOpen) {
      gsap.to(nav, {
        y: '120%',
        autoAlpha: 0,
        duration: 0.4,
        ease: 'power3.inOut',
        overwrite: true,
      });
      visibleRef.current = false;
    } else {
      gsap.to(nav, {
        y: '0%',
        autoAlpha: 1,
        duration: 0.4,
        ease: 'power3.out',
        overwrite: true,
      });
      visibleRef.current = true;
    }
  }, [isSidebarOpen]);

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
    <nav
      ref={navRef}
      className={styles.floatingNav}
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
    </nav>
  );

  // Render as portal to body
  return createPortal(floatingNav, document.body);
};

export default DesktopFloatingNav;
