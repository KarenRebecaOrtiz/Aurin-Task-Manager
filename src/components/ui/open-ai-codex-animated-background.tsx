import { useState, useEffect } from "react";
import styles from './open-ai-codex-animated-background.module.scss';
import UnicornScene from "unicornstudio-react";

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

export const Component = () => {
  const { width, height } = useWindowSize();

  return (
    <div className={styles.container}>
      <UnicornScene 
        production={true} 
        projectId="1grEuiVDSVmyvEMAYhA6" 
        width={width} 
        height={80} 
      />
    </div>
  );
};