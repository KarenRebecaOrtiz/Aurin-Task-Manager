# Dialog Typography & Text Standards

## Overview
Este documento define los estándares de tipografía y jerarquía de textos para todos los diálogos en la aplicación Aurin Task Manager. Asegura consistencia visual, accesibilidad y coherencia en toda la interfaz.

---

## 1. Dialog Structure Hierarchy

```
Dialog
├── DialogHeader (FormHeader)
│   ├── DialogTitle (Heading)
│   └── DialogDescription (Subheading)
├── DialogContent (Body)
│   ├── FormSection
│   │   ├── Labels (Field Labels)
│   │   ├── Input/Select/Textarea
│   │   └── Helper Text (Optional)
│   └── FormFooter
│       ├── Cancel Button (Secondary)
│       └── Submit Button (Primary)
└── DialogBackdrop
```

---

## 2. Typography Levels

### 2.1 Dialog Title (Heading)

**Ubicación**: `FormHeader` → `DialogTitle`

#### Light Mode
```css
font-size: 28px (text-[28px])
font-weight: 700 (font-bold)
line-height: 1.2 (leading-tight)
color: #111827 (text-gray-900)
letter-spacing: -0.02em (tracking-tight)
```

#### Dark Mode
```css
color: #ffffff (!text-white)
```

#### Ejemplos
- "Crear Tarea"
- "Editar Tarea"
- "Crear Cuenta"
- "Configuración"

#### Aplicación
```tsx
<DialogTitle className="text-[28px] font-bold leading-tight text-gray-900 dark:!text-white">
  {title}
</DialogTitle>
```

---

### 2.2 Dialog Description (Subheading)

**Ubicación**: `FormHeader` → `DialogDescription`

#### Light Mode
```css
font-size: 15px (text-[15px])
font-weight: 400 (normal)
line-height: 1.5 (leading-relaxed)
color: #4b5563 (text-gray-600)
margin-top: 8px (mt-2)
```

#### Dark Mode
```css
color: #d1d5db (!text-gray-300)
```

#### Ejemplos
- "Completa el formulario para crear una nueva tarea en el sistema."
- "Modifica la información de la tarea existente."
- "Crea una nueva cuenta para organizar tus proyectos."

#### Aplicación
```tsx
<DialogDescription className="text-[15px] mt-2 text-gray-600 dark:!text-gray-300">
  {description}
</DialogDescription>
```

---

## 3. Form Field Labels

**Ubicación**: Dentro de `FormSection` → Componentes `CrystalInput`, `CrystalSearchableDropdown`, etc.

### 3.1 Label Styling

#### Light Mode
```css
font-size: 14px (text-sm)
font-weight: 600 (font-semibold)
color: #1f2937 (text-gray-800)
margin-bottom: 8px (mb-2)
letter-spacing: 0.01em (tracking-wide)
```

#### Dark Mode
```css
color: #e5e7eb (text-gray-200)
```

#### Ejemplos
- "Nombre de la tarea *"
- "Descripción y Objetivos *"
- "Cuenta Asignada *"
- "Carpeta/Proyecto *"
- "Líder(es) *"
- "Colaboradores"
- "Fecha de Inicio *"
- "Fecha de Fin"
- "Prioridad *"
- "Estado Inicial *"

#### Aplicación
```tsx
<label className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
  {label}
</label>
```

---

## 4. Input Placeholder Text

**Ubicación**: Atributo `placeholder` en inputs

### 4.1 Placeholder Styling

#### Light Mode
```css
font-size: 14px (text-sm)
font-weight: 400 (normal)
color: #9ca3af (text-gray-400)
opacity: 0.7
```

#### Dark Mode
```css
color: #6b7280 (text-gray-500)
opacity: 0.8
```

#### Ejemplos
- "Ej. Rediseño de Landing Page Q3"
- "Describe los objetivos y alcance de la tarea"
- "Selecciona una cuenta"
- "Buscar cuenta..."
- "Selecciona una carpeta"
- "Buscar carpeta..."
- "Selecciona líderes"
- "Buscar usuario..."
- "Selecciona colaboradores"
- "Selecciona fecha de inicio"
- "Selecciona fecha de fin"

---

## 5. Helper Text & Validation Messages

**Ubicación**: Debajo de inputs (opcional)

### 5.1 Helper Text (Informativo)

