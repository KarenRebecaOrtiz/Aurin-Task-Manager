'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import {
  skeletonContainerVariants,
  skeletonRowVariants,
  skeletonCellVariants,
  shimmerVariants,
  tableHeaderVariants,
} from '@/modules/data-views/animations/entryAnimations';
import styles from './TableSkeletonLoader.module.scss';
import tableStyles from '../table/Table.module.scss';

/**
 * Column configuration for skeleton cells
 */
interface SkeletonColumn {
  key: string;
  label: string;
  width: string;
  mobileWidth?: string;
  mobileVisible?: boolean;
}

/**
 * Props for TableSkeletonLoader component
 */
interface TableSkeletonLoaderProps {
  /** Type of table to render skeleton for */
  type: 'tasks' | 'clients' | 'members' | 'archive';
  /** Number of skeleton rows to display */
  rows?: number;
  /** Additional CSS class name */
  className?: string;
}

/**
 * TableSkeletonLoader - Loading state component for data tables
 *
 * Renders a skeleton that matches the exact structure of the populated Table.tsx
 * Uses the same CSS classes and layout as the real table for seamless transitions.
 */
const TableSkeletonLoader: React.FC<TableSkeletonLoaderProps> = memo(({
  type,
  rows = 10,
  className = '',
}) => {
  const { isDarkMode } = useTheme();

  /**
   * Get column configuration based on table type
   * These match the actual column definitions in TasksTable, ClientsTable, etc.
   */
  const getColumns = (): SkeletonColumn[] => {
    switch (type) {
      case 'tasks':
        return [
          { key: 'clientId', label: 'Cuenta', width: '30%', mobileVisible: true, mobileWidth: '25%' },
          { key: 'name', label: 'Tarea', width: '50%', mobileVisible: true, mobileWidth: '60%' },
          { key: 'notificationDot', label: '', width: '20%', mobileVisible: false },
          { key: 'assignedTo', label: 'Asignados', width: '20%', mobileVisible: false },
          { key: 'status', label: 'Estado', width: '30%', mobileVisible: false },
          { key: 'priority', label: 'Prioridad', width: '10%', mobileVisible: false },
          { key: 'action', label: 'Acciones', width: '10%', mobileVisible: true, mobileWidth: '15%' },
        ];
      case 'clients':
        return [
          { key: 'image', label: '', width: '10%', mobileVisible: true },
          { key: 'name', label: 'Cuentas', width: '50%', mobileVisible: true },
          { key: 'projects', label: 'Proyectos Asignados', width: '30%', mobileVisible: false },
          { key: 'action', label: 'Acciones', width: '10%', mobileVisible: true },
        ];
      case 'members':
        return [
          { key: 'avatar', label: '', width: '10%', mobileVisible: true },
          { key: 'name', label: 'Nombre', width: '30%', mobileVisible: true },
          { key: 'role', label: 'Rol', width: '20%', mobileVisible: false },
          { key: 'status', label: 'Estado', width: '15%', mobileVisible: false },
          { key: 'tasks', label: 'Tareas', width: '15%', mobileVisible: false },
          { key: 'action', label: 'Acciones', width: '10%', mobileVisible: true },
        ];
      case 'archive':
        return [
          { key: 'clientId', label: 'Cuenta', width: '30%', mobileVisible: true, mobileWidth: '25%' },
          { key: 'name', label: 'Tarea', width: '50%', mobileVisible: true, mobileWidth: '60%' },
          { key: 'assignedTo', label: 'Asignados', width: '20%', mobileVisible: false },
          { key: 'status', label: 'Estado', width: '30%', mobileVisible: false },
          { key: 'priority', label: 'Prioridad', width: '10%', mobileVisible: false },
          { key: 'action', label: 'Acciones', width: '10%', mobileVisible: true, mobileWidth: '15%' },
        ];
      default:
        return [];
    }
  };

  const columns = getColumns();

  /**
   * Shimmer overlay component
   */
  const ShimmerOverlay = () => (
    <motion.div
      className={styles.shimmerOverlay}
      variants={shimmerVariants}
      animate="animate"
      style={{
        background: isDarkMode
          ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
      }}
    />
  );

  /**
   * Get skeleton element based on column type
   */
  const renderSkeletonCell = (column: SkeletonColumn) => {
    const baseStyle = {
      backgroundColor: isDarkMode ? 'rgba(60, 60, 60, 0.5)' : 'rgba(230, 230, 230, 0.8)',
      borderRadius: '4px',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    };

    switch (column.key) {
      case 'image':
      case 'avatar':
        return (
          <div
            className={styles.skeletonAvatar}
            style={{ ...baseStyle, borderRadius: '50%' }}
          >
            <ShimmerOverlay />
          </div>
        );

      case 'clientId':
        return (
          <div className={styles.skeletonClientCell}>
            <div
              className={styles.skeletonAvatar}
              style={{ ...baseStyle, borderRadius: '50%', width: 32, height: 32 }}
            >
              <ShimmerOverlay />
            </div>
            <div
              className={styles.skeletonText}
              style={{ ...baseStyle, width: '70%', height: 14 }}
            >
              <ShimmerOverlay />
            </div>
          </div>
        );

      case 'assignedTo':
        return (
          <div className={styles.skeletonAvatarGroup}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={styles.skeletonAvatarSmall}
                style={{
                  ...baseStyle,
                  borderRadius: '50%',
                  marginLeft: i > 0 ? -8 : 0,
                }}
              >
                <ShimmerOverlay />
              </div>
            ))}
          </div>
        );

      case 'action':
        return (
          <div
            className={styles.skeletonAction}
            style={{ ...baseStyle, width: 32, height: 32, borderRadius: '8px' }}
          >
            <ShimmerOverlay />
          </div>
        );

      case 'priority':
        return (
          <div
            className={styles.skeletonBadge}
            style={{ ...baseStyle, width: 70, height: 24, borderRadius: '12px' }}
          >
            <ShimmerOverlay />
          </div>
        );

      case 'status':
        return (
          <div
            className={styles.skeletonStatus}
            style={{ ...baseStyle, width: 90, height: 24, borderRadius: '12px' }}
          >
            <ShimmerOverlay />
          </div>
        );

      case 'notificationDot':
        return null;

      case 'name':
        return (
          <div
            className={styles.skeletonText}
            style={{ ...baseStyle, width: '85%', height: 16 }}
          >
            <ShimmerOverlay />
          </div>
        );

      default:
        return (
          <div
            className={styles.skeletonText}
            style={{ ...baseStyle, width: '80%', height: 14 }}
          >
            <ShimmerOverlay />
          </div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={`${tableStyles.tableContainer} ${className}`}
        data-table={type}
        variants={skeletonContainerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className={tableStyles.table}>
          {/* Header - matches TableHeader structure */}
          <motion.div
            className={`${tableStyles.header} ${styles.skeletonHeader}`}
            variants={tableHeaderVariants}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className={`${tableStyles.headerCell} ${!column.mobileVisible ? tableStyles.hideOnMobile : ''}`}
                style={{ width: column.width }}
              >
                <motion.div
                  variants={skeletonCellVariants}
                  className={styles.skeletonHeaderText}
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(60, 60, 60, 0.4)' : 'rgba(220, 220, 220, 0.6)',
                    borderRadius: '4px',
                    height: 12,
                    width: column.label ? '60%' : 0,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {column.label && <ShimmerOverlay />}
                </motion.div>
              </div>
            ))}
          </motion.div>

          {/* Body rows - matches Table row structure */}
          <motion.div
            className={styles.skeletonBody}
            variants={skeletonContainerVariants}
          >
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <motion.div
                key={`skeleton-row-${rowIndex}`}
                className={`${tableStyles.row} ${styles.skeletonRow}`}
                variants={skeletonRowVariants}
                custom={rowIndex}
              >
                {columns.map((column) => (
                  <motion.div
                    key={column.key}
                    className={`${tableStyles.cell} ${!column.mobileVisible ? tableStyles.hideOnMobile : ''} ${
                      column.key === 'action' ? tableStyles.actionCell : ''
                    }`}
                    style={{ width: column.width }}
                    variants={skeletonCellVariants}
                  >
                    {renderSkeletonCell(column)}
                  </motion.div>
                ))}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

TableSkeletonLoader.displayName = 'TableSkeletonLoader';

export default TableSkeletonLoader;
