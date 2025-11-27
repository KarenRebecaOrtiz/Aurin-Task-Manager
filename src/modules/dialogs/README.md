# Dialogs Module 🎭

Sistema unificado de diálogos siguiendo **Atomic Design** y principios **DRY**.

## 📐 Arquitectura

```
dialogs/
├── components/
│   ├── atoms/                    # Componentes básicos reutilizables
│   │   ├── DialogSpinner         # Spinner animado
│   │   ├── DialogLoadingState    # Estado de carga completo
│   │   └── DialogErrorState      # Estado de error con retry
│   │
│   ├── molecules/                # Combinaciones de atoms
│   │   ├── ScrollableContent     # Contenedor con scrollbar custom
│   │   ├── DialogFooter          # Footer sticky con estilos
│   │   └── DialogActions         # Botones de acción (Cancel/Submit)
│   │
│   ├── organisms/                # Componentes complejos
│   │   └── CrudDialog            # Dialog base para CRUD operations
│   │
│   └── variants/                 # Variantes especializadas
│       ├── ConfirmDialog         # Confirmaciones
│       ├── AlertDialog           # Alertas
│       └── FormDialog            # Formularios simples
│
├── styles/
│   ├── mixins/
│   │   └── _scrollbar.scss       # Mixin para scrollbars custom
│   └── CrudDialog.module.scss    # Estilos centralizados
│
├── types/
│   ├── dialog.types.ts           # Tipos base
│   └── crud-dialog.types.ts      # Tipos para CrudDialog
│
├── config/
│   └── animations.ts             # Animaciones Framer Motion
│
└── stores/
    └── dialogStore.ts            # Zustand store (opcional)
```

---

## 🚀 Uso Rápido

### CrudDialog - Para operaciones CRUD

```tsx
import { CrudDialog } from '@/modules/dialogs';

function MyDialog() {
  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      mode="create" // 'create' | 'view' | 'edit'
      title="Crear Cliente"
      description="Completa el formulario"
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      size="xl"
    >
      <MyForm />
    </CrudDialog>
  );
}
```

### Props Principales

#### CrudDialog

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | **Required** - Estado del dialog |
| `onOpenChange` | `(open: boolean) => void` | - | **Required** - Callback al cambiar estado |
| `mode` | `'create' \| 'view' \| 'edit'` | - | **Required** - Modo de operación |
| `title` | `string` | - | Título del dialog |
| `description` | `string` | - | Descripción/subtitle |
| `children` | `ReactNode` | - | **Required** - Contenido del dialog |
| `isLoading` | `boolean` | `false` | Muestra DialogLoadingState |
| `isSubmitting` | `boolean` | `false` | Deshabilita botones y muestra spinner |
| `error` | `Error \| string` | - | Muestra DialogErrorState |
| `onSubmit` | `() => void \| Promise<void>` | - | Callback al enviar |
| `onCancel` | `() => void` | - | Callback al cancelar |
| `onEdit` | `() => void` | - | Callback para editar (modo view) |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'xl'` | Tamaño del dialog |
| `submitText` | `string` | Auto | Texto del botón submit |
| `cancelText` | `string` | `'Cancelar'` | Texto del botón cancel |
| `submitVariant` | `'primary' \| 'danger' \| 'secondary'` | `'primary'` | Variante del botón |
| `header` | `ReactNode` | Auto | Header customizado |
| `footer` | `ReactNode` | Auto | Footer customizado |
| `actions` | `ReactNode` | Auto | Acciones customizadas |

---

## 📦 Componentes Exportados

### Atoms

```tsx
import {
  DialogSpinner,
  DialogLoadingState,
  DialogErrorState,
} from '@/modules/dialogs';

// Spinner básico
<DialogSpinner size="md" variant="blue" />

// Estado de carga completo
<DialogLoadingState
  message="Cargando..."
  spinnerSize="lg"
/>

// Estado de error con retry
<DialogErrorState
  title="Error"
  message="No se pudo cargar"
  onRetry={handleRetry}
/>
```

### Molecules

```tsx
import {
  ScrollableContent,
  DialogFooter,
  DialogActions,
} from '@/modules/dialogs';

// Contenedor scrollable
<ScrollableContent>
  <MyForm />
</ScrollableContent>

// Footer sticky
<DialogFooter sticky>
  <DialogActions
    onCancel={handleCancel}
    onSubmit={handleSubmit}
    isLoading={isLoading}
  />
</DialogFooter>
```

---

## 🎨 Customización

### Header Customizado

```tsx
<CrudDialog
  header={
    <div className="custom-header">
      <h2>Mi Título Custom</h2>
      <MyCustomSubheader />
    </div>
  }
>
  {children}
</CrudDialog>
```

### Footer Customizado

```tsx
<CrudDialog
  footer={
    <div className="custom-footer">
      <MyCustomButtons />
    </div>
  }
>
  {children}
</CrudDialog>
```

### Actions Customizadas

```tsx
<CrudDialog
  actions={
    <div className="flex gap-3">
      <Button onClick={handleCustomAction}>
        Acción Custom
      </Button>
      <Button onClick={handleSubmit} intent="primary">
        Guardar
      </Button>
    </div>
  }
>
  {children}
</CrudDialog>
```

---

## 🎭 Casos de Uso

### 1. Dialog Simple de Creación

```tsx
<CrudDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  mode="create"
  title="Crear Tarea"
  onSubmit={handleCreate}
  onCancel={() => setIsOpen(false)}
