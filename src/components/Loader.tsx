'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import styles from './Loader.module.scss';

interface LoaderProps {
  message?: string;
  isFullPage?: boolean;
  loadingProgress?: {
    tasks: boolean;
    clients: boolean;
    users: boolean;
  };
  isVisible?: boolean;
  onAnimationComplete?: () => void;
}

const Loader: React.FC<LoaderProps> = ({ 
  message = "Cargando datos...", 
  isFullPage = false,
  loadingProgress,
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

  const spinnerVariants = {
    hidden: { rotate: 0, scale: 0.8 },
    visible: { 
      rotate: 360,
      scale: 1,
      transition: {
        rotate: {
          duration: 1,
          repeat: Infinity,
          ease: "linear" as const
        },
        scale: {
          duration: 0.3,
          ease: "easeOut" as const
        }
      }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        delay: 0.2,
        ease: "easeOut" as const
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
            <motion.div
              className={styles.spinner}
              variants={spinnerVariants}
              initial="hidden"
              animate="visible"
            >
              <Image
                src="/logoDark.svg"
                alt="Logo"
                width={48}
                height={48}
                className={styles.logo}
              />
            </motion.div>
            <motion.p
              className={styles.message}
              variants={textVariants}
              initial="hidden"
              animate="visible"
            >
              {message}
            </motion.p>
            {loadingProgress && (
              <motion.div
                className={styles.progressDetails}
                variants={textVariants}
                initial="hidden"
                animate="visible"
              >
                <div className={styles.progressItem}>
                  <span className={`${styles.progressDot} ${loadingProgress.tasks ? styles.completed : ''}`} />
                  <span>Tareas</span>
                </div>
                <div className={styles.progressItem}>
                  <span className={`${styles.progressDot} ${loadingProgress.clients ? styles.completed : ''}`} />
                  <span>Clientes</span>
                </div>
                <div className={styles.progressItem}>
                  <span className={`${styles.progressDot} ${loadingProgress.users ? styles.completed : ''}`} />
                  <span>Usuarios</span>
                </div>
              </motion.div>
            )}
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
          <motion.div
            className={styles.spinner}
            variants={spinnerVariants}
            initial="hidden"
            animate="visible"
          >
            <Image
              src="/logoDark.svg"
              alt="Logo"
              width={24}
              height={24}
              className={styles.logo}
            />
          </motion.div>
          {message && (
            <motion.p
              className={styles.message}
              variants={textVariants}
              initial="hidden"
              animate="visible"
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return isFullPage ? fullPageLoader : inlineLoader;
};

export default Loader;