#### Light Mode
```css
font-size: 12px (text-xs)
font-weight: 400 (normal)
color: #6b7280 (text-gray-500)
margin-top: 4px (mt-1)
```

#### Dark Mode
```css
color: #9ca3af (text-gray-400)
```

#### Ejemplos
- "Máximo 500 caracteres"
- "Requerido"
- "Selecciona al menos un líder"

---

### 5.2 Error Messages

#### Light Mode
```css
font-size: 12px (text-xs)
font-weight: 500 (font-medium)
color: #dc2626 (text-red-600)
margin-top: 4px (mt-1)
```

#### Dark Mode
```css
color: #ef4444 (text-red-400)
```

#### Ejemplos
- "Este campo es requerido"
- "La fecha de inicio debe ser anterior a la fecha de fin"
- "Por favor, selecciona una cuenta"

#### Aplicación
```tsx
{error && (
  <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">
    {error}
  </p>
)}
```

---

### 5.3 Success Messages

#### Light Mode
```css
font-size: 12px (text-xs)
font-weight: 500 (font-medium)
color: #16a34a (text-green-600)
margin-top: 4px (mt-1)
```

#### Dark Mode
```css
color: #22c55e (text-green-400)
```

---

## 6. Button Text

**Ubicación**: `FormFooter` → Botones

### 6.1 Primary Button (Submit)

#### Light Mode
```css
font-size: 14px (text-sm)
font-weight: 600 (font-semibold)
color: #ffffff (text-white)
background: #000000 (bg-black)
padding: 10px 24px (px-6 py-2.5)
border-radius: 6px (rounded-md)
```

#### Dark Mode
```css
background: #ffffff (bg-white)
color: #000000 (text-black)
```

#### Ejemplos
- "Crear Tarea"
- "Actualizar"
- "Crear Cuenta"
- "Guardar"

#### Aplicación
```tsx
<Button
  type="submit"
  className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold text-sm rounded-md"
  disabled={isLoading}
>
  {submitText}
</Button>
```

---

### 6.2 Secondary Button (Cancel)

#### Light Mode
```css
font-size: 14px (text-sm)
font-weight: 500 (font-medium)
color: #6b7280 (text-gray-600)
background: transparent
border: 1px solid #e5e7eb (border-gray-200)
padding: 10px 24px (px-6 py-2.5)
border-radius: 6px (rounded-md)
hover: background #f3f4f6 (hover:bg-gray-100)
```

#### Dark Mode
```css
color: #d1d5db (text-gray-300)
border: 1px solid #374151 (border-gray-700)
hover: background #1f2937 (hover:bg-gray-800)
```

#### Ejemplos
- "Cancelar"
- "Cerrar"

#### Aplicación
```tsx
<Button
  type="button"
  variant="outline"
  className="px-6 py-2.5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-medium text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
  onClick={onCancel}
>
  Cancelar
</Button>
```

---

## 7. Section Dividers & Spacing

### 7.1 FormSection Spacing

```css
gap: 24px (gap-6)
margin-bottom: 24px (mb-6)
```

#### Estructura
```tsx
<FormSection>
  {/* Campos relacionados */}
</FormSection>
```

---

### 7.2 Visual Separator

**Ubicación**: Entre secciones principales

#### Light Mode
```css
border-color: #e5e7eb (border-gray-200)
opacity: 0.5
height: 1px
margin: 24px 0 (my-6)
```

#### Dark Mode
```css
border-color: #374151 (border-gray-700)
```

#### Aplicación
```tsx
<Separator className="my-6 bg-gray-200 dark:bg-gray-700" />
```

---

## 8. Loading & Disabled States

### 8.1 Disabled Text

#### Light Mode
```css
color: #d1d5db (text-gray-300)
opacity: 0.6
cursor: not-allowed
```

#### Dark Mode
```css
color: #4b5563 (text-gray-600)
opacity: 0.5
```

---

### 8.2 Loading Spinner Text

#### Light Mode
```css
font-size: 14px (text-sm)
color: #6b7280 (text-gray-500)
```

#### Dark Mode
```css
color: #9ca3af (text-gray-400)
```

#### Ejemplo
```tsx
<p className="text-sm text-gray-500 dark:text-gray-400">
  Cargando información de la tarea...
</p>
```

---

## 9. Empty States & Messages

### 9.1 Empty State Heading

