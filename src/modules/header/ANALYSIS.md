# Análisis del Componente Header

## Resumen Ejecutivo

El componente `Header.tsx` tiene **253 líneas** y es el componente principal del header de la aplicación. Maneja navegación, información del usuario, y orquesta múltiples componentes auxiliares.

## Estructura Actual

### Imports (Líneas 1-17)
```typescript
// Externos
- @clerk/nextjs (useUser)
- gsap (animaciones)
- framer-motion (motion)
- next/image (Image)
- react (useEffect, useRef, useCallback)

// Componentes
- AdviceInput
- ToDoDynamic
- AvailabilityToggle
- GeoClock
- AvatarDropdown
- TextShimmer

// Contextos
- AuthContext (useAuth)
- ThemeContext (useTheme)

// Stores
- tasksPageStore (useTasksPageStore)

// Estilos
- Header.module.scss
```

### Props Interface (Líneas 20-31)
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

### Estado y Refs (Líneas 42-55)
```typescript
// Hooks externos
const { user, isLoaded } = useUser();
const { isAdmin } = useAuth();
const { isDarkMode } = useTheme();

// Refs
const wrapperRef = useRef<HTMLDivElement>(null);
const iconRef = useRef<HTMLDivElement>(null);

// Computed values
const userName = isLoaded && user ? user.firstName || 'Usuario' : 'Usuario';
```

### Efectos (Líneas 71-79)
```typescript
// Animación de entrada del icono sol/luna
useEffect(() => {
  if (iconRef.current) {
    gsap.fromTo(
      iconRef.current,
      { scale: 0 },
      { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.6)' },
    );
  }
}, []);
```

### Helpers (Líneas 90-108)
```typescript
const getSubtitle = () => {
  if (isArchiveTableOpen) {
    return 'Aquí puedes ver y gestionar todas las tareas archivadas';
  }
  
  switch (selectedContainer) {
    case 'tareas':
      return 'Esta es una lista de tus tareas actuales';
    case 'cuentas':
      return 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización';
    case 'miembros':
      return 'Aquí puedes consultar y gestionar todos los miembros de tu organización';
    case 'config':
      return 'Configura tus preferencias y ajustes personales';
    default:
      return 'Esta es una lista de tus tareas actuales';
  }
};
```

### Handlers (Líneas 113-148)
```typescript
// Handler principal de navegación con verificación de cambios no guardados
const handleContainerChange = useCallback((newContainer) => {
  if (isCreateTaskOpen || isEditTaskOpen) {
    if (hasUnsavedChanges) {
      const { openConfirmExitPopup, setPendingContainer } = useTasksPageStore.getState();
      setPendingContainer(newContainer);
      openConfirmExitPopup();
    } else {
      onChangeContainer(newContainer);
    }
  } else {
    onChangeContainer(newContainer);
  }
}, [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges, onChangeContainer]);

// Handlers del logo
const handleLogoClick = useCallback(() => {
  handleContainerChange('tareas');
}, [handleContainerChange]);

const handleLogoMouseEnter = useCallback((e) => {
  e.currentTarget.style.filter = isDarkMode 
    ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5)) brightness(1.1)' 
    : 'drop-shadow(0 6px 12px rgba(255, 255, 255, 0.5)) brightness(1.1)';
}, [isDarkMode]);

const handleLogoMouseLeave = useCallback((e) => {
  e.currentTarget.style.filter = isDarkMode 
    ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
    : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))';
}, [isDarkMode]);
```

