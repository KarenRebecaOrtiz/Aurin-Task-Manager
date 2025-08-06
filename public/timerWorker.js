/**
 * Timer Web Worker
 * Mantiene el timer preciso incluso cuando la pestaña está inactiva
 * Basado en performance.now() para máxima precisión
 */

let timerInterval = null;
let startTime = null;
let expectedTime = null;
let isRunning = false;

// Función para calcular el próximo tick con compensación de deriva
function scheduleNextTick() {
  if (!isRunning) return;
  
  const now = performance.now();
  const elapsed = now - startTime;
  const drift = elapsed - expectedTime;
  
  // Calcular el próximo tick con compensación de deriva
  const nextTick = Math.max(0, 1000 - drift);
  
  timerInterval = setTimeout(() => {
    // Enviar tick al main thread
    self.postMessage({ type: 'tick', timestamp: now });
    
    // Programar próximo tick
    expectedTime += 1000;
    scheduleNextTick();
  }, nextTick);
}

// Manejar mensajes del main thread
self.onmessage = function(e) {
  const { action, data } = e.data;
  
  switch (action) {
    case 'start':
      console.log('[TimerWorker] Starting timer');
      isRunning = true;
      startTime = performance.now();
      expectedTime = 1000; // Primer tick en 1 segundo
      scheduleNextTick();
      break;
      
    case 'pause':
      console.log('[TimerWorker] Pausing timer');
      isRunning = false;
      if (timerInterval) {
        clearTimeout(timerInterval);
        timerInterval = null;
      }
      break;
      
    case 'stop':
      console.log('[TimerWorker] Stopping timer');
      isRunning = false;
      if (timerInterval) {
        clearTimeout(timerInterval);
        timerInterval = null;
      }
      startTime = null;
      expectedTime = null;
      break;
      
    case 'sync':
      // Sincronizar con tiempo del servidor
      const { serverTime, clientTime } = data;
      const timeDiff = serverTime - clientTime;
      
      if (startTime) {
        startTime += timeDiff;
        console.log('[TimerWorker] Synced with server, adjusted by:', timeDiff, 'ms');
      }
      break;
      
    default:
      console.warn('[TimerWorker] Unknown action:', action);
  }
};

// Manejar errores
self.onerror = function(error) {
  console.error('[TimerWorker] Error:', error);
  self.postMessage({ type: 'error', error: error.message });
}; 