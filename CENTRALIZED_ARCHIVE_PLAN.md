# 📋 Plan Cauteloso para Centralizar Lógica de Archivado/Desarchivado

## 🎯 **Objetivo Principal**
Centralizar la lógica de archivado/desarchivado de tareas de manera segura y progresiva, eliminando duplicación de código y race conditions entre los componentes.

## 🔍 **Problemas Identificados**

### 🔴 **Críticos**
1. **Race Conditions**: Entre `filteredTasks`, `effectiveTasks` y `dataStore`
2. **Rollback Incompleto**: Solo revierten estado local, no `dataStore`
3. **TasksKanban sin Optimismo**: No hay feedback inmediato
4. **Lógica Duplicada**: 3 componentes con código casi idéntico

### 🟡 **Menores**
1. **Sistemas de Undo Separados**: Cada componente maneja su propio undo
2. **Múltiples Fuentes de Verdad**: Confusión en el flujo de datos

## 📈 **Plan de Implementación (3 Fases)**

### 🟢 **FASE 1: Hook Compartido (Menos Riesgoso)**
**Duración Estimada**: 2-3 horas
**Riesgo**: ⭐⭐☆☆☆ (Bajo)

#### **Paso 1.1: Crear Hook Base**
```typescript
// src/hooks/useTaskArchiving.ts
interface ArchiveAction {
  task: Task;
  action: 'archive' | 'unarchive';
  timestamp: number;
}

export const useTaskArchiving = () => {
  const [undoStack, setUndoStack] = useState<ArchiveAction[]>([]);
  const [showUndo, setShowUndo] = useState(false);
  
  const handleArchive = async (task: Task, userId: string, isAdmin: boolean) => {
    // Lógica centralizada con rollback completo
  };
  
  const handleUnarchive = async (task: Task, userId: string, isAdmin: boolean) => {
    // Lógica centralizada con rollback completo
  };
  
  const handleUndo = async (undoItem: ArchiveAction) => {
    // Sistema de undo unificado
  };
  
  return { handleArchive, handleUnarchive, handleUndo, undoStack, showUndo };
};
```

#### **Paso 1.2: Integrar en TasksKanban (Menos Crítico)**
- Añadir actualización optimista
- Mantener compatibilidad con código existente
- Testing básico

#### **Paso 1.3: Refactorizar TasksTable**
- Reemplazar lógica de archivo con hook
- Mantener sistema de filtrado existente
- Testing exhaustivo

#### **Paso 1.4: Refactorizar ArchiveTable**
- Usar hook compartido
- Mantener compatibilidad con props existentes

### 🟡 **FASE 2: Optimización de Estados (Riesgo Medio)**
**Duración Estimada**: 3-4 horas
**Riesgo**: ⭐⭐⭐☆☆ (Medio)

#### **Paso 2.1: Eliminar Actualizaciones Directas de filteredTasks**
```typescript
// Antes (problemático):
setFilteredTasks(filteredTasks.filter(t => t.id !== task.id));

// Después (seguro):
// Dejar que useEffect recalcule automáticamente desde effectiveTasks
```

#### **Paso 2.2: Mejorar Sistema de Rollback**
```typescript
const handleArchiveWithCompleteRollback = async (task: Task) => {
  // 1. Guardar estados originales
  const originalDataStoreState = useDataStore.getState().tasks;
  const originalTask = { ...task };
  
  try {
    // 2. Actualización optimista completa
    updateDataStore(task);
    
    // 3. Operación en Firestore
    await archiveTask(task.id, userId, isAdmin, task);
    
  } catch (error) {
    // 4. Rollback COMPLETO
    useDataStore.getState().setTasks(originalDataStoreState);
  }
};
```

#### **Paso 2.3: Unificar Sistemas de Filtrado**
- Crear función centralizada para filtros
- Eliminar duplicación entre componentes

### 🔴 **FASE 3: Store Compartido (Mayor Riesgo)**
**Duración Estimada**: 4-6 horas
**Riesgo**: ⭐⭐⭐⭐☆ (Alto)

#### **Paso 3.1: Crear Store de Archivado**
```typescript
// src/stores/archiveStore.ts
interface ArchiveStore {
  undoStack: ArchiveAction[];
  showUndo: boolean;
  isProcessing: boolean;
  
  archiveTask: (task: Task) => Promise<void>;
  unarchiveTask: (task: Task) => Promise<void>;
  undoAction: (action: ArchiveAction) => Promise<void>;
  
  // Cola de operaciones para evitar race conditions
  operationQueue: ArchiveOperation[];
  processQueue: () => void;
}
```