### Render (Líneas 153-250)
```typescript
return (
  <div ref={wrapperRef} className={styles.wrapper}>
    {/* Logo y Welcome Section */}
    <div className={styles.logoAndWelcomeContainer}>
      {/* Logo */}
      <div className={styles.logoContainer}>
        <Image src={logo} alt="Logo" />
      </div>
      
      {/* Welcome Section */}
      <div className={styles.lefContainer}>
        <div className={styles.AvatarMobile}>
          <AvatarDropdown />
        </div>
        <div className={styles.frame14}>
          {/* Welcome Text con TextShimmer */}
          <div className={styles.title}>
            <div className={styles.welcome}>
              <span>Te damos la bienvenida de nuevo, </span>
              <TextShimmer>{userName}</TextShimmer>
              {isAdmin && <AdminBadge />}
            </div>
          </div>
          {/* Subtitle */}
          <div className={styles.text}>
            <div className={styles.subtitle}>{getSubtitle()}</div>
          </div>
        </div>
      </div>
    </div>

    {/* Header Container con componentes auxiliares */}
    <div className={styles.headerContainer}>
      <div className={styles.superiorHeader}>
        <GeoClock personalLocations={personalLocations} />
        <div className={styles.todoContainer}>
          <ToDoDynamic />
        </div>
        <div className={styles.availabilityContainer}>
          <AvailabilityToggle />
        </div>
        <div className={styles.AvatarDesktop}>
          <AvatarDropdown onChangeContainer={handleContainerChange} />
        </div>
      </div>
      <div className={styles.adviceContainer}>
        <AdviceInput isAdmin={isAdmin} />
      </div>
    </div>
  </div>
);
```

## Análisis de Dependencias

### Componentes Externos Usados
1. **AdviceInput** (`@/components/ui/AdviceInput`)
   - Props: `isAdmin: boolean`
   - Responsabilidad: Input para consejos de admin

2. **ToDoDynamic** (`@/components/ToDoDynamic`)
   - Props: Ninguna
   - Responsabilidad: Gestión de tareas pendientes

3. **AvailabilityToggle** (`@/components/ui/AvailabilityToggle`)
   - Props: Ninguna
   - Responsabilidad: Toggle de disponibilidad

4. **GeoClock** (`@/components/ui/GeoClock`)
   - Props: `personalLocations`
   - Responsabilidad: Reloj con información geográfica

5. **AvatarDropdown** (`@/components/AvatarDropdown`)
   - Props: `onChangeContainer`
   - Responsabilidad: Dropdown del avatar con navegación

6. **TextShimmer** (`@/components/ui/TextShimmer`)
   - Props: `as`, `className`, `children`
   - Responsabilidad: Efecto shimmer en texto

### Contextos Usados
1. **AuthContext** - `isAdmin`
2. **ThemeContext** - `isDarkMode`
3. **Clerk** - `user`, `isLoaded`

### Stores Usados
1. **tasksPageStore** - Para manejo de confirmación de salida

## Oportunidades de Refactorización

### 1. Extraer Lógica a Hooks

#### useHeaderAnimations
```typescript
// Líneas 71-79
const useHeaderAnimations = (iconRef: RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.6)' },
      );
    }
  }, []);
};
```

#### useSubtitleContent
```typescript
// Líneas 90-108
const useSubtitleContent = (
  selectedContainer: ContainerType,
  isArchiveTableOpen: boolean
) => {
  return useMemo(() => {
    if (isArchiveTableOpen) {
      return SUBTITLES.archive;
    }
    return SUBTITLES[selectedContainer];
  }, [selectedContainer, isArchiveTableOpen]);
};
```

#### useHeaderNavigation
```typescript
// Líneas 113-129
const useHeaderNavigation = (
  onChangeContainer: (container: ContainerType) => void,
  isCreateTaskOpen: boolean,
  isEditTaskOpen: boolean,
  hasUnsavedChanges: boolean
) => {
  const handleContainerChange = useCallback((newContainer: ContainerType) => {
    if (isCreateTaskOpen || isEditTaskOpen) {
      if (hasUnsavedChanges) {
        const { openConfirmExitPopup, setPendingContainer } = useTasksPageStore.getState();
        setPendingContainer(newContainer);
        openConfirmExitPopup();
      } else {
        onChangeContainer(newContainer);
      }
    } else {
      onChangeContainer(newContainer);
    }
  }, [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges, onChangeContainer]);

  return { handleContainerChange };
};
```

