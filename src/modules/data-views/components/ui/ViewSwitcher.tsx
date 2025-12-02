'use client';

import React, { useEffect, useState, useContext, createContext, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { List } from '@/components/animate-ui/icons/list';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import { Unplug } from '@/components/animate-ui/icons/unplug';
import { MobileViewSwitcher } from './MobileViewSwitcher';
import styles from './ViewSwitcher.module.scss';

const ViewSwitcherContext = createContext<{
  value: string | null;
  setValue: React.Dispatch<React.SetStateAction<string | null>>;
} | null>(null);

// Route mapping for prefetch
const VIEW_ROUTES = {
  table: '/dashboard/tasks',
  kanban: '/dashboard/kanban',
  archive: '/dashboard/archive',
} as const;

interface ViewSwitcherProps {
  currentView?: 'table' | 'kanban' | 'archive';
  onViewChange?: (view: 'table' | 'kanban' | 'archive') => void;
}

interface ControlProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  defaultChecked?: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

const Control: React.FC<ControlProps> = ({ icon, value, label, defaultChecked, buttonRef }) => {
  const context = useContext(ViewSwitcherContext);
  const checked = value === context?.value;

  useEffect(() => {
    if (defaultChecked) {
      context?.setValue(value);
    }
  }, []);

  return (
    <button
      ref={buttonRef}
      className={twMerge(clsx(
        'flex items-center justify-center flex-1 cursor-pointer font-medium font-sans duration-150 py-1 px-2 rounded-sm',
        checked ? 'bg-gray-100 text-gray-1000 fill-gray-1000' : 'text-gray-900 hover:text-gray-1000 fill-gray-900 hover:fill-gray-1000'
      ))}
      data-active={checked}
      onClick={() => context?.setValue(value)}
      title={label}
    >
      <span>{icon}</span>
    </button>
  );
};

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onViewChange }) => {
  const router = useRouter();
  const pathname = usePathname();

  // Determine current view from pathname if not provided
  const getCurrentView = (): 'table' | 'kanban' | 'archive' => {
    if (currentView) return currentView;
    if (pathname.includes('/kanban')) return 'kanban';
    if (pathname.includes('/archive')) return 'archive';
    return 'table';
  };

  const [value, setValue] = useState<string | null>(getCurrentView());
  const containerRef = useRef<HTMLDivElement>(null);
  const tableButtonRef = useRef<HTMLButtonElement>(null);
  const kanbanButtonRef = useRef<HTMLButtonElement>(null);
  const archiveButtonRef = useRef<HTMLButtonElement>(null);
  const previousValueRef = useRef<string | null>(value);

  // 🚀 PREFETCH: Preload all view routes on mount for instant navigation
  useEffect(() => {
    // Prefetch all routes immediately for instant switching
    router.prefetch(VIEW_ROUTES.table);
    router.prefetch(VIEW_ROUTES.kanban);
    router.prefetch(VIEW_ROUTES.archive);
  }, [router]);

  // Sync value with pathname changes
  useEffect(() => {
    const newView = getCurrentView();
    if (newView !== value) {
      setValue(newView);
      previousValueRef.current = newView;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Handle navigation when value changes - OPTIMIZED: Use pushState for instant switching
  useEffect(() => {
    if (!value || value === previousValueRef.current) return;

    previousValueRef.current = value;

    if (onViewChange) {
      onViewChange(value as 'table' | 'kanban' | 'archive');
    } else {
      // 🚀 PERFORMANCE: Use window.history.pushState for instant navigation without remount
      const route = VIEW_ROUTES[value as keyof typeof VIEW_ROUTES];
      if (route) {
        window.history.pushState(null, '', route);
        // Trigger popstate event for DataViewsContainer to detect change
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  }, [value, onViewChange]);

  // Actualizar posición del indicador cuando cambia el valor
  useEffect(() => {
    if (!containerRef.current) return;

    let activeButton: HTMLButtonElement | null = null;
    if (value === 'table') activeButton = tableButtonRef.current;
    else if (value === 'kanban') activeButton = kanbanButtonRef.current;
    else if (value === 'archive') activeButton = archiveButtonRef.current;

    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const x = buttonRect.left - containerRect.left;
      const y = buttonRect.top - containerRect.top;
      const width = buttonRect.width;
      const height = buttonRect.height;

      // Actualizar variables CSS para el indicador
      containerRef.current.style.setProperty('--indicator-x', `${x}px`);
      containerRef.current.style.setProperty('--indicator-y', `${y}px`);
      containerRef.current.style.setProperty('--indicator-width', `${width}px`);
      containerRef.current.style.setProperty('--indicator-height', `${height}px`);
    }
  }, [value]);

  const contextValue = useMemo(() => ({ value, setValue }), [value]);

  const activeView = getCurrentView();

  return (
    <>
      {/* Desktop View Switcher - Hidden on mobile */}
      <ViewSwitcherContext.Provider value={contextValue}>
        <div className={styles.viewSwitcher}>
          <div ref={containerRef} className={styles.switchContainer}>
            <Control
              buttonRef={tableButtonRef}
              defaultChecked={activeView === 'table'}
              icon={<List animateOnHover />}
              value="table"
              label="Tabla"
            />
            <Control
              buttonRef={kanbanButtonRef}
              defaultChecked={activeView === 'kanban'}
              icon={<LayoutDashboard animateOnHover />}
              value="kanban"
              label="Kanban"
            />
            <Control
              buttonRef={archiveButtonRef}
              defaultChecked={activeView === 'archive'}
              icon={<Unplug animateOnHover />}
              value="archive"
              label="Archivo Muerto"
            />
          </div>
        </div>
      </ViewSwitcherContext.Provider>

      {/* Mobile View Switcher - Only shown on mobile */}
      <MobileViewSwitcher
        currentView={currentView}
        onViewChange={onViewChange}
      />
    </>
  );
};

export default ViewSwitcher;
