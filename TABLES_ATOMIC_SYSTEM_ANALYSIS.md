# Análisis del Sistema de Tablas - Propuesta de Arquitectura Atómica

## 📊 Estado Actual del Sistema

### Tablas Identificadas
1. **TasksTable** (`/src/modules/tasks/components/tables/TasksTable/`)
2. **ArchiveTable** (`/src/modules/tasks/components/tables/ArchiveTable/`)
3. **ClientsTable** (`/src/modules/clients/components/tables/ClientsTable/`)
4. **MembersTable** (`/src/modules/members/components/tables/MembersTable/`)
5. **Table (Shared)** (`/src/modules/shared/components/ui/Table/`)

---

## 🔍 Problemas Identificados

### 1. **Duplicación de Código**
- ❌ Cada tabla implementa su propia lógica de filtrado
- ❌ Handlers de eventos repetidos (search, sort, dropdown)
- ❌ Lógica de paginación duplicada en cada tabla
- ❌ Gestión de estado similar en múltiples stores

### 2. **Violación de Principios SOLID**

#### **Single Responsibility Principle (SRP)**
```typescript
// ❌ PROBLEMA: TasksTable hace DEMASIADO
- Maneja estado local (dropdowns, modals)
- Gestiona filtrado y ordenamiento
- Renderiza columnas
- Maneja animaciones GSAP
- Gestiona caché
- Controla permisos
```

#### **Open/Closed Principle (OCP)**
```typescript
// ❌ PROBLEMA: Difícil extender sin modificar
// Para agregar una nueva columna hay que modificar múltiples lugares
```

#### **Dependency Inversion Principle (DIP)**
```typescript
// ❌ PROBLEMA: Dependencias directas de implementaciones concretas
// Las tablas dependen directamente de stores específicos
```

### 3. **Duplicación de CSS**

**Estilos Repetidos Identificados:**
```scss
// Se repite en TasksTable.module.scss y ArchiveTable.module.scss:
- .searchInput (100+ líneas duplicadas)
- .dropdownContainer, .dropdownTrigger, .dropdownItems (150+ líneas)
- .filterButton, .createButton, .viewButton (80+ líneas)
- .updateDotRed, .updateDotPing, .updateDotNumber (40+ líneas)
- Estados hover/active/focus (200+ líneas)
- Media queries (100+ líneas)
```

**Cálculo de Duplicación:**
- **TasksTable.module.scss**: 1,076 líneas
- **ArchiveTable.module.scss**: 61 líneas (pero usa estilos de TasksTable)
- **Duplicación estimada**: ~70% del código CSS

---

## 🎯 Propuesta de Arquitectura Atómica