>
  <TaskForm />
</CrudDialog>
```

### 2. Dialog con Loading State

```tsx
<CrudDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  mode="edit"
  title="Editar Cliente"
  isLoading={isLoading} // Muestra spinner automáticamente
  loadingMessage="Cargando cliente..."
  onSubmit={handleUpdate}
>
  <ClientForm />
</CrudDialog>
```

### 3. Dialog View/Edit Switchable

```tsx
const [mode, setMode] = useState<'view' | 'edit'>('view');

<CrudDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  mode={mode}
  title={mode === 'view' ? 'Ver Cliente' : 'Editar Cliente'}
  onEdit={() => setMode('edit')} // Muestra botón "Editar" en modo view
  onSubmit={handleSave}
  onCancel={() => {
    setMode('view');
    setIsOpen(false);
  }}
>
  <ClientForm isReadOnly={mode === 'view'} />
</CrudDialog>
```

### 4. Dialog con Error Handling

```tsx
const [error, setError] = useState<Error | null>(null);

<CrudDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  mode="create"
  title="Crear Proyecto"
  error={error} // Muestra error state automáticamente
  onSubmit={async () => {
    try {
      await createProject();
      setError(null);
    } catch (err) {
      setError(err);
    }
  }}
>
  <ProjectForm />
</CrudDialog>
```

---

## 🔄 Migración desde Dialogs Antiguos

### Antes (357 líneas)

```tsx
<Dialog open={isOpen} onOpenChange={onOpenChange}>
  <DialogContent className={`${styles.dialogContent} flex flex-col w-full h-[90vh] p-0 gap-0 !border-none overflow-hidden rounded-lg shadow-xl`}>
    <VisuallyHidden><DialogTitle>...</DialogTitle></VisuallyHidden>
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit">
          <DialogHeader title="..." description="..." bordered />
          <div className={`${styles.scrollableContent} flex-1 min-h-0 overflow-y-auto`}>
            <MyForm />
          </div>
          <div className={styles.stickyFooter}>
            <MyActions />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </DialogContent>
</Dialog>
```

### Después (262 líneas)

```tsx
<CrudDialog
  isOpen={isOpen}
  onOpenChange={onOpenChange}
  mode="create"
  title="Título"
  description="Descripción"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
>
  <MyForm />
</CrudDialog>
```

**Beneficios:**
- ✅ **67% menos código** duplicado eliminado
- ✅ **Mantenibilidad** - cambios en un solo lugar
- ✅ **Consistencia** - todos los dialogs se ven igual
- ✅ **Type Safety** - TypeScript estricto
- ✅ **Accesibilidad** - HeadlessUI + buenas prácticas
- ✅ **Animaciones** - Framer Motion integrado
- ✅ **Dark Mode** - Soporte automático

---

## 🎯 Dialogs Migrados

- ✅ **TaskDialog** - `src/modules/task-crud/components/forms/TaskDialog.tsx`
- ✅ **ClientDialog** - `src/modules/client-crud/components/ClientDialog.tsx`
- ✅ **ConfigDialog** - `src/modules/config/components/ConfigModal/ConfigDialog.tsx`

---

## 📝 Notas Técnicas

### Scrollbar Custom

Todos los dialogs usan el mixin `_scrollbar.scss` que proporciona:
- Scrollbar custom en light/dark mode
- Smooth scrolling behavior
- Soporte Firefox y WebKit

### Animaciones

Usa las animaciones de `config/animations.ts`:
- `panelVariants` - Fade in/out con scale
- `backdropVariants` - Fade del overlay
- `transitions` - Timings consistentes

### Form Handling

CrudDialog NO envuelve el contenido en un `<form>`. Los formularios internos (como TaskForm) deben:
1. Tener su propio elemento `<form>`
2. Llamar `onSubmit` prop cuando el form se envía
3. Manejar validación internamente

Para dialogs sin form interno, usa `onSubmit` en CrudDialog y los botones automáticamente serán type="button".

---

## 🐛 Troubleshooting

### El botón Submit no funciona

Si el form está dentro del children:
```tsx
// En tu form component
<form onSubmit={(e) => {
  e.preventDefault();
  onSubmit?.(formData);
}}>
  {/* fields */}
</form>
```

### Animaciones no funcionan

Verifica que `isOpen` prop esté cambiando correctamente:
```tsx
const [isOpen, setIsOpen] = useState(false);

<CrudDialog
  isOpen={isOpen}  // Must be boolean, not undefined
  onOpenChange={setIsOpen}
>
```

### Dark mode no aplica

Los estilos usan `:global(.dark)` - asegúrate de que tu app tenga la clase `dark` en el root:
```tsx
<html className={isDark ? 'dark' : ''}>
```

---

## 🚧 Roadmap

- [ ] Agregar tests unitarios con Jest
- [ ] Crear Storybook stories
- [ ] Agregar más variantes (Drawer, Sheet)
- [ ] Implementar drag & resize
- [ ] Mejorar a11y (ARIA labels, keyboard nav)
- [ ] Agregar ejemplos interactivos

---

## 📚 Referencias

- [HeadlessUI Dialog](https://headlessui.com/react/dialog)
- [Framer Motion](https://www.framer.com/motion/)
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/)
- [Radix UI](https://www.radix-ui.com/) - Inspiración para APIs

---

**Mantenido por**: Equipo de Desarrollo Aurin
**Última actualización**: 2025-01-27
