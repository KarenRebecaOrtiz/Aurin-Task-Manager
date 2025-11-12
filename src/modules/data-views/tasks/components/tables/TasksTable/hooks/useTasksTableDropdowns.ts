import { useCallback } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { tasksTableStore } from '../../../../stores/tasksTableStore';

/**
 * Hook consolidado para manejar todos los dropdowns de TasksTable
 * Reduce código duplicado de gestión de estado de UI
 */
export const useTasksTableDropdowns = () => {

  // Store selectors
  const isPriorityDropdownOpen = useStore(tasksTableStore, useShallow(state => state.isPriorityDropdownOpen));
  const isClientDropdownOpen = useStore(tasksTableStore, useShallow(state => state.isClientDropdownOpen));
  const isUserDropdownOpen = useStore(tasksTableStore, useShallow(state => state.isUserDropdownOpen));
  const isStatusDropdownOpen = useStore(tasksTableStore, useShallow(state => state.isStatusDropdownOpen));

  const setIsPriorityDropdownOpen = useStore(tasksTableStore, useShallow(state => state.setIsPriorityDropdownOpen));
  const setIsClientDropdownOpen = useStore(tasksTableStore, useShallow(state => state.setIsClientDropdownOpen));
  const setIsUserDropdownOpen = useStore(tasksTableStore, useShallow(state => state.setIsUserDropdownOpen));
  const setIsStatusDropdownOpen = useStore(tasksTableStore, useShallow(state => state.setIsStatusDropdownOpen));

  // Toggle functions
  const togglePriorityDropdown = useCallback(() => {
    setIsPriorityDropdownOpen(!isPriorityDropdownOpen);
    if (!isPriorityDropdownOpen) {
      setIsClientDropdownOpen(false);
      setIsUserDropdownOpen(false);
      setIsStatusDropdownOpen(false);
    }
  }, [
    isPriorityDropdownOpen,
    setIsPriorityDropdownOpen,
    setIsClientDropdownOpen,
    setIsUserDropdownOpen,
    setIsStatusDropdownOpen
  ]);

  const toggleClientDropdown = useCallback(() => {
    setIsClientDropdownOpen(!isClientDropdownOpen);
    if (!isClientDropdownOpen) {
      setIsPriorityDropdownOpen(false);
      setIsUserDropdownOpen(false);
      setIsStatusDropdownOpen(false);
    }
  }, [
    isClientDropdownOpen,
    setIsClientDropdownOpen,
    setIsPriorityDropdownOpen,
    setIsUserDropdownOpen,
    setIsStatusDropdownOpen
  ]);

  const toggleUserDropdown = useCallback(() => {
    setIsUserDropdownOpen(!isUserDropdownOpen);
    if (!isUserDropdownOpen) {
      setIsPriorityDropdownOpen(false);
      setIsClientDropdownOpen(false);
      setIsStatusDropdownOpen(false);
    }
  }, [
    isUserDropdownOpen,
    setIsUserDropdownOpen,
    setIsPriorityDropdownOpen,
    setIsClientDropdownOpen,
    setIsStatusDropdownOpen
  ]);

  const toggleStatusDropdown = useCallback(() => {
    setIsStatusDropdownOpen(!isStatusDropdownOpen);
    if (!isStatusDropdownOpen) {
      setIsPriorityDropdownOpen(false);
      setIsClientDropdownOpen(false);
      setIsUserDropdownOpen(false);
    }
  }, [
    isStatusDropdownOpen,
    setIsStatusDropdownOpen,
    setIsPriorityDropdownOpen,
    setIsClientDropdownOpen,
    setIsUserDropdownOpen
  ]);

  const closeAllDropdowns = useCallback(() => {
    setIsPriorityDropdownOpen(false);
    setIsClientDropdownOpen(false);
    setIsUserDropdownOpen(false);
    setIsStatusDropdownOpen(false);
  }, [
    setIsPriorityDropdownOpen,
    setIsClientDropdownOpen,
    setIsUserDropdownOpen,
    setIsStatusDropdownOpen
  ]);

  return {
    // States
    isPriorityDropdownOpen,
    isClientDropdownOpen,
    isUserDropdownOpen,
    isStatusDropdownOpen,

    // Toggles
    togglePriorityDropdown,
    toggleClientDropdown,
    toggleUserDropdown,
    toggleStatusDropdown,

    // Setters (for direct control)
    setIsPriorityDropdownOpen,
    setIsClientDropdownOpen,
    setIsUserDropdownOpen,
    setIsStatusDropdownOpen,

    // Utilities
    closeAllDropdowns,

    // Computed
    isAnyDropdownOpen: isPriorityDropdownOpen || isClientDropdownOpen || isUserDropdownOpen || isStatusDropdownOpen,
  };
};
