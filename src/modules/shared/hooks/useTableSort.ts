import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface UseTableSortProps<T> {
  data: T[];
  initialSort?: SortConfig;
  customSortFn?: (a: T, b: T, sortConfig: SortConfig) => number;
}

export interface UseTableSortReturn<T> {
  sortedData: T[];
  sortConfig: SortConfig | null;
  handleSort: (key: string) => void;
  clearSort: () => void;
}

export const useTableSort = <T extends Record<string, unknown>>({
  data,
  initialSort,
  customSortFn,
}: UseTableSortProps<T>): UseTableSortReturn<T> => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(initialSort || null);

  const sortedData = useMemo(() => {
    if (!sortConfig) {
      return data;
    }

    const sorted = [...data];

    sorted.sort((a, b) => {
      // Use custom sort function if provided
      if (customSortFn) {
        return customSortFn(a, b, sortConfig);
      }

      // Default sorting logic
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Handle different types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime();
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      // Fallback to string comparison
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortConfig, customSortFn]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prevConfig) => {
      if (!prevConfig || prevConfig.key !== key) {
        return { key, direction: 'asc' };
      }

      if (prevConfig.direction === 'asc') {
        return { key, direction: 'desc' };
      }

      // Third click removes sorting
      return null;
    });
  }, []);

  const clearSort = useCallback(() => {
    setSortConfig(null);
  }, []);

  return {
    sortedData,
    sortConfig,
    handleSort,
    clearSort,
  };
};
