# 🔔 Sonner Toast Module

Sistema centralizado de notificaciones usando Sonner con Tailwind CSS.

## 📦 Instalación

Ya está instalado en el proyecto. Solo necesitas importar el hook.

## 🚀 Uso

### Hook `useSonnerToast()`

```tsx
import { useSonnerToast } from '@/modules/sonner';

export function MyComponent() {
  const { success, error, warning, info } = useSonnerToast();

  return (
    <button onClick={() => success('¡Éxito!')}>
      Mostrar Toast
    </button>
  );
}
```

### Métodos disponibles

```tsx
const { success, error, warning, info } = useSonnerToast();

// Éxito
success('Operación completada');

// Error con descripción
error('Error', 'Algo salió mal');

// Advertencia
warning('Cuidado con esta acción');

// Información
info('Información importante');
```

### Opciones avanzadas

```tsx
success('Tarea eliminada', {
  duration: 3000,           // Duración en ms (default: 5000)
  onClose: () => console.log('Cerrado'),
  onAction: () => console.log('Acción ejecutada'),
  actionLabel: 'Deshacer',
  playSound: false,         // Desactivar audio
});
```

## 🎨 Características

- ✅ 4 variantes: success, error, warning, info
- ✅ Audio integrado (configurable)
- ✅ Tailwind CSS styling
- ✅ Acciones personalizadas
- ✅ Auto-cierre configurable
- ✅ Responsive
- ✅ Tema claro/oscuro

## 📁 Estructura

```
/src/modules/sonner/
├── index.tsx                  # Componente SonnerToaster + exports
├── hooks/
│   └── useSonnerToast.ts     # Hook principal
└── README.md                 # Este archivo
```

## 🔧 Configuración

El componente `SonnerToaster` está configurado en `/src/app/layout.tsx` con:
- Posición: top-right
- Máximo de toasts visibles: 5
- Tema: system (sigue el tema del SO)
- Botón de cierre: habilitado
- Colores ricos: habilitado

## 📝 Notas

- El audio se reproduce automáticamente (si el navegador lo permite)
- Los navegadores pueden bloquear autoplay - se maneja gracefully
- Compatible con Tailwind CSS v4
