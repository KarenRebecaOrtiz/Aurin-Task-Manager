# OnlineUsersPortal Component

## Descripción

El componente `OnlineUsersPortal` es un portal React que se renderiza en el bottom right de la pantalla y muestra los usuarios que están actualmente online en la aplicación.

## Características

- **Portal React**: Se renderiza directamente en el `document.body` usando `createPortal`
- **Posicionamiento fijo**: Aparece en el bottom right de la pantalla
- **Diseño discreto**: Avatares pequeños y circulares con efecto cristalizado
- **Filtrado automático**: Solo muestra usuarios con estado "Disponible", "Ocupado" o "Por terminar"
- **Tooltip interactivo**: Al hacer hover muestra información detallada de todos los usuarios online
- **Indicador de usuarios adicionales**: Si hay más usuarios de los visibles, muestra un contador
- **Diseño responsive**: Se adapta a diferentes tamaños de pantalla
- **Animaciones suaves**: Efectos hover y transiciones fluidas
- **Estilos cristalizados**: Utiliza mixins de glassmorphism y neomorphic shadows

## Uso

### Básico

```tsx
import OnlineUsersPortal from '@/components/ui/OnlineUsersPortal';

function MyPage() {
  return (
    <div>
      {/* Tu contenido de página */}
      <OnlineUsersPortal />
    </div>
  );
}
```

### Con configuración personalizada

```tsx
import OnlineUsersPortal from '@/components/ui/OnlineUsersPortal';

function MyPage() {
  return (
    <div>
      {/* Tu contenido de página */}
      <OnlineUsersPortal 
        maxVisible={6} 
        className="custom-class" 
      />
    </div>
  );
}
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `maxVisible` | `number` | `3` | Número máximo de avatares visibles |
| `className` | `string` | `undefined` | Clase CSS adicional |

## Dependencias

El componente utiliza los siguientes recursos existentes:

- **UserAvatar**: Para mostrar los avatares de los usuarios
- **useUsers**: Hook de Zustand para obtener la lista de usuarios
- **dataStore**: Store que contiene los datos de usuarios

## Estilos

Los estilos están escritos en SCSS y se encuentran en `OnlineUsersPortal.module.scss`. Utiliza los mixins cristalizados del sistema de diseño:

- **Glassmorphism**: Efecto cristalizado con backdrop-filter
- **Neomorphic shadows**: Sombras suaves y naturales
- **Mixins tipográficos**: Tipografía consistente con el sistema
- **Variables de espaciado**: Espaciado consistente con el sistema
- **Diseño responsive**: Se adapta a diferentes tamaños de pantalla
- **Animaciones suaves**: Transiciones fluidas y efectos hover

## Variables CSS Requeridas

El componente utiliza las siguientes variables CSS que deben estar definidas en tu tema:

```css
:root {
  --background: #ffffff;
  --border: #d1d5db;
  --muted: #f3f4f6;
  --muted-foreground: #6b7280;
  --popover: #ffffff;
  --popover-foreground: #1f2937;
  --accent: #f9fafb;
}

[data-theme='dark'] {
  --background: #1f2937;
  --border: #4b5563;
  --muted: #374151;
  --muted-foreground: #9ca3af;
  --popover: #1f2937;
  --popover-foreground: #f9fafb;
  --accent: #374151;
}
```

## Demo

Para probar el componente, puedes usar el componente demo:

```tsx
import { OnlineUsersPortalDemo } from '@/components/ui/OnlineUsersPortalDemo';

function DemoPage() {
  return <OnlineUsersPortalDemo />;
}
```

## Integración en TasksPage

El componente ya está integrado en `src/app/dashboard/tasks/page.tsx`:

```tsx
export default function TasksPage() {
  return (
    <AuthProvider>
      <TasksPageContent />
      <IndependentMessageSidebarRenderer />
      <IndependentChatSidebarRenderer />
      {/* Portal de usuarios online */}
      <OnlineUsersPortal maxVisible={4} />
      <SafariFirebaseAuthFix />
    </AuthProvider>
  );
}
```

## Comportamiento

1. **Renderizado condicional**: Solo se muestra si hay usuarios online
2. **Actualización automática**: Se actualiza cuando cambia el estado de los usuarios
3. **Z-index alto**: Se posiciona por encima de otros elementos (z-index: 1000)
4. **No interfiere**: No afecta el layout de la página principal

## Personalización

Puedes personalizar el componente modificando:

- **Estilos**: Editando `OnlineUsersPortal.module.scss`
- **Lógica de filtrado**: Modificando la función de filtrado en el componente
- **Posicionamiento**: Cambiando las propiedades CSS de `.onlineUsersPortal`
- **Tooltip**: Personalizando el contenido y estilo del tooltip 