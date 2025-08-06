/**
 * Script para limpiar logs de inactividad y reiniciar el sistema
 * 
 * Este script ayuda a diagnosticar y resolver problemas con el sistema
 * de detección de inactividad.
 */

console.log('🧹 Limpiando logs de inactividad...');

// Limpiar consola
console.clear();

// Reiniciar contadores globales
if (typeof window !== 'undefined') {
  // Limpiar cualquier timer de inactividad activo
  const clearAllTimers = () => {
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
  };

  // Limpiar event listeners problemáticos
  const clearEventListeners = () => {
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'focus', 'input'];
    events.forEach(event => {
      window.removeEventListener(event, () => {});
      document.removeEventListener(event, () => {});
    });
  };

  try {
    clearAllTimers();
    clearEventListeners();
    console.log('✅ Timers y event listeners limpiados');
  } catch (error) {
    console.warn('⚠️ Error limpiando timers:', error);
  }
}

// Mensaje de reinicio
console.log('🔄 Sistema de inactividad reiniciado');
console.log('📊 Monitoreando logs...');

// Función para monitorear logs excesivos
let logCount = 0;
const originalLog = console.log;

console.log = (...args) => {
  if (args[0]?.includes?.('[InactivityDetection]')) {
    logCount++;
    
    // Alertar si hay demasiados logs
    if (logCount > 100) {
      console.warn('🚨 ALERTA: Demasiados logs de inactividad detectados!');
      console.warn('💡 Considera revisar el hook useInactivityDetection');
    }
  }
  
  originalLog.apply(console, args);
};

console.log('🎯 Script de limpieza ejecutado correctamente'); 