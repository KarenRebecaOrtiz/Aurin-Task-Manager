'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/modules/shared/components/atoms/Badge';
import { Dropdown, type DropdownItem } from '@/modules/shared/components/molecules/Dropdown';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { SlidersHorizontal } from 'lucide-react';
import styles from './PriorityFilter.module.scss';

export interface PriorityFilterProps {
  value: string;
  onChange: (priority: string) => void;
}

export const PriorityFilter: React.FC<PriorityFilterProps> = ({
  value,
  onChange,
}) => {
  // Priority filter options with badges (no duplicate icons)
  const priorityOptions: DropdownItem[] = useMemo(
    () => [
      {
        id: 'Alta',
        value: 'Alta',
        label: (
          <Badge variant="error" size="small">
            Alta
          </Badge>
        ),
      },
      {
        id: 'Media',
        value: 'Media',
        label: (
          <Badge variant="warning" size="small">
            Media
          </Badge>
        ),
      },
      {
        id: 'Baja',
        value: 'Baja',
        label: (
          <Badge variant="success" size="small">
            Baja
          </Badge>
        ),
      },
      {
        id: 'all',
        value: '',
        label: (
          <Badge variant="info" size="small">
            Todos
          </Badge>
        ),
      },
    ],
    []
  );

  const handleChange = (item: DropdownItem) => {
    onChange(item.value as string);
  };

  return (
    <div className={styles.priorityFilter}>
      <Dropdown
        trigger={
          <div className={styles.filterTrigger}>
            <AnimateIcon animateOnHover>
              <SlidersHorizontal className="w-4 h-4" />
            </AnimateIcon>
            <span>Prioridad</span>
          </div>
        }
        items={priorityOptions}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

export default PriorityFilter;
