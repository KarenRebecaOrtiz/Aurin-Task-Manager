'use client';

import React from 'react';

export type PriorityType = 'low' | 'medium' | 'high' | 'urgent';

interface PriorityBadgeProps {
  priority: PriorityType;
  className?: string;
  showIcon?: boolean;
}

const priorityConfig: Record<PriorityType, { label: string; bgColor: string; textColor: string; icon: string }> = {
  low: {
    label: 'Low',
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: '↓',
  },
  medium: {
    label: 'Medium',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    icon: '→',
  },
  high: {
    label: 'High',
    bgColor: 'bg-orange-100 dark:bg-orange-950',
    textColor: 'text-orange-700 dark:text-orange-300',
    icon: '↑',
  },
  urgent: {
    label: 'Urgent',
    bgColor: 'bg-red-100 dark:bg-red-950',
    textColor: 'text-red-700 dark:text-red-300',
    icon: '🔴',
  },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  className = '',
  showIcon = true,
}) => {
  const config = priorityConfig[priority];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      {showIcon && <span className="text-xs font-bold">{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
};
