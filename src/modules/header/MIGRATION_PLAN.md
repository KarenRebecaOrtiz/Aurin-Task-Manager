# Plan de Migración del Módulo Header

## Estado Actual

✅ **Fase 1 Completada**: Estructura de carpetas y documentación inicial

## Resumen del Plan

Este documento detalla el plan paso a paso para migrar el componente Header y todos sus componentes relacionados a una arquitectura modular siguiendo los principios SOLID y DRY.

## Fases de Migración

### ✅ Fase 1: Preparación (COMPLETADA)
- [x] Crear estructura de carpetas
- [x] Crear README.md con documentación completa
- [x] Crear ANALYSIS.md con análisis detallado
- [x] Crear MIGRATION_PLAN.md (este archivo)

### 🔄 Fase 2: Types y Constantes (EN PROGRESO)

#### 2.1 Crear Types
**Archivos a crear:**

1. **`/src/modules/header/types/header.types.ts`**
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

2. **`/src/modules/header/types/navigation.types.ts`**
```typescript
import { ContainerType } from './header.types';

export interface NavigationOptions {
  checkUnsavedChanges: boolean;
  showConfirmation: boolean;
}

export interface ContainerChangeEvent {
  from: ContainerType;
  to: ContainerType;
  timestamp: number;
}

export interface NavigationHandler {
  handleContainerChange: (container: ContainerType) => void;
}
```

3. **`/src/modules/header/types/ui.types.ts`**
```typescript
import { ContainerType, PersonalLocations } from './header.types';

export interface LogoSectionProps {
  isDarkMode: boolean;
  onLogoClick: () => void;
  onLogoMouseEnter: (e: React.MouseEvent<HTMLImageElement>) => void;
  onLogoMouseLeave: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export interface WelcomeSectionProps {
  userName: string;
  isAdmin: boolean;
  subtitle: string;
  onChangeContainer: (container: ContainerType) => void;
}

export interface HeaderActionsProps {
  personalLocations?: PersonalLocations;
  isAdmin: boolean;
  onChangeContainer: (container: ContainerType) => void;
}

export interface TextShimmerProps {
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
}

export interface AdviceInputProps {
  isAdmin: boolean;
}

export interface GeoClockProps {
  personalLocations?: PersonalLocations;
}

export interface AvatarDropdownProps {
  onChangeContainer: (container: ContainerType) => void;
}
```

4. **`/src/modules/header/types/index.ts`**
```typescript
export * from './header.types';
export * from './navigation.types';
export * from './ui.types';
```

**Checklist:**
- [ ] Crear `header.types.ts`
- [ ] Crear `navigation.types.ts`
- [ ] Crear `ui.types.ts`
- [ ] Crear `index.ts` para exportaciones
- [ ] Verificar que todos los tipos estén correctamente definidos

#### 2.2 Crear Constantes
**Archivos a crear:**

1. **`/src/modules/header/constants/subtitles.ts`**
```typescript
import { ContainerType } from '../types';

export const SUBTITLES: Record<ContainerType, string> = {
  tareas: 'Esta es una lista de tus tareas actuales',
  cuentas: 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización',
  miembros: 'Aquí puedes consultar y gestionar todos los miembros de tu organización',
  config: 'Configura tus preferencias y ajustes personales',
};

export const ARCHIVE_SUBTITLE = 'Aquí puedes ver y gestionar todas las tareas archivadas';
```

2. **`/src/modules/header/constants/animations.ts`**
```typescript
export const LOGO_ANIMATION = {
  scale: {
    from: 0,
    to: 1,
  },
  duration: 0.6,
  ease: 'elastic.out(1,0.6)',
};

export const ADMIN_BADGE_ANIMATION = {
  initial: { scale: 0, rotate: -180 },
  animate: { scale: 1, rotate: 0 },
  transition: {
    type: "spring",
    stiffness: 200,
    damping: 15,
    delay: 0.5,
  },
  whileHover: { 
    scale: 1.15, 
    rotate: 5,
    transition: { duration: 0.2 },
  },
  whileTap: { scale: 0.95 },
};
```

3. **`/src/modules/header/constants/index.ts`**
```typescript
export * from './subtitles';
export * from './animations';
```

**Checklist:**
- [ ] Crear `subtitles.ts`
- [ ] Crear `animations.ts`
- [ ] Crear `index.ts` para exportaciones
- [ ] Verificar que todas las constantes estén correctamente definidas

### ⏳ Fase 3: Utilidades

