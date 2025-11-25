# Sistema de Componentes de Botón

Este directorio contiene el sistema de botones modular y reutilizable para la aplicación.

## Archivos

-   `index.tsx`: El componente principal `Button`. Contiene la lógica funcional, manejo de props, y la estructura del componente.
-   `variants.ts`: La definición de estilos usando `class-variance-authority`. Define todas las variantes visuales (intents), tamaños y estados del botón.

---

## Cómo Usar el Componente `Button`

### 1. Importación

Para usar el botón en cualquier parte de la aplicación, impórtalo de la siguiente manera:

```tsx
import { Button } from '@/components/ui/buttons';
```

### 2. Uso Básico

Por defecto, el botón se renderiza con `intent="primary"` y `size="md"`.

```tsx
<Button>Botón Primario</Button>
```

### 3. Variantes de Intención (`intent`)

Usa la prop `intent` para cambiar el estilo visual del botón.

```tsx
<Button intent="primary">Primary</Button>
<Button intent="secondary">Secondary</Button>
<Button intent="ghost">Ghost</Button>
<Button intent="danger">Danger</Button>
```

### 4. Variantes de Tamaño (`size`)

Usa la prop `size` para cambiar las dimensiones del botón.

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium (Default)</Button>
<Button size="lg">Large</Button>
```

### 5. Botones con Iconos

Puedes añadir iconos de `lucide-react` (o cualquier componente de icono) usando las props `leftIcon` y `rightIcon`.

```tsx
import { ChevronRight, Download } from "lucide-react";

<Button leftIcon={Download}>Descargar</Button>
<Button rightIcon={ChevronRight}>Siguiente</Button>
```

Para botones que son solo un icono, usa `size="icon"`.

```tsx
import { Settings } from "lucide-react";

<Button size="icon" aria-label="Configuración">
  <Settings />
</Button>
```

### 6. Estado de Carga (`isLoading`)

Usa `isLoading` para mostrar un spinner y deshabilitar el botón. Puedes proveer un texto opcional con `loadingText`.

```tsx
<Button isLoading>Cargando...</Button>

<Button isLoading loadingText="Guardando">
  Guardar Cambios
</Button>
```

### 7. Estado Deshabilitado (`disabled`)

Usa la prop estándar `disabled` para deshabilitar el botón.

```tsx
<Button disabled>Acción no disponible</Button>
```

### 8. Renderizar como otro elemento (`asChild`)

Si necesitas que el botón se comporte como un `<a>` de Next.js `Link` u otro componente, pero manteniendo el estilo del botón, usa la prop `asChild`.

```tsx
import Link from 'next/link';

<Button asChild>
  <Link href="/dashboard">Ir al Dashboard</Link>
</Button>

<Button asChild size="lg">
  <a href="/ruta-externa" target="_blank" rel="noopener noreferrer">
    Abrir en nueva pestaña
  </a>
</Button>
```
