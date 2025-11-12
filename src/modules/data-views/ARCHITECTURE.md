# Tasks Module - Modular Architecture

## 📁 Directory Structure

```
src/modules/tasks/
├── components/
│   ├── modals/
│   │   └── TasksPageModals.tsx
│   │
│   ├── shared/                          # 🆕 Shared components across all views
│   │   ├── cells/                       # Cell renderers for tables
│   │   │   ├── StatusCell.tsx          # Status badge component
│   │   │   ├── PriorityCell.tsx        # Priority indicator
│   │   │   ├── ClientCell.tsx          # Client display
│   │   │   ├── DateCell.tsx            # Date formatting
│   │   │   ├── UserCell.tsx            # User avatar/name
│   │   │   ├── ActionCell.tsx          # Action buttons
│   │   │   └── index.ts
│   │   │
│   │   ├── table/                       # Generic table components
│   │   │   ├── TableHeader.tsx         # Reusable table header
│   │   │   ├── TableRow.tsx            # Generic row wrapper
│   │   │   ├── TableEmptyState.tsx     # Empty state display
│   │   │   ├── TableLoadingState.tsx   # Loading skeleton
│   │   │   └── index.ts
│   │   │
│   │   └── filters/                     # Filter components
│   │       ├── StatusFilter.tsx        # Status dropdown
│   │       ├── PriorityFilter.tsx      # Priority dropdown
│   │       ├── ClientFilter.tsx        # Client selector
│   │       ├── UserFilter.tsx          # User selector
│   │       ├── SearchInput.tsx         # Search input
│   │       ├── FilterBar.tsx           # Filter bar container
│   │       └── index.ts
│   │
│   ├── tables/
│   │   ├── TasksTable/                  # Main tasks table
│   │   │   ├── TasksTable.tsx          # Main entry (orchestrator)
│   │   │   ├── components/              # 🆕 TasksTable specific components
│   │   │   │   ├── TasksTableContainer.tsx  # Container with state
│   │   │   │   ├── TasksTableHeader.tsx     # Header with filters
│   │   │   │   ├── TasksTableContent.tsx    # Table content renderer
│   │   │   │   ├── TasksTableRow.tsx        # Row component
│   │   │   │   └── index.ts
│   │   │   ├── columns/
│   │   │   │   └── taskColumns.tsx     # Column definitions
│   │   │   ├── hooks/
│   │   │   │   ├── useTaskFilters.ts
│   │   │   │   ├── useTasksTableHandlers.ts
│   │   │   │   └── useTasksTableState.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ArchiveTable/                # Archive tasks table
│   │   │   ├── ArchiveTable.tsx        # Main entry (orchestrator)
│   │   │   ├── components/              # 🆕 ArchiveTable specific components
│   │   │   │   ├── ArchiveTableContainer.tsx
│   │   │   │   ├── ArchiveTableHeader.tsx
│   │   │   │   ├── ArchiveTableContent.tsx
│   │   │   │   ├── ArchiveTableRow.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── KanbanBoard/                 # Kanban view (different UI)
│   │   │   ├── TasksKanban.tsx         # Main entry (orchestrator)
│   │   │   ├── components/              # 🆕 Kanban specific components
│   │   │   │   ├── KanbanTaskCard.tsx  # Individual task card
│   │   │   │   ├── KanbanColumn.tsx    # Column component
│   │   │   │   ├── KanbanColumnHeader.tsx # Column header
│   │   │   │   ├── KanbanDropZone.tsx  # Drop zone indicator
│   │   │   │   └── index.ts
│   │   │   ├── hooks/                   # 🆕 Kanban specific hooks
│   │   │   │   ├── useKanbanDragDrop.ts    # Drag & drop logic
│   │   │   │   ├── useKanbanGrouping.ts    # Task grouping
│   │   │   │   ├── useKanbanFiltering.ts   # Filter logic
│   │   │   │   ├── useKanbanAnimations.ts  # Animations
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── TasksTableIsolated.tsx
│   │   └── index.ts
│   │
│   └── ui/
│       ├── ActionMenu.tsx
│       ├── KanbanHeader.tsx             # To be refactored
│       └── index.ts
│
├── hooks/
│   ├── table/                           # 🆕 Shared table hooks
│   │   ├── useTableSorting.ts          # Generic sorting logic
│   │   ├── useTableFiltering.ts        # Generic filtering logic
│   │   ├── useTableSelection.ts        # Selection management
│   │   ├── useDropdownManager.ts       # Dropdown state manager
│   │   ├── useKeyboardShortcuts.ts     # Keyboard handlers
│   │   └── index.ts
│   │
│   ├── useTaskArchiving.ts             # Archive functionality
│   ├── useTasksCommon.ts               # Common task operations
│   └── index.ts
│
├── stores/
│   ├── tasksTableStore.ts
│   ├── tasksTableActionsStore.ts
│   ├── archiveTableStore.ts
│   └── index.ts
│
├── utils/                               # 🆕 Shared utility functions
│   ├── statusUtils.ts                  # Status normalization
│   ├── sortingUtils.ts                 # Sorting helpers
│   ├── keyboardUtils.ts                # Keyboard event handlers
│   ├── animationUtils.ts               # GSAP animations
│   ├── dropdownUtils.ts                # Dropdown utilities
│   └── index.ts
│
├── constants/                           # 🆕 Shared constants
│   ├── statusConstants.ts              # Status mappings
│   ├── priorityConstants.ts            # Priority orders
│   ├── sortingConstants.ts             # Sort configurations
│   └── index.ts
│
├── ARCHITECTURE.md                      # This file
└── index.ts

```

