# Arquitectura del Módulo ToDoDynamic

## 📊 Estructura Completa

```
src/modules/header/components/ui/ToDoDynamic/
│
├── 📁 types/                          # Definiciones de tipos TypeScript
│   ├── index.ts                       # Exportaciones centralizadas
│   ├── todo.types.ts                  # Tipos de entidad Todo
│   ├── dropdown.types.ts              # Tipos de dropdown
│   └── component.types.ts             # Props de componentes
│
├── 📁 constants/                      # Constantes centralizadas
│   ├── index.ts                       # Exportaciones
│   ├── validation.constants.ts        # Mensajes y límites de validación
│   ├── animation.constants.ts         # Configuraciones Framer Motion
│   └── ui.constants.ts                # Textos, labels y config UI
│
├── 📁 hooks/                          # Hooks personalizados (lógica)
│   ├── index.ts                       # Exportaciones
│   ├── useTodos.ts                    # CRUD + Firestore (302 líneas)
│   ├── useToDoDropdownState.ts        # Estado dropdown con Zustand
│   ├── useToDoInput.ts                # Estado input + validación
│   └── useTodoFiltering.ts            # Estadísticas y filtrado
│
├── 📁 stores/                         # Zustand stores
│   ├── index.ts                       # Exportaciones
│   └── todoDropdownStore.ts           # Estado persistente dropdown
│
├── 📁 components/                     # Componentes UI
│   ├── index.ts                       # Exportaciones
│   ├── ToDoDropdown.tsx               # Dropdown principal (672 líneas)
│   └── ToDoDynamicButton.tsx          # Botón disparador
│
├── 📁 utils/                          # Funciones utilitarias
│   ├── index.ts                       # Exportaciones
│   ├── todoValidation.ts              # Validación de texto
│   └── dateUtils.ts                   # Operaciones con fechas
│
├── 📄 ToDoDynamic.tsx                 # Componente principal (143 líneas)
├── 📄 ToDoDynamic.module.scss         # Estilos del módulo
├── 📄 index.ts                        # API pública del módulo
├── 📄 README.md                       # Documentación general
└── 📄 ARCHITECTURE.md                 # Este archivo
```

## 🎯 Principios de Arquitectura

### 1. DRY (Don't Repeat Yourself)
- ✅ **Constantes centralizadas**: Todos los valores configurables en `/constants`
- ✅ **Tipos compartidos**: Definiciones únicas en `/types`
- ✅ **Utilidades reutilizables**: Funciones puras en `/utils`
- ✅ **Hooks consolidados**: Lógica compartida en `/hooks`

### 2. SOLID

#### Single Responsibility
```
Componentes → Solo UI rendering
Hooks → Solo lógica de estado
Stores → Solo persistencia
Utils → Solo funciones puras
Constants → Solo valores
```

#### Open/Closed
- Fácil de extender sin modificar código existente
- Nuevas validaciones se agregan en `validation.constants.ts`
- Nuevas animaciones en `animation.constants.ts`

#### Liskov Substitution
- Componentes intercambiables
- Props consistentes entre componentes

#### Interface Segregation
- Props específicas y mínimas
- Cada componente solo recibe lo que necesita

#### Dependency Inversion
- Inyección de dependencias a través de props/hooks
- No hay acoplamiento fuerte

### 3. Single Responsibility

| Archivo | Responsabilidad |
|---------|-----------------|
| `useTodos.ts` | Gestión CRUD con Firestore |
| `useToDoDropdownState.ts` | Estado del dropdown |
| `useToDoInput.ts` | Estado del input + validación |
| `useTodoFiltering.ts` | Cálculos y estadísticas |
| `ToDoDropdown.tsx` | Renderizar dropdown |
| `ToDoDynamicButton.tsx` | Renderizar botón |
| `todoDropdownStore.ts` | Persistencia de estado |
| `todoValidation.ts` | Validación de texto |
| `dateUtils.ts` | Operaciones con fechas |

## 📦 Dependencias Entre Módulos

```
ToDoDynamic.tsx (Main)
├── useTodos() ─────────────────────┐
│   └── Firestore                   │
├── useToDoDropdownState() ─────────┤
│   └── todoDropdownStore           │
├── useToDoInput() ─────────────────┤
│   └── TODO_VALIDATION             │
├── useTodoFiltering() ─────────────┤
│   └── Todo[]                      │
├── ToDoDropdown ───────────────────┤
│   ├── useTodos()                  │
│   ├── useToDoDropdownState()      │
│   ├── useToDoInput()              │
│   ├── TODO_ANIMATIONS             │
│   ├── TODO_UI                     │
│   └── ToDoDropdown.module.scss    │
└── ToDoDynamicButton ──────────────┤
    ├── useTodoFiltering()          │
    ├── TODO_ANIMATIONS             │
    └── ToDoDynamic.module.scss     │
```

## 🔄 Flujo de Datos

```
┌─────────────────────────────────────────────────────────┐
│                    ToDoDynamic                          │
│                   (Main Component)                      │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   useTodos()  useToDoDropdownState()  useToDoInput()
   (Firestore)  (Zustand Store)        (Local State)
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
   ToDoDropdown              ToDoDynamicButton
   (Dropdown UI)             (Button UI)
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
            useTodoFiltering()
            (Statistics)
```

## 🎨 Patrones Utilizados

### 1. Custom Hooks Pattern
```typescript
// Separación de lógica de UI
const { todos, addTodo } = useTodos();
const { isOpen, setIsOpen } = useToDoDropdownState();
const { newTodoText, setNewTodoText } = useToDoInput();
```

### 2. Zustand Store Pattern
```typescript
// Estado persistente y global
export const useToDoDropdownStore = create<ToDoDropdownState>((set) => ({
  isVisible: false,
  isOpen: false,
  // ...
}));
```

### 3. Constants Pattern
```typescript
// Valores centralizados
export const TODO_VALIDATION = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 100,
  // ...
};
```

### 4. Utility Functions Pattern
```typescript
// Funciones puras reutilizables
export const validateTodoText = (text: string): string | null => {
  // Validación
};
```

## 📈 Métricas

| Métrica | Valor |
|---------|-------|
| Archivos creados | 25 |
| Líneas de código | ~2,000+ |
| Componentes | 2 |
| Hooks | 4 |
| Stores | 1 |
| Tipos | 5 |
| Constantes | 3 |
| Utilidades | 5 |
| Documentación | 2 archivos |

## 🚀 Próximos Pasos

### Fase 2: Migración de Código
1. Mover `ToDoDropdown.tsx` desde `/src/components/ui/`
2. Mover `useTodos.ts` desde `/src/hooks/`
3. Mover `todoDropdownStore.ts` desde `/src/stores/`
4. Actualizar imports en toda la aplicación

### Fase 3: Refactorización Adicional
1. Considerar mover `SimpleTooltip` a módulo compartido
2. Optimizar performance con memoización
3. Agregar tests unitarios
4. Documentar casos de uso avanzados

## 📝 Notas Importantes

- ✅ Todos los archivos están listos para recibir código
- ✅ Estructura sigue patrones de arquitectura limpia
- ✅ Tipado completo con TypeScript
- ✅ Documentación completa
- ⏳ Pendiente: Mover código de archivos legacy
- ⏳ Pendiente: Actualizar imports en toda la app

## 🔗 Referencias

- **DRY**: Don't Repeat Yourself
- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **SRP**: Single Responsibility Principle
- **Zustand**: State management library
- **Framer Motion**: Animation library
- **Firestore**: Database
