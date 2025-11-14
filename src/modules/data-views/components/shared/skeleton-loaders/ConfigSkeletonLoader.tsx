'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './ConfigSkeletonLoader.module.scss';

/**
 * Props for ConfigSkeletonLoader component
 */
interface ConfigSkeletonLoaderProps {
  /** Number of skeleton rows to display */
  rows?: number;
  /** Additional CSS class name */
  className?: string;
}

/**
 * ConfigSkeletonLoader - Loading state component for configuration pages
 * Part of the data-views module for consistent config loading states
 */
const ConfigSkeletonLoader: React.FC<ConfigSkeletonLoaderProps> = memo(({ 
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

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
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
    borderRadius: '8px',
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

  return (
    <motion.div
      className={`${styles.configSkeleton} ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div className={styles.headerSection} variants={sectionVariants}>
        <motion.div 
          className={styles.avatar} 
          style={baseShimmerStyle}
        >
          {shimmerOverlay}
        </motion.div>
        <div className={styles.headerInfo}>
          <motion.div 
            className={styles.title} 
            style={baseShimmerStyle}
          >
            {shimmerOverlay}
          </motion.div>
          <motion.div 
            className={styles.subtitle} 
            style={baseShimmerStyle}
          >
            {shimmerOverlay}
          </motion.div>
        </div>
      </motion.div>

      {/* Tabs Section */}
      <motion.div className={styles.tabsSection} variants={sectionVariants}>
        {Array.from({ length: 5 }).map((_, index) => (
          <motion.div
            key={`tab-${index}`}
            className={styles.tab}
            style={baseShimmerStyle}
            variants={sectionVariants}
          >
            {shimmerOverlay}
          </motion.div>
        ))}
      </motion.div>

      {/* Content Sections */}
      {Array.from({ length: rows }).map((_, index) => (
        <motion.div
          key={`section-${index}`}
          className={styles.contentSection}
          variants={sectionVariants}
        >
          <motion.div 
            className={styles.sectionTitle} 
            style={baseShimmerStyle}
          >
            {shimmerOverlay}
          </motion.div>
          <div className={styles.sectionContent}>
            <motion.div 
              className={styles.field} 
              style={baseShimmerStyle}
            >
              {shimmerOverlay}
            </motion.div>
            <motion.div 
              className={styles.field} 
              style={baseShimmerStyle}
            >
              {shimmerOverlay}
            </motion.div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
});

ConfigSkeletonLoader.displayName = 'ConfigSkeletonLoader';

export default ConfigSkeletonLoader;
