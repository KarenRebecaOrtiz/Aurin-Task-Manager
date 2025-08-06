'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function TimerTestPage() {
  const { userId } = useAuth();
  const [testResults, setTestResults] = useState<any>(null);
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
      setTestResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  if (!userId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Timer Test Page</h1>
        <p>Necesitas iniciar sesión para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Timer Test Suite</h1>
      
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Instrucciones</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Esta página ejecuta pruebas automáticas del sistema de timer</li>
          <li>Las pruebas incluyen: deriva, Web Worker, IndexedDB, Performance API</li>
          <li>El test dura aproximadamente 35 segundos</li>
          <li>Revisa la consola del navegador para logs detallados</li>
        </ul>
      </div>

      <div className="mb-8">
        <button
          onClick={runTimerTest}
          disabled={isRunning}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? '🔄 Ejecutando pruebas...' : '🚀 Ejecutar Timer Test'}
        </button>
      </div>

      {testResults && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">📊 Resultados de las Pruebas</h2>
          
          {testResults.error ? (
            <div className="p-4 bg-red-100 border border-red-400 rounded-lg">
              <h3 className="font-semibold text-red-800">❌ Error en las pruebas</h3>
              <p className="text-red-700">{testResults.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-100 border border-green-400 rounded-lg">
                <h3 className="font-semibold text-green-800">✅ Pruebas completadas</h3>
                <p className="text-green-700">
                  Timestamp: {new Date(testResults.timestamp).toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 bg-gray-100 border border-gray-400 rounded-lg">
                <h3 className="font-semibold text-gray-800">📝 Logs de la consola</h3>
                <div className="mt-2 max-h-96 overflow-y-auto">
                  {testResults.logs?.map((log: string, index: number) => (
                    <div key={index} className="text-sm font-mono text-gray-700 py-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 p-6 bg-yellow-50 border border-yellow-400 rounded-lg">
        <h2 className="text-xl font-semibold text-yellow-800 mb-4">💡 Consejos para Testing</h2>
        <ul className="list-disc list-inside space-y-2 text-yellow-700">
          <li>Para probar inactividad: cambia a otra pestaña durante 15+ minutos</li>
          <li>Para probar offline: usa DevTools → Network → Offline</li>
          <li>Para probar multi-device: abre la app en dos navegadores</li>
          <li>Para ver logs detallados: abre DevTools → Console</li>
        </ul>
      </div>
    </div>
  );
} 