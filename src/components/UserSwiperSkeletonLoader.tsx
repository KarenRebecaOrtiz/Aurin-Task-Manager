'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import styles from './UserSwiperSkeletonLoader.module.scss';
import { useTheme } from '@/contexts/ThemeContext';

interface UserSwiperSkeletonLoaderProps {
  className?: string;
}

const UserSwiperSkeletonLoader: React.FC<UserSwiperSkeletonLoaderProps> = memo(({ className }) => {
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

  const cardVariants = {
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

  // Generate 6 skeleton cards to match typical UserSwiper layout
  const skeletonCards = Array.from({ length: 6 }, (_, index) => (
    <motion.li key={index} variants={cardVariants}>
      <div className={styles.card}>
        <div className={styles.cardInfo}>
          <div className={styles.avatarWrapper}>
            <div className={styles.cardAvatar}>
              <motion.div 
                className={styles.avatarImage}
                style={baseShimmerStyle}
              >
                {shimmerOverlay}
              </motion.div>
            </div>
          </div>
          <div className={styles.cardText}>
            <motion.div 
              className={styles.cardTitle}
              style={baseShimmerStyle}
            >
              {shimmerOverlay}
            </motion.div>
            <motion.div 
              className={styles.cardStatus}
              style={baseShimmerStyle}
            >
              {shimmerOverlay}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.li>
  ));

  return (
    <div className={`${styles.swiperContainer} ${className || ''}`} style={{ paddingTop: '20px', paddingBottom: '20px' }}>
      {/* Viñetado izquierdo */}
      <div className={styles.vignetteLeft}></div>
      
      {/* Viñetado derecho */}
      <div className={styles.vignetteRight}></div>
      
      <section
        className="splide"
        aria-label="Carrusel de Perfiles de Usuarios - Cargando"
      >
        <div className="splide__track" style={{ 
          paddingTop: '20px', 
          paddingBottom: '20px', 
          paddingLeft: '0px', 
          paddingRight: '0px', 
          overflow: 'visible!important' 
        }}>
          <motion.ul 
            className="splide__list" 
            style={{ paddingTop: '20px', paddingBottom: '20px' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {skeletonCards}
          </motion.ul>
        </div>
      </section>
    </div>
  );
});

UserSwiperSkeletonLoader.displayName = 'UserSwiperSkeletonLoader';

export default UserSwiperSkeletonLoader; 