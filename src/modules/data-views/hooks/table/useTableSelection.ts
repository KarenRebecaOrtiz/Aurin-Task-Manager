import { useState, useCallback, useMemo } from 'react';

/**
 * Configuration for table selection
 */
export interface TableSelectionConfig<TData> {
  /** All available items */
  data: TData[];
  /** Function to get unique ID from item */
  getItemId: (item: TData) => string;
  /** Enable multi-selection (default: true) */
  multiSelect?: boolean;
  /** Initial selected IDs (default: []) */
  initialSelectedIds?: string[];
}

/**
 * Return type of useTableSelection hook
 */
export interface UseTableSelectionReturn<TData> {
  /** Selected item IDs */
  selectedIds: Set<string>;
  /** Selected items */
  selectedItems: TData[];
  /** Check if item is selected */
  isSelected: (item: TData) => boolean;
  /** Toggle item selection */
  toggleSelection: (item: TData) => void;
  /** Select specific item(s) */
  select: (itemOrItems: TData | TData[]) => void;
  /** Deselect specific item(s) */
  deselect: (itemOrItems: TData | TData[]) => void;
  /** Select all items */
  selectAll: () => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if all items are selected */
  isAllSelected: boolean;
  /** Check if some (but not all) items are selected */
  isSomeSelected: boolean;
  /** Number of selected items */
  selectedCount: number;
}

/**
 * Custom hook for managing table row selection
 *
 * Supports both single and multi-selection modes with convenient utility functions.
 *
 * @example
 * ```tsx
 * const {
 *   selectedIds,
 *   isSelected,
 *   toggleSelection,
 *   selectAll,
 *   clearSelection
 * } = useTableSelection({
 *   data: tasks,
 *   getItemId: (task) => task.id,
 *   multiSelect: true
 * });
 * ```
 */
export function useTableSelection<TData>({
  data,
  getItemId,
  multiSelect = true,
  initialSelectedIds = [],
}: TableSelectionConfig<TData>): UseTableSelectionReturn<TData> {

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialSelectedIds)
  );

  // Get selected items
  const selectedItems = useMemo(() => {
    return data.filter(item => selectedIds.has(getItemId(item)));
  }, [data, selectedIds, getItemId]);

  // Check if item is selected
  const isSelected = useCallback(
    (item: TData): boolean => {
      return selectedIds.has(getItemId(item));
    },
    [selectedIds, getItemId]
  );

  // Toggle selection
  const toggleSelection = useCallback(
    (item: TData) => {
      const id = getItemId(item);
      setSelectedIds(prev => {
        const newSet = new Set(prev);

        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          if (!multiSelect) {
            newSet.clear();
          }
          newSet.add(id);
        }

        return newSet;
      });
    },
    [getItemId, multiSelect]
  );

  // Select specific items
  const select = useCallback(
    (itemOrItems: TData | TData[]) => {
      const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
      const ids = items.map(getItemId);

      setSelectedIds(prev => {
        const newSet = multiSelect ? new Set(prev) : new Set<string>();
        ids.forEach(id => newSet.add(id));
        return newSet;
      });
    },
    [getItemId, multiSelect]
  );

  // Deselect specific items
  const deselect = useCallback(
    (itemOrItems: TData | TData[]) => {
      const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
      const ids = items.map(getItemId);

      setSelectedIds(prev => {
        const newSet = new Set(prev);
        ids.forEach(id => newSet.delete(id));
        return newSet;
      });
    },
    [getItemId]
  );

  // Select all items
  const selectAll = useCallback(() => {
    if (!multiSelect) return;
    setSelectedIds(new Set(data.map(getItemId)));
  }, [data, getItemId, multiSelect]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Computed values
  const isAllSelected = useMemo(() => {
    return data.length > 0 && selectedIds.size === data.length;
  }, [data.length, selectedIds.size]);

  const isSomeSelected = useMemo(() => {
    return selectedIds.size > 0 && !isAllSelected;
  }, [selectedIds.size, isAllSelected]);

  const selectedCount = useMemo(() => {
    return selectedIds.size;
  }, [selectedIds.size]);

  return {
    selectedIds,
    selectedItems,
    isSelected,
    toggleSelection,
    select,
    deselect,
    selectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    selectedCount,
  };
}
