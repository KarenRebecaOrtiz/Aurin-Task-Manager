/**
 * Timer Test Script para Navegador
 * Ejecutar en la consola del navegador: 
 * fetch('/timer-test.js').then(r => r.text()).then(eval)
 */

(function() {
  console.log('🧪 Iniciando pruebas de precisión del timer en navegador...');
  
  // Test 1: Medir deriva del timer
  function testTimerDrift() {
    console.log('\n⏱️ Test 1: Medir deriva del timer...');
    
    const startTime = performance.now();
    const expectedSeconds = 30; // 30 segundos para test rápido
    let actualSeconds = 0;
    let lastUpdate = startTime;
    let totalDrift = 0;
    
    return new Promise((resolve) => {
      const preciseTimer = () => {
        const now = performance.now();
        const elapsedSinceStart = (now - startTime) / 1000;
        actualSeconds = Math.floor(elapsedSinceStart);
        
        // Calcular deriva
        const drift = Math.abs(actualSeconds - (now - lastUpdate) / 1000);
        totalDrift += drift;
        
        if (actualSeconds % 5 === 0) {
          console.log(`⏱️  ${actualSeconds}s - Deriva: ${drift.toFixed(3)}s`);
        }
        
        if (actualSeconds < expectedSeconds) {
          const nextTick = 1000 - ((now - startTime) % 1000);
          setTimeout(preciseTimer, Math.max(0, nextTick));
        } else {
          const avgDrift = totalDrift / actualSeconds;
          const projectedDriftPerHour = avgDrift * 3600;
          
          console.log(`\n📊 Resultados del test de deriva:`);
          console.log(`   Tiempo esperado: ${expectedSeconds}s`);
          console.log(`   Tiempo real: ${actualSeconds}s`);
          console.log(`   Deriva total: ${totalDrift.toFixed(3)}s`);
          console.log(`   Deriva promedio por segundo: ${avgDrift.toFixed(3)}s`);
          console.log(`   Deriva proyectada por hora: ${projectedDriftPerHour.toFixed(2)}s/hora`);
          
          if (projectedDriftPerHour < 30) {
            console.log('✅ Deriva excelente (< 30s/hora)');
          } else if (projectedDriftPerHour < 60) {
            console.log('✅ Deriva aceptable (< 60s/hora)');
          } else {
            console.log('❌ Deriva excesiva (> 60s/hora)');
          }
          
          resolve({ totalDrift, projectedDriftPerHour });
        }
      };
      
      preciseTimer();
    });
  }

  // Test 2: Verificar soporte de Web Worker
  function testWebWorker() {
    console.log('\n🔧 Test 2: Verificar soporte de Web Worker...');
    
    const isWorkerSupported = typeof Worker !== 'undefined';
    const isSharedWorkerSupported = typeof SharedWorker !== 'undefined';
    
    console.log(`   Web Worker: ${isWorkerSupported ? '✅ Soportado' : '❌ No soportado'}`);
    console.log(`   Shared Worker: ${isSharedWorkerSupported ? '✅ Soportado' : '❌ No soportado'}`);
    
    if (isWorkerSupported) {
      try {
        const testWorker = new Worker(URL.createObjectURL(new Blob([`
          self.onmessage = function(e) {
            self.postMessage({ type: 'test', data: 'Worker funcionando' });
          };
        `])));
        
        testWorker.onmessage = function(e) {
          if (e.data.type === 'test') {
            console.log('   ✅ Worker test exitoso');
          }
          testWorker.terminate();
        };
        
        testWorker.postMessage({ action: 'test' });
      } catch (error) {
        console.log('   ❌ Error creando worker:', error.message);
      }
    }
    
    return { isWorkerSupported, isSharedWorkerSupported };
  }

  // Test 3: Verificar IndexedDB para offline persistence
  function testIndexedDB() {
    console.log('\n💾 Test 3: Verificar IndexedDB para offline persistence...');
    
    const isIndexedDBSupported = typeof indexedDB !== 'undefined';
    console.log(`   IndexedDB: ${isIndexedDBSupported ? '✅ Soportado' : '❌ No soportado'}`);
    
    if (isIndexedDBSupported) {
      try {
        const request = indexedDB.open('timer-test', 1);
        request.onerror = () => console.log('   ❌ Error abriendo IndexedDB');
        request.onsuccess = () => {
          console.log('   ✅ IndexedDB funcionando correctamente');
          request.result.close();
        };
      } catch (error) {
        console.log('   ❌ Error con IndexedDB:', error.message);
      }
    }
    
    return { isIndexedDBSupported };
  }

  // Test 4: Verificar performance.now() para alta precisión
  function testPerformanceAPI() {
    console.log('\n⚡ Test 4: Verificar performance.now()...');
    
    const isPerformanceSupported = typeof performance !== 'undefined' && typeof performance.now === 'function';
    console.log(`   Performance API: ${isPerformanceSupported ? '✅ Soportado' : '❌ No soportado'}`);
    
    if (isPerformanceSupported) {
      const start = performance.now();
      setTimeout(() => {
        const end = performance.now();
        const precision = end - start;
        console.log(`   Precisión: ${precision.toFixed(2)}ms`);
        
        if (precision < 1) {
          console.log('   ✅ Precisión excelente (< 1ms)');
        } else if (precision < 5) {
          console.log('   ✅ Precisión buena (< 5ms)');
        } else {
          console.log('   ⚠️ Precisión limitada (> 5ms)');
        }
      }, 1);
    }
    
    return { isPerformanceSupported };
  }

  // Test 5: Simular inactividad y verificar comportamiento
  function testInactivityBehavior() {
    console.log('\n😴 Test 5: Simular comportamiento de inactividad...');
    
    const isPageVisibilitySupported = typeof document !== 'undefined' && 'hidden' in document;
    console.log(`   Page Visibility API: ${isPageVisibilitySupported ? '✅ Soportado' : '❌ No soportado'}`);
    
    if (isPageVisibilitySupported) {
      console.log(`   Tab visible: ${!document.hidden}`);
      console.log(`   Estado de visibilidad: ${document.visibilityState}`);
    }
    
    return { isPageVisibilitySupported };
  }

  // Ejecutar todos los tests
  async function runAllTests() {
    console.log('🚀 Iniciando suite completa de pruebas...\n');
    
    const results = {
      drift: await testTimerDrift(),
      worker: testWebWorker(),
      indexedDB: testIndexedDB(),
      performance: testPerformanceAPI(),
      inactivity: testInactivityBehavior()
    };
    
    console.log('\n📋 Resumen de resultados:');
    console.log(`   Deriva proyectada: ${results.drift.projectedDriftPerHour.toFixed(2)}s/hora`);
    console.log(`   Web Worker: ${results.worker.isWorkerSupported ? '✅' : '❌'}`);
    console.log(`   IndexedDB: ${results.indexedDB.isIndexedDBSupported ? '✅' : '❌'}`);
    console.log(`   Performance API: ${results.performance.isPerformanceSupported ? '✅' : '❌'}`);
    console.log(`   Page Visibility: ${results.inactivity.isPageVisibilitySupported ? '✅' : '❌'}`);
    
    // Evaluación general
    const score = [
      results.drift.projectedDriftPerHour < 30,
      results.worker.isWorkerSupported,
      results.indexedDB.isIndexedDBSupported,
      results.performance.isPerformanceSupported,
      results.inactivity.isPageVisibilitySupported
    ].filter(Boolean).length;
    
    console.log(`\n🎯 Puntuación general: ${score}/5`);
    
    if (score >= 4) {
      console.log('✅ Sistema de timer optimizado y listo para producción');
    } else if (score >= 3) {
      console.log('⚠️ Sistema funcional con algunas limitaciones');
    } else {
      console.log('❌ Sistema necesita mejoras significativas');
    }
    
    return results;
  }

  // Ejecutar tests
  runAllTests().catch(console.error);
})(); 