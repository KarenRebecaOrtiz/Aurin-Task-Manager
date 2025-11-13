'use client';

import React from 'react';
import { Dropdown, DropdownItem } from '@/modules/shared/components/molecules/Dropdown';
import Image from 'next/image';
import styles from './FilterGroup.module.scss';

export interface Filter {
  id: string;
  label: string;
  value: unknown;
  options: DropdownItem[];
  onChange: (value: unknown) => void;
  icon?: string | React.ReactNode;
}

export interface FilterGroupProps {
  filters: Filter[];
  className?: string;
}

/**
 * FilterGroup - Grupo de filtros reutilizable
 * 
 * Renderiza múltiples dropdowns de filtro de manera consistente
 */
export const FilterGroup: React.FC<FilterGroupProps> = ({
  filters,
  className = '',
}) => {
  const handleFilterChange = React.useCallback((filterId: string, item: DropdownItem) => {
    const filter = filters.find(f => f.id === filterId);
    if (filter) {
      filter.onChange(item.value);
    }
  }, [filters]);

  return (
    <div className={`${styles.filterGroup} ${className}`}>
      {filters.map((filter) => (
        <div key={filter.id} className={styles.filterWrapper}>
          <Dropdown
            trigger={
              <div className={styles.filterTrigger}>
                {filter.icon && (
                  typeof filter.icon === 'string' ? (
                    <Image
                      src={filter.icon}
                      alt=""
                      width={12}
                      height={12}
                      className={styles.filterIcon}
                    />
                  ) : (
                    <div className={styles.filterIcon}>
                      {filter.icon}
                    </div>
                  )
                )}
                <span>{filter.label}</span>
              </div>
            }
            items={filter.options}
            value={filter.value}
            onChange={(item) => handleFilterChange(filter.id, item)}
          />
        </div>
      ))}
    </div>
  );
};
