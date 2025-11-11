# Config Module

Módulo de configuración de usuario y perfil.

## Estructura

```
src/modules/config/
├── components/
│   ├── profile/          # Componentes de perfil de usuario
│   │   ├── ProfileHeader/
│   │   ├── ProfileForm/
│   │   ├── BioSection/
│   │   ├── ContactSection/
│   │   └── LocationSection/
│   ├── security/         # Componentes de seguridad
│   │   ├── PasswordSection/
│   │   ├── SessionsTable/
│   │   └── TwoFactorAuth/
│   ├── teams/           # Componentes de equipos
│   │   ├── TeamsTable/
│   │   ├── TeamCard/
│   │   └── TeamSelector/
│   └── ui/              # Componentes UI específicos del módulo
│       ├── TabNavigation/
│       ├── SectionHeader/
│       └── ActionButtons/
├── stores/              # Zustand stores
│   ├── configPageStore.ts
│   ├── profileFormStore.ts
│   └── securityStore.ts
├── hooks/               # Custom hooks
│   ├── useProfileForm.ts
│   ├── useImageUpload.ts
│   ├── useTeamsManagement.ts
│   └── useSecuritySettings.ts
├── types/               # TypeScript types
│   ├── profile.types.ts
│   ├── security.types.ts
│   └── teams.types.ts
└── utils/               # Utilidades
    ├── validation.ts
    ├── imageProcessing.ts
    └── formHelpers.ts
```

## Propósito

Este módulo maneja toda la funcionalidad relacionada con:

- **Perfil de Usuario**: Edición de información personal, biografía, contacto
- **Seguridad**: Gestión de contraseña, sesiones activas, 2FA
- **Equipos**: Visualización y gestión de equipos del usuario
- **Configuración**: Preferencias y ajustes generales

## Componentes Principales

### ConfigPage (Futuro)
Componente principal que orquesta todas las secciones de configuración.

**Ubicación futura:** `/src/modules/config/components/ConfigPage/`

### Secciones

1. **Profile Section**
   - Información básica (nombre, email, teléfono)
   - Biografía y descripción
   - Foto de perfil y cover
   - Ubicación y zona horaria
   - Redes sociales y sitio web

2. **Security Section**
   - Cambio de contraseña (Clerk)
   - Sesiones activas
   - Autenticación de dos factores
   - Dispositivos conectados

3. **Teams Section**
   - Equipos del usuario
   - Miembros de cada equipo
   - Gestión de equipos (agregar/eliminar)

## Stores

### configPageStore
Estado global de la página de configuración:
- Tab activo
- Estado de edición
- Cambios pendientes
- Loading states

### profileFormStore
Estado del formulario de perfil:
- Datos del formulario
- Validación
- Cambios sin guardar
- Estado de guardado

### securityStore
Estado de seguridad:
- Sesiones activas
- Configuración 2FA
- Historial de cambios

## Hooks Personalizados

### useProfileForm
Maneja la lógica del formulario de perfil:
- Validación de campos
- Guardado de cambios
- Manejo de errores
- Sincronización con Firestore

### useImageUpload
Maneja la subida de imágenes:
- Validación de tamaño/formato
- Preview de imagen
- Upload a Firebase Storage
- Manejo de errores

### useTeamsManagement
Maneja la gestión de equipos:
- Obtención de equipos
- Agregar/eliminar equipos
- Obtención de miembros

### useSecuritySettings
Maneja configuración de seguridad:
- Obtención de sesiones activas
- Revocación de sesiones
- Configuración 2FA

## Migración Futura

Cuando se decida modularizar `ConfigPage.tsx`:

1. **Mover componente principal:**
   ```bash
   mv src/components/ConfigPage.tsx src/modules/config/components/ConfigPage/
   mv src/components/ConfigPage.module.scss src/modules/config/components/ConfigPage/
   ```

2. **Separar en componentes:**
   - Extraer cada sección a su propio componente
   - Mover a carpetas correspondientes (profile/, security/, teams/)

3. **Crear stores:**
   - Extraer estado local a Zustand stores
   - Separar por responsabilidad

4. **Extraer hooks:**
   - Mover lógica de negocio a custom hooks
   - Hacer hooks reutilizables

5. **Actualizar imports:**
   ```typescript
   // Antes
   import ConfigPage from '@/components/ConfigPage';
   
   // Después
   import ConfigPage from '@/modules/config/components/ConfigPage';
   ```

## Dependencias

- `@clerk/nextjs` - Autenticación
- `firebase/firestore` - Base de datos
- `firebase/storage` - Almacenamiento de archivos
- `zustand` - State management
- `framer-motion` - Animaciones
- `react-select` - Selectores
- `gsap` - Animaciones avanzadas

## Notas de Implementación

- Seguir el patrón de las otras tablas modulares (tasks, members, clients)
- Mantener componentes pequeños y enfocados
- Usar TypeScript estricto
- Documentar props y tipos
- Agregar tests cuando sea posible

## Estado Actual

⚠️ **Pendiente de migración**

El componente actual está en `/src/components/ConfigPage.tsx` y será migrado a esta estructura modular en el futuro.
