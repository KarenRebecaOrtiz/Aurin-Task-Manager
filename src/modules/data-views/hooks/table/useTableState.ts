import { useState, useCallback, useMemo } from 'react';

/**
 * Generic table state configuration
 */
export interface TableStateConfig<TData = any> {
  /** Initial sort key (default: 'createdAt') */
  initialSortKey?: string;
  /** Initial sort direction (default: 'desc') */
  initialSortDirection?: 'asc' | 'desc';
  /** Initial search query (default: '') */
  initialSearchQuery?: string;
  /** Initial filters (default: {}) */
  initialFilters?: Record<string, string>;
}

/**
 * Filter state for the table
 */
export interface TableFilters {
  [key: string]: string;
}

/**
 * Sorting state for the table
 */
export interface TableSorting {
  sortKey: string;
  sortDirection: 'asc' | 'desc';
}

/**
 * UI state for table dropdowns and menus
 */
export interface TableUIState {
  openDropdowns: Set<string>;
  actionMenuOpenId: string | null;
}

/**
 * Loading state for table data
 */
export interface TableLoadingState {
  isLoadingData: boolean;
  isLoadingFilters: boolean;
}

/**
 * Complete table state
 */
export interface TableState<TData = any> {
  // Data
  filteredData: TData[];

  // Search
  searchQuery: string;

  // Filters
  filters: TableFilters;

  // Sorting
  sorting: TableSorting;

  // UI State
  uiState: TableUIState;

  // Loading
  loadingState: TableLoadingState;
}

/**
 * Table state actions
 */
export interface TableStateActions<TData = any> {
  // Data actions
  setFilteredData: (data: TData[]) => void;

  // Search actions
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Filter actions
  setFilter: (key: string, value: string) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;

  // Sorting actions
  setSortKey: (key: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  toggleSortDirection: () => void;
  setSort: (key: string, direction: 'asc' | 'desc') => void;

  // UI actions
  toggleDropdown: (dropdownKey: string) => void;
  closeAllDropdowns: () => void;
  setActionMenuOpen: (id: string | null) => void;

  // Loading actions
  setIsLoadingData: (loading: boolean) => void;
  setIsLoadingFilters: (loading: boolean) => void;

  // Reset
  resetState: () => void;
}

/**
 * Return type of useTableState hook
 */
export interface UseTableStateReturn<TData = any>
  extends TableState<TData>, TableStateActions<TData> {
  // Computed values
  hasActiveFilters: boolean;
  hasActiveSearch: boolean;
  isAnyDropdownOpen: boolean;
}

/**
 * Custom hook for managing table state (sorting, filtering, search, UI state)
 *
 * This hook provides a centralized state management solution for tables,
 * reducing code duplication across different table implementations.
 *
 * @example
 * ```tsx
 * const {
 *   filteredData,
 *   setFilteredData,
 *   searchQuery,
 *   setSearchQuery,
 *   filters,
 *   setFilter,
 *   sorting,
 *   setSort,
 *   hasActiveFilters
 * } = useTableState<Task>({
 *   initialSortKey: 'createdAt',
 *   initialSortDirection: 'desc'
 * });
 * ```
 */
export function useTableState<TData = any>(
  config: TableStateConfig<TData> = {}
): UseTableStateReturn<TData> {
  const {
    initialSortKey = 'createdAt',
    initialSortDirection = 'desc',
    initialSearchQuery = '',
    initialFilters = {},
  } = config;

  // Data state
  const [filteredData, setFilteredData] = useState<TData[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  // Filter state
  const [filters, setFilters] = useState<TableFilters>(initialFilters);

  // Sorting state
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);

  // UI state
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Loading state
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // ==================== Search Actions ====================

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // ==================== Filter Actions ====================

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilter = useCallback((key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  // ==================== Sorting Actions ====================

  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const setSort = useCallback((key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  }, []);

  // ==================== UI Actions ====================

  const toggleDropdown = useCallback((dropdownKey: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dropdownKey)) {
        newSet.delete(dropdownKey);
      } else {
        newSet.clear(); // Close all others
        newSet.add(dropdownKey);
      }
      return newSet;
    });
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setOpenDropdowns(new Set());
  }, []);

  const setActionMenuOpen = useCallback((id: string | null) => {
    setActionMenuOpenId(id);
  }, []);

  // ==================== Reset ====================

  const resetState = useCallback(() => {
    setFilteredData([]);
    setSearchQuery(initialSearchQuery);
    setFilters(initialFilters);
    setSortKey(initialSortKey);
    setSortDirection(initialSortDirection);
    setOpenDropdowns(new Set());
    setActionMenuOpenId(null);
    setIsLoadingData(false);
    setIsLoadingFilters(false);
  }, [initialSearchQuery, initialFilters, initialSortKey, initialSortDirection]);

  // ==================== Computed Values ====================

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => filters[key] !== '');
  }, [filters]);

  const hasActiveSearch = useMemo(() => {
    return searchQuery.trim() !== '';
  }, [searchQuery]);

  const isAnyDropdownOpen = useMemo(() => {
    return openDropdowns.size > 0;
  }, [openDropdowns]);

  // ==================== Return Value ====================

  return {
    // Data
    filteredData,
    setFilteredData,

    // Search
    searchQuery,
    setSearchQuery,
    clearSearch,

    // Filters
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,

    // Sorting
    sorting: {
      sortKey,
      sortDirection,
    },
    setSortKey,
    setSortDirection,
    toggleSortDirection,
    setSort,

    // UI State
    uiState: {
      openDropdowns,
      actionMenuOpenId,
    },
    toggleDropdown,
    closeAllDropdowns,
    setActionMenuOpen,

    // Loading
    loadingState: {
      isLoadingData,
      isLoadingFilters,
    },
    setIsLoadingData,
    setIsLoadingFilters,

    // Computed
    hasActiveFilters,
    hasActiveSearch,
    isAnyDropdownOpen,

    // Reset
    resetState,
  };
}
