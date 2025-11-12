/**
 * Ejemplo Básico de Uso del Toast Module
 * Este archivo muestra cómo usar el sistema de toasts en tus componentes
 */

'use client';

import { useToast } from '../index';

export function BasicExample() {
  const { success, error, warning, info, clearAll } = useToast();

  return (
    <div style={{ padding: '20px', gap: '10px', display: 'flex', flexDirection: 'column' }}>
      <h2>Toast Examples</h2>

      <button onClick={() => success('¡Operación exitosa!')}>
        Mostrar Success
      </button>

      <button onClick={() => error('Algo salió mal', 'Detalles del error')}>
        Mostrar Error
      </button>

      <button onClick={() => warning('Esto no se puede deshacer')}>
        Mostrar Warning
      </button>

      <button onClick={() => info('Información importante')}>
        Mostrar Info
      </button>

      <button
        onClick={() =>
          success('Tarea eliminada', {
            actionLabel: 'Deshacer',
            onAction: () => console.log('Acción ejecutada'),
          })
        }
      >
        Con Acción
      </button>

      <button onClick={() => clearAll()}>
        Limpiar Todos
      </button>
    </div>
  );
}
