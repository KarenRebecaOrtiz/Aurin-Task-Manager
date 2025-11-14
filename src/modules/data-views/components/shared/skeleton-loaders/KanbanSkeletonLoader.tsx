'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './KanbanSkeletonLoader.module.scss';

/**
 * Props for KanbanSkeletonLoader component
 */
interface KanbanSkeletonLoaderProps {
  /** Number of cards per column */
  cardsPerColumn?: number;
  /** Additional CSS class name */
  className?: string;
}

/**
 * KanbanSkeletonLoader - Loading state component for Kanban boards
 * Part of the data-views module for consistent Kanban loading states
 */
const KanbanSkeletonLoader: React.FC<KanbanSkeletonLoaderProps> = memo(({ 
  cardsPerColumn = 3,
  className = ''
}) => {
  const { isDarkMode } = useTheme();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const columnVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
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

  const columns = [
    { id: 'pending', title: 'Pendiente' },
    { id: 'in-progress', title: 'En Progreso' },
    { id: 'review', title: 'Revisión' },
    { id: 'completed', title: 'Completado' }
  ];

  return (
    <motion.div
      className={`${styles.kanbanSkeleton} ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {columns.map((column) => (
        <motion.div
          key={column.id}
          className={styles.kanbanColumn}
          variants={columnVariants}
        >
          {/* Column Header */}
          <div className={styles.columnHeader}>
            <motion.div 
              className={styles.columnTitle} 
              style={baseShimmerStyle}
              variants={cardVariants}
            >
              {shimmerOverlay}
            </motion.div>
            <motion.div 
              className={styles.columnCount} 
              style={baseShimmerStyle}
              variants={cardVariants}
            >
              {shimmerOverlay}
            </motion.div>
          </div>

          {/* Column Cards */}
          <div className={styles.columnCards}>
            {Array.from({ length: Math.floor(Math.random() * 2) + cardsPerColumn }).map((_, cardIndex) => (
              <motion.div
                key={`${column.id}-card-${cardIndex}`}
                className={styles.skeletonKanbanCard}
                style={baseShimmerStyle}
                variants={cardVariants}
              >
                {/* Card Header */}
                <motion.div 
                  className={styles.skeletonCardHeader} 
                  style={baseShimmerStyle}
                  variants={cardVariants}
                >
                  {shimmerOverlay}
                </motion.div>

                {/* Card Content */}
                <motion.div 
                  className={styles.skeletonCardContent} 
                  style={baseShimmerStyle}
                  variants={cardVariants}
                >
                  {shimmerOverlay}
                </motion.div>

                {/* Card Footer */}
                <motion.div 
                  className={styles.skeletonCardFooter} 
                  style={baseShimmerStyle}
                  variants={cardVariants}
                >
                  {shimmerOverlay}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
});

KanbanSkeletonLoader.displayName = 'KanbanSkeletonLoader';

export default KanbanSkeletonLoader;
