import { useMemo, useCallback } from 'react';

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Custom sort function type
 */
export type SortFunction<TData> = (a: TData, b: TData) => number;

/**
 * Configuration for table sorting
 */
export interface TableSortingConfig<TData> {
  /** Data to sort */
  data: TData[];
  /** Key to sort by */
  sortKey: string;
  /** Sort direction */
  sortDirection: SortDirection;
  /** Custom sort functions for specific keys (optional) */
  sortFunctions?: Record<string, SortFunction<TData>>;
}

/**
 * Return type of useTableSorting hook
 */
export interface UseTableSortingReturn<TData> {
  /** Sorted data */
  sortedData: TData[];
  /** Apply custom sort function */
  applySort: (sortFn: SortFunction<TData>) => TData[];
}

/**
 * Default sort function - handles strings, numbers, dates, and null values
 */
function defaultSortFunction<TData>(
  a: TData,
  b: TData,
  key: string,
  direction: SortDirection
): number {
  const aVal = (a as any)[key];
  const bVal = (b as any)[key];

  // Handle null/undefined
  if (aVal == null && bVal == null) return 0;
  if (aVal == null) return 1;
  if (bVal == null) return -1;

  // Compare values
  let comparison = 0;

  if (typeof aVal === 'string' && typeof bVal === 'string') {
    comparison = aVal.localeCompare(bVal);
  } else if (typeof aVal === 'number' && typeof bVal === 'number') {
    comparison = aVal - bVal;
  } else if (aVal instanceof Date && bVal instanceof Date) {
    comparison = aVal.getTime() - bVal.getTime();
  } else {
    // Try to convert to string and compare
    comparison = String(aVal).localeCompare(String(bVal));
  }

  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Custom hook for sorting table data
 *
 * Provides efficient sorting with support for custom sort functions.
 * Automatically memoizes sorted results to prevent unnecessary recalculations.
 *
 * @example
 * ```tsx
 * const { sortedData } = useTableSorting({
 *   data: tasks,
 *   sortKey: 'priority',
 *   sortDirection: 'asc',
 *   sortFunctions: {
 *     priority: (a, b) => {
 *       const priorityOrder = { low: 1, medium: 2, high: 3 };
 *       return priorityOrder[a.priority] - priorityOrder[b.priority];
 *     }
 *   }
 * });
 * ```
 */
export function useTableSorting<TData>({
  data,
  sortKey,
  sortDirection,
  sortFunctions = {},
}: TableSortingConfig<TData>): UseTableSortingReturn<TData> {

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    const customSortFn = sortFunctions[sortKey];

    return [...data].sort((a, b) => {
      if (customSortFn) {
        const result = customSortFn(a, b);
        return sortDirection === 'asc' ? result : -result;
      }

      return defaultSortFunction(a, b, sortKey, sortDirection);
    });
  }, [data, sortKey, sortDirection, sortFunctions]);

  // Apply custom sort function
  const applySort = useCallback(
    (sortFn: SortFunction<TData>): TData[] => {
      return [...sortedData].sort(sortFn);
    },
    [sortedData]
  );

  return {
    sortedData,
    applySort,
  };
}