#### 3.1 Crear Utilidades
**Archivos a crear:**

1. **`/src/modules/header/utils/subtitleHelpers.ts`**
```typescript
import { ContainerType } from '../types';
import { SUBTITLES, ARCHIVE_SUBTITLE } from '../constants';

export const getSubtitleByContainer = (
  container: ContainerType,
  isArchiveOpen: boolean
): string => {
  if (isArchiveOpen) {
    return ARCHIVE_SUBTITLE;
  }
  return SUBTITLES[container];
};
```

2. **`/src/modules/header/utils/logoFilters.ts`**
```typescript
export const getLogoFilter = (isDarkMode: boolean, isHover: boolean): string => {
  if (isHover) {
    return isDarkMode 
      ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5)) brightness(1.1)' 
      : 'drop-shadow(0 6px 12px rgba(255, 255, 255, 0.5)) brightness(1.1)';
  }
  return isDarkMode 
    ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
    : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))';
};

export const getDefaultLogoFilter = (isDarkMode: boolean): string => {
  return getLogoFilter(isDarkMode, false);
};

export const getHoverLogoFilter = (isDarkMode: boolean): string => {
  return getLogoFilter(isDarkMode, true);
};
```

3. **`/src/modules/header/utils/navigationHelpers.ts`**
```typescript
export const canNavigate = (
  hasUnsavedChanges: boolean,
  isModalOpen: boolean
): boolean => {
  if (!isModalOpen) {
    return true;
  }
  return !hasUnsavedChanges;
};

export const shouldShowConfirmation = (
  isModalOpen: boolean,
  hasUnsavedChanges: boolean
): boolean => {
  return isModalOpen && hasUnsavedChanges;
};
```

4. **`/src/modules/header/utils/index.ts`**
```typescript
export * from './subtitleHelpers';
export * from './logoFilters';
export * from './navigationHelpers';
```

**Checklist:**
- [ ] Crear `subtitleHelpers.ts`
- [ ] Crear `logoFilters.ts`
- [ ] Crear `navigationHelpers.ts`
- [ ] Crear `index.ts` para exportaciones
- [ ] Agregar tests unitarios para cada utilidad

### ⏳ Fase 4: Hooks Personalizados

#### 4.1 Crear Hooks
**Archivos a crear:**

1. **`/src/modules/header/hooks/useSubtitleContent.ts`**
```typescript
import { useMemo } from 'react';
import { ContainerType } from '../types';
import { getSubtitleByContainer } from '../utils';

export const useSubtitleContent = (
  selectedContainer: ContainerType,
  isArchiveTableOpen: boolean
): string => {
  return useMemo(
    () => getSubtitleByContainer(selectedContainer, isArchiveTableOpen),
    [selectedContainer, isArchiveTableOpen]
  );
};
```

2. **`/src/modules/header/hooks/useHeaderAnimations.ts`**
```typescript
import { useEffect, RefObject } from 'react';
import { gsap } from 'gsap';
import { LOGO_ANIMATION } from '../constants';

export const useHeaderAnimations = (iconRef: RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: LOGO_ANIMATION.scale.from },
        { 
          scale: LOGO_ANIMATION.scale.to, 
          duration: LOGO_ANIMATION.duration, 
          ease: LOGO_ANIMATION.ease 
        }
      );
    }
  }, []);
};
```

3. **`/src/modules/header/hooks/useHeaderNavigation.ts`**
```typescript
import { useCallback } from 'react';
import { ContainerType } from '../types';
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { shouldShowConfirmation } from '../utils';

export const useHeaderNavigation = (
  onChangeContainer: (container: ContainerType) => void,
  isCreateTaskOpen: boolean,
  isEditTaskOpen: boolean,
  hasUnsavedChanges: boolean
) => {
  const handleContainerChange = useCallback(
    (newContainer: ContainerType) => {
      const isModalOpen = isCreateTaskOpen || isEditTaskOpen;
      
      if (shouldShowConfirmation(isModalOpen, hasUnsavedChanges)) {
        const { openConfirmExitPopup, setPendingContainer } = useTasksPageStore.getState();
        setPendingContainer(newContainer);
        openConfirmExitPopup();
      } else {
        onChangeContainer(newContainer);
      }
    },
    [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges, onChangeContainer]
  );

  return { handleContainerChange };
};
```