#### Light Mode
```css
font-size: 18px (text-lg)
font-weight: 600 (font-semibold)
color: #1f2937 (text-gray-800)
```

#### Dark Mode
```css
color: #f3f4f6 (text-gray-100)
```

---

### 9.2 Empty State Description

#### Light Mode
```css
font-size: 14px (text-sm)
font-weight: 400 (normal)
color: #6b7280 (text-gray-600)
margin-top: 8px (mt-2)
```

#### Dark Mode
```css
color: #d1d5db (text-gray-300)
```

---

## 10. Dropdown & Select Items

### 10.1 Item Label

#### Light Mode
```css
font-size: 14px (text-sm)
font-weight: 500 (font-medium)
color: #1f2937 (text-gray-800)
```

#### Dark Mode
```css
color: #f3f4f6 (text-gray-100)
```

---

### 10.2 Item Subtitle

#### Light Mode
```css
font-size: 12px (text-xs)
font-weight: 400 (normal)
color: #9ca3af (text-gray-400)
margin-top: 2px (mt-0.5)
```

#### Dark Mode
```css
color: #6b7280 (text-gray-500)
```

#### Ejemplos
- "3 proyectos"
- "Administrador"
- "Diseñador"

---

## 11. Chip Selector (Priority & Status)

### 11.1 Chip Label

#### Light Mode
```css
font-size: 14px (text-sm)
font-weight: 600 (font-semibold)
color: #1f2937 (text-gray-800)
margin-bottom: 12px (mb-3)
```

#### Dark Mode
```css
color: #f3f4f6 (text-gray-100)
```

---

### 11.2 Chip Option (Unselected)

#### Light Mode
```css
font-size: 13px (text-sm)
font-weight: 500 (font-medium)
color: #6b7280 (text-gray-600)
background: #f3f4f6 (bg-gray-100)
padding: 8px 16px (px-4 py-2)
border-radius: 20px (rounded-full)
border: 1px solid transparent
```

#### Dark Mode
```css
color: #d1d5db (text-gray-300)
background: #374151 (bg-gray-700)
```

---

### 11.3 Chip Option (Selected)

#### Light Mode
```css
font-size: 13px (text-sm)
font-weight: 600 (font-semibold)
color: #ffffff (text-white)
background: #000000 (bg-black)
border: 1px solid #000000 (border-black)
```

#### Dark Mode
```css
color: #000000 (text-black)
background: #ffffff (bg-white)
border: 1px solid #ffffff (border-white)
```

---

## 12. Complete Example: TaskDialog

```tsx
// FormHeader
<DialogHeader className="px-6 pt-6 pb-4">
  <DialogTitle className="text-[28px] font-bold leading-tight text-gray-900 dark:!text-white">
    Crear Tarea
  </DialogTitle>
  <DialogDescription className="text-[15px] mt-2 text-gray-600 dark:!text-gray-300">
    Completa el formulario para crear una nueva tarea en el sistema.
  </DialogDescription>
</DialogHeader>

// FormSection with Labels
<FormSection>
  <motion.div className="md:col-span-2">
    <label className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
      Nombre de la tarea *
    </label>
    <CrystalInput
      placeholder="Ej. Rediseño de Landing Page Q3"
      value={formData.name}
      onChange={handleNameChange}
    />
  </motion.div>
</FormSection>

// FormFooter with Buttons
<FormFooter>
  <Button
    type="button"
    variant="outline"
    className="px-6 py-2.5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-medium text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
    onClick={onCancel}
  >
    Cancelar
  </Button>
  <Button
    type="submit"
    className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold text-sm rounded-md"
    disabled={isLoading}
  >
    Crear Tarea
  </Button>
</FormFooter>
```

---

## 13. Dark Mode Implementation

### 13.1 Tailwind Dark Mode Classes

Todos los componentes deben usar el prefijo `dark:` para estilos en modo oscuro:

```tsx
// Light: text-gray-900, Dark: text-white
className="text-gray-900 dark:text-white"

// Light: bg-white, Dark: bg-gray-950
className="bg-white dark:bg-gray-950"

// Light: border-gray-200, Dark: border-gray-700
className="border-gray-200 dark:border-gray-700"
```

### 13.2 Important Override

Para `DialogTitle` y `DialogDescription`, usar `!` para forzar override:

```tsx
className="text-gray-900 dark:!text-white"
className="text-gray-600 dark:!text-gray-300"
```

