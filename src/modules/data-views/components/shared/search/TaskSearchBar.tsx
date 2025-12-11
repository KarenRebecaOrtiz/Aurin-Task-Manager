'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence, easeOut } from 'framer-motion';
import { Search, X, ClipboardCheck, FolderKanban, Users } from 'lucide-react';
import { Small } from '@/components/ui/Typography';
import styles from './TaskSearchBar.module.scss';
import chipStyles from '@/modules/task-crud/components/forms/ChipSelector.module.scss';

// 'client' removido - ahora se filtra con el WorkspacesDropdown global
export type SearchCategory = 'task' | 'project' | 'member';
export type PriorityLevel = 'Alta' | 'Media' | 'Baja';
export type StatusLevel = 'por-iniciar' | 'en-proceso' | 'por-finalizar' | 'finalizado';

export interface SearchAction {
  id: string;
  label: string;
  category: SearchCategory;
  icon: React.ReactNode;
}

export interface PriorityFilter {
  id: string;
  label: string;
  value: PriorityLevel;
  variant: 'priority-high' | 'priority-medium' | 'priority-low';
}

export interface StatusFilter {
  id: string;
  label: string;
  value: StatusLevel;
  variant: 'status-backlog' | 'status-todo' | 'status-in-progress' | 'status-in-review' | 'status-done' | 'status-archived';
}

interface TaskSearchBarProps {
  onSearch: (keywords: string[], category: SearchCategory | null) => void;
  onPriorityFiltersChange?: (priorities: PriorityLevel[]) => void;
  onStatusFiltersChange?: (statuses: StatusLevel[]) => void;
  placeholder?: string;
}

// Categorías de búsqueda (Cuenta se filtra con el dropdown principal)
const SEARCH_CATEGORIES: SearchAction[] = [
  {
    id: 'task',
    label: 'Tarea',
    category: 'task',
    icon: <ClipboardCheck className="w-4 h-4" />,
  },
  {
    id: 'project',
    label: 'Proyecto',
    category: 'project',
    icon: <FolderKanban className="w-4 h-4" />,
  },
  {
    id: 'member',
    label: 'Miembro',
    category: 'member',
    icon: <Users className="w-4 h-4" />,
  },
];

const PRIORITY_FILTERS: PriorityFilter[] = [
  {
    id: 'alta',
    label: 'Alta',
    value: 'Alta',
    variant: 'priority-high',
  },
  {
    id: 'media',
    label: 'Media',
    value: 'Media',
    variant: 'priority-medium',
  },
  {
    id: 'baja',
    label: 'Baja',
    value: 'Baja',
    variant: 'priority-low',
  },
];

const STATUS_FILTERS: StatusFilter[] = [
  {
    id: 'por-iniciar',
    label: 'Por Iniciar',
    value: 'por-iniciar',
    variant: 'status-todo',
  },
  {
    id: 'en-proceso',
    label: 'En Proceso',
    value: 'en-proceso',
    variant: 'status-in-progress',
  },
  {
    id: 'por-finalizar',
    label: 'Por Finalizar',
    value: 'por-finalizar',
    variant: 'status-in-review',
  },
  {
    id: 'finalizado',
    label: 'Finalizado',
    value: 'finalizado',
    variant: 'status-done',
  },
];

// Menu animations (type-safe)
const menuAnimations = {
  initial: { opacity: 0, y: -12, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.95 },
  transition: { duration: 0.15, ease: easeOut },
};

const itemAnimations = (index: number) => ({
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.12, delay: index * 0.03 },
});

