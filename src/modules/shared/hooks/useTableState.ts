import { useState, useMemo, useCallback } from 'react';

export interface UseTableStateProps<T> {
  data: T[];
  initialSort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  initialFilters?: Record<string, unknown>;
  itemsPerPage?: number;
}

export interface UseTableStateReturn<T> {
  // Data
  filteredData: T[];
  sortedData: T[];
  paginatedData: T[];
  totalItems: number;
  
  // Sort
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (key: string) => void;
  
  // Filter
  filters: Record<string, unknown>;
  handleFilter: (key: string, value: unknown) => void;
  clearFilters: () => void;
  
  // Search
  searchQuery: string;
  handleSearch: (query: string) => void;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
}

export const useTableState = <T extends Record<string, unknown>>({
  data,
  initialSort = { key: '', direction: 'asc' },
  initialFilters = {},
  itemsPerPage = 10,
}: UseTableStateProps<T>): UseTableStateReturn<T> => {
  // Sort state
  const [sortKey, setSortKey] = useState(initialSort.key);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSort.direction);

  // Filter state
  const [filters, setFilters] = useState<Record<string, unknown>>(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Apply filters
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search query
    if (searchQuery) {
      result = result.filter((item) => {
        return Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        result = result.filter((item) => item[key] === value);
      }
    });

    return result;
  }, [data, searchQuery, filters]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Apply pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = useMemo(
    () => sortedData.slice(startIndex, startIndex + itemsPerPage),
    [sortedData, startIndex, itemsPerPage]
  );

  // Sort handlers
  const handleSort = useCallback((key: string) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey]);

  // Filter handlers
  const handleFilter = useCallback((key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToFirstPage = useCallback(() => setCurrentPage(1), []);
  const goToLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);
  const goToNextPage = useCallback(() => setCurrentPage((prev) => Math.min(prev + 1, totalPages)), [totalPages]);
  const goToPrevPage = useCallback(() => setCurrentPage((prev) => Math.max(prev - 1, 1)), []);

  return {
    // Data
    filteredData,
    sortedData,
    paginatedData,
    totalItems: filteredData.length,
    
    // Sort
    sortKey,
    sortDirection,
    handleSort,
    
    // Filter
    filters,
    handleFilter,
    clearFilters,
    
    // Search
    searchQuery,
    handleSearch,
    
    // Pagination
    currentPage,
    totalPages,
    handlePageChange,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPrevPage,
  };
};