## 🎯 Architecture Principles

### 1. Separation of Concerns

**Tables (TasksTable, ArchiveTable):**
- Share the same table UI structure
- Reuse cell components, filters, and table utilities
- Have specific variations in displayed columns

**Kanban (TasksKanban):**
- Different UI paradigm (board vs table)
- Reuses the same data hooks and stores
- Has its own specific components and drag-drop logic

### 2. Component Hierarchy

```
Main Component (Orchestrator)
├── Container (State management)
│   ├── Header (Filters, actions)
│   └── Content (Data rendering)
│       └── Row/Card (Individual items)
│           └── Cells (Atomic components)
```

### 3. Shared vs Specific

**Shared Across All Views:**
- `utils/` - Pure functions (status normalization, sorting, keyboard)
- `constants/` - Static data (mappings, configurations)
- `hooks/table/` - Generic table operations
- `components/shared/cells/` - Cell renderers (Status, Priority, etc.)
- `components/shared/filters/` - Filter controls

**Specific to Tables:**
- `components/shared/table/` - Table-specific UI components
- `hooks/table/useTableSorting` - Table sorting logic

**Specific to Kanban:**
- `components/tables/KanbanBoard/components/` - Card, Column, DropZone
- `components/tables/KanbanBoard/hooks/` - Drag-drop, grouping

## 📊 Data Flow

```
Zustand Stores (tasksTableStore, archiveTableStore)
        ↓
Common Hooks (useTasksCommon, useTaskArchiving)
        ↓
Table Hooks (useTableSorting, useTableFiltering)
        ↓
View Components (TasksTable, ArchiveTable, TasksKanban)
        ↓
Specific Components (Container → Header → Content → Row/Card)
        ↓
Shared Components (Cells, Filters)
```

## 🔄 Migration Strategy

### Phase 1: Extract Shared Utilities
1. Create `utils/statusUtils.ts` - Extract status normalization
2. Create `utils/sortingUtils.ts` - Extract sorting logic
3. Create `utils/keyboardUtils.ts` - Extract keyboard handlers
4. Create `constants/` - Extract static mappings

### Phase 2: Create Shared Components
1. Create `components/shared/cells/` - Extract cell renderers
2. Create `components/shared/filters/` - Extract filter controls
3. Create `components/shared/table/` - Extract table UI components

### Phase 3: Refactor Tables
1. Split `TasksTable.tsx` into Container, Header, Content, Row
2. Split `ArchiveTable.tsx` using same pattern
3. Update imports to use shared components

