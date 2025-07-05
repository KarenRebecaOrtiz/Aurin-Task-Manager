import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TimerState {
  isRunning: boolean;
  accumulatedSeconds: number;
  startTime: Date | null;
  lastSync: Date;
  deviceId: string;
  isRestoring: boolean;
  isSyncing: boolean;
}

// Función para obtener tiempo del servidor con offset
let serverTimeOffset = 0;

const getServerTime = async (): Promise<Date> => {
  try {
    // Usar Timestamp.now() de Firestore para obtener tiempo del servidor
    const serverTimestamp = Timestamp.now();
    const now = new Date();
    
    // Calcular offset para futuras llamadas
    serverTimeOffset = serverTimestamp.toDate().getTime() - now.getTime();
    
    return new Date(now.getTime() + serverTimeOffset);
  } catch (error) {
    console.warn('[getServerTime] Error, usando tiempo local:', error);
    return new Date();
  }
};

// Función para calcular tiempo transcurrido
const calculateElapsedTime = (startTime: Date, serverTime: Date): number => {
  return Math.max(0, Math.floor((serverTime.getTime() - startTime.getTime()) / 1000));
};



export const useTimer = (taskId: string, userId: string) => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    accumulatedSeconds: 0,
    startTime: null,
    lastSync: new Date(),
    deviceId: crypto.randomUUID(),
    isRestoring: false,
    isSyncing: false,
  });

  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const timerDocRef = useRef(doc(db, `tasks/${taskId}/timers/${userId}`));
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para manejar errores del timer
  const handleTimerError = useCallback(async (operation: string, fallbackState: TimerState) => {
    console.error(`[useTimer] Error en ${operation}`);
    
    // Verificar estado real en Firestore
    try {
      const timerDoc = await getDoc(timerDocRef.current);
      if (timerDoc.exists()) {
        const realData = timerDoc.data();
        const serverTime = await getServerTime();
        
        let accumulatedSeconds = realData.accumulatedSeconds || 0;
        
        if (realData.isRunning && realData.startTime) {
          const elapsed = calculateElapsedTime(realData.startTime.toDate(), serverTime);
          accumulatedSeconds += elapsed;
        }
        
        setTimerState({
          isRunning: realData.isRunning,
          accumulatedSeconds,
          startTime: realData.startTime?.toDate() || null,
          lastSync: serverTime,
          deviceId: timerState.deviceId,
          isRestoring: false,
          isSyncing: false,
        });
        
        console.log('[useTimer] ✅ Estado restaurado desde Firestore');
      } else {
        setTimerState(fallbackState);
        console.log('[useTimer] ⚠️ No hay datos en Firestore, usando estado de fallback');
      }
    } catch (error) {
      console.error('[useTimer] ❌ Error verificando estado real:', error);
      setTimerState(fallbackState);
    }
  }, [timerState.deviceId]);

  // Función optimizada para sincronizar con Firestore
  const syncWithFirestore = useCallback(async (newState: Partial<TimerState>, forceSync = false) => {
    const now = Date.now();
    
    // Evitar sincronizaciones muy frecuentes (mínimo 1 segundo entre syncs)
    if (!forceSync && (now - lastSyncRef.current) < 1000) {
      console.log('[useTimer] ⏭️ Sincronización omitida (muy frecuente)');
      return;
    }

    if (timerState.isSyncing) {
      console.log('[useTimer] ⏭️ Sincronización en progreso, omitiendo');
      return;
    }
    
    setTimerState(prev => ({ ...prev, isSyncing: true }));
    lastSyncRef.current = now;
    
    try {
      const firestoreData = {
        userId,
        isRunning: newState.isRunning,
        startTime: newState.startTime ? serverTimestamp() : null,
        accumulatedSeconds: newState.accumulatedSeconds || 0,
        lastSync: serverTimestamp(),
        deviceId: timerState.deviceId,
        lastAction: newState.isRunning ? 'started' : 'paused',
        lastActionTime: serverTimestamp(),
      };

      await setDoc(timerDocRef.current, firestoreData, { merge: true });
      
      console.log('[useTimer] ✅ Sincronización exitosa:', {
        isRunning: newState.isRunning,
        accumulatedSeconds: newState.accumulatedSeconds,
        deviceId: timerState.deviceId
      });
    } catch (error) {
      console.error('[useTimer] ❌ Error sincronizando:', error);
      await handleTimerError('sync', timerState);
    } finally {
      setTimerState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [timerState, userId, handleTimerError]);

  // Función para sincronización inmediata (para acciones críticas)
  const immediateSync = useCallback((newState: Partial<TimerState>) => {
    return syncWithFirestore(newState, true);
  }, [syncWithFirestore]);



  // Restaurar timer al montar
  useEffect(() => {
    const restoreTimer = async () => {
      if (!taskId || !userId) return;
      
      setTimerState(prev => ({ ...prev, isRestoring: true }));
      console.log('[useTimer] 🔄 Iniciando restauración de timer...', { taskId, userId });
      
      try {
        const timerDoc = await getDoc(timerDocRef.current);
        
        if (timerDoc.exists()) {
          const data = timerDoc.data();
          const serverTime = await getServerTime();
          
          console.log('[useTimer] 📊 Datos de timer encontrados:', data);
          
          let accumulatedSeconds = data.accumulatedSeconds || 0;
          
          if (data.isRunning && data.startTime) {
            const elapsed = calculateElapsedTime(data.startTime.toDate(), serverTime);
            accumulatedSeconds += elapsed;
            
            console.log('[useTimer] ▶️ Restaurando timer activo:', {
              startTime: data.startTime.toDate().toISOString(),
              elapsed,
              accumulatedSeconds: data.accumulatedSeconds || 0,
              totalSeconds: accumulatedSeconds
            });
          } else if (!data.isRunning && data.accumulatedSeconds > 0) {
            console.log('[useTimer] ⏸️ Restaurando timer pausado:', {
              accumulatedSeconds: data.accumulatedSeconds
            });
          } else {
            console.log('[useTimer] 🆕 Timer en estado inicial');
          }
          
          setTimerState({
            isRunning: data.isRunning,
            accumulatedSeconds,
            startTime: data.startTime?.toDate() || null,
            lastSync: serverTime,
            deviceId: timerState.deviceId,
            isRestoring: false,
            isSyncing: false,
          });
        } else {
          console.log('[useTimer] ❌ No se encontraron datos de timer - estado inicial');
          setTimerState(prev => ({ ...prev, isRestoring: false }));
        }
      } catch (error) {
        console.error('[useTimer] ❌ Error restaurando timer:', error);
        setTimerState(prev => ({ ...prev, isRestoring: false }));
      }
    };

    restoreTimer();
  }, [taskId, userId, timerState.deviceId]);

  // Timer activo - actualizar cada segundo
  useEffect(() => {
    if (timerState.isRunning && !timerState.isRestoring) {
      const interval = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          accumulatedSeconds: prev.accumulatedSeconds + 1,
        }));
      }, 1000);
      
      setIntervalId(interval);
      console.log('[useTimer] ▶️ Timer iniciado');
    } else if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      console.log('[useTimer] ⏸️ Timer pausado');
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    };
  }, [timerState.isRunning, timerState.isRestoring, intervalId]);

  // Listener en tiempo real para sincronización entre dispositivos - MEJORADO
  useEffect(() => {
    if (timerState.isRestoring) return;

    console.log('[useTimer] 📡 Configurando listener en tiempo real...');

    const unsubscribe = onSnapshot(timerDocRef.current, (doc) => {
      if (!doc.exists()) return;
      
      const remoteData = doc.data();
      console.log('[useTimer] 🔄 Cambio detectado en timer remoto:', remoteData);
      
      // Solo sincronizar si es de otro dispositivo
      if (remoteData.deviceId !== timerState.deviceId) {
        console.log('[useTimer] 🔄 Sincronizando desde dispositivo remoto');
        
        const serverTime = new Date();
        let accumulatedSeconds = remoteData.accumulatedSeconds || 0;
        
        if (remoteData.isRunning && remoteData.startTime) {
          const elapsed = calculateElapsedTime(remoteData.startTime.toDate(), serverTime);
          accumulatedSeconds += elapsed;
        }
        
        // Sincronización inmediata para cambios de estado
        const isStateChange = remoteData.isRunning !== timerState.isRunning;
        
        setTimerState(prev => ({
          ...prev,
          isRunning: remoteData.isRunning,
          accumulatedSeconds,
          startTime: remoteData.startTime?.toDate() || null,
          lastSync: serverTime,
        }));

        // Si es un cambio de estado (start/pause), forzar sincronización inmediata
        if (isStateChange) {
          console.log('[useTimer] 🚨 Cambio de estado detectado, sincronizando inmediatamente');
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          syncTimeoutRef.current = setTimeout(() => {
            immediateSync({
              isRunning: remoteData.isRunning,
              startTime: remoteData.startTime?.toDate() || null,
              accumulatedSeconds,
            });
          }, 100);
        }
      }
    }, (error) => {
      console.error('[useTimer] ❌ Error en listener de timer:', error);
    });

    return () => {
      console.log('[useTimer] 🔌 Desconectando listener de timer...');
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      unsubscribe();
    };
  }, [taskId, userId, timerState.isRestoring, timerState.deviceId, immediateSync, timerState.isRunning]);

  // Funciones de control del timer - OPTIMIZADAS
  const startTimer = useCallback(async () => {
    console.log('[useTimer] 🎯 Iniciando timer...');
    
    try {
      const serverTime = await getServerTime();
      
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        startTime: serverTime,
        lastSync: serverTime,
      }));

      // Sincronización inmediata para acciones críticas
      await immediateSync({
        isRunning: true,
        startTime: serverTime,
        accumulatedSeconds: timerState.accumulatedSeconds,
      });
      
      console.log('[useTimer] ✅ Timer iniciado correctamente');
    } catch (error) {
      console.error('[useTimer] ❌ Error iniciando timer:', error);
      await handleTimerError('start', timerState);
    }
  }, [timerState, immediateSync, handleTimerError]);

  const pauseTimer = useCallback(async () => {
    console.log('[useTimer] 🎯 Pausando timer...');
    
    try {
      const serverTime = await getServerTime();
      const finalSeconds = timerState.accumulatedSeconds;
      
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: finalSeconds,
        lastSync: serverTime,
      }));

      // Sincronización inmediata para pausar (acción crítica)
      await immediateSync({
        isRunning: false,
        startTime: null,
        accumulatedSeconds: finalSeconds,
      });
      
      console.log('[useTimer] ✅ Timer pausado correctamente');
    } catch (error) {
      console.error('[useTimer] ❌ Error pausando timer:', error);
      await handleTimerError('pause', timerState);
    }
  }, [timerState, immediateSync, handleTimerError]);

  const resetTimer = useCallback(async () => {
    console.log('[useTimer] 🎯 Reseteando timer...');
    
    try {
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
        lastSync: new Date(),
      }));

      await immediateSync({
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
      });
      
      console.log('[useTimer] ✅ Timer reseteado correctamente');
    } catch (error) {
      console.error('[useTimer] ❌ Error reseteando timer:', error);
      await handleTimerError('reset', timerState);
    }
  }, [immediateSync, handleTimerError, timerState]);

  const finalizeTimer = useCallback(async () => {
    console.log('[useTimer] 🎯 Finalizando timer...');
    
    try {
      const finalSeconds = timerState.accumulatedSeconds;
      
      // Limpiar timer en Firestore
      await setDoc(timerDocRef.current, {
        userId,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
        lastFinalized: serverTimestamp(),
        deviceId: timerState.deviceId,
      });
      
      // Limpiar estado local
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
        lastSync: new Date(),
      }));
      
      console.log('[useTimer] ✅ Timer finalizado correctamente');
      return finalSeconds;
    } catch (error) {
      console.error('[useTimer] ❌ Error finalizando timer:', error);
      await handleTimerError('finalize', timerState);
      throw error;
    }
  }, [timerState, userId, handleTimerError]);

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