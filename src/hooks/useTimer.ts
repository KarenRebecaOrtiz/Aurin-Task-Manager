import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TimerState {
  isRunning: boolean;
  accumulatedSeconds: number;
  startTime: Date | null;
  deviceId: string;
  isRestoring: boolean;
}

export const useTimer = (taskId: string, userId: string) => {
  const deviceId = useRef(crypto.randomUUID());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerDocRef = useRef(doc(db, `tasks/${taskId}/timers/${userId}`));
  
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    accumulatedSeconds: 0,
    startTime: null,
    deviceId: deviceId.current,
    isRestoring: true,
  });

  // Función para sincronizar con Firestore
  const syncToFirestore = useCallback(async (state: TimerState) => {
    try {
      const firestoreData = {
        userId,
        isRunning: state.isRunning,
        startTime: state.startTime ? Timestamp.fromDate(state.startTime) : null,
        accumulatedSeconds: state.accumulatedSeconds,
        deviceId: deviceId.current,
        lastSync: Timestamp.fromDate(new Date()),
      };

      await setDoc(timerDocRef.current, firestoreData, { merge: true });
      console.log('[useTimer] ✅ Sincronizado con Firestore:', { isRunning: state.isRunning, seconds: state.accumulatedSeconds });
    } catch (error) {
      console.error('[useTimer] ❌ Error sincronizando:', error);
    }
  }, [userId]);

  // Función para obtener tiempo del servidor
  const getServerTime = useCallback(() => new Date(), []);

  // Función para calcular tiempo transcurrido
  const calculateElapsedTime = useCallback((startTime: Date, currentTime: Date): number => {
    return Math.max(0, Math.floor((currentTime.getTime() - startTime.getTime()) / 1000));
  }, []);

  // Restaurar timer al montar
  useEffect(() => {
    const restoreTimer = async () => {
      if (!taskId || !userId) return;
      
      try {
        const timerDoc = await getDoc(timerDocRef.current);
        
        if (timerDoc.exists()) {
          const data = timerDoc.data();
          const serverTime = getServerTime();
          
          let accumulatedSeconds = data.accumulatedSeconds || 0;
          
          if (data.isRunning && data.startTime) {
            const elapsed = calculateElapsedTime(data.startTime.toDate(), serverTime);
            accumulatedSeconds += elapsed;
          }
          
          const newState = {
            isRunning: data.isRunning,
            accumulatedSeconds,
            startTime: data.isRunning ? data.startTime.toDate() : null,
            deviceId: deviceId.current,
            isRestoring: false,
          };
          
          setTimerState(newState);
          console.log('[useTimer] ✅ Timer restaurado:', newState);
        } else {
          setTimerState(prev => ({ ...prev, isRestoring: false }));
          console.log('[useTimer] 🆕 Timer inicial');
        }
      } catch (error) {
        console.error('[useTimer] ❌ Error restaurando timer:', error);
        setTimerState(prev => ({ ...prev, isRestoring: false }));
      }
    };

    restoreTimer();
  }, [taskId, userId, getServerTime, calculateElapsedTime]);

  // Timer local - actualizar cada segundo
  useEffect(() => {
    if (timerState.isRunning && !timerState.isRestoring) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          accumulatedSeconds: prev.accumulatedSeconds + 1,
        }));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.isRestoring]);

  // Sincronización periódica cada 5 minutos
  useEffect(() => {
    if (timerState.isRunning && !timerState.isRestoring) {
      syncIntervalRef.current = setInterval(() => {
        setTimerState(prev => {
          const currentTime = getServerTime();
          let accumulatedSeconds = prev.accumulatedSeconds;
          
          if (prev.startTime) {
            const elapsed = calculateElapsedTime(prev.startTime, currentTime);
            accumulatedSeconds = elapsed;
          }
          
          const newState = {
            ...prev,
            accumulatedSeconds,
          };
          
          // Sincronizar con Firestore
          syncToFirestore(newState);
          
          return newState;
        });
      }, 5 * 60 * 1000); // 5 minutos
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.isRestoring, syncToFirestore, getServerTime, calculateElapsedTime]);

  // Listener en tiempo real para sincronización entre dispositivos
  useEffect(() => {
    if (timerState.isRestoring) return;

    const unsubscribe = onSnapshot(timerDocRef.current, (doc) => {
      if (!doc.exists()) return;
      
      const remoteData = doc.data();
      
      // Solo sincronizar si es de otro dispositivo
      if (remoteData.deviceId !== deviceId.current) {
        const serverTime = getServerTime();
        let accumulatedSeconds = remoteData.accumulatedSeconds || 0;
        
        if (remoteData.isRunning && remoteData.startTime) {
          const elapsed = calculateElapsedTime(remoteData.startTime.toDate(), serverTime);
          accumulatedSeconds += elapsed;
        }
        
        setTimerState(prev => {
          // Solo actualizar si realmente hay cambios
          if (prev.isRunning === remoteData.isRunning && 
              Math.abs(prev.accumulatedSeconds - accumulatedSeconds) < 2) {
            return prev;
          }
          
          return {
            ...prev,
            isRunning: remoteData.isRunning,
            accumulatedSeconds,
            startTime: remoteData.isRunning ? remoteData.startTime.toDate() : null,
          };
        });
      }
    });

    return () => unsubscribe();
  }, [taskId, userId, timerState.isRestoring, getServerTime, calculateElapsedTime]);

  // Funciones de control del timer
  const startTimer = useCallback(async () => {
    console.log('[useTimer] 🎯 Iniciando timer...');
    
    const serverTime = getServerTime();
    
    setTimerState(prev => {
      const newState = {
        ...prev,
        isRunning: true,
        startTime: serverTime,
      };
      
      // Sincronización inmediata
      syncToFirestore(newState);
      
      return newState;
    });
    
    console.log('[useTimer] ✅ Timer iniciado');
  }, [getServerTime, syncToFirestore]);

  const pauseTimer = useCallback(async () => {
    console.log('[useTimer] 🎯 Pausando timer...');
    
    setTimerState(prev => {
      const newState = {
        ...prev,
        isRunning: false,
        startTime: null,
      };
      
      // Sincronización inmediata
      syncToFirestore(newState);
      
      return newState;
    });
    
    console.log('[useTimer] ✅ Timer pausado');
  }, [syncToFirestore]);

  const resetTimer = useCallback(async () => {
    console.log('[useTimer] 🎯 Reseteando timer...');
    
    setTimerState(prev => {
      const newState = {
        ...prev,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
      };
      
      // Sincronización inmediata
      syncToFirestore(newState);
      
      return newState;
    });
    
    console.log('[useTimer] ✅ Timer reseteado');
  }, [syncToFirestore]);

  const finalizeTimer = useCallback(async () => {
    console.log('[useTimer] 🎯 Finalizando timer...');
    
    let finalSeconds = 0;
    
    setTimerState(prev => {
      finalSeconds = prev.accumulatedSeconds;
      
      // Limpiar timer en Firestore
      setDoc(timerDocRef.current, {
        userId,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
        lastFinalized: Timestamp.fromDate(new Date()),
        deviceId: deviceId.current,
      });
      
      return {
        ...prev,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
      };
    });
    
    console.log('[useTimer] ✅ Timer finalizado');
    return finalSeconds;
  }, [userId]);

  return {
    timerState,
    startTimer,
    pauseTimer,
    resetTimer,
    finalizeTimer,
    // Getters para compatibilidad
    isTimerRunning: timerState.isRunning,
    timerSeconds: timerState.accumulatedSeconds,
    isRestoringTimer: timerState.isRestoring,
  };
}; 