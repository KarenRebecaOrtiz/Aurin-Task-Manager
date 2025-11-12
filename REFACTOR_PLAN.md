# Plan de Refactorización - Data Views Module

## 📊 Estado Actual

### Líneas de Código por Archivo
```
TasksTable.tsx    → 1,381 líneas ⚠️
TasksKanban.tsx   → 1,380 líneas ⚠️
ArchiveTable.tsx  →   903 líneas ⚠️
ClientsTable.tsx  →   784 líneas ⚠️
MembersTable.tsx  →   448 líneas ⚠️
```

### ✅ Ya Completado
- [x] Extracción de utilidades compartidas (statusUtils, sortingUtils, keyboardUtils)
- [x] Extracción de constantes compartidas (STATUS_MAP, KANBAN_COLUMNS, PRIORITY_MAP)
- [x] Creación de cell components (StatusCell, PriorityCell, ClientCell, UserCell, DateCell)
- [x] Consolidación de módulos bajo `/data-views/`
- [x] Reutilización de infraestructura entre tables

## 🎯 Siguientes Pasos (Pragmáticos)

### Fase 1: Extraer Lógica de Negocio (ALTA PRIORIDAD)
**Problema**: Los archivos de tabla tienen 1,300+ líneas principalmente por:
1. Lógica de filtrado duplicada
2. Lógica de sorting duplicada
3. Event handlers duplicados (keyboard, click, drag)
4. Gestión de estado local duplicada

**Solución**: Crear custom hooks compartidos

```
/data-views/hooks/
  ├── useTableState.ts          (estado común: sorting, filters, pagination)
  ├── useTableFilters.ts        (lógica de filtrado genérica)
  ├── useTableActions.ts        (handlers: edit, delete, archive)
  ├── useKeyboardNavigation.ts  (keyboard shortcuts compartidos)
  └── useDragAndDrop.ts         (lógica drag & drop para Kanban)
```

**Impacto estimado**: Reducir ~300-400 líneas por tabla

---

### Fase 2: Extraer Componentes de UI (MEDIA PRIORIDAD)
**Problema**: Render logic duplicada para headers, toolbars, empty states

**Solución**: Crear componentes compartidos

```
/data-views/components/shared/
  ├── table-header/
  │   ├── TableHeader.tsx       (header genérico con búsqueda + acciones)
  │   └── ColumnVisibilityMenu.tsx
  ├── table-toolbar/
  │   ├── FilterToolbar.tsx     (filtros genéricos)
  │   └── SortingControls.tsx
  ├── empty-states/
  │   ├── EmptyTableState.tsx
  │   └── NoResultsState.tsx
  └── loading/
      └── TableSkeleton.tsx     (ya existe SkeletonLoader, unificar)
```

**Impacto estimado**: Reducir ~200-300 líneas por tabla

---

### Fase 3: Optimización de Caching (MEDIA PRIORIDAD)

#### 🚫 NO Redis (para Vercel)
**Razón**: Redis requiere infraestructura adicional. En Vercel:
- Serverless functions son stateless
- No hay servidor persistente para Redis
- Opción externa (Upstash Redis) añade complejidad + costos

#### ✅ SÍ: Client-side Caching Mejorado
**Estrategia actual**: Ya tienes cache con localStorage (ClientsTable líneas 24-63)

**Mejoras propuestas**:

```typescript
// /data-views/lib/cache/
├── cacheManager.ts              // Sistema unificado de cache
├── queryCache.ts                // Cache para queries (inspirado en React Query)
└── optimisticUpdates.ts         // Optimistic updates para mejor UX

// Ejemplo de API:
const { data, isLoading } = useCachedData('tasks', {
  fetchFn: () => fetchTasks(userId),
  cacheTime: 10 * 60 * 1000,  // 10 min
  staleTime: 5 * 60 * 1000,    // 5 min
});
```

**Ventajas**:
- Cache compartido entre todas las tablas
- Invalidación inteligente de cache
- Reduce llamadas a Firestore
- Optimistic updates para mejor UX

---

### Fase 4: Data Fetching Centralizado (BAJA PRIORIDAD)

**Problema actual**: Cada tabla tiene su propio listener de Firestore

**Solución**: Centralizar en `dataStore` (ya existe parcialmente)

```typescript
// /stores/dataStore.ts (mejorar existente)
export const useDataStore = create((set, get) => ({
  // Ya tienes tasks, mejorar con:
  clients: [],
  members: [],

  // Listeners centralizados
  subscribeToAll: (userId) => {
    // Un solo lugar para todos los listeners
    subscribeToTasks(userId);
    subscribeToClients(userId);
    subscribeToMembers(userId);
  },

  // Cleanup centralizado
  cleanup: () => {
    // Un solo lugar para cleanup
  }
}));
```

**Ventajas**:
- Una sola fuente de verdad
- Listeners compartidos (no duplicados)
- Sincronización automática entre tablas

---

## 🎨 Arquitectura de Caching Recomendada

### Opción 1: React Query (Recomendada)
```bash
npm install @tanstack/react-query
```

**Pros**:
- Industry standard para data fetching
- Cache automático + invalidación
- Optimistic updates built-in
- Loading/error states automáticos
- Funciona perfecto con Firestore

**Contras**:
- Dependencia adicional (~40kb)

### Opción 2: SWR (Alternativa Ligera)
```bash
npm install swr
```

