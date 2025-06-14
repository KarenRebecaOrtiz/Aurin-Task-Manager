'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import styles from './Table.module.scss';

interface HasId {
  id: string;
}

interface Column<T> {
  key: string;
  label: string;
  width: string;
  mobileVisible?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T extends HasId> {
  data: T[];
  columns: Column<T>[];
  itemsPerPage?: number;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (item: T, columnKey: string) => void;
}

const Table = memo(
  <T extends HasId>({ data, columns, itemsPerPage = 10, sortKey, sortDirection, onSort, onRowClick }: TableProps<T>) => {
    const [currentPage, setCurrentPage] = useState(1);
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

    const handleSort = useCallback((key: string) => {
      if (
        onSort &&
        columns.find((col) => col.key === key && col.key !== 'action' && !col.render)
      ) {
        onSort(key);
      }
    }, [onSort, columns]);

    const handleCellClick = useCallback((item: T, column: Column<T>, e: React.MouseEvent) => {
      if (column.key === 'action') {
        e.stopPropagation();
        return;
      }
      if (onRowClick) {
        gsap.to(e.currentTarget, {
          scale: 0.98,
          duration: 0.15,
          ease: 'power1.out',
          yoyo: true,
          repeat: 1,
        });
        onRowClick(item, column.key);
      }
    }, [onRowClick]);

    const handleFirstPage = useCallback(() => setCurrentPage(1), []);
    const handlePrevPage = useCallback(() => setCurrentPage((prev) => Math.max(prev - 1, 1)), []);
    const handleNextPage = useCallback(() => setCurrentPage((prev) => Math.min(prev + 1, totalPages)), [totalPages]);
    const handleLastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);

    const EmptyState = () => (
      <div className={styles.emptyState}>
        <Image
          src="/emptyStateImage.png"
          alt="No hay tareas asignadas"
          width={189}
          height={190}
          className={styles.emptyStateImage}
          style={{ width: 'auto', height: 'auto' }}
        />
        <div className={styles.emptyStateText}>
          <div className={styles.emptyStateTitle}>¡Todo en orden por ahora!</div>
          <div className={styles.emptyStateSubtitle}>
            No tienes tareas activas. ¿Por qué no comienzas creando una nueva?
          </div>
        </div>
      </div>
    );

    return (
      <div className={styles.tableContainer}>
        <div ref={tableRef} className={styles.table}>
          <div className={styles.header}>
            {columns.map((column) => (
              <div
                key={column.key}
                className={`${styles.headerCell} ${
                  column.key !== 'action' && !column.render ? styles.sortable : ''
                } ${!column.mobileVisible ? styles.hideOnMobile : ''}`}
                style={{ width: column.width }}
                onClick={() => handleSort(column.key)}
                role={column.key !== 'action' && !column.render ? 'button' : undefined}
                tabIndex={column.key !== 'action' && !column.render ? 0 : undefined}
                onKeyDown={(e) =>
                  e.key === 'Enter' && column.key !== 'action' && !column.render && handleSort(column.key)
                }
              >
                <span>{column.label}</span>
                {column.key === sortKey && column.key !== 'action' && (
                  <span className={styles.sortIndicator}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            ))}
          </div>
          {paginatedData.length === 0 ? (
            <EmptyState />
          ) : (
            paginatedData.map((item, index) => (
              <div key={item.id || `row-${index}`} className={styles.row}>
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={`${styles.cell} ${!column.mobileVisible ? styles.hideOnMobile : ''} ${
                      column.key === 'action' ? styles.actionCell : styles.clickableCell
                    }`}
                    style={{ width: column.width }}
                    onClick={(e) => handleCellClick(item, column, e)}
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
              onClick={handleFirstPage}
              disabled={currentPage === 1}
              className={styles.paginationButton}
              aria-label="Ir a la primera página"
            >
              <Image src="/chevrons-left.svg" alt="Primera página" width={16} height={16} style={{ width: 'auto', height: 'auto' }} />
            </button>
            <button
              onClick={handlePrevPage}
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
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={styles.paginationButton}
              aria-label="Ir a la página siguiente"
            >
              <Image src="/chevron-right.svg" alt="Página siguiente" width={16} height={16} style={{ width: 'auto', height: 'auto' }} />
            </button>
            <button
              onClick={handleLastPage}
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
      prevProps.onRowClick === nextProps.onRowClick
    );
  },
);

Table.displayName = 'Table';

export default Table;