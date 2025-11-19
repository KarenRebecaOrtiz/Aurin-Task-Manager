# Header Module

Módulo del header principal de la aplicación con navegación, información del usuario y componentes auxiliares.

## Estructura

```
src/modules/header/
├── components/
│   ├── Header/                    # Componente principal del header
│   │   ├── Header.tsx
│   │   ├── Header.module.scss
│   │   └── index.ts
│   ├── ui/                        # Componentes UI específicos del header
│   │   ├── AdviceInput/
│   │   │   ├── AdviceInput.tsx
│   │   │   ├── AdviceInput.module.scss
│   │   │   └── index.ts
│   │   ├── AvailabilityToggle/
│   │   │   ├── AvailabilityToggle.tsx
│   │   │   ├── AvailabilityToggle.module.scss
│   │   │   └── index.ts
│   │   ├── GeoClock/
│   │   │   ├── GeoClock.tsx
│   │   │   ├── GeoClock.module.scss
│   │   │   └── index.ts
│   │   ├── TextShimmer/
│   │   │   ├── TextShimmer.tsx
│   │   │   ├── TextShimmer.module.scss
│   │   │   └── index.ts
│   │   ├── AvatarDropdown/
│   │   │   ├── AvatarDropdown.tsx
│   │   │   ├── AvatarDropdown.module.scss
│   │   │   ├── animations.ts              # ✅ Animaciones centralizadas (Framer Motion)
│   │   │   ├── index.ts
│   │   │   └── README.md                  # ✅ Documentación del submódulo
│   │   └── ToDoDynamic/
│   │       ├── ToDoDynamic.tsx
│   │       ├── ToDoDynamic.module.scss
│   │       └── index.ts
├── hooks/                         # Custom hooks
│   ├── useHeaderAnimations.ts     # Animaciones GSAP del header
│   ├── useHeaderNavigation.ts     # Lógica de navegación y cambio de container
│   ├── useLogoInteractions.ts     # Interacciones del logo
│   └── useSubtitleContent.ts      # Lógica para obtener subtítulos dinámicos
├── stores/                        # Zustand stores
│   └── headerStore.ts             # Estado global del header
├── types/                         # TypeScript types
│   ├── header.types.ts            # Tipos del header principal
│   ├── navigation.types.ts        # Tipos de navegación
│   └── ui.types.ts                # Tipos de componentes UI
├── utils/                         # Utilidades
│   ├── subtitleHelpers.ts         # Helpers para subtítulos
│   └── navigationHelpers.ts       # Helpers para navegación
├── constants/                     # Constantes
│   └── subtitles.ts               # Textos de subtítulos por container
└── index.ts                       # Exportaciones públicas del módulo
```

## Propósito

Este módulo maneja toda la funcionalidad relacionada con el header principal de la aplicación:

- **Navegación**: Cambio entre containers (tareas, cuentas, miembros, config)
- **Información del Usuario**: Bienvenida personalizada, badge de admin
- **Componentes Auxiliares**: Reloj geográfico, toggle de disponibilidad, input de consejos
- **Animaciones**: Animaciones GSAP para el logo y elementos del header
- **Estado Global**: Gestión del estado del header con Zustand

## Componentes Principales

### Header
Componente principal que orquesta todo el header de la aplicación.

**Props:**
```typescript
interface HeaderProps {
  selectedContainer: 'tareas' | 'cuentas' | 'miembros' | 'config';
  isArchiveTableOpen?: boolean;
  onChangeContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void;
  isCreateTaskOpen?: boolean;
  isEditTaskOpen?: boolean;
  hasUnsavedChanges?: boolean;
  personalLocations?: {
    home?: { name: string; address: string; lat: number; lng: number; radius: number };
    secondary?: { name: string; address: string; lat: number; lng: number; radius: number };
  };
}
```

**Responsabilidades:**
- Renderizar el logo y la información de bienvenida
- Manejar la navegación entre containers
- Verificar cambios no guardados antes de cambiar de container
- Renderizar componentes auxiliares (GeoClock, ToDoDynamic, AvailabilityToggle, etc.)

### Componentes UI

#### AdviceInput
Input para que los administradores ingresen consejos o avisos.

**Props:**
```typescript
interface AdviceInputProps {
  isAdmin: boolean;
}
```

#### AvailabilityToggle
Toggle para cambiar el estado de disponibilidad del usuario.

#### GeoClock
Reloj con información geográfica y clima basado en ubicaciones personales.

**Props:**
```typescript
interface GeoClockProps {
  personalLocations?: {
    home?: { name: string; address: string; lat: number; lng: number; radius: number };
    secondary?: { name: string; address: string; lat: number; lng: number; radius: number };
  };
}
```

#### TextShimmer
Componente de texto con efecto shimmer/brillo animado.

**Props:**
```typescript
interface TextShimmerProps {
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
}
```

#### AvatarDropdown
Dropdown del avatar del usuario con opciones de navegación.

