# Módulo Profile Card

## Estructura Modularizada con Atomic Design

Este módulo ha sido refactorizado siguiendo principios de Atomic Design para mejorar la mantenibilidad, reutilización y testing.

## 📋 Descripción

El módulo `profile-card` proporciona un componente `ProfileCard` que se muestra en un modal, junto con un store de `zustand` para manejar el estado de los perfiles. La estrategia de cache y pre-fetching reduce las lecturas a Firestore y mejora la experiencia de usuario.

## 🏗️ Estructura (Refactorizada)

```
profile-card/
├── components/
│   ├── atoms/                      # Componentes básicos reutilizables
│   │   ├── ActionButton/           # Botón de acción (config/message)
│   │   ├── StackTag/               # Tag de tecnología
│   │   ├── SectionTitle/           # Título de sección
│   │   └── index.ts
│   │
│   ├── molecules/                  # Composiciones de átomos
│   │   ├── ContactInfo/            # Sección de información de contacto
│   │   ├── StackSection/           # Sección de stack con toggle
│   │   ├── SocialLinks/            # Lista de enlaces sociales
│   │   ├── ProfileHeader/          # Header con avatar, nombre, badge
│   │   └── index.ts
│   │
│   ├── organisms/                  # Composiciones complejas
│   │   ├── ProfileCardContent/     # Contenido completo del card
│   │   ├── ProfileCardWrapper/     # Wrapper con overlay y estados
│   │   └── index.ts
│   │
│   ├── ProfileCard.tsx             # ⚠️ COMPONENTE MONOLÍTICO ORIGINAL (415 líneas)
│   ├── ProfileCard.refactored.tsx  # ✅ NUEVO ORQUESTADOR (~95 líneas)
│   ├── ProfileCard.module.scss     # Estilos del componente original
│   └── index.ts
│
├── hooks/
│   ├── useProfile.ts               # Hook para obtener datos del perfil
│   └── useProfileScroll.ts         # Hook para manejar scroll lock
│
├── stores/
│   └── profileCardStore.ts         # Store de Zustand para perfiles
│
├── types/
│   └── index.ts                    # Tipos TypeScript del módulo
│
├── utils/
│   └── socialLinksHelper.ts        # Utility para procesar social links
│
├── index.ts                        # Exportaciones principales
└── README.md                       # Este archivo
```

## ⚡ Refactorización Completada

### Componentes Creados

#### Átomos (Atoms)
Componentes UI básicos y reutilizables:
- **ActionButton**: Botón para acciones (configuración/mensaje)
- **StackTag**: Tag individual de tecnología
- **SectionTitle**: Título de sección

#### Moléculas (Molecules)
Grupos de átomos que forman componentes funcionales:
- **ContactInfo**: Muestra información de contacto (teléfono, ciudad, etc.)
- **StackSection**: Sección de stack con funcionalidad expand/collapse
- **SocialLinks**: Lista de enlaces a redes sociales
- **ProfileHeader**: Header completo con avatar, nombre, badge y botones

#### Organismos (Organisms)
Secciones complejas del UI:
- **ProfileCardContent**: Todo el contenido del profile card
- **ProfileCardWrapper**: Wrapper con overlay, animaciones y estados (loading/error)

### Utilities y Hooks

#### Hooks
- **useProfile**: Obtiene datos del perfil desde el store
- **useProfileScroll**: Maneja el bloqueo de scroll cuando el modal está abierto

#### Utils
- **getSocialLinks**: Procesa los enlaces sociales del perfil

## 🔄 Migración

### Archivo Original
- `ProfileCard.tsx` - 415 líneas (monolítico)

### Archivo Refactorizado
- `ProfileCard.refactored.tsx` - ~95 líneas (orquestador)

### Pasos para migrar:
1. **Revisar y testear** `ProfileCard.refactored.tsx`
2. **Backup del original**: Renombrar `ProfileCard.tsx` a `ProfileCard.old.tsx`
3. **Activar nuevo**: Renombrar `ProfileCard.refactored.tsx` a `ProfileCard.tsx`
4. **Testing**: Verificar funcionalidad completa
5. **Limpiar**: Eliminar archivo old si todo funciona

## ✅ Beneficios de la Refactorización

### 1. Mantenibilidad
- Cada componente tiene una única responsabilidad
- Cambios localizados en componentes específicos
- Más fácil de entender y modificar

### 2. Reutilización
- Átomos como `ActionButton` y `StackTag` pueden usarse en otros módulos
- Moléculas pueden componerse de diferentes formas

### 3. Testing
- Componentes pequeños son fáciles de testear aisladamente
- Mocks más simples para unit tests

### 4. Legibilidad
- ProfileCard principal reducido de 415 a ~95 líneas
- Estructura clara y predecible

### 5. Escalabilidad
- Fácil agregar nuevas secciones o variantes
- Estructura preparada para growth

## 📝 TODOs

Todos los archivos contienen comentarios `// TODO:` que indican:
- La responsabilidad del componente
- Props esperadas
- Lógica a implementar
- Estilos a aplicar

Estos TODOs sirven como guía para completar la implementación.

## 🎯 Componentes

### ProfileCard
Componente que muestra la información de un perfil de usuario en un modal.

**Características:**
- Consume datos del `profileCardStore`.
- Muestra estado de carga y error.
- Permite contactar al usuario o configurar el perfil propio.

## 🏪 Store (Zustand)

### profileCardStore
Store centralizado para los perfiles de usuario.

**Estado:**
- `profiles`: Un `Map` para cachear los perfiles por `userId`.
- `loading`: Un `Set` para rastrear los perfiles que se están cargando.
- `error`: Un `Map` para guardar errores de carga.

**Acciones:**
- `fetchProfile(userId)`: Obtiene un perfil de Firestore si no está en caché.
- `prefetchProfile(userId)`: Alias de `fetchProfile` para precargar datos.
- `unsubscribeProfile(userId)`: Cancela la subscripción de Firebase para un perfil.

## 🔗 Integración

Para usar el `ProfileCard`, simplemente impórtalo y controla su estado de apertura. El store se encargará de la gestión de datos.

**Uso:**
```tsx
import { ProfileCard } from '@/modules/profile-card';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const openProfile = (id: string) => {
    setUserId(id);
    setIsOpen(true);
  };

  return (
    <>
      <button onClick={() => openProfile('some-user-id')}>Ver Perfil</button>
      {userId && (
        <ProfileCard
          isOpen={isOpen}
          userId={userId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
```
