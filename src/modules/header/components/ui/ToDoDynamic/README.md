# ToDoDynamic Module

Submódulo completo para la gestión de tareas personales (To-Do list) del usuario.

## 📁 Estructura

```
ToDoDynamic/
├── components/           # Componentes UI
│   ├── ToDoDropdown.tsx          # Dropdown principal
│   ├── ToDoDynamicButton.tsx     # Botón disparador
│   └── index.ts
├── constants/            # Constantes centralizadas
│   ├── validation.constants.ts   # Reglas de validación
│   ├── animation.constants.ts    # Configuraciones de animación
│   ├── ui.constants.ts           # Constantes de UI
│   └── index.ts
├── hooks/                # Hooks personalizados
│   ├── useTodos.ts               # Gestión de datos de todos
│   ├── useToDoDropdownState.ts   # Estado del dropdown
│   ├── useToDoInput.ts           # Estado del input
│   ├── useTodoFiltering.ts       # Lógica de filtrado
│   └── index.ts
├── stores/               # Zustand stores
│   ├── todoDropdownStore.ts      # Estado persistente del dropdown
│   └── index.ts
├── types/                # Definiciones de tipos
│   ├── todo.types.ts             # Tipos de entidades Todo
│   ├── dropdown.types.ts         # Tipos de dropdown
│   ├── component.types.ts        # Props de componentes
│   └── index.ts
├── utils/                # Funciones utilitarias
│   ├── todoValidation.ts         # Validación de todos
│   ├── dateUtils.ts              # Utilidades de fechas
│   └── index.ts
├── ToDoDynamic.tsx       # Componente principal
├── ToDoDynamic.module.scss
├── index.ts              # Exportaciones públicas
└── README.md             # Este archivo
```

## 🎯 Responsabilidades

### Components
- **ToDoDropdown**: Renderiza el dropdown con la lista de todos
- **ToDoDynamicButton**: Botón que dispara la apertura del dropdown

### Hooks
- **useTodos**: Gestión completa de datos (CRUD) con Firestore
- **useToDoDropdownState**: Manejo del estado del dropdown
- **useToDoInput**: Gestión del estado del input y validación
- **useTodoFiltering**: Cálculo de estadísticas y filtrado

### Stores
- **todoDropdownStore**: Estado persistente con Zustand

### Utils
- **todoValidation**: Validación de texto de todos
- **dateUtils**: Operaciones con fechas

### Constants
- **validation.constants**: Mensajes y límites de validación
- **animation.constants**: Configuraciones de Framer Motion
- **ui.constants**: Textos, labels y configuración de UI

## 📦 Exportaciones Públicas

```typescript
// Componentes
export { default as ToDoDynamic } from './ToDoDynamic';

// Hooks
export { useTodos } from './hooks';
export { useToDoDropdownState } from './hooks';
export { useToDoInput } from './hooks';
export { useTodoFiltering } from './hooks';

// Stores
export { useToDoDropdownStore } from './stores';

// Types
export type { Todo, TodoState } from './types';
export type { ToDoDropdownState, DropdownPosition } from './types';
export type { ToDoDropdownProps } from './types';

// Constants
export { TODO_VALIDATION } from './constants';
export { TODO_ANIMATIONS } from './constants';
export { TODO_UI } from './constants';

// Utils
export { validateTodoText, isValidTodoText } from './utils';
export { getTodayDate, isToday, formatDate } from './utils';
```

## 🔄 Flujo de Datos

```
ToDoDynamic (Main Component)
├── useTodos() → Firestore data
├── useToDoDropdownState() → Zustand store
├── useToDoInput() → Input state
└── useTodoFiltering() → Statistics

Components
├── ToDoDynamicButton
│   └── onClick → setIsOpen(true)
└── ToDoDropdown
    ├── Usa todos de useTodos()
    ├── Usa estado de useToDoDropdownState()
    └── Usa input de useToDoInput()
```

## 🎨 Principios de Arquitectura

### DRY (Don't Repeat Yourself)
- Constantes centralizadas en `/constants`
- Tipos compartidos en `/types`
- Utilidades reutilizables en `/utils`

### SOLID
- **Single Responsibility**: Cada hook/componente tiene una responsabilidad
- **Open/Closed**: Fácil de extender sin modificar código existente
- **Liskov Substitution**: Componentes intercambiables
- **Interface Segregation**: Props específicas y mínimas
- **Dependency Inversion**: Inyección de dependencias a través de props/hooks

### Single Responsibility
- Componentes: Solo UI rendering
- Hooks: Solo lógica de estado
- Stores: Solo persistencia de estado
- Utils: Solo funciones puras
- Constants: Solo valores configurables

## 🚀 Uso

### Importar el componente principal
```typescript
import { ToDoDynamic } from '@/modules/header';

export default function Header() {
  return <ToDoDynamic />;
}
```

### Usar hooks individuales
```typescript
import { useTodos, useToDoInput } from '@/modules/header';

function MyComponent() {
  const { todos, addTodo } = useTodos();
  const { newTodoText, setNewTodoText } = useToDoInput();
  
  return (
    // Tu componente
  );
}
```

## 📝 Notas de Implementación

- Todos los componentes usan `'use client'` (Client Components)
- Animaciones con Framer Motion
- Estado global con Zustand
- Datos persistentes en Firestore
- Validación centralizada
- Tipado completo con TypeScript

## 🔄 Próximos Pasos

1. Mover `ToDoDropdown.tsx` desde `/src/components/ui/`
2. Mover `useTodos.ts` desde `/src/hooks/`
3. Mover `todoDropdownStore.ts` desde `/src/stores/`
4. Actualizar imports en toda la aplicación
5. Considerar mover `SimpleTooltip` a módulo compartido
