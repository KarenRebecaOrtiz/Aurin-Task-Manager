'use client';

import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../styles/Loader.module.scss';
import LighthouseScene from '../atoms/LighthouseScene';
import type { LoaderProps } from '../../config/types';

const Loader: React.FC<LoaderProps> = ({ 
  isFullPage = false,
  isVisible = true,
  onAnimationComplete
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeInOut" as const
      }
    },
    exit: { 
      y: "-100vh",
      transition: {
        duration: 0.8,
        ease: "easeInOut" as const,
        onComplete: onAnimationComplete
      }
    }
  };

  const fullPageLoader = (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      {isVisible && (
        <motion.div
          className={styles.fullPageLoader}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className={styles.loaderContent}>
            <div className={styles.lighthouseContainer}>
              <LighthouseScene />
            </div>
            <motion.div
              className={styles.progressBar}
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const inlineLoader = (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className={styles.inlineLoader}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className={styles.lighthouseContainer}>
            <LighthouseScene />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return isFullPage ? fullPageLoader : inlineLoader;
};

export default Loader;