**Props:**
```typescript
interface AvatarDropdownProps {
  onChangeContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void;
}
```

#### ToDoDynamic
Componente para mostrar y gestionar tareas pendientes.

## Hooks Personalizados

### useHeaderAnimations
Maneja las animaciones GSAP del header:
- Animación de entrada del logo
- Animación del icono sol/luna
- Animaciones de hover

```typescript
const useHeaderAnimations = (iconRef: RefObject<HTMLDivElement>) => {
  // Lógica de animaciones
};
```

### useHeaderNavigation
Maneja la lógica de navegación entre containers:
- Verificación de cambios no guardados
- Apertura de popup de confirmación
- Cambio de container

```typescript
const useHeaderNavigation = (
  onChangeContainer: (container: ContainerType) => void,
  isCreateTaskOpen: boolean,
  isEditTaskOpen: boolean,
  hasUnsavedChanges: boolean
) => {
  // Lógica de navegación
};
```

### useLogoInteractions
Maneja las interacciones del logo:
- Click para volver a tareas
- Hover effects
- Transiciones de filtro

```typescript
const useLogoInteractions = (
  isDarkMode: boolean,
  handleContainerChange: (container: ContainerType) => void
) => {
  // Lógica de interacciones
};
```

### useSubtitleContent
Obtiene el subtítulo dinámico basado en el container actual:

```typescript
const useSubtitleContent = (
  selectedContainer: ContainerType,
  isArchiveTableOpen: boolean
) => {
  // Lógica para obtener subtítulo
};
```

## Stores

### headerStore
Estado global del header:

```typescript
interface HeaderStore {
  // Estado
  isLogoAnimating: boolean;
  currentContainer: ContainerType;
  
  // Acciones
  setLogoAnimating: (isAnimating: boolean) => void;
  setCurrentContainer: (container: ContainerType) => void;
}
```

## Types

### header.types.ts
```typescript
export type ContainerType = 'tareas' | 'cuentas' | 'miembros' | 'config';

export interface PersonalLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface PersonalLocations {
  home?: PersonalLocation;
  secondary?: PersonalLocation;
}

export interface HeaderProps {
  selectedContainer: ContainerType;
  isArchiveTableOpen?: boolean;
  onChangeContainer: (container: ContainerType) => void;
  isCreateTaskOpen?: boolean;
  isEditTaskOpen?: boolean;
  hasUnsavedChanges?: boolean;
  personalLocations?: PersonalLocations;
}
```

### navigation.types.ts
```typescript
export interface NavigationOptions {
  checkUnsavedChanges: boolean;
  showConfirmation: boolean;
}

export interface ContainerChangeEvent {
  from: ContainerType;
  to: ContainerType;
  timestamp: number;
}
```

## Utils

### subtitleHelpers.ts
```typescript
export const getSubtitleByContainer = (
  container: ContainerType,
  isArchiveOpen: boolean
): string => {
  // Lógica para obtener subtítulo
};
```

### navigationHelpers.ts
```typescript
export const canNavigate = (
  hasUnsavedChanges: boolean,
  isModalOpen: boolean
): boolean => {
  // Lógica para verificar si se puede navegar
};
```

## Constants

### subtitles.ts
```typescript
export const SUBTITLES: Record<ContainerType, string> = {
  tareas: 'Esta es una lista de tus tareas actuales',
  cuentas: 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización',
  miembros: 'Aquí puedes consultar y gestionar todos los miembros de tu organización',
  config: 'Configura tus preferencias y ajustes personales',
};

export const ARCHIVE_SUBTITLE = 'Aquí puedes ver y gestionar todas las tareas archivadas';
```

## Dependencias

### Externas
- `@clerk/nextjs` - Autenticación y usuario
- `gsap` - Animaciones
- `framer-motion` - Animaciones de componentes
- `next/image` - Optimización de imágenes
- `zustand` - State management

### Internas
- `@/contexts/AuthContext` - Contexto de autenticación
- `@/contexts/ThemeContext` - Contexto de tema
- `@/stores/tasksPageStore` - Store de la página de tareas

## Plan de Migración

### Fase 1: Preparación y Types ✅
1. ✅ Crear estructura de carpetas
2. ✅ Crear README.md
3. ⏳ Definir todos los tipos en `/types`
4. ⏳ Crear constantes en `/constants`

### Fase 2: Utilidades y Helpers
1. Crear `subtitleHelpers.ts`
2. Crear `navigationHelpers.ts`
3. Agregar tests unitarios

### Fase 3: Stores
1. Crear `headerStore.ts` con Zustand
2. Migrar estado local a store global
3. Agregar persistencia si es necesario

### Fase 4: Hooks Personalizados
1. Extraer `useHeaderAnimations`
2. Extraer `useHeaderNavigation`
3. Extraer `useLogoInteractions`
4. Extraer `useSubtitleContent`
5. Agregar tests para hooks

