# Migración del Módulo Loader

## Resumen de Cambios

El módulo `loader` ha sido completamente modularizado siguiendo la arquitectura atómica (Atomic Design).

## Estructura Anterior vs Nueva

### Antes
```
src/
├── components/
│   ├── Loader.tsx
│   ├── Loader.module.scss
│   ├── LighthouseScene.tsx
│   └── LighthouseScene.module.scss
```

### Después
```
src/modules/loader/
├── components/
│   ├── atoms/
│   │   ├── LighthouseScene.tsx
│   │   ├── LighthouseScene.module.scss
│   │   └── index.ts
│   ├── organisms/
│   │   ├── Loader.tsx
│   │   └── index.ts
│   └── index.ts
├── config/
│   ├── index.ts
│   └── types.ts
├── styles/
│   └── Loader.module.scss
├── index.ts
├── README.md
└── MIGRATION.md
```

## Cambios en Imports

### Import del Loader (Default)

**Antes:**
```tsx
import Loader from '@/components/Loader';
```

**Después:**
```tsx
import Loader from '@/modules/loader';
```

### Import de LighthouseScene

**Antes:**
```tsx
import LighthouseScene from '@/components/LighthouseScene';
```

**Después:**
```tsx
import { LighthouseScene } from '@/modules/loader';
```

### Import de Tipos

**Nuevo:**
```tsx
import type { LoaderProps, LoaderConfig } from '@/modules/loader';
```

### Import de Configuración

**Nuevo:**
```tsx
import { LOADER_CONFIG } from '@/modules/loader';
```

## API del Componente

La API del componente `Loader` **NO ha cambiado**. Todos los props siguen siendo los mismos:

```tsx
interface LoaderProps {
  message?: string;
  isFullPage?: boolean;
  loadingProgress?: {
    tasks: boolean;
    clients: boolean;
    users: boolean;
  };
  isVisible?: boolean;
  onAnimationComplete?: () => void;
}
```

## Archivos a Eliminar (Opcional)

Una vez verificado que todo funciona correctamente, puedes eliminar:

- `src/components/Loader.tsx`
- `src/components/Loader.module.scss`
- `src/components/LighthouseScene.tsx`
- `src/components/LighthouseScene.module.scss`

**IMPORTANTE:** Verifica primero que no haya otros imports de estos archivos en el proyecto.

## Verificación de Migración

Para verificar que la migración fue exitosa:

1. **Buscar imports antiguos:**
   ```bash
   grep -r "from '@/components/Loader'" src/
   grep -r "from '@/components/LighthouseScene'" src/
   ```

2. **Todos los imports deben apuntar a:**
   ```bash
   grep -r "from '@/modules/loader'" src/
   ```

3. **Compilar el proyecto:**
   ```bash
   npm run build
   ```

## Nuevas Características

### Configuración Centralizada

Ahora puedes acceder a la configuración del loader:

```tsx
import { LOADER_CONFIG } from '@/modules/loader';

const { ANIMATION, LIGHTHOUSE, Z_INDEX } = LOADER_CONFIG;
```

### Tipos Exportados

Todos los tipos están disponibles:

```tsx
import type { 
  LoaderProps, 
  LighthouseSceneProps,
  LoaderVariant,
  LoaderState 
} from '@/modules/loader';
```

## Beneficios de la Modularización

1. **Organización Clara:** Estructura atómica bien definida
2. **Tipos Centralizados:** Todos los tipos en un solo lugar
3. **Configuración Separada:** Fácil de modificar sin tocar componentes
4. **Mejor Mantenibilidad:** Cada componente en su nivel correcto
5. **Escalabilidad:** Fácil agregar nuevos componentes relacionados

## Soporte

Si encuentras algún problema con la migración, revisa:

1. El archivo `README.md` en el módulo loader
2. Los tipos en `config/types.ts`
3. La configuración en `config/index.ts`

## Checklist de Migración

- [x] Crear estructura de carpetas atómica
- [x] Mover LighthouseScene a atoms
- [x] Mover Loader a organisms
- [x] Crear archivos de configuración y tipos
- [x] Actualizar todos los exports
- [x] Verificar imports en archivos que usan el loader
- [ ] Eliminar archivos antiguos (después de verificar)
- [ ] Actualizar documentación del proyecto

## Fecha de Migración

Noviembre 11, 2025
