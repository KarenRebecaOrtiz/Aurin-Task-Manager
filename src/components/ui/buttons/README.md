# Sistema de Botones Neumórficos

Este directorio contiene el sistema de botones modular con efectos neumórficos 3D para la aplicación.

## Características

- **Efecto Neumórfico**: Sombras inset que crean profundidad 3D
- **Animaciones Spring**: Transiciones suaves con Framer Motion
- **6 Intenciones**: default, primary, secondary, danger, ghost, outline
- **6 Tamaños**: sm, md, lg, icon, icon-sm, icon-lg
- **Estados**: loading, disabled, fullWidth

## Archivos

- `index.tsx`: Componente principal `Button` con soporte para Framer Motion
- `variants.ts`: Definición de variantes con `class-variance-authority`
- `ButtonDemo.tsx`: Demostración de todas las variantes
- `GoBackButton.tsx`: Botón especializado para navegación

---

## Cómo Usar el Componente `Button`

### 1. Importación

```tsx
import { Button } from '@/components/ui/buttons';
```

### 2. Uso Básico

Por defecto, el botón se renderiza con `intent="default"` y `size="md"`.

```tsx
<Button>Botón Default</Button>
```

### 3. Variantes de Intención (`intent`)

```tsx
<Button intent="default">Default (Oscuro)</Button>
<Button intent="primary">Primary (Azul)</Button>
<Button intent="secondary">Secondary (Blanco)</Button>
<Button intent="danger">Danger (Rojo)</Button>
<Button intent="ghost">Ghost (Transparente)</Button>
<Button intent="outline">Outline (Borde)</Button>
```

### 4. Variantes de Tamaño (`size`)

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium (Default)</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon Only</Button>
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
