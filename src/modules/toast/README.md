# 🎯 Toast Module - Sistema Centralizado de Notificaciones

## 📦 Estructura

```
/src/modules/toast/
├── components/
│   ├── Toast.tsx              # Componente individual
│   ├── Toast.module.scss      # Estilos del toast
│   ├── ToastContainer.tsx     # Contenedor que renderiza toasts
│   └── ToastContainer.module.scss
├── hooks/
│   └── useToast.ts            # Hook principal para usar toasts
├── store/
│   └── toastStore.ts          # Zustand store
├── types/
│   └── index.ts               # Tipos TypeScript
├── legacy/
│   ├── SuccessAlert.tsx       # Componente antiguo (deprecated)
│   └── FailAlert.tsx          # Componente antiguo (deprecated)
├── index.ts                   # Exportaciones
└── README.md                  # Este archivo
```

## 🚀 Uso Rápido

### 1. Importar el hook

```tsx
import { useToast } from '@/modules/toast';

export function MyComponent() {
  const { success, error, warning, info } = useToast();

  return (
    <button onClick={() => success('¡Operación exitosa!')}>
      Mostrar Toast
    </button>
  );
}
```

### 2. Métodos disponibles

```tsx
const { success, error, warning, info, removeToast, clearAll } = useToast();

// Éxito
success('Tarea creada exitosamente');

// Error con detalles
error('Error al crear tarea', 'Permiso denegado');

// Advertencia
warning('Esta acción no se puede deshacer');

// Información
info('Cargando datos...');

// Remover un toast específico
removeToast(toastId);

// Limpiar todos los toasts
clearAll();
```

### 3. Opciones avanzadas

```tsx
success('Operación completada', {
  duration: 3000,           // Duración en ms (default: 5000)
  onClose: () => console.log('Toast cerrado'),
  onAction: () => console.log('Acción ejecutada'),
  actionLabel: 'Deshacer',
  playSound: false,         // Desactivar audio
});
```

## 🎨 Variantes

El sistema soporta 4 variantes:
- **success** - Verde, audio Success.mp3
- **error** - Rojo, audio Error.mp3
- **warning** - Naranja, audio Warning.mp3
- **info** - Azul, audio Info.mp3

## 📍 Posiciones

```tsx
const config = {
  position: 'top-right',      // default
  // Opciones: top-right, top-center, top-left, bottom-right, bottom-center, bottom-left
};
```

## 🔧 Configuración

### Duración por defecto
- Toasts: 5 segundos
- Se pueden personalizar por toast

### Audio
- Se reproduce automáticamente al mostrar el toast
- Se puede desactivar con `playSound: false`
- Los navegadores pueden bloquear autoplay

### Estilos
- Animación de entrada: 0.3s
- Responsive: Funciona en móvil y desktop
- Tema: Se adapta al tema actual de la app

## 🔄 Migración desde Sistema Antiguo

### ANTES
```tsx
import SuccessAlert from '@/components/SuccessAlert';

{showSuccessAlert && (
  <SuccessAlert
    message={successMessage}
    onClose={() => setShowSuccessAlert(false)}
  />
)}
```

### DESPUÉS
```tsx
import { useToast } from '@/modules/toast';

const { success } = useToast();
success('Operación exitosa');
```

## 📝 Ejemplos Reales

### Crear tarea
```tsx
const { success, error } = useToast();

const handleCreateTask = async (taskData) => {
  try {
    await createTask(taskData);
    success(`Tarea "${taskData.name}" creada exitosamente`);
  } catch (err) {
    error('Error al crear tarea', err.message);
  }
};
```

### Con acción
```tsx
const { removeToast } = useToast();

success('Tarea eliminada', {
  actionLabel: 'Deshacer',
  onAction: () => restoreTask(),
});
```

## 🎯 Características

✅ Sin duplicación de código
✅ Consistencia visual
✅ Fácil de usar
✅ TypeScript completo
✅ Animaciones suaves
✅ Audio integrado
✅ Responsive
✅ Accesible (ARIA)
✅ Posiciones configurables
✅ Auto-cierre configurable