#### useLogoInteractions
```typescript
// Líneas 134-148
const useLogoInteractions = (
  isDarkMode: boolean,
  handleContainerChange: (container: ContainerType) => void
) => {
  const handleLogoClick = useCallback(() => {
    handleContainerChange('tareas');
  }, [handleContainerChange]);

  const handleLogoMouseEnter = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.filter = isDarkMode 
      ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5)) brightness(1.1)' 
      : 'drop-shadow(0 6px 12px rgba(255, 255, 255, 0.5)) brightness(1.1)';
  }, [isDarkMode]);

  const handleLogoMouseLeave = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.filter = isDarkMode 
      ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
      : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))';
  }, [isDarkMode]);

  return {
    handleLogoClick,
    handleLogoMouseEnter,
    handleLogoMouseLeave,
  };
};
```

### 2. Extraer Componentes Internos

#### LogoSection
```typescript
// Líneas 156-175
interface LogoSectionProps {
  isDarkMode: boolean;
  onLogoClick: () => void;
  onLogoMouseEnter: (e: React.MouseEvent<HTMLImageElement>) => void;
  onLogoMouseLeave: (e: React.MouseEvent<HTMLImageElement>) => void;
}

const LogoSection: React.FC<LogoSectionProps> = ({
  isDarkMode,
  onLogoClick,
  onLogoMouseEnter,
  onLogoMouseLeave,
}) => {
  return (
    <div 
      className={styles.logoContainer}
      onClick={onLogoClick}
      onMouseEnter={onLogoMouseEnter}
      onMouseLeave={onLogoMouseLeave}
    >
      <Image
        src={isDarkMode ? '/logoDark.svg' : '/logoLight.svg'}
        alt="Logo"
        width={180}
        height={68}
        priority
        style={{
          transition: 'all 0.3s ease',
          filter: isDarkMode 
            ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
            : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))'
        }}
      />
    </div>
  );
};
```

#### WelcomeSection
```typescript
// Líneas 176-224
interface WelcomeSectionProps {
  userName: string;
  isAdmin: boolean;
  subtitle: string;
  onChangeContainer: (container: ContainerType) => void;
}

const WelcomeSection: React.FC<WelcomeSectionProps> = ({
  userName,
  isAdmin,
  subtitle,
  onChangeContainer,
}) => {
  return (
    <div className={styles.lefContainer} style={{justifyContent: 'start'}}>
      <div className={styles.AvatarMobile}>
        <AvatarDropdown onChangeContainer={onChangeContainer} />
      </div>
      <div className={styles.frame14}>
        <div className={styles.title}>
          <div className={styles.welcome}>
            <span className={styles.welcomeText}>
              Te damos la bienvenida de nuevo,{' '}
              <TextShimmer as="span" className={styles.userNameShimmer}>
                {userName}
              </TextShimmer>
            </span>
            {isAdmin && <AdminBadge />}
          </div>
        </div>
        <div className={styles.text}>
          <div className={styles.subtitle}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
};
```

#### AdminBadge
```typescript
// Líneas 189-217
const AdminBadge: React.FC = () => {
  return (
    <motion.div 
      className={styles.adminBadge}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.5
      }}
      whileHover={{ 
        scale: 1.15, 
        rotate: 5,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
    >
      <div className={styles.adminBadgeInner}>
        <Image
          src="/verified.svg"
          alt="Admin Verified"
          width={16}
          height={16}
          className={styles.adminBadgeIcon}
        />
      </div>
    </motion.div>
  );
};
```

#### HeaderActions
```typescript
// Líneas 227-244
interface HeaderActionsProps {
  personalLocations?: PersonalLocations;
  isAdmin: boolean;
  onChangeContainer: (container: ContainerType) => void;
}

const HeaderActions: React.FC<HeaderActionsProps> = ({
  personalLocations,
  isAdmin,
  onChangeContainer,
}) => {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.superiorHeader}>
        <GeoClock personalLocations={personalLocations} />
        <div className={styles.todoContainer}>
          <ToDoDynamic />
        </div>
        <div className={styles.availabilityContainer}>
          <AvailabilityToggle />
        </div>
        <div className={styles.AvatarDesktop}>
          <AvatarDropdown onChangeContainer={onChangeContainer} />
        </div>
      </div>
      <div className={styles.adviceContainer}>
        <AdviceInput isAdmin={isAdmin} />
      </div>
    </div>
  );
};
```

### 3. Crear Constantes