### Phase 4: Refactor Kanban
1. Extract `KanbanTaskCard` from inline SortableItem
2. Create `KanbanColumn` component
3. Extract drag-drop logic to `useKanbanDragDrop`
4. Extract grouping logic to `useKanbanGrouping`

## 🎨 Component Responsibilities

### Main Components (TasksTable.tsx, ArchiveTable.tsx, TasksKanban.tsx)
- **Role**: Orchestrator/Entry point
- **Responsibilities**:
  - Import and compose sub-components
  - Export final component
- **Size**: < 50 lines

### Container Components
- **Role**: State management and business logic
- **Responsibilities**:
  - Connect to Zustand stores
  - Handle data fetching
  - Manage local state
  - Pass props to children
- **Size**: 200-300 lines

### Header Components
- **Role**: Filters and actions bar
- **Responsibilities**:
  - Render filter controls
  - Handle filter changes
  - Display action buttons
- **Size**: 200-250 lines

### Content Components
- **Role**: Data rendering
- **Responsibilities**:
  - Map data to rows/cards
  - Handle sorting display
  - Render empty/loading states
- **Size**: 150-200 lines

### Row/Card Components
- **Role**: Individual item display
- **Responsibilities**:
  - Render single task
  - Compose cell components
  - Handle row-specific interactions
- **Size**: 100-150 lines

### Cell Components (Shared)
- **Role**: Atomic data display
- **Responsibilities**:
  - Render specific data type
  - Apply consistent styling
  - Handle cell-specific interactions
- **Size**: 50-100 lines each

## 🔧 Utility Functions

### statusUtils.ts
```typescript
- normalizeStatus(status: string): string
- getStatusColor(status: string): string
- getStatusIcon(status: string): ReactNode
```

### sortingUtils.ts
```typescript
- createSortComparator(column: string, direction: 'asc' | 'desc')
- sortByStatus(tasks: Task[]): Task[]
- sortByPriority(tasks: Task[]): Task[]
- sortByDate(tasks: Task[], field: string): Task[]
```

### keyboardUtils.ts
```typescript
- handleCopy(e: KeyboardEvent, selectedTasks: Task[]): void
- handlePaste(e: KeyboardEvent): void
- handleSelectAll(e: KeyboardEvent): void
- isModifierKey(e: KeyboardEvent): boolean
```

### animationUtils.ts
```typescript
- animateClick(element: HTMLElement): void
- animateDropdownOpen(element: HTMLElement): void
- animateRowDelete(element: HTMLElement): Promise<void>
- animateCardMove(from: Position, to: Position): Promise<void>
```

## 📦 Import Patterns

```typescript
// ❌ Bad - Long relative paths
import { normalizeStatus } from '../../../utils/statusUtils';

// ✅ Good - Use index.ts barrel exports
import { normalizeStatus } from '@/modules/tasks/utils';

// ✅ Good - Shared components
import { StatusCell, PriorityCell } from '@/modules/tasks/components/shared/cells';

// ✅ Good - Table hooks
import { useTableSorting, useTableFiltering } from '@/modules/tasks/hooks/table';
```

## 🚀 Performance Considerations

1. **Code Splitting**: Each table view can be lazy-loaded
2. **Memoization**: Use React.memo for cell components
3. **Virtual Scrolling**: Consider for large datasets
4. **Optimized Selectors**: Use Zustand's useShallow for multiple values
5. **Shared Chunks**: Common utilities bundled together

## 📝 Naming Conventions

- **Components**: PascalCase (e.g., `TasksTableHeader`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useTableSorting`)
- **Utils**: camelCase (e.g., `normalizeStatus`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STATUS_COLORS`)
- **Types**: PascalCase with 'Type' suffix if needed

## 🎯 Benefits of This Architecture

1. **Reduced File Size**: Main files from 1,400+ lines → 200-300 lines
2. **Code Reusability**: Shared components and utilities
3. **Better Testing**: Small, focused units
4. **Easier Maintenance**: Clear responsibilities
5. **Performance**: Better code splitting and lazy loading
6. **Developer Experience**: Easier to find and modify code
7. **Consistency**: Shared components ensure UI consistency
