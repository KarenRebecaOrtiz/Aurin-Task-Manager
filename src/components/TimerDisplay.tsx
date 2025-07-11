// src/components/TimerDisplay.tsx
import React, { memo, useMemo } from 'react';
import Image from 'next/image';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';
import styles from './ChatSidebar.module.scss';

interface TimerDisplayProps {
  timerSeconds: number;
  isTimerRunning: boolean;
  onToggleTimer: (e: React.MouseEvent) => void;
  onFinalizeTimer: () => Promise<void>;
  onTogglePanel: (e: React.MouseEvent) => void;
  isRestoringTimer: boolean;
}

const TimerDisplay = memo(({ 
  timerSeconds, 
  isTimerRunning, 
  onToggleTimer, 
  onFinalizeTimer, 
  onTogglePanel, 
  isRestoringTimer 
}: TimerDisplayProps) => {
  // Memoizar los cálculos del timer para evitar re-renders innecesarios
  const timerValues = useMemo(() => ({
    hours: Math.floor(timerSeconds / 3600),
    minutes: Math.floor((timerSeconds % 3600) / 60),
    seconds: timerSeconds % 60
  }), [timerSeconds]);

  const handleDoubleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (timerSeconds > 0) await onFinalizeTimer();
  };

  return (
    <div className={styles.timerContainer}>
      <button 
        className={styles.playStopButton} 
        onClick={onToggleTimer}
        onDoubleClick={handleDoubleClick}
        title={isTimerRunning ? 'Click: Pausar | Doble click: Enviar' : 'Iniciar'}
      >
        <Image 
          src={isTimerRunning ? '/Stop.svg' : '/Play.svg'} 
          alt={isTimerRunning ? 'Detener' : 'Iniciar'} 
          width={12} 
          height={12} 
        />
      </button>
      <div className={styles.timer} onClick={onTogglePanel}>
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
        {isRestoringTimer && <div className={styles.restoreIndicator}>↻</div>}
        <Image src="/chevron-down.svg" alt="Abrir panel" width={12} height={12} />
      </div>
    </div>
  );
});

TimerDisplay.displayName = 'TimerDisplay';

export default TimerDisplay; 