#### subtitles.ts
```typescript
export const SUBTITLES: Record<ContainerType, string> = {
  tareas: 'Esta es una lista de tus tareas actuales',
  cuentas: 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización',
  miembros: 'Aquí puedes consultar y gestionar todos los miembros de tu organización',
  config: 'Configura tus preferencias y ajustes personales',
};

export const ARCHIVE_SUBTITLE = 'Aquí puedes ver y gestionar todas las tareas archivadas';
```

### 4. Crear Utilidades

#### logoFilters.ts
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
```

## Métricas de Complejidad

### Antes de la Refactorización
- **Líneas totales**: 253
- **Componentes internos**: 0 (todo en un solo componente)
- **Hooks personalizados**: 0
- **Funciones helper**: 1 (`getSubtitle`)
- **Handlers**: 3 (`handleContainerChange`, `handleLogoClick`, `handleLogoMouseEnter/Leave`)
- **Complejidad ciclomática**: ~8

### Después de la Refactorización (Estimado)
- **Componente principal**: ~80 líneas
- **Componentes internos**: 4 (LogoSection, WelcomeSection, AdminBadge, HeaderActions)
- **Hooks personalizados**: 4 (useHeaderAnimations, useSubtitleContent, useHeaderNavigation, useLogoInteractions)
- **Archivos de utilidades**: 2
- **Archivos de constantes**: 1
- **Complejidad ciclomática**: ~3 por archivo

## Beneficios de la Refactorización

### 1. Mantenibilidad
- ✅ Componentes más pequeños y enfocados
- ✅ Lógica separada en hooks reutilizables
- ✅ Fácil de entender y modificar

### 2. Testabilidad
- ✅ Hooks pueden ser testeados independientemente
- ✅ Componentes más simples de testear
- ✅ Utilidades son funciones puras

### 3. Reutilización
- ✅ Hooks pueden usarse en otros componentes
- ✅ Componentes internos pueden extraerse si se necesitan
- ✅ Utilidades compartidas

### 4. Escalabilidad
- ✅ Fácil agregar nuevas funcionalidades
- ✅ Estructura clara y organizada
- ✅ Separación de responsabilidades

## Riesgos y Consideraciones

### Riesgos
1. **Animaciones GSAP**: Asegurar que las refs se pasen correctamente
2. **Contextos**: Verificar que todos los contextos estén disponibles
3. **Stores**: Asegurar que el store de tareas funcione correctamente
4. **Responsive**: Verificar que el diseño responsive no se rompa

### Consideraciones
1. **Performance**: Las animaciones GSAP deben mantenerse fluidas
2. **Accesibilidad**: Mantener la accesibilidad del componente
3. **Modo oscuro**: Verificar que todos los estilos funcionen en ambos modos
4. **Compatibilidad**: Asegurar que funcione en todos los navegadores

## Plan de Implementación Recomendado

### Orden de Implementación
1. ✅ Crear estructura de carpetas
2. ✅ Crear documentación (README.md, ANALYSIS.md)
3. **Crear types** (header.types.ts, navigation.types.ts, ui.types.ts)
4. **Crear constantes** (subtitles.ts)
5. **Crear utilidades** (logoFilters.ts, subtitleHelpers.ts)
6. **Crear hooks** (uno por uno, testeando cada uno)
7. **Crear componentes internos** (LogoSection, WelcomeSection, etc.)
8. **Migrar componentes UI** (AdviceInput, GeoClock, etc.)
9. **Refactorizar Header principal** (usando hooks y componentes internos)
10. **Actualizar imports** en archivos que usen Header
11. **Testing completo**
12. **Limpieza de archivos antiguos**

### Tiempo Estimado
- **Fase 1-2**: ✅ Completado
- **Fase 3-5**: 2-3 horas
- **Fase 6-7**: 3-4 horas
- **Fase 8-9**: 4-5 horas
- **Fase 10-12**: 2-3 horas
- **Total**: 11-15 horas

## Próximos Pasos Inmediatos

1. ✅ Revisar y aprobar este análisis
2. **Crear archivo de tipos** (`header.types.ts`)
3. **Crear archivo de constantes** (`subtitles.ts`)
4. **Comenzar con el primer hook** (`useSubtitleContent`)
5. **Testear el hook**
6. **Continuar con los siguientes hooks**
