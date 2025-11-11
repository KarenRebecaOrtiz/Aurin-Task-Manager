import { useState, useMemo, useCallback } from 'react';

export interface FilterConfig<T = unknown> {
  key: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'boolean';
  label: string;
  options?: Array<{ label: string; value: T }>;
  defaultValue?: T;
}

export interface UseTableFiltersProps<T> {
  data: T[];
  filterConfigs: FilterConfig[];
  customFilterFn?: (item: T, filters: Record<string, unknown>) => boolean;
}

export interface UseTableFiltersReturn<T> {
  filteredData: T[];
  activeFilters: Record<string, unknown>;
  setFilter: (key: string, value: unknown) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

export const useTableFilters = <T extends Record<string, unknown>>({
  data,
  filterConfigs,
  customFilterFn,
}: UseTableFiltersProps<T>): UseTableFiltersReturn<T> => {
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    filterConfigs.forEach((config) => {
      if (config.defaultValue !== undefined) {
        initial[config.key] = config.defaultValue;
      }
    });
    return initial;
  });

  const filteredData = useMemo(() => {
    if (Object.keys(activeFilters).length === 0) {
      return data;
    }

    return data.filter((item) => {
      // Use custom filter function if provided
      if (customFilterFn) {
        return customFilterFn(item, activeFilters);
      }

      // Default filtering logic
      return Object.entries(activeFilters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          return true;
        }

        const itemValue = item[key];
        const config = filterConfigs.find((c) => c.key === key);

        if (!config) return true;

        switch (config.type) {
          case 'text':
            return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
          
          case 'select':
            return itemValue === value;
          
          case 'multiselect':
            return Array.isArray(value) && value.includes(itemValue);
          
          case 'boolean':
            return Boolean(itemValue) === Boolean(value);
          
          case 'date':
            // Simple date comparison (can be extended)
            return new Date(itemValue as string).toDateString() === new Date(value as string).toDateString();
          
          default:
            return true;
        }
      });
    });
  }, [data, activeFilters, filterConfigs, customFilterFn]);

  const setFilter = useCallback((key: string, value: unknown) => {
    setActiveFilters((prev) => {
      if (value === null || value === undefined || value === '') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const clearFilter = useCallback((key: string) => {
    setActiveFilters((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return {
    filteredData,
    activeFilters,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
  };
};
