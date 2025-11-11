'use client';

import React, { memo, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import styles from './Table.module.scss';
import TableHeader, { Column as TableHeaderColumn } from './TableHeader';


interface HasId {
  id: string;
}

interface Column<T> extends TableHeaderColumn<T> {
  // Mantener compatibilidad con implementación anterior
  key: string;
}

interface TableProps<T extends HasId> {
  data: T[];
  columns: Column<T>[];
  itemsPerPage?: number;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (item: T, columnKey: string) => void;
  getRowClassName?: (item: T) => string;
  emptyStateType?: 'tasks' | 'archive' | 'clients' | 'members' | 'team';
  className?: string;
  // Nuevas props para funcionalidad de visibilidad de columnas
  visibleColumns?: string[];
  onColumnVisibilityChange?: (columnKey: string, visible: boolean) => void;
  enableColumnVisibility?: boolean; // Para habilitar/deshabilitar esta funcionalidad
}

const Table = memo(
  <T extends HasId>({ 
    data, 
    columns, 
    itemsPerPage = 10, 
    sortKey, 
    sortDirection, 
    onSort, 
    onRowClick, 
    getRowClassName, 
    emptyStateType, 
    className,
    visibleColumns,
    onColumnVisibilityChange,
    enableColumnVisibility = false
  }: TableProps<T>) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobile, setIsMobile] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);






    const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = useMemo(() => data.slice(startIndex, startIndex + itemsPerPage), [data, startIndex, itemsPerPage]);

      useEffect(() => {
    if (currentPage > totalPages && data.length > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages, data.length]);

  // ✅ CORREGIDO: Reset de paginación cuando cambian los filtros
  useEffect(() => {
    const handleResetPagination = (event: CustomEvent) => {
      if (event.detail?.reason === 'filterChanged') {
        setCurrentPage(1); // Reset a la primera página
      }
    };

    // Escuchar evento personalizado para resetear paginación
    document.addEventListener('resetPagination', handleResetPagination as EventListener);
    
    return () => {
      document.removeEventListener('resetPagination', handleResetPagination as EventListener);
    };
  }, []);

  // ✅ CORREGIDO: Reset automático de paginación cuando cambia el data
  useEffect(() => {
    setCurrentPage(1); // Reset a la primera página cuando cambian los datos
  }, [data.length]); // Reset cuando cambia la cantidad de datos

  // ✅ DEBUG: Log temporal para verificar datos
  useEffect(() => {
    // Debug logging disabled
  }, [data.length, currentPage, totalPages, startIndex, itemsPerPage, paginatedData.length]);

    useEffect(() => {
      if (tableRef.current && paginatedData.length > 0) {
        const rows = tableRef.current.querySelectorAll(`.${styles.row}`);
        gsap.fromTo(
          rows,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' },
        );
        return () => {
          gsap.killTweensOf(rows);
        };
      }
    }, [paginatedData]);

    // Detect mobile screen size
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const getColumnWidth = (column: Column<T>) => {
      if (isMobile && column.mobileWidth) {
        return column.mobileWidth;
      }
      return column.width;
    };

    // Función para determinar si una columna está visible
    const isColumnVisible = useCallback((columnKey: string): boolean => {
      if (!enableColumnVisibility || !visibleColumns) return true;
      return visibleColumns.includes(columnKey);
    }, [enableColumnVisibility, visibleColumns]);

    // Filtrar columnas visibles para renderizado
    const visibleColumnsForRender = useMemo(() => {
      if (!enableColumnVisibility) return columns;
      return columns.filter(column => isColumnVisible(column.key));
    }, [columns, enableColumnVisibility, isColumnVisible]);



    const handleCellClick = useCallback((item: T, column: Column<T>) => {
      if (column.key === 'action') {
        return;
      }
      
      if (onRowClick) {
        onRowClick(item, column.key);
      }
    }, [onRowClick]);

    // Memoized callback for each cell to avoid arrow function warnings
    const createCellClickHandler = useCallback((item: T, column: Column<T>) => {
      return () => handleCellClick(item, column);
    }, [handleCellClick]);

    const handleFirstPage = useCallback(() => setCurrentPage(1), []);
    const handlePrevPage = useCallback(() => setCurrentPage((prev) => Math.max(prev - 1, 1)), []);
    const handleNextPage = useCallback(() => setCurrentPage((prev) => Math.min(prev + 1, totalPages)), [totalPages]);
    const handleLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);

    const handleFirstPageClick = useCallback(() => handleFirstPage(), [handleFirstPage]);
    const handlePrevPageClick = useCallback(() => handlePrevPage(), [handlePrevPage]);
    const handleNextPageClick = useCallback(() => handleNextPage(), [handleNextPage]);
    const handleLastPageClick = useCallback(() => handleLastPage(), [handleLastPage]);

    const EmptyState = () => {
      const getEmptyStateContent = () => {
        switch (emptyStateType) {
          case 'archive':
            return {
              title: 'No hay tareas archivadas',
              subtitle: 'Las tareas que archives aparecerán aquí para mantener un historial organizado de tu trabajo.'
            };
          case 'clients':
            return {
              title: 'No hay cuentas registradas',
              subtitle: 'Crea tu primera cuenta para comenzar a organizar tus proyectos y tareas.'
            };
          case 'members':
            return {
              title: 'No hay miembros en el equipo',
              subtitle: 'Invita a tu equipo para colaborar en proyectos y tareas de manera eficiente.'
            };
          case 'team':
            return {
              title: 'No hay miembros en el equipo',
              subtitle: 'Agrega miembros a tu equipo para mejorar la colaboración y productividad.'
            };
          case 'tasks':
          default:
            return {
              title: 'No hay tareas asignadas',
              subtitle: 'Crea tu primera tarea para comenzar a organizar tu trabajo y proyectos.'
            };
        }
      };

      const content = getEmptyStateContent();

      return (
        <div className={styles.emptyState}>
          <Image
            src="/emptyStateImage.png"
            alt="No hay datos"
            width={189}
            height={190}
            className={styles.emptyStateImage}
            style={{ width: 'auto', height: 'auto' }}
          />
          <div className={styles.emptyStateText}>
            <div className={styles.emptyStateTitle}>{content.title}</div>
            <div className={styles.emptyStateSubtitle}>
              {content.subtitle}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className={`${styles.tableContainer} ${className || ''}`} data-table={emptyStateType}>

        <div ref={tableRef} className={styles.table}>
          <TableHeader
            columns={columns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSort}
            visibleColumns={enableColumnVisibility ? visibleColumns : undefined}
            onColumnVisibilityChange={enableColumnVisibility ? onColumnVisibilityChange : undefined}
            isMobile={isMobile}
          />
          {paginatedData.length === 0 ? (
            <EmptyState />
          ) : (
            paginatedData.map((item, index) => (
              <div key={item.id || `row-${index}`} className={`${styles.row} ${getRowClassName?.(item) || ''}`}>
                {visibleColumnsForRender.map((column) => (
                  <div
                    key={column.key}
                    className={`${styles.cell} ${!column.mobileVisible ? styles.hideOnMobile : ''} ${
                      column.key === 'action' ? styles.actionCell : styles.clickableCell
                    }`}
                    style={{ width: getColumnWidth(column) }}
                    onClick={createCellClickHandler(item, column)}
                  >
                    {column.render
                      ? column.render(item)
                      : column.key === 'action'
                      ? ''
                      : String((item as Record<string, unknown>)[column.key] ?? '')}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        {totalPages > 1 && data.length > 0 && (
          <div className={styles.pagination}>
            <button
              onClick={handleFirstPageClick}
              disabled={currentPage === 1}
              className={styles.paginationButton}
              aria-label="Ir a la primera página"
            >
              <Image src="/chevrons-left.svg" alt="Primera página" width={16} height={16} style={{ width: 'auto', height: 'auto' }} />
            </button>
            <button
              onClick={handlePrevPageClick}
              disabled={currentPage === 1}
              className={styles.paginationButton}
              aria-label="Ir a la página anterior"
            >
              <Image src="/chevron-left.svg" alt="Página anterior" width={16} height={16} style={{ width: 'auto', height: 'auto' }} />
            </button>
            <span className={styles.pageInfo}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={handleNextPageClick}
              disabled={currentPage === totalPages}
              className={styles.paginationButton}
              aria-label="Ir a la página siguiente"
            >
              <Image src="/chevron-right.svg" alt="Página siguiente" width={16} height={16} style={{ width: 'auto', height: 'auto' }} />
            </button>
            <button
              onClick={handleLastPageClick}
              disabled={currentPage === totalPages}
              className={styles.paginationButton}
              aria-label="Ir a la última página"
            >
              <Image src="/chevrons-right.svg" alt="Última página" width={16} height={16} style={{ width: 'auto', height: 'auto' }} />
            </button>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.data === nextProps.data &&
      prevProps.sortKey === nextProps.sortKey &&
      prevProps.sortDirection === nextProps.sortDirection &&
      prevProps.columns === nextProps.columns &&
      prevProps.itemsPerPage === nextProps.itemsPerPage &&
      prevProps.onSort === nextProps.onSort &&
      prevProps.onRowClick === nextProps.onRowClick &&
      prevProps.getRowClassName === nextProps.getRowClassName &&
      prevProps.emptyStateType === nextProps.emptyStateType &&
      prevProps.className === nextProps.className &&
      prevProps.visibleColumns === nextProps.visibleColumns &&
      prevProps.onColumnVisibilityChange === nextProps.onColumnVisibilityChange &&
      prevProps.enableColumnVisibility === nextProps.enableColumnVisibility
    );
  },
);

Table.displayName = 'Table';

export default Table;