#### **Paso 3.2: Migrar Componentes al Store**
- Eliminar estados locales de archivo
- Usar store compartido
- Testing intensivo

#### **Paso 3.3: Implementar Cola de Operaciones**
```typescript
const processArchiveQueue = async () => {
  // Procesar operaciones secuencialmente para evitar race conditions
  while (queue.length > 0) {
    const operation = queue.shift();
    await executeOperation(operation);
  }
};
```

## 📚 **Documentación de Referencia**

### **Patrones de React/Hooks**
- [React Hooks Patterns](https://reactpatterns.com/hooks)
- [State Management Best Practices](https://kentcdodds.com/blog/application-state-management-with-react)
- [Custom Hooks Guidelines](https://react.dev/learn/reusing-logic-with-custom-hooks)

### **Zustand Patterns**
- [Zustand Best Practices](https://github.com/pmndrs/zustand#best-practices)
- [Avoiding Common Pitfalls](https://github.com/pmndrs/zustand/blob/main/docs/guides/event-handler-in-pre-v4.0.0.md)

### **Error Handling Patterns**
- [Graceful Error Handling in React](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react)
- [Rollback Strategies](https://martinfowler.com/articles/patterns-of-distributed-systems/rollback.html)

## 🧪 **Estrategia de Testing**

### **Fase 1 Testing**
```typescript
describe('useTaskArchiving', () => {
  it('should archive task optimistically', async () => {
    // Test optimistic update
  });
  
  it('should rollback on failure', async () => {
    // Test rollback logic
  });
  
  it('should handle undo correctly', async () => {
    // Test undo functionality
  });
});
```

### **Integration Testing**
```typescript
describe('Archive Integration', () => {
  it('should work across all components', async () => {
    // Test TasksTable + TasksKanban + ArchiveTable
  });
  
  it('should maintain data consistency', async () => {
    // Test no race conditions
  });
});
```

## 🚦 **Criterios de Éxito por Fase**

### **Fase 1 Completa Cuando:**
- ✅ Hook `useTaskArchiving` funciona correctamente
- ✅ TasksKanban tiene actualización optimista
- ✅ Todos los tests pasan
- ✅ No hay regresiones en funcionalidad

### **Fase 2 Completa Cuando:**
- ✅ No hay actualizaciones directas de `filteredTasks`
- ✅ Sistema de rollback funciona completamente
- ✅ Race conditions eliminadas
- ✅ Performance mejorada

### **Fase 3 Completa Cuando:**
- ✅ Store compartido funcionando
- ✅ Cola de operaciones implementada
- ✅ Código duplicado eliminado
- ✅ Arquitectura limpia y mantenible

## ⚠️ **Puntos de Riesgo y Mitigación**

### **Riesgo**: Romper funcionalidad existente
**Mitigación**: 
- Implementar por fases
- Testing exhaustivo en cada fase
- Rollback plan para cada cambio

### **Riesgo**: Race conditions durante migración
**Mitigación**:
- Mantener compatibilidad con código viejo
- Migrar un componente a la vez
- Feature flags para rollback rápido

### **Riesgo**: Performance degradation
**Mitigación**:
- Benchmarking antes y después
- Optimizaciones de Zustand con useShallow
- Lazy loading de operaciones pesadas

## 📋 **Checklist de Implementación**

### **Pre-Fase 1**
- [ ] Backup del código actual
- [ ] Setup de testing environment
- [ ] Documentar comportamiento actual
- [ ] Identificar edge cases

### **Durante Cada Fase**
- [ ] Implementar cambio mínimo
- [ ] Ejecutar tests
- [ ] Verificar no regresiones
- [ ] Documentar cambios
- [ ] Commit incremental

### **Post-Implementación**
- [ ] Testing de integración completo
- [ ] Performance benchmarking
- [ ] Documentación actualizada
- [ ] Code review
- [ ] Deploy gradual

## 🎯 **Próximos Pasos Inmediatos**

1. **Revisar este plan contigo** ✅
2. **Crear branch para Fase 1**: `feature/centralized-archiving-phase1`
3. **Implementar hook básico** (1-2 horas)
4. **Testing inicial** (30 min)
5. **Integración en TasksKanban** (1 hora)

¿Te parece un plan suficientemente cauteloso? ¿Hay alguna fase que te preocupe más o quieres que ajuste algo?
