import { useMemo, useCallback } from 'react';

/**
 * Filter function type - returns true if item should be included
 */
export type FilterFunction<TData> = (item: TData) => boolean;

/**
 * Configuration for table filtering
 */
export interface TableFilteringConfig<TData> {
  /** Raw data to filter */
  data: TData[];
  /** Search query to filter by */
  searchQuery?: string;
  /** Additional filters as key-value pairs */
  filters?: Record<string, string>;
  /** Custom search function (optional) */
  searchFunction?: (item: TData, query: string) => boolean;
  /** Custom filter functions for each filter key (optional) */
  filterFunctions?: Record<string, (item: TData, value: string) => boolean>;
}

/**
 * Return type of useTableFiltering hook
 */
export interface UseTableFilteringReturn<TData> {
  /** Filtered data */
  filteredData: TData[];
  /** Apply a single filter function */
  applyFilter: (filterFn: FilterFunction<TData>) => TData[];
  /** Check if item matches search query */
  matchesSearch: (item: TData) => boolean;
  /** Check if item matches all filters */
  matchesFilters: (item: TData) => boolean;
}

/**
 * Default search function - searches common text fields
 */
function defaultSearchFunction<TData>(item: TData, query: string): boolean {
  if (!query.trim()) return true;

  const searchableValues = Object.values(item as any)
    .filter(val => typeof val === 'string')
    .map(val => val.toLowerCase());

  const lowerQuery = query.toLowerCase();
  return searchableValues.some(val => val.includes(lowerQuery));
}

/**
 * Custom hook for filtering table data
 *
 * Provides efficient filtering capabilities with search and custom filters.
 * Automatically memoizes filtered results to prevent unnecessary recalculations.
 *
 * @example
 * ```tsx
 * const { filteredData, matchesSearch } = useTableFiltering({
 *   data: tasks,
 *   searchQuery: 'urgent',
 *   filters: { status: 'in-progress', priority: 'high' },
 *   filterFunctions: {
 *     status: (task, value) => task.status === value,
 *     priority: (task, value) => task.priority === value
 *   }
 * });
 * ```
 */
export function useTableFiltering<TData>({
  data,
  searchQuery = '',
  filters = {},
  searchFunction = defaultSearchFunction,
  filterFunctions = {},
}: TableFilteringConfig<TData>): UseTableFilteringReturn<TData> {

  // Check if item matches search query
  const matchesSearch = useCallback(
    (item: TData): boolean => {
      return searchFunction(item, searchQuery);
    },
    [searchQuery, searchFunction]
  );

  // Check if item matches all filters
  const matchesFilters = useCallback(
    (item: TData): boolean => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || value === '') return true;

        const filterFn = filterFunctions[key];
        if (filterFn) {
          return filterFn(item, value);
        }

        // Default: exact match on the property
        return (item as any)[key] === value;
      });
    },
    [filters, filterFunctions]
  );

  // Apply filtering
  const filteredData = useMemo(() => {
    return data.filter(item => {
      return matchesSearch(item) && matchesFilters(item);
    });
  }, [data, matchesSearch, matchesFilters]);

  // Apply a custom filter function
  const applyFilter = useCallback(
    (filterFn: FilterFunction<TData>): TData[] => {
      return filteredData.filter(filterFn);
    },
    [filteredData]
  );

  return {
    filteredData,
    applyFilter,
    matchesSearch,
    matchesFilters,
  };
}