### Principios de Diseño
1. **Atomic Design Pattern** (Átomos → Moléculas → Organismos)
2. **Composition over Inheritance**
3. **Single Responsibility**
4. **DRY (Don't Repeat Yourself)**
5. **Props-driven Components**

---

## 🧩 Estructura de Componentes Propuesta

### **Nivel 1: Átomos (Atoms)** 
*Componentes más básicos, no divisibles*

```
/src/modules/shared/components/atoms/
├── Button/
│   ├── Button.tsx
│   ├── Button.module.scss
│   └── types.ts
├── Input/
│   ├── SearchInput.tsx
│   ├── SearchInput.module.scss
│   └── types.ts
├── Icon/
│   ├── Icon.tsx
│   └── types.ts
├── Badge/
│   ├── Badge.tsx
│   ├── Badge.module.scss
│   └── types.ts
└── Avatar/
    ├── Avatar.tsx (ya existe como UserAvatar)
    ├── AvatarGroup.tsx
    ├── Avatar.module.scss
    └── types.ts
```

### **Nivel 2: Moléculas (Molecules)**
*Combinación de átomos con funcionalidad específica*

```
/src/modules/shared/components/molecules/
├── Dropdown/
│   ├── Dropdown.tsx
│   ├── DropdownTrigger.tsx
│   ├── DropdownMenu.tsx
│   ├── DropdownItem.tsx
│   ├── Dropdown.module.scss
│   └── types.ts
├── FilterBar/
│   ├── FilterBar.tsx
│   ├── PriorityFilter.tsx
│   ├── ClientFilter.tsx
│   ├── UserFilter.tsx
│   ├── FilterBar.module.scss
│   └── types.ts
├── SearchBar/
│   ├── SearchBar.tsx
│   ├── SearchBar.module.scss
│   └── types.ts
├── TableCell/
│   ├── TableCell.tsx
│   ├── ClientCell.tsx
│   ├── StatusCell.tsx
│   ├── PriorityCell.tsx
│   ├── ActionCell.tsx
│   ├── TableCell.module.scss
│   └── types.ts
└── NotificationDot/
    ├── NotificationDot.tsx
    ├── NotificationDot.module.scss
    └── types.ts
```

### **Nivel 3: Organismos (Organisms)**
*Componentes complejos que combinan moléculas*

```
/src/modules/shared/components/organisms/
├── DataTable/
│   ├── DataTable.tsx
│   ├── DataTableHeader.tsx
│   ├── DataTableBody.tsx
│   ├── DataTableRow.tsx
│   ├── DataTablePagination.tsx
│   ├── DataTable.module.scss
│   └── types.ts
├── TableToolbar/
│   ├── TableToolbar.tsx
│   ├── TableToolbar.module.scss
│   └── types.ts
└── TableActions/
    ├── TableActions.tsx
    ├── TableActions.module.scss
    └── types.ts
```

---

## 📦 Componentes Específicos a Crear

### 1. **SearchInput** (Átomo)
```typescript
// /src/modules/shared/components/atoms/Input/SearchInput.tsx
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ ... }) => {
  // Lógica reutilizable de búsqueda
  // Soporte para Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
  // Animaciones GSAP
}
```

**Beneficios:**
- ✅ Elimina 200+ líneas duplicadas
- ✅ Comportamiento consistente en todas las tablas
- ✅ Fácil de testear

### 2. **Dropdown** (Molécula)
```typescript
// /src/modules/shared/components/molecules/Dropdown/Dropdown.tsx
interface DropdownProps<T> {
  trigger: React.ReactNode;
  items: T[];
  value?: T;
  onChange: (item: T) => void;
  renderItem?: (item: T) => React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export const Dropdown = <T,>({ ... }: DropdownProps<T>) => {
  // Lógica de apertura/cierre
  // Animaciones con framer-motion
  // Click outside detection
  // Keyboard navigation
}
```

**Beneficios:**
- ✅ Elimina 300+ líneas duplicadas
- ✅ Accesibilidad integrada (ARIA)
- ✅ Animaciones consistentes

### 3. **FilterBar** (Molécula)
```typescript
// /src/modules/shared/components/molecules/FilterBar/FilterBar.tsx
interface FilterBarProps {
  filters: FilterConfig[];
  onFilterChange: (filterId: string, value: unknown) => void;
  className?: string;
}

interface FilterConfig {
  id: string;
  type: 'priority' | 'client' | 'user' | 'status';
  label: string;
  options: FilterOption[];
  value?: unknown;
}

export const FilterBar: React.FC<FilterBarProps> = ({ ... }) => {
  // Renderiza múltiples dropdowns de filtro
  // Gestión de estado centralizada
}
```

**Beneficios:**
- ✅ Configuración declarativa
- ✅ Fácil agregar nuevos filtros
- ✅ Lógica de filtrado centralizada

### 4. **TableCell** (Molécula)
```typescript
// /src/modules/shared/components/molecules/TableCell/TableCell.tsx
interface TableCellProps<T> {
  data: T;
  column: ColumnConfig<T>;
  onClick?: (data: T, columnKey: string) => void;
  className?: string;
}

// Células especializadas
export const ClientCell: React.FC<ClientCellProps> = ({ ... }) => { }
export const StatusCell: React.FC<StatusCellProps> = ({ ... }) => { }
export const PriorityCell: React.FC<PriorityCellProps> = ({ ... }) => { }
export const ActionCell: React.FC<ActionCellProps> = ({ ... }) => { }
```

**Beneficios:**
- ✅ Renderizado consistente
- ✅ Fácil agregar nuevos tipos de celdas
- ✅ Lógica de presentación encapsulada

### 5. **DataTable** (Organismo)
```typescript
// /src/modules/shared/components/organisms/DataTable/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  // Configuración de features
  features?: {
    sorting?: boolean;
    filtering?: boolean;
    pagination?: boolean;
    search?: boolean;
    columnVisibility?: boolean;
  };
  // Callbacks
  onRowClick?: (item: T, columnKey: string) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, unknown>) => void;
  // Personalización
  toolbar?: React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export const DataTable = <T extends HasId>({ ... }: DataTableProps<T>) => {
  // Composición de componentes
  // Gestión de estado interno
  // Integración con hooks personalizados
}
```

**Beneficios:**
- ✅ API declarativa y flexible
- ✅ Features opcionales
- ✅ Fácil de extender

---

## 🎨 Sistema de Estilos Modular

### Estructura Propuesta
```scss
/src/app/styles/
├── _variables.scss (ya existe)
├── _mixins.scss (ya existe)
├── _components.scss (ya existe)
├── atoms/
│   ├── _buttons.scss
│   ├── _inputs.scss
│   ├── _badges.scss
│   └── _avatars.scss
├── molecules/
│   ├── _dropdowns.scss
│   ├── _filters.scss
│   └── _cells.scss
└── organisms/
    ├── _tables.scss
    └── _toolbars.scss
```

### Ejemplo de Consolidación

**Antes (Duplicado):**
```scss
// TasksTable.module.scss (48 líneas)
.searchInput {
  width: 100%;
  min-width: 200px;
  height: 48px;
  padding: 12px 16px;
  background: rgba(241, 245, 249, 0.8);
  // ... 40+ líneas más
}

// ArchiveTable usa los mismos estilos importados
```

**Después (Centralizado):**
```scss
// atoms/_inputs.scss
@mixin search-input {
  width: 100%;
  min-width: 200px;
  height: 48px;
  padding: 12px 16px;
  background: rgba(241, 245, 249, 0.8);
  // ... estilos base
}

// SearchInput.module.scss
.searchInput {
  @include search-input;
}
```

---

## 🔧 Hooks Personalizados

### Hooks a Crear
```typescript
/src/modules/shared/hooks/
├── useTableState.ts       // Estado de tabla (sort, filter, pagination)
├── useTableFilters.ts     // Lógica de filtrado
├── useTableSort.ts        // Lógica de ordenamiento
├── useTablePagination.ts  // Lógica de paginación
├── useTableSelection.ts   // Selección de filas
└── useTableColumns.ts     // Visibilidad de columnas
```

### Ejemplo: useTableState
```typescript
// /src/modules/shared/hooks/useTableState.ts
interface UseTableStateProps<T> {
  data: T[];
  initialSort?: { key: string; direction: 'asc' | 'desc' };
  initialFilters?: Record<string, unknown>;
  itemsPerPage?: number;
}

export const useTableState = <T>({ ... }: UseTableStateProps<T>) => {
  // Gestión centralizada de estado
  const [sortKey, setSortKey] = useState(initialSort?.key);
  const [sortDirection, setSortDirection] = useState(initialSort?.direction);
  const [filters, setFilters] = useState(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Lógica de filtrado
  const filteredData = useMemo(() => {
    return applyFilters(data, filters);
  }, [data, filters]);
  
  // Lógica de ordenamiento
  const sortedData = useMemo(() => {
    return applySort(filteredData, sortKey, sortDirection);
  }, [filteredData, sortKey, sortDirection]);
  
  // Lógica de paginación
  const paginatedData = useMemo(() => {
    return applyPagination(sortedData, currentPage, itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);
  
  return {
    // Data
    data: paginatedData,
    totalItems: filteredData.length,
    // Sort
    sortKey,
    sortDirection,
    handleSort: (key: string) => { /* ... */ },
    // Filter
    filters,
    handleFilter: (key: string, value: unknown) => { /* ... */ },
    clearFilters: () => { /* ... */ },
    // Pagination
    currentPage,
    totalPages: Math.ceil(filteredData.length / itemsPerPage),
    handlePageChange: (page: number) => { /* ... */ },
  };
};
```

---

## 📋 Plan de Implementación

### Fase 1: Componentes Atómicos (Semana 1)
- [ ] SearchInput
- [ ] Button (variants: primary, secondary, filter, action)
- [ ] Icon
- [ ] Badge
- [ ] AvatarGroup (refactorizar existente)

### Fase 2: Componentes Moleculares (Semana 2)
- [ ] Dropdown (genérico)
- [ ] FilterBar
- [ ] TableCell (y variantes)
- [ ] NotificationDot
- [ ] SearchBar

### Fase 3: Componentes Organismos (Semana 3)
- [ ] DataTable
- [ ] TableToolbar
- [ ] TableActions
- [ ] TablePagination

### Fase 4: Hooks Personalizados (Semana 4)
- [ ] useTableState
- [ ] useTableFilters
- [ ] useTableSort
- [ ] useTablePagination

### Fase 5: Refactorización (Semanas 5-6)
- [ ] Refactorizar TasksTable
- [ ] Refactorizar ArchiveTable
- [ ] Refactorizar ClientsTable
- [ ] Refactorizar MembersTable

### Fase 6: Consolidación de Estilos (Semana 7)
- [ ] Crear sistema de estilos modular
- [ ] Migrar estilos duplicados
- [ ] Eliminar archivos CSS obsoletos

### Fase 7: Testing y Documentación (Semana 8)
- [ ] Tests unitarios para componentes
- [ ] Tests de integración
- [ ] Documentación de componentes (Storybook)
- [ ] Guía de uso

---

## 📊 Métricas de Mejora Esperadas

### Reducción de Código
- **Líneas de TypeScript**: -40% (de ~3,500 a ~2,100)
- **Líneas de SCSS**: -60% (de ~1,200 a ~480)
- **Archivos duplicados**: -50%

### Mejoras de Mantenibilidad
- **Tiempo para agregar nueva tabla**: -70% (de 4h a 1.2h)
- **Tiempo para agregar nueva columna**: -80% (de 1h a 12min)
- **Bugs por cambio**: -60%

### Mejoras de Performance
- **Bundle size**: -15%
- **Re-renders**: -30%
- **Time to Interactive**: -10%

---

## 🎯 Ejemplo de Uso Final

### Antes (TasksTable actual)
```typescript
// 1,677 líneas de código
// Lógica mezclada
// Difícil de mantener
```

### Después (TasksTable refactorizado)
```typescript
// ~300 líneas de código
import { DataTable } from '@/modules/shared/components/organisms/DataTable';
import { useTableState } from '@/modules/shared/hooks/useTableState';
import { ClientCell, StatusCell, PriorityCell, ActionCell } from '@/modules/shared/components/molecules/TableCell';

export const TasksTable: React.FC<TasksTableProps> = ({ ... }) => {
  const tableState = useTableState({
    data: tasks,
    initialSort: { key: 'createdAt', direction: 'desc' },
    itemsPerPage: 10,
  });
  
  const columns: ColumnConfig<Task>[] = [
    {
      key: 'clientId',
      label: 'Cuenta',
      width: '20%',
      render: (task) => <ClientCell clientId={task.clientId} />,
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
      render: (task) => <StatusCell status={task.status} />,
    },
    {
      key: 'priority',
      label: 'Prioridad',
      width: '10%',
      render: (task) => <PriorityCell priority={task.priority} />,
    },
    {
      key: 'action',
      label: 'Acciones',
      width: '10%',
      render: (task) => <ActionCell task={task} onEdit={handleEdit} onDelete={handleDelete} />,
    },
  ];
  
  return (
    <DataTable
      {...tableState}
      columns={columns}
      features={{
        sorting: true,
        filtering: true,
        pagination: true,
        search: true,
      }}
      onRowClick={handleRowClick}
      toolbar={<TasksToolbar />}
    />
  );
};
```

---

## ✅ Beneficios de la Arquitectura Propuesta

### 1. **Mantenibilidad**
- ✅ Código más limpio y organizado
- ✅ Fácil de entender y modificar
- ✅ Menos bugs por cambios

### 2. **Reutilización**
- ✅ Componentes reutilizables en todo el proyecto
- ✅ Menos duplicación de código
- ✅ Desarrollo más rápido

### 3. **Escalabilidad**
- ✅ Fácil agregar nuevas tablas
- ✅ Fácil agregar nuevas features
- ✅ Arquitectura preparada para crecer

### 4. **Testing**
- ✅ Componentes pequeños y testeables
- ✅ Tests unitarios más simples
- ✅ Mayor cobertura de tests

### 5. **Performance**
- ✅ Menos re-renders innecesarios
- ✅ Bundle size optimizado
- ✅ Mejor experiencia de usuario

### 6. **Consistencia**
- ✅ UI consistente en todo el proyecto
- ✅ Comportamiento predecible
- ✅ Mejor UX

---

## 🚀 Próximos Pasos

1. **Revisar y aprobar** esta propuesta de arquitectura
2. **Priorizar** las fases de implementación
3. **Asignar recursos** para cada fase
4. **Comenzar con Fase 1** (Componentes Atómicos)
5. **Iterar** y ajustar según feedback

---

## 📚 Referencias

- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [DRY Principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
- [React Composition](https://reactjs.org/docs/composition-vs-inheritance.html)
- [Component-Driven Development](https://www.componentdriven.org/)
