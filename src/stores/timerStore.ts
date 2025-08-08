import { create } from 'zustand';
import { doc, getDoc, setDoc, onSnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TimerState {
  isRunning: boolean;
  accumulatedSeconds: number;
  startTime: Date | null;
  deviceId: string;
  isRestoring: boolean;
  taskId: string | null;
  userId: string | null;
  lastSyncTime: number | null; // High-resolution timestamp for drift tracking
  syncStatus: 'idle' | 'syncing' | 'error';
  workerActive: boolean; // Indica si el worker está activo
}

interface TimerActions {
  // Estado
  setTaskId: (taskId: string) => void;
  setUserId: (userId: string) => void;
  setIsRunning: (isRunning: boolean) => void;
  setAccumulatedSeconds: (seconds: number) => void;
  setStartTime: (startTime: Date | null) => void;
  setIsRestoring: (isRestoring: boolean) => void;
  setLastSyncTime: (time: number | null) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
  setWorkerActive: (active: boolean) => void;
  
  // Acciones
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  finalizeTimer: () => Promise<number>;
  
  // Getters
  getTimerSeconds: () => number;
  getIsTimerRunning: () => boolean;
  getIsRestoringTimer: () => boolean;
  getSyncStatus: () => 'idle' | 'syncing' | 'error';
  
  // Inicialización
  initializeTimer: (taskId: string, userId: string) => Promise<void>;
  cleanupTimer: () => void;
}

type TimerStore = TimerState & TimerActions;

export const useTimerStore = create<TimerStore>((set, get) => {
  let timeoutRef: NodeJS.Timeout | null = null;
  let syncTimeoutRef: NodeJS.Timeout | null = null;
  let unsubscribeSnapshot: (() => void) | null = null;
  let performanceStartTime: number | null = null;
  let worker: Worker | null = null;
  
  const deviceId = crypto.randomUUID();

  // Inicializar Web Worker
  const initializeWorker = () => {
    if (typeof window === 'undefined') return;
    
    try {
      worker = new Worker('/timerWorker.js');
      
      worker.onmessage = (e) => {
        const { type, timestamp, error } = e.data;
        
        switch (type) {
          case 'tick':
            set((prev) => ({
              ...prev,
              accumulatedSeconds: prev.accumulatedSeconds + 1,
            }));
            break;
            
          case 'error':
            console.error('[TimerStore] Worker error:', error);
            set({ syncStatus: 'error' });
            break;
        }
      };
      
      worker.onerror = (error) => {
        console.error('[TimerStore] Worker error:', error);
        set({ syncStatus: 'error', workerActive: false });
      };
      
      set({ workerActive: true });
      console.log('[TimerStore] Web Worker initialized successfully');
    } catch (error) {
      console.warn('[TimerStore] Web Worker not supported, falling back to setTimeout');
      set({ workerActive: false });
    }
  };

  // Función para sincronizar con Firestore usando serverTimestamp
  const syncToFirestore = async (state: TimerState) => {
    const { taskId, userId } = state;
    if (!taskId || !userId) return;
    
    try {
      set({ syncStatus: 'syncing' });
      const timerDocRef = doc(db, `tasks/${taskId}/timers/${userId}`);
      const firestoreData = {
        userId,
        isRunning: state.isRunning,
        startTime: state.startTime ? Timestamp.fromDate(state.startTime) : null,
        accumulatedSeconds: state.accumulatedSeconds,
        deviceId,
        lastSync: serverTimestamp(), // Use server timestamp for accuracy
        lastSyncTime: state.lastSyncTime,
      };

      await setDoc(timerDocRef, firestoreData, { merge: true });
      set({ syncStatus: 'idle', lastSyncTime: performance.now() });
      console.log('[TimerStore] ✅ Sincronizado con Firestore:', { 
        isRunning: state.isRunning, 
        seconds: state.accumulatedSeconds,
        drift: state.lastSyncTime ? performance.now() - state.lastSyncTime : 0
      });
    } catch (error) {
      console.error('[TimerStore] ❌ Error sincronizando:', error);
      set({ syncStatus: 'error' });
    }
  };

  // Función para obtener tiempo del servidor usando performance.now() para precisión
  const getHighResTime = () => performance.now();

  // Función para calcular tiempo transcurrido con alta precisión
  const calculateElapsedTime = (startTime: Date, currentTime: Date): number => {
    return Math.max(0, Math.floor((currentTime.getTime() - startTime.getTime()) / 1000));
  };

  // Función recursiva para timer preciso usando setTimeout (fallback)
  const startPreciseTimer = () => {
    const state = get();
    if (!state.isRunning || state.isRestoring) return;

    const now = getHighResTime();
    const elapsedSinceStart = performanceStartTime ? (now - performanceStartTime) / 1000 : 0;
    
    // Calcular el tiempo transcurrido basado en startTime real
    let totalElapsed = state.accumulatedSeconds;
    if (state.startTime) {
      const realElapsed = calculateElapsedTime(state.startTime, new Date());
      totalElapsed = realElapsed;
    }

    set((prev) => ({
      ...prev,
      accumulatedSeconds: Math.floor(totalElapsed),
    }));

    // Programar próximo tick con compensación de deriva
    const nextTick = 1000 - (elapsedSinceStart % 1000);
    timeoutRef = setTimeout(() => {
      startPreciseTimer();
    }, Math.max(0, nextTick));
  };

  // Función para sincronización periódica mejorada
  const startSyncTimer = () => {
    const state = get();
    if (!state.isRunning || state.isRestoring) return;

    syncTimeoutRef = setTimeout(async () => {
      const currentState = get();
      if (currentState.isRunning) {
        await syncToFirestore(currentState);
        startSyncTimer(); // Recursive call for continuous sync
      }
    }, 30000); // Sync every 30 seconds instead of 5 minutes
  };

  return {
    // Estado inicial
    isRunning: false,
    accumulatedSeconds: 0,
    startTime: null,
    deviceId,
    isRestoring: true,
    taskId: null,
    userId: null,
    lastSyncTime: null,
    syncStatus: 'idle',
    workerActive: false,

    // Setters
    setTaskId: (taskId) => set({ taskId }),
    setUserId: (userId) => set({ userId }),
    setIsRunning: (isRunning) => set({ isRunning }),
    setAccumulatedSeconds: (accumulatedSeconds) => set({ accumulatedSeconds }),
    setStartTime: (startTime) => set({ startTime }),
    setIsRestoring: (isRestoring) => set({ isRestoring }),
    setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
    setSyncStatus: (syncStatus) => set({ syncStatus }),
    setWorkerActive: (workerActive) => set({ workerActive }),

    // Getters
    getTimerSeconds: () => get().accumulatedSeconds,
    getIsTimerRunning: () => get().isRunning,
    getIsRestoringTimer: () => get().isRestoring,
    getSyncStatus: () => get().syncStatus,

    // Inicialización mejorada
    initializeTimer: async (taskId: string, userId: string) => {
      set({ taskId, userId, isRestoring: true });
      
      // Inicializar Web Worker
      initializeWorker();
      
      try {
        const timerDocRef = doc(db, `tasks/${taskId}/timers/${userId}`);
        const timerDoc = await getDoc(timerDocRef);
        
        if (timerDoc.exists()) {
          const data = timerDoc.data();
          const serverTime = new Date();
          
          let accumulatedSeconds = data.accumulatedSeconds || 0;
          
          if (data.isRunning && data.startTime) {
            const elapsed = calculateElapsedTime(data.startTime.toDate(), serverTime);
            accumulatedSeconds = elapsed;
          }
          
          const newState = {
            isRunning: data.isRunning,
            accumulatedSeconds,
            startTime: data.isRunning && data.startTime ? data.startTime.toDate() : null,
            isRestoring: false,
            lastSyncTime: data.lastSyncTime || null,
            syncStatus: 'idle' as const,
          };
          
          set(newState);

          // Configurar listener en tiempo real para multi-device sync
          unsubscribeSnapshot = onSnapshot(timerDocRef, (doc) => {
            if (!doc.exists()) return;
            
            const data = doc.data();
            const currentState = get();
            
            // Solo actualizar si viene de otro dispositivo
            if (data.deviceId !== currentState.deviceId) {
              const serverTime = new Date();
              let accumulatedSeconds = data.accumulatedSeconds || 0;
              
              if (data.isRunning && data.startTime) {
                const elapsed = calculateElapsedTime(data.startTime.toDate(), serverTime);
                accumulatedSeconds = elapsed;
              }
              
              set({
                isRunning: data.isRunning,
                accumulatedSeconds,
                startTime: data.isRunning && data.startTime ? data.startTime.toDate() : null,
                lastSyncTime: data.lastSyncTime || null,
              });
              
              console.log('[TimerStore] 🔄 Sincronizado desde otro dispositivo:', { 
                deviceId: data.deviceId, 
                isRunning: data.isRunning, 
                seconds: accumulatedSeconds 
              });
            }
          });

          // Iniciar timers si es necesario
          if (newState.isRunning) {
            performanceStartTime = getHighResTime();
            
            // Usar Web Worker si está disponible, sino fallback a setTimeout
            if (worker && get().workerActive) {
              worker.postMessage({ action: 'start' });
            } else {
              startPreciseTimer();
            }
            
            startSyncTimer();
          }
        } else {
          set({ isRestoring: false, syncStatus: 'idle' });
        }
      } catch (error) {
        console.error('[TimerStore] ❌ Error inicializando timer:', error);
        set({ isRestoring: false, syncStatus: 'error' });
      }
    },

    // Acciones mejoradas
    startTimer: async () => {
      const state = get();
      
      if (state.isRunning) {
        console.log('[TimerStore] ⚠️ Timer ya está corriendo, ignorando startTimer');
        return;
      }
      
      const serverTime = new Date();
      performanceStartTime = getHighResTime();
      
      const newState = {
        ...state,
        isRunning: true,
        startTime: serverTime,
        lastSyncTime: getHighResTime(),
      };
      
      set(newState);
      
      // Limpiar timers existentes
      if (timeoutRef) {
        clearTimeout(timeoutRef);
        timeoutRef = null;
      }
      if (syncTimeoutRef) {
        clearTimeout(syncTimeoutRef);
        syncTimeoutRef = null;
      }
      
      // Iniciar timer usando Web Worker o fallback
      if (worker && state.workerActive) {
        worker.postMessage({ action: 'start' });
      } else {
        startPreciseTimer();
      }
      
      // Iniciar sincronización periódica
      startSyncTimer();

      // Sincronización inmediata
      await syncToFirestore(newState);
    },

    pauseTimer: async () => {
      const state = get();
      
      if (!state.isRunning) {
        console.log('[TimerStore] ⚠️ Timer ya está pausado, ignorando pauseTimer');
        return;
      }
      
      // Limpiar timers
      if (timeoutRef) {
        clearTimeout(timeoutRef);
        timeoutRef = null;
      }
      if (syncTimeoutRef) {
        clearTimeout(syncTimeoutRef);
        syncTimeoutRef = null;
      }
      
      // Pausar Web Worker si está activo
      if (worker && state.workerActive) {
        worker.postMessage({ action: 'pause' });
      }
      
      performanceStartTime = null;
      
      const newState = {
        ...state,
        isRunning: false,
        startTime: null,
        lastSyncTime: getHighResTime(),
      };
      
      set(newState);
      await syncToFirestore(newState);
    },

    resetTimer: async () => {
      const state = get();
      
      // Limpiar timers
      if (timeoutRef) {
        clearTimeout(timeoutRef);
        timeoutRef = null;
      }
      if (syncTimeoutRef) {
        clearTimeout(syncTimeoutRef);
        syncTimeoutRef = null;
      }
      
      // Detener Web Worker si está activo
      if (worker && state.workerActive) {
        worker.postMessage({ action: 'stop' });
      }
      
      performanceStartTime = null;
      
      const newState = {
        ...state,
        isRunning: false,
        accumulatedSeconds: 0,
        startTime: null,
        lastSyncTime: getHighResTime(),
      };
      
      set(newState);
      await syncToFirestore(newState);
    },

    finalizeTimer: async () => {
      const state = get();
      const finalSeconds = state.accumulatedSeconds;
      
      // Usar resetTimer en lugar de pauseTimer para limpiar completamente a 0
      await get().resetTimer();
      console.log('[TimerStore] ✅ Timer finalizado y reseteado a 0 segundos');
      return finalSeconds;
    },

    cleanupTimer: () => {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
        timeoutRef = null;
      }
      if (syncTimeoutRef) {
        clearTimeout(syncTimeoutRef);
        syncTimeoutRef = null;
      }
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      if (worker) {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
        worker = null;
      }
      performanceStartTime = null;
      set({ workerActive: false });
    },
  };
}); 