4. **`/src/modules/header/hooks/useLogoInteractions.ts`**
```typescript
import { useCallback } from 'react';
import { ContainerType } from '../types';
import { getHoverLogoFilter, getDefaultLogoFilter } from '../utils';

export const useLogoInteractions = (
  isDarkMode: boolean,
  handleContainerChange: (container: ContainerType) => void
) => {
  const handleLogoClick = useCallback(() => {
    handleContainerChange('tareas');
  }, [handleContainerChange]);

  const handleLogoMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      e.currentTarget.style.filter = getHoverLogoFilter(isDarkMode);
    },
    [isDarkMode]
  );

  const handleLogoMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      e.currentTarget.style.filter = getDefaultLogoFilter(isDarkMode);
    },
    [isDarkMode]
  );

  return {
    handleLogoClick,
    handleLogoMouseEnter,
    handleLogoMouseLeave,
  };
};
```

5. **`/src/modules/header/hooks/index.ts`**
```typescript
export * from './useSubtitleContent';
export * from './useHeaderAnimations';
export * from './useHeaderNavigation';
export * from './useLogoInteractions';
```

**Checklist:**
- [ ] Crear `useSubtitleContent.ts`
- [ ] Crear `useHeaderAnimations.ts`
- [ ] Crear `useHeaderNavigation.ts`
- [ ] Crear `useLogoInteractions.ts`
- [ ] Crear `index.ts` para exportaciones
- [ ] Agregar tests para cada hook

### ⏳ Fase 5: Componentes Internos del Header

#### 5.1 Crear Componentes Internos
**Archivos a crear:**

1. **`/src/modules/header/components/Header/components/LogoSection.tsx`**
2. **`/src/modules/header/components/Header/components/WelcomeSection.tsx`**
3. **`/src/modules/header/components/Header/components/AdminBadge.tsx`**
4. **`/src/modules/header/components/Header/components/HeaderActions.tsx`**
5. **`/src/modules/header/components/Header/components/index.ts`**

**Checklist:**
- [ ] Crear `LogoSection.tsx`
- [ ] Crear `WelcomeSection.tsx`
- [ ] Crear `AdminBadge.tsx`
- [ ] Crear `HeaderActions.tsx`
- [ ] Crear `index.ts` para exportaciones
- [ ] Verificar que todos los componentes funcionen correctamente

### ⏳ Fase 6: Migración de Componentes UI

#### 6.1 Migrar Componentes UI
**Componentes a migrar:**

1. **AdviceInput**
   - Desde: `/src/components/ui/AdviceInput.tsx`
   - Hacia: `/src/modules/header/components/ui/AdviceInput/AdviceInput.tsx`
   - Estilos: `/src/modules/header/components/ui/AdviceInput/AdviceInput.module.scss`

2. **AvailabilityToggle**
   - Desde: `/src/components/ui/AvailabilityToggle.tsx`
   - Hacia: `/src/modules/header/components/ui/AvailabilityToggle/AvailabilityToggle.tsx`
   - Estilos: `/src/modules/header/components/ui/AvailabilityToggle/AvailabilityToggle.module.scss`

3. **GeoClock**
   - Desde: `/src/components/ui/GeoClock.tsx`
   - Hacia: `/src/modules/header/components/ui/GeoClock/GeoClock.tsx`
   - Estilos: `/src/modules/header/components/ui/GeoClock/GeoClock.module.scss`

4. **TextShimmer**
   - Desde: `/src/components/ui/TextShimmer.tsx`
   - Hacia: `/src/modules/header/components/ui/TextShimmer/TextShimmer.tsx`
   - Estilos: `/src/modules/header/components/ui/TextShimmer/TextShimmer.module.scss`

5. **AvatarDropdown**
   - Desde: `/src/components/AvatarDropdown.tsx`
   - Hacia: `/src/modules/header/components/ui/AvatarDropdown/AvatarDropdown.tsx`
   - Estilos: `/src/modules/header/components/ui/AvatarDropdown/AvatarDropdown.module.scss`

6. **ToDoDynamic**
   - Desde: `/src/components/ToDoDynamic.tsx`
   - Hacia: `/src/modules/header/components/ui/ToDoDynamic/ToDoDynamic.tsx`
   - Estilos: `/src/modules/header/components/ui/ToDoDynamic/ToDoDynamic.module.scss`

**Checklist:**
- [ ] Migrar `AdviceInput`
- [ ] Migrar `AvailabilityToggle`
- [ ] Migrar `GeoClock`
- [ ] Migrar `TextShimmer`
- [ ] Migrar `AvatarDropdown`
- [ ] Migrar `ToDoDynamic`
- [ ] Crear `index.ts` en cada carpeta
- [ ] Actualizar imports en cada componente
- [ ] Verificar que todos los estilos funcionen

