# Módulo Profile Card

Este módulo se encarga de mostrar la tarjeta de perfil de un usuario, gestionando la obtención y cacheo de los datos para un rendimiento óptimo.

## 📋 Descripción

El módulo `profile-card` proporciona un componente `ProfileCard` que se muestra en un modal, junto con un store de `zustand` para manejar el estado de los perfiles. La estrategia de cache y pre-fetching reduce las lecturas a Firestore y mejora la experiencia de usuario.

## 🏗️ Estructura

```
profile-card/
├── components/
│   ├── ProfileCard.tsx             # Componente principal de la tarjeta
│   └── ProfileCard.module.scss     # Estilos del componente
├── hooks/
│   └── useProfile.ts               # Hook para consumir datos del store
├── stores/
│   └── profileCardStore.ts         # Store de Zustand para perfiles
├── types/
│   └── index.ts                    # Tipos TypeScript del módulo
├── utils/
│   └── index.ts                    # Funciones de utilidad
├── index.ts                        # Exportaciones principales
└── README.md                       # Este archivo
```

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
