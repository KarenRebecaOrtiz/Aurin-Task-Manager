# 🔧 Plan de Descomposición de Tablas

## 🚨 Problema Actual
- **TasksTable**: 1,609 líneas ❌
- **ArchiveTable**: 946 líneas ❌
- **ClientsTable**: 789 líneas ❌
- **Total**: 3,344 líneas ❌

## ✅ Objetivo
Cada componente debe tener **máximo 200-300 líneas**.

---

## 📦 Nueva Estructura Modular

### 1. **TableToolbar** (Componente Reutilizable)
```
/src/modules/shared/components/organisms/TableToolbar/
├── TableToolbar.tsx (100 líneas)
├── TableToolbar.module.scss
└── types.ts
```

**Responsabilidad**: Barra de herramientas con búsqueda, filtros y acciones.

**Props**:
```typescript
interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterConfig[];
  actions?: ActionButton[];
  leftActions?: React.ReactNode;
}
```

---

### 2. **TableFilters** (Componente Reutilizable)
```
/src/modules/shared/components/organisms/TableFilters/
├── TableFilters.tsx (80 líneas)
├── FilterDropdown.tsx (60 líneas)
├── TableFilters.module.scss
└── types.ts
```

**Responsabilidad**: Sistema de filtros con dropdowns.

---

### 3. **TableColumns** (Configuración Separada)
```
/src/modules/tasks/components/tables/TasksTable/
├── columns/
│   ├── taskColumns.tsx (150 líneas)
│   ├── archiveColumns.tsx (100 líneas)
│   └── types.ts
```

**Responsabilidad**: Definición de columnas y renders.

---

### 4. **TableActions** (Componente Reutilizable)
```
/src/modules/shared/components/organisms/TableActions/
├── TableActions.tsx (80 líneas)
├── TableActions.module.scss
└── types.ts
```

**Responsabilidad**: Botones de acción (crear, exportar, etc).

---

### 5. **Componente Principal Simplificado**
```typescript
// TasksTable.tsx (150-200 líneas MAX)
export const TasksTable = () => {
  const tableState = useTableState({ data: tasks });
  const columns = useTaskColumns();
  
  return (
    <div>
      <TableToolbar {...toolbarProps} />
      <DataTable
        data={tableState.paginatedData}
        columns={columns}
        onRowClick={handleRowClick}
      />
    </div>
  );
};
```

---

## 🎯 Desglose Detallado

### TasksTable Actual (1,609 líneas) → Dividir en:

1. **TasksTable.tsx** (200 líneas)
   - Lógica principal
   - Composición de componentes
   - Handlers principales

2. **TasksTableToolbar.tsx** (150 líneas)
   - SearchInput
   - Botones de vista (Kanban/Archivo)
   - Botón crear tarea

3. **TasksTableFilters.tsx** (120 líneas)
   - Dropdown de prioridad
   - Dropdown de cliente
   - Dropdown de usuario (admin)

4. **taskColumns.tsx** (200 líneas)
   - Definición de columnas
   - Renders de celdas
   - Lógica de ordenamiento

5. **TasksTableHandlers.ts** (150 líneas)
   - Handlers de eventos
   - Lógica de negocio
   - Callbacks memoizados

6. **TasksTableState.ts** (100 líneas)
   - Custom hook con estado
   - Selectores de Zustand
   - Estado derivado

7. **TasksTableUtils.ts** (80 líneas)
   - Funciones auxiliares
   - Normalización de datos
   - Validaciones

**Total**: ~1,000 líneas distribuidas en 7 archivos pequeños ✅

---

## 🔄 Implementación Paso a Paso

### Fase 1: Crear Componentes Compartidos (2-3 horas)

#### 1.1 TableToolbar
```typescript
// /src/modules/shared/components/organisms/TableToolbar/TableToolbar.tsx
interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  filters?: React.ReactNode;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  leftActions,
  rightActions,
  filters,
}) => {
  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        {leftActions}
        <SearchInput value={searchValue} onChange={onSearchChange} />
      </div>
      <div className={styles.right}>
        {filters}
        {rightActions}
      </div>
    </div>
  );
};
```

#### 1.2 FilterGroup
```typescript
// /src/modules/shared/components/organisms/FilterGroup/FilterGroup.tsx
interface FilterGroupProps {
  filters: Array<{
    id: string;
    label: string;
    value: unknown;
    options: DropdownItem[];
    onChange: (value: unknown) => void;
  }>;
}

export const FilterGroup: React.FC<FilterGroupProps> = ({ filters }) => {
  return (
    <div className={styles.filterGroup}>
      {filters.map((filter) => (
        <Dropdown
          key={filter.id}
          trigger={<span>{filter.label}</span>}
          items={filter.options}
          value={filter.value}
          onChange={filter.onChange}
        />
      ))}
    </div>
  );
};
```

---

### Fase 2: Extraer Configuración de Columnas (1-2 horas)

```typescript
// /src/modules/tasks/components/tables/TasksTable/columns/taskColumns.tsx
import { ClientCell, StatusCell, PriorityCell } from '@/modules/shared/components/molecules/TableCell';

export const useTaskColumns = () => {
  const { effectiveClients, effectiveUsers, userId } = useTasksCommon();

  return useMemo(() => [
    {
      key: 'clientId',
      label: 'Cuenta',
      width: '20%',
      render: (task: Task) => {
        const client = effectiveClients.find(c => c.id === task.clientId);
        return <ClientCell client={client} />;
      },
    },
    {
      key: 'name',
      label: 'Tarea',
      width: '60%',
    },
    {
      key: 'status',
      label: 'Estado',
      width: '30%',
      render: (task: Task) => <StatusCell status={task.status} />,
    },
    {
      key: 'priority',
      label: 'Prioridad',
      width: '10%',
      render: (task: Task) => <PriorityCell priority={task.priority} />,
    },
    {
      key: 'assignedTo',
      label: 'Asignados',
      width: '20%',
      render: (task: Task) => (
        <AvatarGroup
          assignedUserIds={task.AssignedTo}
          leadedByUserIds={task.LeadedBy}
          users={effectiveUsers}
          currentUserId={userId}
        />
      ),
    },
  ], [effectiveClients, effectiveUsers, userId]);
};
```

