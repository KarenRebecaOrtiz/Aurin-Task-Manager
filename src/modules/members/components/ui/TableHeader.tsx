'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from './TableHeader.module.scss';

export interface Column<T> {
  key: string;
  label: string;
  width: string;
  mobileVisible?: boolean;
  mobileWidth?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean; // Nueva propiedad para controlar si es ordenable
  notificationCount?: boolean; // Para la columna de notificaciones
}

interface TableHeaderProps<T> {
  columns: Column<T>[];
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  visibleColumns?: string[]; // Array de keys de columnas visibles
  onColumnVisibilityChange?: (columnKey: string, visible: boolean) => void;
  isMobile?: boolean;
}

type SortState = 'none' | 'asc' | 'desc';

const TableHeader = <T,>({
  columns,
  sortKey,
  sortDirection,
  onSort,
  visibleColumns,
  onColumnVisibilityChange,
  isMobile = false,
}: TableHeaderProps<T>) => {
  // Función para obtener el estado de ordenamiento de una columna
  const getSortState = useCallback((columnKey: string): SortState => {
    if (sortKey !== columnKey) return 'none';
    return sortDirection || 'none';
  }, [sortKey, sortDirection]);

  // Función para obtener el siguiente estado de ordenamiento
  const getNextSortState = (currentState: SortState): SortState => {
    switch (currentState) {
      case 'none': return 'asc';
      case 'asc': return 'desc';
      case 'desc': return 'none';
      default: return 'none';
    }
  };

  // Función para manejar el clic en ordenamiento
  const handleSort = useCallback((columnKey: string) => {
    if (!onSort) return;
    
    const currentState = getSortState(columnKey);
    const nextState = getNextSortState(currentState);
    
    if (nextState === 'none') {
      // Remover ordenamiento - enviar cadena vacía o null
      onSort('');
    } else {
      onSort(columnKey);
    }
  }, [onSort, getSortState]);

  // Función para manejar visibilidad de columnas
  const handleColumnVisibilityToggle = useCallback((columnKey: string) => {
    if (!onColumnVisibilityChange || !visibleColumns) return;
    
    const isVisible = visibleColumns.includes(columnKey);
    onColumnVisibilityChange(columnKey, !isVisible);
  }, [onColumnVisibilityChange, visibleColumns]);

  // Función para determinar si una columna está visible
  const isColumnVisible = useCallback((columnKey: string): boolean => {
    if (!visibleColumns) return true;
    return visibleColumns.includes(columnKey);
  }, [visibleColumns]);

  // Función para obtener el ancho de columna
  const getColumnWidth = (column: Column<T>) => {
    if (isMobile && column.mobileWidth) {
      return column.mobileWidth;
    }
    return column.width;
  };

  // Función para determinar si una columna es ordenable
  const isColumnSortable = (column: Column<T>): boolean => {
    // La columna de acciones nunca es ordenable
    if (column.key === 'action') return false;
    
    // La columna de notificaciones no es ordenable (sin texto en header)
    if (column.key === 'notificationDot') return false;
    
    // Si se especifica explícitamente, usar esa configuración
    if (column.sortable !== undefined) return column.sortable;
    
    // Por defecto, es ordenable
    return true;
  };

  return (
    <div className={styles.header}>
      {columns.map((column) => {
        const sortable = isColumnSortable(column);
        const visible = isColumnVisible(column.key);
        const sortState = getSortState(column.key);
        const hasLabel = column.label && column.label.trim() !== '';

        // Si no hay label y no es ordenable, no mostrar la celda
        if (!hasLabel && !sortable) {
          return null;
        }

        // Si no hay label, mostrar como celda no interactiva
        if (!hasLabel) {
          return (
            <div
              key={column.key}
              className={`
                ${styles.headerCell} 
                ${!column.mobileVisible ? styles.hideOnMobile : ''}
                ${!visible ? styles.hidden : ''}
              `}
              style={{
                width: getColumnWidth(column),
                opacity: visible ? 1 : 0.3,
              }}
            >
              <div className={styles.sortContainer}>
                {/* Sin contenido */}
              </div>
            </div>
          );
        }

        return (
          <div
            key={column.key}
            className={`
              ${styles.headerCell} 
              ${sortable ? styles.sortable : ''} 
              ${!column.mobileVisible ? styles.hideOnMobile : ''}
              ${sortState !== 'none' ? styles.sorted : ''}
              ${!visible ? styles.hidden : ''}
            `}
            style={{
              width: getColumnWidth(column),
              opacity: visible ? 1 : 0.3,
            }}
            onClick={sortable ? () => handleSort(column.key) : undefined}
            role={sortable ? 'button' : undefined}
            tabIndex={sortable ? 0 : undefined}
            aria-sort={
              sortable && sortState !== 'none'
                ? sortState === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && sortable) {
                handleSort(column.key);
              }
            }}
          >
            <div className={styles.sortContainer}>
              <span className={styles.columnLabel}>{column.label}</span>
            </div>

            {onColumnVisibilityChange &&
              column.key !== 'action' &&
              column.key !== 'notificationDot' && (
                <div className={styles.visibilityContainer}>
                  <button
                    className={styles.visibilityButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColumnVisibilityToggle(column.key);
                    }}
                    aria-label={
                      visible
                        ? `Ocultar columna ${column.label}`
                        : `Mostrar columna ${column.label}`
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'absolute',
                      top: '50%',
                      right: '2px',
                      transform: 'translateY(-50%)',
                      zIndex: 10
                    }}
                  >
                    <motion.div
                      animate={{
                        scale: visible ? 1 : 0.8,
                        opacity: visible ? 1 : 0.5,
                      }}
                      transition={{ duration: 0.15 }}
                    >
                      <Image
                        src={visible ? '/eye.svg' : '/eye-closed.svg'}
                        alt={
                          visible ? 'Ocultar columna' : 'Mostrar columna'
                        }
                        width={7}
                        height={7}
                        className={styles.eyeIcon}
                        style={{ 
                          width: '15px', 
                          height: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      />
                    </motion.div>
                  </button>
                </div>
              )}
          </div>
        );
      })}
    </div>
  );
};

TableHeader.displayName = 'TableHeader';

export default TableHeader;
