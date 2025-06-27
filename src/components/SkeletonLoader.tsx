'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import styles from './SkeletonLoader.module.scss';

interface SkeletonLoaderProps {
  type: 'tasks' | 'clients' | 'members';
  rows?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = memo(({ type, rows = 5 }) => {
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
      default:
        return [];
    }
  };

  const columns = getColumns();

  // Variants para animaciones suaves
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut" as const,
      },
    },
  };

  const shimmerVariants = {
    animate: {
      x: ["-100%", "100%"],
      transition: {
        duration: 1.8,
        ease: "easeInOut" as const,
        repeat: Infinity,
        repeatType: "loop" as const,
      },
    },
  };

  const renderSkeletonCell = (column: { key: string; width: string }) => {
    const baseShimmerStyle = {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      backgroundColor: 'rgba(240, 240, 240, 0.6)',
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
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
          transform: 'translateX(-100%)',
        }}
      />
    );

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
      className={styles.skeletonContainer}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header skeleton */}
      <motion.div 
        className={styles.skeletonHeader}
        variants={rowVariants}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={styles.skeletonHeaderCell}
            style={{ width: column.width }}
          >
            <motion.div 
              className={styles.skeletonHeaderText}
              style={{
                backgroundColor: 'rgba(240, 240, 240, 0.6)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
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
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                  transform: 'translateX(-100%)',
                }}
              />
            </motion.div>
          </div>
        ))}
      </motion.div>

      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, index) => (
        <motion.div 
          key={index} 
          className={styles.skeletonRow}
          variants={rowVariants}
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className={styles.skeletonCell}
              style={{ width: column.width }}
            >
              {renderSkeletonCell(column)}
            </div>
          ))}
        </motion.div>
      ))}
    </motion.div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

export default SkeletonLoader; 