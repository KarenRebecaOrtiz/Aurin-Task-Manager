/**
 * PriorityCell Component
 * Displays task priority with badge styling
 * Used in TasksTable, ArchiveTable
 */

import React from 'react';
import { Badge, BadgeVariant } from '@/modules/shared/components/atoms/Badge';

interface PriorityCellProps {
  priority: string;
  className?: string;
}

/**
 * Maps priority to Badge variant
 */
const getPriorityVariant = (priority: string): BadgeVariant => {
  const variantMap: { [key: string]: BadgeVariant } = {
    'Alta': 'priority-high',
    'Media': 'priority-medium',
    'Baja': 'priority-low',
  };

  return variantMap[priority] || 'default';
};

/**
 * PriorityCell Component
 * Renders a priority badge with standardized colors
 */
const PriorityCell: React.FC<PriorityCellProps> = ({ priority, className }) => {
  const variant = getPriorityVariant(priority);

  return (
    <Badge variant={variant} size="small" className={className}>
      {priority}
    </Badge>
  );
};

export default PriorityCell;
