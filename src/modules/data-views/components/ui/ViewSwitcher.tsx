'use client';

import React from 'react';
import { MobileViewSwitcher } from './MobileViewSwitcher';
import { DesktopFloatingNav } from './DesktopFloatingNav';

type ViewType = 'tasks' | 'archive' | 'teams';

interface ViewSwitcherProps {
  currentView?: ViewType;
  onViewChange?: (view: ViewType) => void;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onViewChange }) => {
  return (
    <>
      {/* Desktop Floating Nav - Fixed dock at bottom (shown on viewports > 768px) */}
      <DesktopFloatingNav
        currentView={currentView}
        onViewChange={onViewChange}
      />

      {/* Mobile View Switcher - Only shown on mobile (viewports <= 768px) */}
      <MobileViewSwitcher
        currentView={currentView}
        onViewChange={onViewChange}
      />
    </>
  );
};

export default ViewSwitcher;
