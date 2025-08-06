/**
 * useOptimizedWrites Hook
 * 
 * Hook para optimizar las escrituras a Firestore usando batches y debouncing.
 * Especialmente importante para el plan Spark de Firestore que tiene límites estrictos.
 * 
 * Características:
 * - Debouncing de writes para reducir llamadas
 * - Batching de actualizaciones relacionadas
 * - Cache local para evitar writes duplicados
 * - Logging de usage para monitoreo
 * - Fallback a RTDB para datos efímeros
 */

import { useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, rtdb } from '@/lib/firebase';

interface WriteOperation {
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

export const useOptimizedWrites = () => {
  const { user } = useUser();
  const writeQueue = useRef<WriteOperation[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastWrite = useRef<Record<string, unknown>>({});
  const writeCount = useRef(0);

  /**
   * Debounced write para evitar writes excesivos
   */
  const debouncedWrite = useCallback(async (operation: WriteOperation) => {
    // Agregar a la cola
    writeQueue.current.push(operation);
    
    // Limpiar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Ejecutar después de 2 segundos de inactividad
    debounceTimer.current = setTimeout(async () => {
      await executeBatchWrites();
    }, 2000);
  }, []);

  /**
   * Ejecutar writes en batch
   */
  const executeBatchWrites = useCallback(async () => {
    if (!user?.id || writeQueue.current.length === 0) return;

    try {
      const batch = writeBatch(db);
      const rtdbUpdates: Promise<void>[] = [];
      
      // Agrupar operaciones por prioridad
      const highPriority = writeQueue.current.filter(op => op.priority === 'high');
      const mediumPriority = writeQueue.current.filter(op => op.priority === 'medium');
      const lowPriority = writeQueue.current.filter(op => op.priority === 'low');
      
      // Procesar en orden de prioridad
      const allOperations = [...highPriority, ...mediumPriority, ...lowPriority];
      
      allOperations.forEach(operation => {
        // Verificar si el write es necesario (evitar duplicados)
        const key = `${operation.id}-${JSON.stringify(operation.data)}`;
        if (lastWrite.current[key] === operation.timestamp) {
          return; // Skip duplicate
        }
        
        // Agregar a batch de Firestore
        const docRef = doc(db, 'users', operation.id);
        batch.update(docRef, operation.data);
        
        // Agregar a RTDB si es presencia
        if (operation.data.status || operation.data.online !== undefined) {
          const presenceRef = ref(rtdb, `presence/${operation.id}`);
          rtdbUpdates.push(set(presenceRef, {
            ...operation.data,
            lastUpdate: new Date().toISOString()
          }));
        }
        
        lastWrite.current[key] = operation.timestamp;
        writeCount.current++;
      });
      
      // Ejecutar batch de Firestore
      if (writeQueue.current.length > 0) {
        await batch.commit();
        console.log(`[OptimizedWrites] Batch executed: ${writeQueue.current.length} operations`);
      }
      
      // Ejecutar updates de RTDB
      if (rtdbUpdates.length > 0) {
        await Promise.all(rtdbUpdates);
        console.log(`[OptimizedWrites] RTDB updates: ${rtdbUpdates.length} operations`);
      }
      
      // Limpiar cola
      writeQueue.current = [];
      
    } catch (error) {
      console.error('[OptimizedWrites] Error executing batch:', error);
    }
  }, [user?.id]);

  /**
   * Write optimizado con prioridad
   */
  const optimizedWrite = useCallback(async (
    userId: string, 
    data: Record<string, unknown>, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    const operation: WriteOperation = {
      id: userId,
      data,
      timestamp: Date.now(),
      priority
    };
    
    // Writes de alta prioridad se ejecutan inmediatamente
    if (priority === 'high') {
      try {
        await updateDoc(doc(db, 'users', userId), data);
        writeCount.current++;
        console.log('[OptimizedWrites] High priority write executed immediately');
      } catch (error) {
        console.error('[OptimizedWrites] Error in high priority write:', error);
      }
    } else {
      // Writes de prioridad media/baja se debouncean
      await debouncedWrite(operation);
    }
  }, [debouncedWrite]);

  /**
   * Obtener estadísticas de writes
   */
  const getWriteStats = useCallback(() => {
    return {
      totalWrites: writeCount.current,
      queueLength: writeQueue.current.length,
      lastWrite: lastWrite.current
    };
  }, []);

  return {
    optimizedWrite,
    executeBatchWrites,
    getWriteStats
  };
}; 