---

## 14. Accessibility Guidelines

### 14.1 Semantic HTML
- Usar `<label>` para labels de inputs
- Usar `<button>` para botones
- Usar `<dialog>` o `Dialog` de shadcn/ui

### 14.2 ARIA Attributes
```tsx
<label htmlFor="task-name" className="...">
  Nombre de la tarea *
</label>
<input id="task-name" aria-required="true" />
```

### 14.3 Color Contrast
- **Light mode**: Texto oscuro sobre fondo claro (WCAG AA ✓)
- **Dark mode**: Texto claro sobre fondo oscuro (WCAG AA ✓)
- **Error text**: Rojo con suficiente contraste

### 14.4 Focus States
```tsx
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
```

---

## 15. Animation & Transitions

### 15.1 Dialog Entry/Exit

```tsx
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
}

<motion.div
  variants={modalVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
  transition={{ duration: 0.2 }}
>
  {/* Content */}
</motion.div>
```

### 15.2 Form Field Animations

```tsx
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

<motion.div variants={fadeInUp}>
  {/* Field */}
</motion.div>
```

---

## 16. Responsive Design

### 16.1 Breakpoints

```css
/* Mobile (default) */
font-size: 14px
width: 100%

/* Tablet (md: 768px) */
md:grid-cols-2
md:col-span-2

/* Desktop (lg: 1024px) */
lg:grid-cols-3
```

### 16.2 Dialog Size

```tsx
<DialogContent className="w-full h-[90vh] max-w-4xl">
  {/* Content */}
</DialogContent>
```

---

## 17. Color Palette Reference

### Light Mode
| Element | Color | Tailwind |
|---------|-------|----------|
| Primary Text | #111827 | text-gray-900 |
| Secondary Text | #4b5563 | text-gray-600 |
| Tertiary Text | #6b7280 | text-gray-500 |
| Placeholder | #9ca3af | text-gray-400 |
| Background | #ffffff | bg-white |
| Border | #e5e7eb | border-gray-200 |
| Error | #dc2626 | text-red-600 |
| Success | #16a34a | text-green-600 |

### Dark Mode
| Element | Color | Tailwind |
|---------|-------|----------|
| Primary Text | #ffffff | text-white |
| Secondary Text | #d1d5db | text-gray-300 |
| Tertiary Text | #9ca3af | text-gray-400 |
| Placeholder | #6b7280 | text-gray-500 |
| Background | #111827 | bg-gray-950 |
| Border | #374151 | border-gray-700 |
| Error | #ef4444 | text-red-400 |
| Success | #22c55e | text-green-400 |

---

## 18. Common Patterns

### 18.1 Required Field Indicator

```tsx
<label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
  Nombre de la tarea <span className="text-red-600 dark:text-red-400">*</span>
</label>
```

### 18.2 Optional Field Indicator

```tsx
<label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
  Descripción <span className="text-xs text-gray-500 dark:text-gray-400">(Opcional)</span>
</label>
```

### 18.3 Loading State

```tsx
{isLoading && (
  <div className="flex items-center gap-2">
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
    <span className="text-sm text-gray-600 dark:text-gray-400">Guardando...</span>
  </div>
)}
```

---

## 19. Implementation Checklist

- [ ] Dialog title: 28px, bold, gray-900/white
- [ ] Dialog description: 15px, normal, gray-600/gray-300
- [ ] Field labels: 14px, semibold, gray-800/gray-200
- [ ] Placeholders: 14px, normal, gray-400/gray-500
- [ ] Helper text: 12px, normal, gray-500/gray-400
- [ ] Error messages: 12px, medium, red-600/red-400
- [ ] Primary button: 14px, semibold, black/white
- [ ] Secondary button: 14px, medium, gray-600/gray-300
- [ ] Dark mode classes applied to all elements
- [ ] Animations configured (entry/exit)
- [ ] Accessibility attributes present
- [ ] Responsive design tested
- [ ] Color contrast verified (WCAG AA)

---

## 20. References

- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui Dialog**: https://ui.shadcn.com/docs/components/dialog
- **Framer Motion**: https://www.framer.com/motion/
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **Typography Best Practices**: https://www.smashingmagazine.com/2020/07/css-techniques-legibility/

---

**Last Updated**: November 25, 2025
**Version**: 1.0
**Maintained By**: Design System Team
