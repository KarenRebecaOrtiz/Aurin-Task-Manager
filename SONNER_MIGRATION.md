# 🔄 Migración a Sonner - Sistema de Alertas

## ✅ Cambios Realizados

### 1. Instalación de Tailwind CSS
- ✅ Instalado: `tailwindcss`, `@tailwindcss/postcss`, `postcss`
- ✅ Creado: `tailwind.config.ts`
- ✅ Creado: `postcss.config.mjs`
- ✅ Importado en: `src/app/globals.scss`

### 2. Módulo Sonner Creado
```
/src/modules/sonner/
├── index.tsx                  # SonnerToaster + exports
├── hooks/
│   └── useSonnerToast.ts     # Hook con API personalizada
└── README.md                 # Documentación
```

### 3. Integración en Layout
- ✅ Reemplazado: `<Toaster />` por `<SonnerToaster />`
- ✅ Removido: `<ToastContainer />`
- ✅ Ubicación: `/src/app/layout.tsx`

---

## 🚀 Cómo Usar

### ANTES (Sistema Antiguo)
```tsx
import SuccessAlert from '@/components/SuccessAlert';
import FailAlert from '@/components/FailAlert';

export function MyComponent() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  return (
    <>
      {showSuccess && (
        <SuccessAlert
          message="Éxito"
          onClose={() => setShowSuccess(false)}
        />
      )}
      {showError && (
        <FailAlert
          message="Error"
          error="Detalles"
          onClose={() => setShowError(false)}
        />
      )}
    </>
  );
}
```

### DESPUÉS (Sonner)
```tsx
import { useSonnerToast } from '@/modules/sonner';

export function MyComponent() {
  const { success, error } = useSonnerToast();

  return (
    <button onClick={() => success('¡Éxito!')}>
      Mostrar Toast
    </button>
  );
}
```

---

## 📋 Componentes a Migrar

### 1. **TasksPageModals.tsx**
```tsx
// ANTES
import SuccessAlert from '@/components/SuccessAlert';
import FailAlert from '@/components/FailAlert';
const { showSuccessAlert, successMessage, showFailAlert, failMessage } = useTasksPageStore();

// DESPUÉS
import { useSonnerToast } from '@/modules/sonner';
const { success, error } = useSonnerToast();
success(successMessage);
error(failMessage);
```

### 2. **CreateTask.tsx**
```tsx
// ANTES
const [showSuccessAlert, setShowSuccessAlert] = useState(false);
const [showFailAlert, setShowFailAlert] = useState(false);

// DESPUÉS
const { success, error } = useSonnerToast();
success('Tarea creada exitosamente');
error('Error al crear tarea', 'Detalles del error');
```

### 3. **EditTask.tsx**
```tsx
// ANTES
const [showSuccessAlert, setShowSuccessAlert] = useState(false);
const [showFailAlert, setShowFailAlert] = useState(false);

// DESPUÉS
const { success, error } = useSonnerToast();
success('Tarea actualizada');
error('Error al actualizar', 'Detalles');
```

### 4. **ClientOverlay.tsx**
```tsx
// ANTES
{showSuccessAlert && <SuccessAlert ... />}
{showFailAlert && <FailAlert ... />}

// DESPUÉS
const { success, error } = useSonnerToast();
success('Cliente guardado');
error('Error al guardar cliente');
```

### 5. **ConfigPage.tsx**
```tsx
// ANTES
onShowSuccessAlert={() => setShowSuccess(true)}
onShowFailAlert={() => setShowFail(true)}

// DESPUÉS
const { success, error } = useSonnerToast();
// Pasar el hook como prop o llamar directamente
```

---

## 🎯 Ventajas

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Componentes** | 2 (SuccessAlert, FailAlert) | 1 (Sonner) |
| **Estado** | Local en cada componente | Centralizado |
| **Líneas de código** | ~400 (duplicadas) | ~100 (reutilizable) |
| **Configuración** | Manual en cada uso | Centralizada |
| **Styling** | SCSS personalizado | Tailwind CSS |
| **Audio** | Integrado | Integrado |
| **Accesibilidad** | Básica | Mejorada |

---

## 📝 Pasos de Migración

### Paso 1: Actualizar componentes uno por uno
1. Importar `useSonnerToast`
2. Remover estado local de alertas
3. Remover imports de SuccessAlert/FailAlert
4. Reemplazar llamadas con `success()` / `error()`

### Paso 2: Limpiar archivos antiguos
- Eliminar `/src/components/SuccessAlert.tsx`
- Eliminar `/src/components/FailAlert.tsx`
- Eliminar `/src/modules/toast/` (si no se usa)

### Paso 3: Verificar
- ✅ Build sin errores
- ✅ Toasts funcionan correctamente
- ✅ Audio se reproduce
- ✅ Estilos se ven bien

---

## 🔗 Referencias

- [Sonner Docs](https://sonner.emilkowal.ski/)
- [shadcn/ui Sonner](https://ui.shadcn.com/docs/components/sonner)
- [Tailwind CSS](https://tailwindcss.com/)

---

## ✨ Status

- ✅ Tailwind CSS instalado y configurado
- ✅ Módulo Sonner creado
- ✅ Hook useSonnerToast implementado
- ✅ SonnerToaster integrado en layout
- ⏳ Pendiente: Migrar componentes existentes
