# Loader Module

Módulo de carga con animación de faro (lighthouse) siguiendo arquitectura atómica.

## Estructura

```
loader/
├── components/
│   ├── atoms/              # Componentes atómicos
│   │   ├── LighthouseScene.tsx
│   │   ├── LighthouseScene.module.scss
│   │   └── index.ts
│   ├── organisms/          # Componentes organismos
│   │   ├── Loader.tsx
│   │   └── index.ts
│   └── index.ts
├── config/                 # Configuración y tipos
│   ├── index.ts
│   └── types.ts
├── styles/                 # Estilos globales del módulo
│   └── Loader.module.scss
├── index.ts               # Punto de entrada principal
└── README.md
```

## Uso

### Importación básica

```tsx
import Loader from '@/modules/loader';

// Loader de página completa
<Loader isFullPage isVisible={loading} />

// Loader inline
<Loader isVisible={loading} />
```

### Con callback de animación

```tsx
import Loader from '@/modules/loader';

<Loader 
  isFullPage 
  isVisible={loading}
  onAnimationComplete={() => console.log('Animation completed')}
/>
```

### Importar componentes individuales

```tsx
import { LighthouseScene } from '@/modules/loader';

<LighthouseScene />
```

## Props

### LoaderProps

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `message` | `string` | `undefined` | Mensaje opcional a mostrar |
| `isFullPage` | `boolean` | `false` | Si es true, muestra loader de página completa |
| `loadingProgress` | `object` | `undefined` | Objeto con progreso de carga |
| `isVisible` | `boolean` | `true` | Controla la visibilidad del loader |
| `onAnimationComplete` | `function` | `undefined` | Callback al completar animación de salida |

## Componentes

### Atoms

- **LighthouseScene**: Escena animada del faro con océano y estrellas

### Organisms

- **Loader**: Componente principal que orquesta la animación de carga

## Configuración

El módulo incluye configuración centralizada en `config/index.ts`:

```tsx
import { LOADER_CONFIG } from '@/modules/loader/config';

// Acceder a configuración
const { ANIMATION, LIGHTHOUSE, Z_INDEX } = LOADER_CONFIG;
```

## Tipos

Todos los tipos están definidos en `config/types.ts`:

- `LoaderProps`
- `LighthouseSceneProps`
- `LoaderVariant`
- `LoaderState`

## Estilos

Los estilos están modularizados:
- `styles/Loader.module.scss`: Estilos del componente Loader
- `components/atoms/LighthouseScene.module.scss`: Estilos de la escena del faro

## Animaciones

El módulo incluye múltiples animaciones:
- Fade in/out del loader
- Animación de salida hacia arriba
- Rotación de luces del faro
- Ondulación del océano
- Parpadeo de estrellas
- Barra de progreso

## Notas de Migración

Si estás migrando desde el componente antiguo:

```tsx
// Antes
import Loader from '@/components/Loader';

// Después
import Loader from '@/modules/loader';
```

El API es compatible, no se requieren cambios adicionales.
