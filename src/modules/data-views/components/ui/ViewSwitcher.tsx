'use client';

import React, { useEffect, useState, useContext, createContext, useRef, useMemo } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { List } from '@/components/animate-ui/icons/list';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import { Unplug } from '@/components/animate-ui/icons/unplug';
import styles from './ViewSwitcher.module.scss';

const ViewSwitcherContext = createContext<{
  value: string | null;
  setValue: React.Dispatch<React.SetStateAction<string | null>>;
} | null>(null);

interface ViewSwitcherProps {
  currentView: 'table' | 'kanban' | 'archive';
  onViewChange: (view: 'table' | 'kanban' | 'archive') => void;
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
  const [value, setValue] = useState<string | null>(currentView);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableButtonRef = useRef<HTMLButtonElement>(null);
  const kanbanButtonRef = useRef<HTMLButtonElement>(null);
  const archiveButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (value && value !== currentView) {
      onViewChange(value as 'table' | 'kanban' | 'archive');
    }
  }, [value, currentView, onViewChange]);

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

  return (
    <ViewSwitcherContext.Provider value={contextValue}>
      <div className={styles.viewSwitcher}>
        <div ref={containerRef} className={styles.switchContainer}>
          <Control
            buttonRef={tableButtonRef}
            defaultChecked={currentView === 'table'}
            icon={<List animateOnHover />}
            value="table"
            label="Tabla"
          />
          <Control
            buttonRef={kanbanButtonRef}
            defaultChecked={currentView === 'kanban'}
            icon={<LayoutDashboard animateOnHover />}
            value="kanban"
            label="Kanban"
          />
          <Control
            buttonRef={archiveButtonRef}
            defaultChecked={currentView === 'archive'}
            icon={<Unplug animateOnHover />}
            value="archive"
            label="Archivo Muerto"
          />
        </div>
      </div>
    </ViewSwitcherContext.Provider>
  );
};

export default ViewSwitcher;