### ⏳ Fase 7: Refactorización del Componente Principal

#### 7.1 Refactorizar Header.tsx
**Pasos:**

1. Migrar archivos:
   - Desde: `/src/components/ui/Header.tsx`
   - Hacia: `/src/modules/header/components/Header/Header.tsx`
   - Estilos: `/src/modules/header/components/Header/Header.module.scss`

2. Refactorizar el componente:
   - Importar hooks personalizados
   - Importar componentes internos
   - Importar tipos
   - Simplificar la lógica usando hooks
   - Usar componentes internos en el render

3. Crear archivo index:
   - `/src/modules/header/components/Header/index.ts`

**Checklist:**
- [ ] Migrar `Header.tsx`
- [ ] Migrar `Header.module.scss`
- [ ] Refactorizar usando hooks
- [ ] Refactorizar usando componentes internos
- [ ] Crear `index.ts`
- [ ] Verificar que todo funcione correctamente

### ⏳ Fase 8: Exportaciones Públicas del Módulo

#### 8.1 Crear Archivo de Exportaciones Principal
**Archivo a crear:**

**`/src/modules/header/index.ts`**
```typescript
// Componente principal
export { default as Header } from './components/Header';

// Componentes UI (si se necesitan exportar)
export { default as AdviceInput } from './components/ui/AdviceInput';
export { default as AvailabilityToggle } from './components/ui/AvailabilityToggle';
export { default as GeoClock } from './components/ui/GeoClock';
export { default as TextShimmer } from './components/ui/TextShimmer';
export { default as AvatarDropdown } from './components/ui/AvatarDropdown';
export { default as ToDoDynamic } from './components/ui/ToDoDynamic';

// Hooks (si se necesitan exportar)
export * from './hooks';

// Types (si se necesitan exportar)
export * from './types';

// Utils (si se necesitan exportar)
export * from './utils';

// Constants (si se necesitan exportar)
export * from './constants';
```

**Checklist:**
- [ ] Crear `index.ts` principal
- [ ] Verificar que todas las exportaciones funcionen
- [ ] Documentar qué se exporta y por qué

### ⏳ Fase 9: Actualización de Imports

#### 9.1 Actualizar Imports en Archivos que Usan Header
**Archivos a actualizar:**

1. **`/src/app/dashboard/tasks/page.tsx`**
   - Antes: `import Header from '@/components/ui/Header';`
   - Después: `import { Header } from '@/modules/header';`

2. **`/src/app/not-found.tsx`** (si usa Header)
   - Antes: `import Header from '@/components/ui/Header';`
   - Después: `import { Header } from '@/modules/header';`

3. **Otros archivos que puedan usar componentes del header**

**Checklist:**
- [ ] Identificar todos los archivos que importan Header
- [ ] Actualizar imports en `/src/app/dashboard/tasks/page.tsx`
- [ ] Actualizar imports en otros archivos
- [ ] Verificar que no haya errores de compilación

### ⏳ Fase 10: Testing y Validación

#### 10.1 Testing Completo
**Tests a realizar:**

1. **Tests Unitarios**
   - [ ] Tests para utilidades
   - [ ] Tests para hooks
   - [ ] Tests para componentes internos

2. **Tests de Integración**
   - [ ] Header se renderiza correctamente
   - [ ] Navegación funciona correctamente
   - [ ] Verificación de cambios no guardados funciona
   - [ ] Animaciones GSAP funcionan
   - [ ] Interacciones del logo funcionan

3. **Tests Visuales**
   - [ ] Diseño responsive funciona en mobile
   - [ ] Diseño responsive funciona en tablet
   - [ ] Diseño responsive funciona en desktop
   - [ ] Modo oscuro funciona correctamente
   - [ ] Modo claro funciona correctamente
   - [ ] Animaciones se ven bien
   - [ ] Transiciones son suaves

4. **Tests de Funcionalidad**
   - [ ] Cambio de container funciona
   - [ ] Popup de confirmación aparece cuando hay cambios no guardados
   - [ ] Logo redirige a tareas
   - [ ] Avatar dropdown funciona
   - [ ] GeoClock muestra información correcta
   - [ ] AvailabilityToggle funciona
   - [ ] AdviceInput funciona para admins
   - [ ] ToDoDynamic funciona

