'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import {
  kanbanBoardVariants,
  kanbanColumnVariants,
  kanbanCardVariants,
  kanbanColumnHeaderVariants,
  shimmerVariants,
} from '@/modules/data-views/animations/entryAnimations';
import { KANBAN_COLUMNS } from '@/modules/data-views/constants';
import styles from './KanbanSkeletonLoader.module.scss';
import columnStyles from '@/modules/data-views/tasks/components/tables/KanbanBoard/components/KanbanColumn.module.scss';
import cardStyles from '@/modules/data-views/tasks/components/tables/KanbanBoard/components/KanbanTaskCard.module.scss';

/**
 * Props for KanbanSkeletonLoader component
 */
interface KanbanSkeletonLoaderProps {
  /** Number of cards per column (base count, varies slightly per column) */
  cardsPerColumn?: number;
  /** Additional CSS class name */
  className?: string;
}

/**
 * KanbanSkeletonLoader - Loading state component for Kanban boards
 *
 * Renders a skeleton that matches the exact structure of KanbanColumn and KanbanTaskCard.
 * Uses the same CSS classes and layout as the real kanban for seamless transitions.
 */
const KanbanSkeletonLoader: React.FC<KanbanSkeletonLoaderProps> = memo(({
  cardsPerColumn = 4,
  className = '',
}) => {
  const { isDarkMode } = useTheme();

  // Use actual kanban columns for consistency
  const columns = KANBAN_COLUMNS;

  // Deterministic card counts per column (avoids random re-renders)
  const cardCounts = [
    cardsPerColumn + 1,
    cardsPerColumn,
    cardsPerColumn - 1,
    cardsPerColumn - 2,
  ];

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
          ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
      }}
    />
  );

  /**
   * Base styles for shimmer elements
   */
  const getBaseStyle = () => ({
    backgroundColor: isDarkMode ? 'rgba(60, 60, 60, 0.5)' : 'rgba(230, 230, 230, 0.8)',
    borderRadius: '4px',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  });

  /**
   * Renders a skeleton card matching KanbanTaskCard structure
   */
  const SkeletonCard = ({ index }: { index: number }) => {
    const baseStyle = getBaseStyle();

    return (
      <motion.div
        className={`${cardStyles.taskCard} ${styles.skeletonCard}`}
        variants={kanbanCardVariants}
        custom={index}
      >
        {/* Primera fila: Cliente + Nombre + Action Button */}
        <div className={cardStyles.taskHeader}>
          <div className={cardStyles.clientInfo}>
            <div
              className={styles.skeletonAvatar}
              style={{ ...baseStyle, borderRadius: '50%', width: 32, height: 32 }}
            >
              <ShimmerOverlay />
            </div>
          </div>
          <div className={cardStyles.taskNameWrapper}>
            <div
              className={styles.skeletonText}
              style={{ ...baseStyle, width: '80%', height: 14 }}
            >
              <ShimmerOverlay />
            </div>
          </div>
          <div
            className={styles.skeletonAction}
            style={{ ...baseStyle, width: 24, height: 24, borderRadius: '6px' }}
          >
            <ShimmerOverlay />
          </div>
        </div>

        {/* Segunda fila: Badges de estado y prioridad */}
        <div className={cardStyles.badgesRow}>
          <div
            className={styles.skeletonBadge}
            style={{ ...baseStyle, width: 70, height: 22, borderRadius: '12px' }}
          >
            <ShimmerOverlay />
          </div>
          <div
            className={styles.skeletonBadge}
            style={{ ...baseStyle, width: 50, height: 22, borderRadius: '12px' }}
          >
            <ShimmerOverlay />
          </div>
        </div>

        {/* Tercera fila: Avatar Group */}
        <div className={cardStyles.avatarRow}>
          <div className={styles.skeletonAvatarGroup}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={styles.skeletonAvatarSmall}
                style={{
                  ...baseStyle,
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  marginLeft: i > 0 ? -8 : 0,
                }}
              >
                <ShimmerOverlay />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={`${styles.kanbanSkeleton} ${className}`}
        variants={kanbanBoardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {columns.map((column, columnIndex) => (
          <motion.div
            key={column.id}
            className={`${columnStyles.kanbanColumn} ${styles.skeletonColumn}`}
            variants={kanbanColumnVariants}
            custom={columnIndex}
          >
            {/* Column Header - matches KanbanColumnHeader structure */}
            <motion.div
              className={styles.columnHeader}
              variants={kanbanColumnHeaderVariants}
            >
              <div className={styles.columnHeaderContent}>
                <div
                  className={styles.skeletonTitle}
                  style={{
                    ...getBaseStyle(),
                    width: '70%',
                    height: 16,
                  }}
                >
                  <ShimmerOverlay />
                </div>
                <div
                  className={styles.skeletonCount}
                  style={{
                    ...getBaseStyle(),
                    width: 28,
                    height: 20,
                    borderRadius: '10px',
                  }}
                >
                  <ShimmerOverlay />
                </div>
              </div>
            </motion.div>

            {/* Task List - matches KanbanColumn structure */}
            <div className={columnStyles.taskList}>
              {Array.from({ length: Math.max(1, cardCounts[columnIndex] || cardsPerColumn) }).map(
                (_, cardIndex) => (
                  <SkeletonCard key={`skeleton-card-${column.id}-${cardIndex}`} index={cardIndex} />
                )
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
});

KanbanSkeletonLoader.displayName = 'KanbanSkeletonLoader';

export default KanbanSkeletonLoader;
