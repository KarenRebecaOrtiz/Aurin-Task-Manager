import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { ref, set } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

interface TabDetectionConfig {
  checkInterval?: number;
  heartbeatInterval?: number;
  toleranceMs?: number;
}

export const useTabDetection = (config: TabDetectionConfig = {}) => {
  const { user } = useUser();
  const {
    checkInterval = 5000, // Menos frecuente
    heartbeatInterval = 6000, // Menos frecuente
    toleranceMs = 10000
  } = config;

  const [activeTabCount, setActiveTabCount] = useState(1);
  const [isOnline, setIsOnline] = useState(true);
  const sessionId = useRef(Math.random().toString(36).substring(2, 15));
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const checkRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isClosingRef = useRef(false);
  const lastLogRef = useRef<number>(0);

  // Función para controlar la frecuencia de logs
  const shouldLog = useCallback(() => {
    const now = Date.now();
    if (now - lastLogRef.current > 10000) { // Solo logear cada 10 segundos
      lastLogRef.current = now;
      return true;
    }
    return false;
  }, []);

  // Estrategia 1: SessionStorage con heartbeat optimizado + RTDB sync
  const updateSessionStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const activeTabs = sessionStorage.getItem('activeTabs');
    let tabs: Record<string, number>;
    
    try {
      tabs = activeTabs ? JSON.parse(activeTabs) : {};
    } catch {
      tabs = {};
    }
    
    // Actualizar timestamp de esta pestaña
    tabs[sessionId.current] = now;
    
    // Limpiar pestañas inactivas más eficientemente
    const cleanedTabs: Record<string, number> = {};
    Object.entries(tabs).forEach(([id, timestamp]) => {
      if (id === sessionId.current || now - timestamp < toleranceMs) {
        cleanedTabs[id] = timestamp;
      }
    });
    
    sessionStorage.setItem('activeTabs', JSON.stringify(cleanedTabs));
    
    const realTabCount = Object.keys(cleanedTabs).length;
    const newIsOnline = realTabCount > 0;
    
    setActiveTabCount(Math.max(1, realTabCount));
    setIsOnline(newIsOnline);
    
    // Sincronizar con RTDB si hay usuario autenticado
    if (user?.id) {
      const presenceRef = ref(rtdb, `presence/${user.id}`);
      set(presenceRef, {
        online: newIsOnline,
        tabCount: realTabCount,
        lastActive: new Date().toISOString(),
        sessionId: sessionId.current
      }).catch((error) => {
        console.error('[TabDetection] Error syncing with RTDB:', error);
      });
    }
    
    if (shouldLog()) {
      // Debug logging disabled to reduce console spam
    }
    
    if (realTabCount === 0) {
      setTimeout(() => {
        sessionStorage.removeItem('activeTabs');
        if (shouldLog()) {
          console.log('📱 No hay pestañas activas, limpiando SessionStorage');
        }
      }, 2000);
    }
  }, [toleranceMs, shouldLog, user?.id]);

  // Estrategia 2: BroadcastChannel optimizado
  const setupBroadcastChannel = useCallback(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) {
      console.warn('BroadcastChannel no soportado');
      return;
    }

    channelRef.current = new BroadcastChannel('tab-detection');
    
    const handleMessage = (event: MessageEvent) => {
      if (['heartbeat', 'tab-closed', 'last-tab-closing'].includes(event.data.type)) {
        updateSessionStorage();
        if (shouldLog() && event.data.type !== 'heartbeat') {
          console.log(`📱 ${event.data.type} detectado via BroadcastChannel`);
        }
      }
    };
    
    channelRef.current.addEventListener('message', handleMessage);
    
    const broadcastHeartbeat = () => {
      if (channelRef.current && !isClosingRef.current) {
        channelRef.current.postMessage({
          type: 'heartbeat',
          sessionId: sessionId.current,
          timestamp: Date.now()
        });
      }
    };
    
    heartbeatRef.current = setInterval(broadcastHeartbeat, heartbeatInterval);
    
    return () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage);
        channelRef.current.close();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [heartbeatInterval, updateSessionStorage, shouldLog]);

  // Estrategia 3: Page Visibility optimizada
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      updateSessionStorage();
    }
  }, [updateSessionStorage]);

  // Estrategia 4: Storage Event optimizado
  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === 'activeTabs' && event.newValue) {
      requestAnimationFrame(() => updateSessionStorage());
    }
  }, [updateSessionStorage]);

  // Función para verificar última pestaña optimizada
  const checkIfLastTab = useCallback(() => {
    const activeTabs = sessionStorage.getItem('activeTabs');
    if (activeTabs) {
      try {
        const tabs = JSON.parse(activeTabs);
        const currentTabs = Object.keys(tabs).filter(id => 
          Date.now() - tabs[id] < toleranceMs
        );
        return currentTabs.length === 1 && currentTabs[0] === sessionId.current;
      } catch {
        return false;
      }
    }
    return false;
  }, [toleranceMs]);

  // Setup inicial optimizado
  useEffect(() => {
    updateSessionStorage();
    const cleanupBroadcast = setupBroadcastChannel();
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    
    checkRef.current = setInterval(updateSessionStorage, checkInterval);
    
    const handleBeforeUnload = () => {
      isClosingRef.current = true;
      const isLastTab = checkIfLastTab();
      
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: isLastTab ? 'last-tab-closing' : 'tab-closed',
          sessionId: sessionId.current,
          timestamp: Date.now()
        });
      }
      
      const activeTabs = sessionStorage.getItem('activeTabs');
      if (activeTabs) {
        try {
          const tabs = JSON.parse(activeTabs);
          delete tabs[sessionId.current];
          
          if (Object.keys(tabs).length === 0) {
            sessionStorage.removeItem('activeTabs');
          } else {
            sessionStorage.setItem('activeTabs', JSON.stringify(tabs));
          }
        } catch {}
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (cleanupBroadcast) cleanupBroadcast();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (checkRef.current) {
        clearInterval(checkRef.current);
      }
    };
  }, [
    updateSessionStorage,
    setupBroadcastChannel,
    handleVisibilityChange,
    handleStorageChange,
    checkInterval,
    checkIfLastTab
  ]);

  return {
    activeTabCount,
    isOnline,
    sessionId: sessionId.current,
    updateSessionStorage
  };
};