### Fase 5: Componentes UI
1. Migrar `AdviceInput` desde `/src/components/ui`
2. Migrar `AvailabilityToggle` desde `/src/components/ui`
3. Migrar `GeoClock` desde `/src/components/ui`
4. Migrar `TextShimmer` desde `/src/components/ui`
5. Migrar `AvatarDropdown` desde `/src/components`
6. Migrar `ToDoDynamic` desde `/src/components`
7. Migrar todos los archivos `.module.scss` correspondientes

### Fase 6: Componente Principal
1. Migrar `Header.tsx` a `/src/modules/header/components/Header`
2. Migrar `Header.module.scss`
3. Refactorizar para usar hooks personalizados
4. Refactorizar para usar store
5. Actualizar imports

### Fase 7: Actualización de Imports
1. Actualizar imports en `/src/app/dashboard/tasks/page.tsx`
2. Actualizar imports en otros archivos que usen Header
3. Crear archivo `index.ts` con exportaciones públicas

### Fase 8: Testing y Validación
1. Verificar que todas las funcionalidades funcionen
2. Verificar animaciones GSAP
3. Verificar navegación y cambios no guardados
4. Verificar responsive design
5. Verificar modo oscuro

### Fase 9: Limpieza
1. Eliminar archivos antiguos de `/src/components/ui`
2. Eliminar archivos antiguos de `/src/components`
3. Actualizar documentación
4. Crear PR con cambios

## Notas de Implementación

### Principios SOLID

1. **Single Responsibility Principle (SRP)**
   - Cada componente tiene una única responsabilidad
   - Los hooks manejan lógica específica
   - Los utils son funciones puras

2. **Open/Closed Principle (OCP)**
   - Los componentes son extensibles mediante props
   - Los hooks son reutilizables en diferentes contextos

3. **Liskov Substitution Principle (LSP)**
   - Los componentes pueden ser reemplazados por versiones mejoradas
   - Las interfaces son consistentes

4. **Interface Segregation Principle (ISP)**
   - Props específicas para cada componente
   - No se fuerzan props innecesarias

5. **Dependency Inversion Principle (DIP)**
   - Dependencias inyectadas mediante props
   - Uso de contextos para dependencias globales

### Principio DRY

- Lógica compartida en hooks personalizados
- Utilidades reutilizables en `/utils`
- Constantes centralizadas en `/constants`
- Tipos compartidos en `/types`

### Mejores Prácticas

- ✅ TypeScript estricto
- ✅ Componentes pequeños y enfocados
- ✅ Props bien documentadas
- ✅ Separación de lógica y presentación
- ✅ Hooks para lógica reutilizable
- ✅ Store para estado global
- ✅ Constantes para valores fijos
- ✅ Utils para funciones puras

## Estado Actual

🚧 **En Preparación - 10% Completado**

### ✅ Completado
- ✅ Estructura de carpetas creada
- ✅ README.md documentado

### ⏳ Pendiente
- ⏳ Definición de tipos
- ⏳ Creación de constantes
- ⏳ Implementación de utilidades
- ⏳ Creación de stores
- ⏳ Extracción de hooks
- ⏳ Migración de componentes UI
- ⏳ Migración del componente principal
- ⏳ Actualización de imports
- ⏳ Testing y validación

## Archivos a Migrar

### Desde `/src/components/ui/`
- `Header.tsx` → `/src/modules/header/components/Header/Header.tsx`
- `Header.module.scss` → `/src/modules/header/components/Header/Header.module.scss`
- `AdviceInput.tsx` → `/src/modules/header/components/ui/AdviceInput/AdviceInput.tsx`
- `AvailabilityToggle.tsx` → `/src/modules/header/components/ui/AvailabilityToggle/AvailabilityToggle.tsx`
- `GeoClock.tsx` → `/src/modules/header/components/ui/GeoClock/GeoClock.tsx`
- `TextShimmer.tsx` → `/src/modules/header/components/ui/TextShimmer/TextShimmer.tsx`

### Desde `/src/components/`
- `AvatarDropdown.tsx` → `/src/modules/header/components/ui/AvatarDropdown/AvatarDropdown.tsx`
- `ToDoDynamic.tsx` → `/src/modules/header/components/ui/ToDoDynamic/ToDoDynamic.tsx`

## Dependencias entre Componentes

```
Header (Principal)
├── Logo (interno)
├── Welcome Section (interno)
│   ├── TextShimmer
│   └── Admin Badge (interno)
├── GeoClock
├── ToDoDynamic
├── AvailabilityToggle
├── AvatarDropdown
└── AdviceInput
```

## Próximos Pasos

1. **Revisar el componente Header.tsx completo**
2. **Analizar todas las dependencias y relaciones**
3. **Identificar lógica que puede extraerse a hooks**
4. **Identificar estado que puede moverse a store**
5. **Crear plan detallado de refactorización**
6. **Comenzar con la implementación fase por fase**