**Checklist:**
- [ ] Ejecutar todos los tests unitarios
- [ ] Ejecutar todos los tests de integración
- [ ] Realizar tests visuales en diferentes dispositivos
- [ ] Realizar tests de funcionalidad completos
- [ ] Documentar cualquier bug encontrado
- [ ] Corregir todos los bugs

### ⏳ Fase 11: Limpieza

#### 11.1 Eliminar Archivos Antiguos
**Archivos a eliminar:**

1. `/src/components/ui/Header.tsx`
2. `/src/components/ui/Header.module.scss`
3. `/src/components/ui/AdviceInput.tsx` (y estilos)
4. `/src/components/ui/AvailabilityToggle.tsx` (y estilos)
5. `/src/components/ui/GeoClock.tsx` (y estilos)
6. `/src/components/ui/TextShimmer.tsx` (y estilos)
7. `/src/components/AvatarDropdown.tsx` (y estilos)
8. `/src/components/ToDoDynamic.tsx` (y estilos)

**Checklist:**
- [ ] Verificar que no haya imports a archivos antiguos
- [ ] Eliminar archivos antiguos uno por uno
- [ ] Verificar que la aplicación siga funcionando después de cada eliminación
- [ ] Hacer commit de los cambios

#### 11.2 Actualizar Documentación
**Documentos a actualizar:**

1. `/src/modules/header/README.md`
   - Actualizar estado del proyecto
   - Marcar todas las fases como completadas

2. `/src/modules/header/ANALYSIS.md`
   - Agregar métricas finales
   - Documentar mejoras logradas

3. `/src/modules/header/MIGRATION_PLAN.md` (este archivo)
   - Marcar todas las fases como completadas
   - Documentar lecciones aprendidas

**Checklist:**
- [ ] Actualizar README.md
- [ ] Actualizar ANALYSIS.md
- [ ] Actualizar MIGRATION_PLAN.md
- [ ] Agregar capturas de pantalla si es necesario

### ⏳ Fase 12: Revisión Final y PR

#### 12.1 Revisión Final
**Checklist:**

- [ ] Todos los tests pasan
- [ ] No hay errores de TypeScript
- [ ] No hay errores de ESLint
- [ ] Código está formateado correctamente
- [ ] Documentación está actualizada
- [ ] Commits están bien organizados
- [ ] No hay archivos antiguos
- [ ] Performance es buena
- [ ] Accesibilidad está mantenida

#### 12.2 Crear Pull Request
**Checklist:**

- [ ] Crear branch para la migración
- [ ] Hacer commits organizados por fase
- [ ] Escribir descripción detallada del PR
- [ ] Agregar screenshots/videos si es necesario
- [ ] Solicitar revisión
- [ ] Hacer merge después de aprobación

## Métricas de Éxito

### Antes de la Migración
- **Líneas en Header.tsx**: 253
- **Componentes modulares**: 0
- **Hooks personalizados**: 0
- **Archivos de utilidades**: 0
- **Archivos de constantes**: 0
- **Complejidad ciclomática**: ~8

### Después de la Migración (Objetivo)
- **Líneas en Header.tsx**: ~80
- **Componentes modulares**: 10+
- **Hooks personalizados**: 4
- **Archivos de utilidades**: 3
- **Archivos de constantes**: 2
- **Complejidad ciclomática**: ~3 por archivo

### Mejoras Esperadas
- ✅ **Reducción de complejidad**: 60-70%
- ✅ **Mejora en mantenibilidad**: 80%
- ✅ **Mejora en testabilidad**: 90%
- ✅ **Mejora en reutilización**: 70%
- ✅ **Mejora en escalabilidad**: 85%

## Riesgos y Mitigación

### Riesgos Identificados
1. **Animaciones GSAP pueden romperse**
   - Mitigación: Testear animaciones en cada paso

2. **Imports pueden fallar**
   - Mitigación: Actualizar imports gradualmente

3. **Estilos pueden romperse**
   - Mitigación: Verificar estilos en cada componente migrado

4. **Performance puede degradarse**
   - Mitigación: Medir performance antes y después

### Plan de Rollback
Si algo sale mal:
1. Revertir commits uno por uno
2. Identificar el problema
3. Corregir el problema
4. Continuar con la migración

## Lecciones Aprendidas

(Se actualizará al finalizar la migración)

## Conclusión

Este plan de migración está diseñado para ser ejecutado de manera incremental y segura. Cada fase puede ser completada y testeada independientemente antes de continuar con la siguiente.

**Próximo paso**: Comenzar con la Fase 2 (Types y Constantes)
