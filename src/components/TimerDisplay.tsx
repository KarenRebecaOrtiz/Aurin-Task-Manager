// src/components/TimerDisplay.tsx
import React, { memo, useMemo, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ChatSidebar.module.scss';
import { useTimerStoreHook } from '@/hooks/useTimerStore';



interface TimerDisplayProps {
  timerSeconds: number;
  isTimerRunning: boolean;
  onToggleTimer: (e: React.MouseEvent) => void;
  onFinalizeTimer: () => Promise<void>;
  onTogglePanel: (e: React.MouseEvent) => void;
  isRestoringTimer: boolean;
  isInitializing?: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const TimerDisplay = memo(({
  timerSeconds,
  isTimerRunning,
  onToggleTimer,
  onFinalizeTimer,
  onTogglePanel,
  isRestoringTimer,
  isInitializing,
  isMenuOpen,
  setIsMenuOpen
}: TimerDisplayProps) => {
  // Hook del timer store para acceder a resetTimer
  const { resetTimer } = useTimerStoreHook('temp-task-id', 'temp-user-id');

  // Memoizar los cálculos del timer para evitar re-renders innecesarios
  const timerValues = useMemo(() => ({
    hours: Math.floor(timerSeconds / 3600),
    minutes: Math.floor((timerSeconds % 3600) / 60),
    seconds: timerSeconds % 60
  }), [timerSeconds]);

  // Determinar el estado del timer y el tooltip correspondiente
  const timerState = useMemo(() => {
    if (isInitializing) {
      return {
        icon: '/Play.svg',
        alt: 'Inicializando...',
        tooltip: 'Inicializando timer...',
        isDisabled: true
      };
    }
    
    if (isRestoringTimer) {
      return {
        icon: '/Play.svg',
        alt: 'Iniciar',
        tooltip: 'Iniciar timer',
        isDisabled: true
      };
    }
    
    if (timerSeconds === 0) {
      return {
        icon: '/Play.svg',
        alt: 'Iniciar',
        tooltip: 'Iniciar timer',
        isDisabled: false
      };
    }
    
    if (isTimerRunning) {
      return {
        icon: '/Stop.svg',
        alt: 'Pausar',
        tooltip: '1 click para pausar o doble click para enviar',
        isDisabled: false
      };
    }
    
    // Timer pausado con tiempo acumulado
    return {
      icon: '/Play.svg',
        alt: 'Reanudar',
        tooltip: 'Reanudar timer',
        isDisabled: false
    };
  }, [timerSeconds, isTimerRunning, isRestoringTimer, isInitializing]);

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isInitializing || isRestoringTimer) {
      return; // No hacer nada si está inicializando o restaurando
    }
    
    await onToggleTimer(e);
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isInitializing || isRestoringTimer || timerSeconds === 0) {
      return; // No hacer nada si está inicializando, restaurando o no hay tiempo
    }
    
    await onFinalizeTimer();
  };

  // Handler para toggle menu en click
  const handleToggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  // Click outside para cerrar menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && !event.target) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);



  return (
    <div className={styles.timerContainer}>
      <div 
        className={styles.timerButtonContainer}
        style={{ position: 'relative' }}
      >
        <button 
          className={styles.playStopButton} 
          onClick={handleToggleMenu}
          title="Abrir menu de timer"
          disabled={isRestoringTimer}
        >
          <Image 
            src="/Clock.svg" 
            alt="Reloj" 
            width={12} 
            height={12} 
          />
        </button>
        

      </div>
      
      <div 
        className={styles.timerDisplay}
        style={{ cursor: 'default', border: 'none', background: 'transparent' }}
        title="Contador de tiempo"
      >
        {isInitializing ? (
          <div className={styles.timerNumbers}>
            <span className={styles.loadingIndicator}>...</span>
          </div>
        ) : (
          <NumberFlowGroup>
            <div className={styles.timerNumbers}>
              <NumberFlow 
                value={timerValues.hours} 
                format={{ minimumIntegerDigits: 2 }} 
              />
              <NumberFlow 
                prefix=":" 
                value={timerValues.minutes} 
                format={{ minimumIntegerDigits: 2 }} 
              />
              <NumberFlow 
                prefix=":" 
                value={timerValues.seconds} 
                format={{ minimumIntegerDigits: 2 }} 
              />
            </div>
          </NumberFlowGroup>
        )}
        {isRestoringTimer && <div className={styles.restoreIndicator}>↻</div>}
        {isInitializing && <div className={styles.restoreIndicator}>⏳</div>}
      </div>
    </div>
  );
});

TimerDisplay.displayName = 'TimerDisplay';

export default TimerDisplay; 