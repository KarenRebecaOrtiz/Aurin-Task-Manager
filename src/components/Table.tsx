'use client';
import { useState, useEffect, useRef, memo } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import styles from './Table.module.scss';

interface Column {
  key: string;
  label: string;
  width: string;
  render?: (item: any) => React.ReactNode;
}

interface TableProps {
  data: any[];
  columns: Column[];
  itemsPerPage?: number;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onAction?: (item: any) => void; // Para la columna de acción genérica si no hay render
}

const Table: React.FC<TableProps> = ({
  data,
  columns,
  itemsPerPage = 10,
  sortKey,
  sortDirection,
  onSort,
  onAction,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const tableRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage)); // Asegurar que totalPages sea al menos 1
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && data.length > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0){ // Caso borde si currentPage llega a ser 0
        setCurrentPage(1);
    }
  }, [currentPage, totalPages, data.length]);


  useEffect(() => {
    if (tableRef.current && paginatedData.length > 0) {
      gsap.fromTo(
        tableRef.current.querySelectorAll(`.${styles.row}`),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [paginatedData]); // Animar cuando paginatedData cambie


  const handleSort = (key: string) => {
    if (onSort && columns.find(col => col.key === key && col.key !== 'action' && !col.render)) { // Solo permitir sort en columnas no renderizadas y no de acción
      onSort(key);
    } else if (onSort && columns.find(col => col.key === key && col.key !== 'action')) { // Permitir sort si tiene onSort y no es action
        onSort(key);
    }
  };

  const handleFirstPage = () => setCurrentPage(1);
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handleLastPage = () => setCurrentPage(totalPages);

  return (
    <div className={styles.tableContainer}>
      <div ref={tableRef} className={styles.table}>
        <div className={styles.header}>
          {columns.map((column) => (
            <div
              key={column.key}
              className={styles.headerCell}
              style={{ width: column.width }}
              onClick={() => handleSort(column.key)}
              role={column.key !== 'action' && !column.render ? "button" : undefined}
              tabIndex={column.key !== 'action' && !column.render ? 0 : undefined}
              onKeyDown={(e) => e.key === 'Enter' && handleSort(column.key)}
            >
              <span>{column.label}</span>
              {column.key === sortKey && column.key !== 'action' && (
                <span className={styles.sortIndicator}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
          ))}
        </div>
        {paginatedData.map((item, index) => (
          <div key={item.id || `row-${index}`} className={styles.row}>
            {columns.map((column) => (
              <div
                key={column.key}
                className={styles.cell}
                style={{ width: column.width }}
              >
                {column.render ? (
                  column.render(item)
                ) : column.key === 'action' && onAction ? (
                  <button onClick={() => onAction(item)} className={styles.actionButton} aria-label={`Acciones para ${item.name || 'elemento'}`}>
                    <Image
                      src="/elipsis.svg"
                      alt="Actions"
                      width={16}
                      height={16}
                    />
                  </button>
                ) : (
                  item[column.key] !== undefined && item[column.key] !== null ? String(item[column.key]) : ''
                )}
              </div>
            ))}
          </div>
        ))}
        {paginatedData.length === 0 && (
            <div className={styles.row}>
                <div className={styles.cell} style={{ width: '100%', textAlign: 'center', fontStyle: 'italic' }}>
                    No hay datos para mostrar.
                </div>
            </div>
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
            <Image
              src="/chevrons-left.svg"
              alt="Primera página"
              width={16}
              height={16}
            />
          </button>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={styles.paginationButton}
            aria-label="Ir a la página anterior"
          >
            <Image
              src="/chevron-left.svg"
              alt="Página anterior"
              width={16}
              height={16}
            />
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
            <Image
              src="/chevron-right.svg"
              alt="Página siguiente"
              width={16}
              height={16}
            />
          </button>
          <button
            onClick={handleLastPage}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
            aria-label="Ir a la última página"
          >
            <Image
              src="/chevrons-right.svg"
              alt="Última página"
              width={16}
              height={16}
            />
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(Table);