**Pros**:
- Más ligero (~5kb)
- Similar a React Query
- Diseñado por Vercel

**Contras**:
- Menos features que React Query

### Opción 3: Custom Cache (Actual)
**Pros**: Ya lo tienes, sin dependencias

**Contras**: Mantener tu propio sistema de cache

---

## 📐 Estructura Final Propuesta

```
/modules/data-views/
├── components/
│   ├── shared/
│   │   ├── cells/           ✅ Ya existe
│   │   ├── headers/         🆕 Nuevo
│   │   ├── toolbars/        🆕 Nuevo
│   │   ├── filters/         🆕 Nuevo
│   │   └── empty-states/    🆕 Nuevo
│   └── ui/
│       ├── ActionMenu.tsx   ✅ Ya existe
│       └── KanbanHeader.tsx ✅ Ya existe
├── hooks/
│   ├── shared/              🆕 Nuevo
│   │   ├── useTableState.ts
│   │   ├── useTableFilters.ts
│   │   ├── useTableActions.ts
│   │   └── useKeyboardNav.ts
│   └── table/               ✅ Ya existe parcial
├── lib/
│   ├── cache/               🆕 Nuevo (o usar React Query)
│   └── firestore/           🆕 Opcional (queries centralizadas)
├── utils/                   ✅ Ya existe
├── constants/               ✅ Ya existe
├── stores/                  ✅ Ya existe
└── [tasks|clients|members]/ ✅ Ya existe
    └── components/tables/   (Más livianos tras refactor)
```

---

## 🎯 Progreso de Implementación

### ✅ Fase 1a: Hooks Compartidos (COMPLETADO)

Hooks creados en `/modules/data-views/hooks/table/`:

1. **useTableState.ts** ✅ - Estado centralizado - 300 líneas
2. **useTableFiltering.ts** ✅ - Lógica de filtrado - 100 líneas
3. **useTableSorting.ts** ✅ - Ordenamiento - 110 líneas
4. **useTableSelection.ts** ✅ - Selección de filas - 160 líneas
5. **useDropdownManager.ts** ✅ - Gestión de dropdowns - 220 líneas
6. **useKeyboardShortcuts.ts** ✅ - Atajos de teclado - 250 líneas

**Total**: ~1,140 líneas de hooks reutilizables

---

### ✅ Fase 1a.5: Hooks TasksTable (COMPLETADO)

Hooks en `/tasks/components/tables/TasksTable/hooks/`:

1. **useTasksTableState.ts** ✅ - Estado consolidado (filtrado + sorting) - 273 líneas
2. **useTasksTableDropdowns.ts** ✅ - Gestión de dropdowns - 120 líneas

**Funcionalidades**: Filtrado por permisos, búsqueda, filtros, sorting, helpers

---

### 🔄 Próximos Pasos

1. **Fase 1b: Refactorizar TasksTable** (EN PROGRESO) 👈 **AHORA**
   - Usar useTasksTableState y useTasksTableDropdowns
   - Remover código duplicado
   - Objetivo: 1381 → ~900 líneas (35% reducción)

2. **Fase 1c: Aplicar a otras tablas** (2-3 horas)
   - ArchiveTable (903 → ~500 líneas)
   - ClientsTable (784 → ~400 líneas)
   - MembersTable (448 → ~250 líneas)

3. **Fase 3: Caching con React Query** (3-4 horas)
   - Instalar y configurar
   - Migrar dataStore a React Query
   - Eliminar cache manual de ClientsTable

4. **Fase 2: Componentes UI** (4-5 horas)
   - Crear TableHeader genérico
   - Crear FilterToolbar genérico
   - Aplicar a todas las tablas

5. **Fase 4: Centralizar listeners** (2-3 horas)
   - Mover todo a dataStore con React Query
   - Eliminar listeners individuales

**Total estimado**: 11-17 horas de trabajo restantes

---

## ❌ Qué NO Hacer (Sobre-ingeniería)

1. ❌ **NO** crear un sistema de plugins/extensiones
2. ❌ **NO** implementar virtual scrolling (aún)
3. ❌ **NO** crear un query builder complejo
4. ❌ **NO** implementar Redis/cache server-side
5. ❌ **NO** reescribir todo en un mega-componente genérico
6. ❌ **NO** agregar GraphQL o similar (Firestore ya funciona)

---

## 📊 Métricas de Éxito

### Objetivos tras refactorización completa:
- TasksTable: 1,381 → ~700-800 líneas ✅ (40-45% reducción)
- TasksKanban: 1,380 → ~700-800 líneas ✅
- ArchiveTable: 903 → ~500-600 líneas ✅
- ClientsTable: 784 → ~400-500 líneas ✅

### Beneficios adicionales:
- ✅ Code sharing entre tablas: ~70%
- ✅ Reducción de llamadas Firestore: ~50%
- ✅ Mejora de performance (cache + optimistic updates)
- ✅ Mejor DX (developer experience)
- ✅ Más fácil agregar nuevas tablas

---

## 💡 Pregunta Clave

**¿Cuál es tu prioridad?**

A. **Performance/UX** → Ir con React Query primero (Fase 3)
B. **Reducir código** → Ir con Hooks primero (Fase 1)
C. **Ambas** → Fase 1a → Fase 3 → Resto

**Mi recomendación**: Opción C - Los hooks te dan quick wins inmediatos, luego React Query mejora toda la experiencia.
