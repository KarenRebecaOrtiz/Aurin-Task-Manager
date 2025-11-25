# DialogHeader Component

Componente reutilizable para el header de dialogs en toda la aplicación.

## Características

✅ **Título y Descripción**: Encabezado con título principal y descripción secundaria
✅ **Botón de Cerrar**: Botón X personalizado con estilos hover
✅ **Dark Mode**: Soporte completo para tema oscuro
✅ **Responsive**: Se adapta a diferentes tamaños de pantalla
✅ **Accesibilidad**: Incluye `sr-only` para lectores de pantalla

## Props

```typescript
interface DialogHeaderProps {
  title: string                  // Título principal del dialog
  description: string            // Descripción/subtítulo
  showCloseButton?: boolean      // Mostrar botón de cerrar (default: true)
  className?: string             // Clases CSS adicionales
}
```

## Uso

### Básico
```tsx
import { DialogHeader } from '@/modules/shared/components/molecules'

<DialogHeader
  title="Crear Tarea"
  description="Completa el formulario para crear una nueva tarea"
/>
```

### Sin botón de cerrar
```tsx
<DialogHeader
  title="Confirmar Acción"
  description="¿Estás seguro de que deseas continuar?"
  showCloseButton={false}
/>
```

### Con clases adicionales
```tsx
<DialogHeader
  title="Editar Cliente"
  description="Actualiza la información del cliente"
  className="border-b border-gray-200"
/>
```

## Estilos

- **Título**: `text-[28px] font-bold leading-tight`
- **Descripción**: `text-[15px] mt-2`
- **Botón Cerrar**: Hover con fondo gris claro/oscuro
- **Padding**: `px-6 pt-6 pb-4`

## Ubicación

- **Componente**: `/src/modules/shared/components/molecules/DialogHeader/DialogHeader.tsx`
- **Exportaciones**: `/src/modules/shared/components/molecules/DialogHeader/index.ts`
- **Índice Molecules**: `/src/modules/shared/components/molecules/index.ts`

## Reutilización

Este componente es usado por:
- ✅ `FormHeader` en task-crud (alias backward compatible)
- ✅ Disponible para todos los dialogs en la aplicación

## Próximos Pasos

1. Usar en `ClientDialog.tsx`
2. Usar en otros dialogs del sistema
3. Mantener consistencia visual en toda la app