function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const TaskSearchBar: React.FC<TaskSearchBarProps> = ({
  onSearch,
  onPriorityFiltersChange,
  onStatusFiltersChange,
  placeholder = 'Buscar tareas, proyectos o miembros...',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory | null>(null);
  const [selectedPriorities, setSelectedPriorities] = useState<PriorityLevel[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<StatusLevel[]>([]);
  const debouncedQuery = useDebounce(query, 200);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Split query by '+' and trim each keyword
    const keywords = debouncedQuery
      .split('+')
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0);
    onSearch(keywords, selectedCategory);
  }, [debouncedQuery, selectedCategory, onSearch]);

  useEffect(() => {
    onPriorityFiltersChange?.(selectedPriorities);
  }, [selectedPriorities, onPriorityFiltersChange]);

  useEffect(() => {
    onStatusFiltersChange?.(selectedStatuses);
  }, [selectedStatuses, onStatusFiltersChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFocused]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleCategorySelect = useCallback((category: SearchCategory) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  }, []);

  const handlePrioritySelect = useCallback((priority: PriorityLevel) => {
    setSelectedPriorities((prev) => {
      if (prev.includes(priority)) {
        return prev.filter((p) => p !== priority);
      } else {
        return [...prev, priority];
      }
    });
  }, []);

  const handleStatusSelect = useCallback((status: StatusLevel) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    setSelectedCategory(null);
    setSelectedPriorities([]);
    setSelectedStatuses([]);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const createCategoryHandler = useCallback(
    (category: SearchCategory) => () => handleCategorySelect(category),
    [handleCategorySelect]
  );

  const createPriorityHandler = useCallback(
    (priority: PriorityLevel) => () => handlePrioritySelect(priority),
    [handlePrioritySelect]
  );

  const createStatusHandler = useCallback(
    (status: StatusLevel) => () => handleStatusSelect(status),
    [handleStatusSelect]
  );

  return (
    <div className={styles.searchContainer} ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <Input
          type="text"
          placeholder={
            selectedCategory
              ? `Buscar ${SEARCH_CATEGORIES.find((c) => c.category === selectedCategory)?.label.toLowerCase()}...`
              : placeholder
          }
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          className={styles.searchInput}
        />
        <div className={styles.searchIcon}>
          <Search className="w-4 h-4" />
        </div>
      </div>

      {/* Dropdown Menu - Absolute positioning */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            className={styles.menu}
            {...menuAnimations}
          >
            {/* Categorías de búsqueda */}
            <div className={styles.menuSection}>
              <Small className={styles.sectionTitle}>Filtrar por:</Small>
              <div className="flex gap-2 flex-wrap">
                {SEARCH_CATEGORIES.map((category, index) => (
                  <motion.button
                    key={category.id}
                    {...itemAnimations(index)}
                    onClick={createCategoryHandler(category.category)}
                    className={`${styles.categoryButton} ${
                      selectedCategory === category.category ? styles.selected : ''
                    }`}
                  >
                    <span className={styles.categoryIcon}>
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.3, ease: easeOut }}
                      >
                        {category.icon}
                      </motion.div>
                    </span>
                    <span className={styles.categoryLabel}>{category.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Filtros de prioridad */}
            <div className={styles.menuSection}>
              <Small className={styles.sectionTitle}>Prioridad:</Small>
              <div className="flex gap-2 flex-wrap">
                {PRIORITY_FILTERS.map((priority, index) => (
                  <motion.button
                    key={priority.id}
                    {...itemAnimations(index + SEARCH_CATEGORIES.length)}
                    onClick={createPriorityHandler(priority.value)}
                    className={`${chipStyles.chip} ${chipStyles[priority.variant]} ${
                      selectedPriorities.includes(priority.value) ? chipStyles.selected : ''
                    }`}
                    style={{
                      width: 'auto',
                      minWidth: 'auto',
                    }}
                  >
                    {priority.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Filtros de estado */}
            <div className={styles.menuSection}>
              <Small className={styles.sectionTitle}>Estado:</Small>
              <div className="flex gap-2 flex-wrap">
                {STATUS_FILTERS.map((status, index) => (
                  <motion.button
                    key={status.id}
                    {...itemAnimations(index + SEARCH_CATEGORIES.length + PRIORITY_FILTERS.length)}
                    onClick={createStatusHandler(status.value)}
                    className={`${chipStyles.chip} ${chipStyles[status.variant]} ${
                      selectedStatuses.includes(status.value) ? chipStyles.selected : ''
                    }`}
                    style={{
                      width: 'auto',
                      minWidth: 'auto',
                    }}
                  >
                    {status.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Clear button */}
            {(query || selectedCategory || selectedPriorities.length > 0 || selectedStatuses.length > 0) && (
              <div className={styles.infoSection}>
                <button
                  onClick={handleClear}
                  className={styles.clearButton}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskSearchBar;