---

### Fase 3: Extraer Lógica de Estado (1 hora)

```typescript
// /src/modules/tasks/components/tables/TasksTable/hooks/useTasksTableState.ts
export const useTasksTableState = (props: TasksTableProps) => {
  const { externalTasks, externalClients, externalUsers } = props;
  
  // Zustand selectors
  const filteredTasks = useStore(tasksTableStore, useShallow(state => state.filteredTasks));
  const sortKey = useStore(tasksTableStore, useShallow(state => state.sortKey));
  const searchQuery = useStore(tasksTableStore, useShallow(state => state.searchQuery));
  
  // Data efectiva
  const effectiveTasks = useMemo(
    () => externalTasks || tasks,
    [externalTasks, tasks]
  );
  
  // Estado derivado
  const sortedTasks = useMemo(() => {
    return applySort(filteredTasks, sortKey, sortDirection);
  }, [filteredTasks, sortKey, sortDirection]);
  
  return {
    effectiveTasks,
    sortedTasks,
    searchQuery,
    // ... más estado
  };
};
```

---

### Fase 4: Refactorizar TasksTable (2 horas)

```typescript
// /src/modules/tasks/components/tables/TasksTable/TasksTable.tsx (200 líneas)
import { TableToolbar } from '@/modules/shared/components/organisms/TableToolbar';
import { FilterGroup } from '@/modules/shared/components/organisms/FilterGroup';
import { useTaskColumns } from './columns/taskColumns';
import { useTasksTableState } from './hooks/useTasksTableState';
import { useTasksTableHandlers } from './hooks/useTasksTableHandlers';

export const TasksTable: React.FC<TasksTableProps> = memo((props) => {
  // Estado
  const state = useTasksTableState(props);
  
  // Columnas
  const columns = useTaskColumns();
  
  // Handlers
  const handlers = useTasksTableHandlers();
  
  // Filtros
  const filters = useTaskFilters();
  
  if (state.isLoading) {
    return <SkeletonLoader type="tasks" />;
  }
  
  return (
    <div className={styles.container}>
      <TableToolbar
        searchValue={state.searchQuery}
        onSearchChange={state.setSearchQuery}
        leftActions={
          <>
            <Button
              variant="view"
              icon="/kanban.svg"
              onClick={handlers.handleViewChange}
            />
            <Button
              variant="view"
              icon="/archive.svg"
              onClick={handlers.handleArchiveOpen}
            />
          </>
        }
        filters={<FilterGroup filters={filters} />}
        rightActions={
          <Button
            variant="primary"
            icon="/square-dashed-mouse-pointer.svg"
            onClick={handlers.handleNewTask}
          >
            Crear Tarea
          </Button>
        }
      />
      
      <Table
        data={state.sortedTasks}
        columns={columns}
        onRowClick={handlers.handleRowClick}
        sortKey={state.sortKey}
        sortDirection={state.sortDirection}
        onSort={handlers.handleSort}
      />
    </div>
  );
});
```

---

## 📊 Resultado Final

### Antes
```
TasksTable.tsx: 1,609 líneas ❌
```

### Después
```
TasksTable/
├── TasksTable.tsx (200 líneas) ✅
├── columns/
│   └── taskColumns.tsx (150 líneas) ✅
├── hooks/
│   ├── useTasksTableState.ts (100 líneas) ✅
│   ├── useTasksTableHandlers.ts (120 líneas) ✅
│   └── useTaskFilters.ts (80 líneas) ✅
└── utils/
    └── taskTableUtils.ts (60 líneas) ✅

Total: 710 líneas en 6 archivos pequeños ✅
```

**Reducción**: ~900 líneas eliminadas por reutilización y mejor organización

---

## 🎯 Beneficios

### 1. **Mantenibilidad** ⬆️
- Archivos pequeños y enfocados
- Fácil encontrar y modificar código
- Menos conflictos en Git

### 2. **Reutilización** ⬆️
- TableToolbar usado en todas las tablas
- FilterGroup compartido
- Hooks reutilizables

### 3. **Testing** ⬆️
- Componentes pequeños = tests simples
- Hooks testeables independientemente
- Mocks más fáciles

### 4. **Performance** ⬆️
- Memoización más efectiva
- Re-renders más controlados
- Bundle splitting mejor

### 5. **Developer Experience** ⬆️
- Código más legible
- Onboarding más rápido
- Menos bugs

---

## 🚀 Próximos Pasos Inmediatos

1. **Crear TableToolbar** (30 min)
2. **Crear FilterGroup** (30 min)
3. **Extraer taskColumns** (45 min)
4. **Crear useTasksTableState** (30 min)
5. **Refactorizar TasksTable** (1 hora)
6. **Aplicar mismo patrón a ArchiveTable** (45 min)
7. **Aplicar mismo patrón a ClientsTable** (45 min)

**Tiempo total estimado**: 4-5 horas

---

## 💡 Regla de Oro

> **"Si un componente tiene más de 300 líneas, probablemente está haciendo demasiado"**

Siempre preguntarse:
- ¿Este componente tiene una sola responsabilidad?
- ¿Puedo extraer lógica a un hook?
- ¿Puedo extraer UI a un componente?
- ¿Puedo extraer configuración a un archivo?
