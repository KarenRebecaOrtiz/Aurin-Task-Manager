'use client';
import { useState, useEffect, useRef } from 'react';
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
  onAction?: (item: any) => void;
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

  // Calcular páginas
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
    if (tableRef.current) {
      gsap.fromTo(
        tableRef.current.querySelectorAll('.table-row'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [currentPage, paginatedData, totalPages]);

  const handleSort = (key: string) => {
    if (onSort && key !== 'action') {
      onSort(key);
    }
  };

  const handleFirstPage = () => setCurrentPage(1);
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handleLastPage = () => setCurrentPage(totalPages);

  return (
    <div ref={tableRef} className={styles.tableContainer}>
      <div className={styles.table}>
        <div className={styles.header}>
          {columns.map((column) => (
            <div
              key={column.key}
              className={styles.headerCell}
              style={{ width: column.width }}
              onClick={() => handleSort(column.key)}
            >
              <span>{column.label}</span>
              {column.key === sortKey && (
                <span className={styles.sortIndicator}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
          ))}
        </div>
        {paginatedData.map((item, index) => (
          <div key={index} className={`${styles.row} table-row`}>
            {columns.map((column) => (
              <div
                key={column.key}
                className={styles.cell}
                style={{ width: column.width }}
              >
                {column.render ? (
                  column.render(item)
                ) : column.key === 'action' && onAction ? (
                  <button onClick={() => onAction(item)} className={styles.actionButton}>
                    <Image
                      src="/elipsis.svg"
                      alt="Actions"
                      width={16}
                      height={16}
                    />
                  </button>
                ) : (
                  item[column.key] || ''
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {totalPages > 0 && (
        <div className={styles.pagination}>
          <button
            onClick={handleFirstPage}
            disabled={currentPage === 1}
            className={styles.paginationButton}
          >
            <Image
              src="/chevrons-left.svg"
              alt="First Page"
              width={16}
              height={16}
            />
          </button>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={styles.paginationButton}
          >
            <Image
              src="/chevron-left.svg"
              alt="Previous Page"
              width={16}
              height={16}
            />
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
          >
            <Image
              src="/chevron-right.svg"
              alt="Next Page"
              width={16}
              height={16}
            />
          </button>
          <button
            onClick={handleLastPage}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
          >
            <Image
              src="/chevrons-right.svg"
              alt="Last Page"
              width={16}
              height={16}
            />
          </button>
          <span className={styles.pageInfo}>
            Página {currentPage} de {totalPages}
          </span>
        </div>
      )}
    </div>
  );
};

export default Table;