'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import styles from './page.module.scss';

type TimerTestResults = { logs: string[]; timestamp: number } | { error: string } | null;

export default function TimerTestPage() {
  const { userId } = useAuth();
  const [testResults, setTestResults] = useState<TimerTestResults>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTimerTest = async () => {
    setIsRunning(true);
    try {
      // Cargar y ejecutar el script de prueba
      const response = await fetch('/timer-test.js');
      const script = await response.text();
      
      // Crear un contexto aislado para ejecutar el script
      const testFunction = new Function(`
        return new Promise((resolve) => {
          const originalConsoleLog = console.log;
          const logs: string[] = [];
          
          console.log = (...args) => {
            logs.push(args.join(' '));
            originalConsoleLog(...args);
          };
          
          ${script}
          
          // Capturar resultados después de 35 segundos
          setTimeout(() => {
            resolve({ logs, timestamp: Date.now() });
          }, 35000);
        });
      `);
      
      const results = await testFunction();
      setTestResults(results);
    } catch (error) {
      console.error('Error ejecutando test:', error);
      setTestResults({ error: (error as Error).message });
    } finally {
      setIsRunning(false);
    }
  };

  if (!userId) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Timer Test Page</h1>
        <p>Necesitas iniciar sesión para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className={styles.containerWide}>
      <h1 className={styles.pageTitleLarge}>🧪 Timer Test Suite</h1>
      
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Instrucciones</h2>
        <ul className={styles.list}
        >
          <li>Esta página ejecuta pruebas automáticas del sistema de timer</li>
          <li>Las pruebas incluyen: deriva, Web Worker, IndexedDB, Performance API</li>
          <li>El test dura aproximadamente 35 segundos</li>
          <li>Revisa la consola del navegador para logs detallados</li>
        </ul>
      </div>

      <div className={styles.section}>
        <button
          onClick={runTimerTest}
          disabled={isRunning}
          className={styles.primaryButton}
        >
          {isRunning ? '🔄 Ejecutando pruebas...' : '🚀 Ejecutar Timer Test'}
        </button>
      </div>

      {testResults && (
        <div className={styles.results}>
          <h2 className={styles.resultsTitle}>📊 Resultados de las Pruebas</h2>
          
          {"error" in testResults ? (
            <div className={styles.errorBox}>
              <h3 className={styles.errorTitle}>❌ Error en las pruebas</h3>
              <p className={styles.errorText}>{testResults.error}</p>
            </div>
          ) : (
            <div className={styles.resultBlocks}>
              <div className={styles.successBox}>
                <h3 className={styles.successTitle}>✅ Pruebas completadas</h3>
                {"timestamp" in testResults && (
                  <p className={styles.successTimestamp}>
                    Timestamp: {new Date(testResults.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
              
              <div className={styles.logsBox}>
                <h3 className={styles.logsTitle}>📝 Logs de la consola</h3>
                <div className={styles.logsContainer}>
                  {"logs" in testResults && testResults.logs?.map((log: string, index: number) => (
                    <div key={index} className={styles.logItem}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.tipsBox}>
        <h2 className={styles.tipsTitle}>💡 Consejos para Testing</h2>
        <ul className={styles.tipsList}>
          <li>Para probar inactividad: cambia a otra pestaña durante 15+ minutos</li>
          <li>Para probar offline: usa DevTools → Network → Offline</li>
          <li>Para probar multi-device: abre la app en dos navegadores</li>
          <li>Para ver logs detallados: abre DevTools → Console</li>
        </ul>
      </div>
    </div>
  );
} 