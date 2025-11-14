'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './TableSkeletonLoader.module.scss';

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
 * Part of the data-views module for consistent table loading states
 */
const TableSkeletonLoader: React.FC<TableSkeletonLoaderProps> = memo(({ 
  type, 
  rows = 5,
  className = ''
}) => {
  const { isDarkMode } = useTheme();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const tableVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  const cellVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.2 }
    }
  };

  const shimmerVariants = {
    animate: {
      x: ['-100%', '100%'],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear' as const
      }
    }
  };

  const baseShimmerStyle = {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    backgroundColor: isDarkMode ? 'rgba(60, 60, 60, 0.6)' : 'rgba(240, 240, 240, 0.6)',
    borderRadius: '4px',
  };

  const shimmerOverlay = (
    <motion.div
      className={styles.shimmerOverlay}
      variants={shimmerVariants}
      animate="animate"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: isDarkMode 
          ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
        transform: 'translateX(-100%)',
      }}
    />
  );

  /**
   * Get column configuration based on table type
   */
  const getColumns = () => {
    switch (type) {
      case 'tasks':
        return [
          { key: 'name', label: 'Tarea', width: '30%' },
          { key: 'client', label: 'Cuenta', width: '15%' },
          { key: 'priority', label: 'Prioridad', width: '10%' },
          { key: 'status', label: 'Estado', width: '10%' },
          { key: 'assigned', label: 'Asignados', width: '20%' },
          { key: 'action', label: 'Acciones', width: '15%' },
        ];
      case 'clients':
        return [
          { key: 'image', label: '', width: '20%' },
          { key: 'name', label: 'Cuentas', width: '50%' },
          { key: 'projects', label: 'Proyectos Asignados', width: '20%' },
          { key: 'action', label: 'Acciones', width: '10%' },
        ];
      case 'members':
        return [
          { key: 'avatar', label: '', width: '15%' },
          { key: 'name', label: 'Nombre', width: '25%' },
          { key: 'role', label: 'Rol', width: '20%' },
          { key: 'status', label: 'Estado', width: '15%' },
          { key: 'tasks', label: 'Tareas', width: '15%' },
          { key: 'action', label: 'Acciones', width: '10%' },
        ];
      case 'archive':
        return [
          { key: 'name', label: 'Tarea', width: '30%' },
          { key: 'client', label: 'Cuenta', width: '15%' },
          { key: 'priority', label: 'Prioridad', width: '10%' },
          { key: 'status', label: 'Estado', width: '10%' },
          { key: 'assigned', label: 'Asignados', width: '20%' },
          { key: 'action', label: 'Acciones', width: '15%' },
        ];
      default:
        return [];
    }
  };

  /**
   * Render skeleton cell based on column type
   */
  const renderSkeletonCell = (column: { key: string; width: string }) => {
    switch (column.key) {
      case 'image':
      case 'avatar':
        return (
          <motion.div 
            className={styles.skeletonAvatar}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
      case 'assigned':
        return (
          <motion.div 
            className={styles.skeletonAvatarGroup}
            variants={rowVariants}
          >
            <motion.div className={styles.skeletonAvatar} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
            <motion.div className={styles.skeletonAvatar} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
            <motion.div className={styles.skeletonAvatar} style={baseShimmerStyle}>
              {shimmerOverlay}
            </motion.div>
          </motion.div>
        );
      case 'action':
        return (
          <motion.div 
            className={styles.skeletonAction}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
      case 'priority':
        return (
          <motion.div 
            className={styles.skeletonBadge}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
      case 'status':
        return (
          <motion.div 
            className={styles.skeletonStatus}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
      default:
        return (
          <motion.div 
            className={styles.skeletonText}
            style={baseShimmerStyle}
            variants={rowVariants}
          >
            {shimmerOverlay}
          </motion.div>
        );
    }
  };

  return (
    <motion.div
      className={`${styles.skeletonContainer} ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className={styles.skeletonTable} variants={tableVariants}>
        {/* Table Header */}
        <motion.div className={styles.skeletonHeader} variants={rowVariants}>
          {getColumns().map((column) => (
            <motion.div
              key={column.key}
              className={styles.skeletonHeaderCell}
              style={{ width: column.width }}
              variants={cellVariants}
            >
              <motion.div className={styles.skeletonText} style={baseShimmerStyle}>
                {shimmerOverlay}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Table Body */}
        <motion.div className={styles.skeletonBody}>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <motion.div
              key={rowIndex}
              className={styles.skeletonRow}
              variants={rowVariants}
            >
              {getColumns().map((column) => (
                <motion.div
                  key={column.key}
                  className={styles.skeletonCell}
                  style={{ width: column.width }}
                  variants={cellVariants}
                >
                  {renderSkeletonCell(column)}
                </motion.div>
              ))}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

TableSkeletonLoader.displayName = 'TableSkeletonLoader';

export default TableSkeletonLoader;
