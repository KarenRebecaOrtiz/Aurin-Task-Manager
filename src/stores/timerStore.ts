import { create } from 'zustand';
import { doc, getDoc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TimerState {
  isRunning: boolean;
  accumulatedSeconds: number;
  startTime: Date | null;
  deviceId: string;
  isRestoring: boolean;
  taskId: string | null;
  userId: string | null;
}

interface TimerActions {
  // Estado
  setTaskId: (taskId: string) => void;
  setUserId: (userId: string) => void;
  setIsRunning: (isRunning: boolean) => void;
  setAccumulatedSeconds: (seconds: number) => void;
  setStartTime: (startTime: Date | null) => void;
  setIsRestoring: (isRestoring: boolean) => void;
  
  // Acciones
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  finalizeTimer: () => Promise<number>;
  
  // Getters
  getTimerSeconds: () => number;
  getIsTimerRunning: () => boolean;
  getIsRestoringTimer: () => boolean;
  
  // Inicialización
  initializeTimer: (taskId: string, userId: string) => Promise<void>;
  cleanupTimer: () => void;
}

type TimerStore = TimerState & TimerActions;

export const useTimerStore = create<TimerStore>((set, get) => {
  let intervalRef: NodeJS.Timeout | null = null;
  let syncIntervalRef: NodeJS.Timeout | null = null;
  let unsubscribeSnapshot: (() => void) | null = null;
  
  const deviceId = crypto.randomUUID();

  // Función para sincronizar con Firestore
  const syncToFirestore = async (state: TimerState) => {
    const { taskId, userId } = state;
    if (!taskId || !userId) return;
    
    try {
      const timerDocRef = doc(db, `tasks/${taskId}/timers/${userId}`);
      const firestoreData = {
        userId,
        isRunning: state.isRunning,
        startTime: state.startTime ? Timestamp.fromDate(state.startTime) : null,
        accumulatedSeconds: state.accumulatedSeconds,
        deviceId,
        lastSync: Timestamp.fromDate(new Date()),
      };

      await setDoc(timerDocRef, firestoreData, { merge: true });
      console.log('[TimerStore] ✅ Sincronizado con Firestore:', { isRunning: state.isRunning, seconds: state.accumulatedSeconds });
    } catch (error) {
      console.error('[TimerStore] ❌ Error sincronizando:', error);
    }
  };

  // Función para obtener tiempo del servidor
  const getServerTime = () => new Date();

  // Función para calcular tiempo transcurrido
  const calculateElapsedTime = (startTime: Date, currentTime: Date): number => {
    return Math.max(0, Math.floor((currentTime.getTime() - startTime.getTime()) / 1000));
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

    // Setters
    setTaskId: (taskId) => set({ taskId }),
    setUserId: (userId) => set({ userId }),
    setIsRunning: (isRunning) => set({ isRunning }),
    setAccumulatedSeconds: (accumulatedSeconds) => set({ accumulatedSeconds }),
    setStartTime: (startTime) => set({ startTime }),
    setIsRestoring: (isRestoring) => set({ isRestoring }),

    // Getters
    getTimerSeconds: () => get().accumulatedSeconds,
    getIsTimerRunning: () => get().isRunning,
    getIsRestoringTimer: () => get().isRestoring,

    // Inicialización
    initializeTimer: async (taskId: string, userId: string) => {
      // Debug logging disabled to reduce console spam
      
      set({ taskId, userId, isRestoring: true });
      
      try {
        const timerDocRef = doc(db, `tasks/${taskId}/timers/${userId}`);
        const timerDoc = await getDoc(timerDocRef);
        
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
            startTime: data.isRunning && data.startTime ? data.startTime.toDate() : null,
            isRestoring: false,
          };
          
          set(newState);
          // Debug logging disabled to reduce console spam
        } else {
          set({ isRestoring: false });
          // Debug logging disabled to reduce console spam
        }

        // Configurar listener en tiempo real
        unsubscribeSnapshot = onSnapshot(timerDocRef, (doc) => {
          if (!doc.exists()) return;
          
          const remoteData = doc.data();
          
          // Solo sincronizar si es de otro dispositivo
          if (remoteData.deviceId !== deviceId) {
            const serverTime = getServerTime();
            let accumulatedSeconds = remoteData.accumulatedSeconds || 0;
            
            if (remoteData.isRunning && remoteData.startTime) {
              const elapsed = calculateElapsedTime(remoteData.startTime.toDate(), serverTime);
              accumulatedSeconds += elapsed;
            }
            
            const current = get();
            // Solo actualizar si realmente hay cambios
            if (current.isRunning === remoteData.isRunning && 
                Math.abs(current.accumulatedSeconds - accumulatedSeconds) < 2) {
              return;
            }
            
            set({
              isRunning: remoteData.isRunning,
              accumulatedSeconds,
              startTime: remoteData.isRunning && remoteData.startTime ? remoteData.startTime.toDate() : null,
            });
          }
        });

        // Configurar timer local
        const startLocalTimer = () => {
          const state = get();
          if (state.isRunning && !state.isRestoring) {
            intervalRef = setInterval(() => {
              set((prev) => ({
                ...prev,
                accumulatedSeconds: prev.accumulatedSeconds + 1,
              }));
            }, 1000);
          }
        };

        // Configurar sincronización periódica
        const startSyncTimer = () => {
          const state = get();
          if (state.isRunning && !state.isRestoring) {
            syncIntervalRef = setInterval(() => {
              const currentState = get();
              const currentTime = getServerTime();
              let accumulatedSeconds = currentState.accumulatedSeconds;
              
              if (currentState.startTime) {
                const elapsed = calculateElapsedTime(currentState.startTime, currentTime);
                accumulatedSeconds = elapsed;
              }
              
              const newState = {
                ...currentState,
                accumulatedSeconds,
              };
              
              set(newState);
              syncToFirestore(newState);
            }, 5 * 60 * 1000); // 5 minutos
          }
        };

        // Iniciar timers si es necesario
        const state = get();
        if (state.isRunning) {
          startLocalTimer();
          startSyncTimer();
        }

      } catch (error) {
        console.error('[TimerStore] ❌ Error inicializando timer:', error);
        set({ isRestoring: false });
      }
    },

    // Acciones
    startTimer: async () => {
      // Debug logging disabled to reduce console spam
      
      const state = get();
      
      // Evitar iniciar si ya está corriendo
      if (state.isRunning) {
        console.log('[TimerStore] ⚠️ Timer ya está corriendo, ignorando startTimer');
        return;
      }
      
      const serverTime = getServerTime();
      
      const newState = {
        ...state,
        isRunning: true,
        startTime: serverTime,
      };
      
      set(newState);
      
      // Limpiar timers existentes antes de iniciar nuevos
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
      if (syncIntervalRef) {
        clearInterval(syncIntervalRef);
        syncIntervalRef = null;
      }
      
      // Iniciar timer local
      intervalRef = setInterval(() => {
        set((prev) => ({
          ...prev,
          accumulatedSeconds: prev.accumulatedSeconds + 1,
        }));
      }, 1000);

      // Iniciar sincronización periódica
      syncIntervalRef = setInterval(() => {
        const currentState = get();
        const currentTime = getServerTime();
        let accumulatedSeconds = currentState.accumulatedSeconds;
        
        if (currentState.startTime) {
          const elapsed = calculateElapsedTime(currentState.startTime, currentTime);
          accumulatedSeconds = elapsed;
        }
        
        const newState = {
          ...currentState,
          accumulatedSeconds,
        };
        
        set(newState);
        syncToFirestore(newState);
      }, 5 * 60 * 1000);

      // Sincronización inmediata
      await syncToFirestore(newState);
      
      // Debug logging disabled to reduce console spam
    },

    pauseTimer: async () => {
      // Debug logging disabled to reduce console spam
      
      const state = get();
      
      // Evitar pausar si ya está pausado
      if (!state.isRunning) {
        console.log('[TimerStore] ⚠️ Timer ya está pausado, ignorando pauseTimer');
        return;
      }
      
      const newState = {
        ...state,
        isRunning: false,
        startTime: null,
      };
      
      set(newState);
      
      // Limpiar timers
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
      if (syncIntervalRef) {
        clearInterval(syncIntervalRef);
        syncIntervalRef = null;
      }

      // Sincronización inmediata
      await syncToFirestore(newState);
      
      // Debug logging disabled to reduce console spam
    },

    resetTimer: async () => {
      // Debug logging disabled to reduce console spam
      
      const state = get();
      const newState = {
        ...state,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
      };
      
      set(newState);
      
      // Limpiar timers
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
      if (syncIntervalRef) {
        clearInterval(syncIntervalRef);
        syncIntervalRef = null;
      }

      // Sincronización inmediata
      await syncToFirestore(newState);
      
      console.log('[TimerStore] ✅ Timer reseteado');
    },

    finalizeTimer: async () => {
      console.log('[TimerStore] 🎯 Finalizando timer...');
      
      const state = get();
      const finalSeconds = state.accumulatedSeconds;
      
      // Limpiar timer en Firestore
      if (state.taskId && state.userId) {
        const timerDocRef = doc(db, `tasks/${state.taskId}/timers/${state.userId}`);
        await setDoc(timerDocRef, {
          userId: state.userId,
          isRunning: false,
          startTime: null,
          accumulatedSeconds: 0,
          lastFinalized: Timestamp.fromDate(new Date()),
          deviceId,
        });
      }
      
      // Limpiar timers locales primero
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
      if (syncIntervalRef) {
        clearInterval(syncIntervalRef);
        syncIntervalRef = null;
      }
      
      // Resetear estado completamente
      const newState = {
        ...state,
        isRunning: false,
        startTime: null,
        accumulatedSeconds: 0,
        isRestoring: false,
      };
      
      set(newState);
      
      console.log('[TimerStore] ✅ Timer finalizado y reseteado completamente');
      return finalSeconds;
    },

    // Limpieza
    cleanupTimer: () => {
      // Debug logging disabled to reduce console spam
      
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = null;
      }
      if (syncIntervalRef) {
        clearInterval(syncIntervalRef);
        syncIntervalRef = null;
      }
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      
      set({
        isRunning: false,
        accumulatedSeconds: 0,
        startTime: null,
        isRestoring: true,
        taskId: null,
        userId: null,
      });
    },
  };
}); 