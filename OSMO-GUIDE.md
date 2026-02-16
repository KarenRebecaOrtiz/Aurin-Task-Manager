# Osmo Scaling System — Guía Completa

> Sistema de tipografía fluida para Aurin Task Manager. Un solo `clamp()` por token escala suavemente de 320px a 1920px sin media queries.

---

## Concepto Central

Osmo genera CSS custom properties (`--text-xs`, `--text-base`, `--text-xl`, etc.) que usan `clamp()` para interpolar entre un tamaño mobile y uno desktop. Las variables SCSS `$text-*` simplemente leen esas custom properties, así que **cualquier archivo SCSS que use `$text-sm` obtiene escalado fluido automáticamente**.

```
Mobile (320px)  ←──── clamp() interpola ────→  Desktop (1920px)
  14px base                                       16px base
  ratio 1.2                                       ratio 1.25
```

---

## Arquitectura de Archivos

```
src/app/styles/
├── osmo/
│   ├── _config.scss      ← Breakpoints, ratios, steps
│   ├── _functions.scss    ← osmo-rem(), osmo-clamp(), osmo-pow()
│   ├── _mixins.scss       ← osmo-type-scale(), osmo-generate-breakpoints()
│   └── _index.scss        ← @forward de todo
├── _variables.scss        ← Tokens globales ($text-*, $spacing-*, $radius-*, colores)
└── globals.scss           ← @include osmo-type-scale() genera las custom properties
```

---

## Configuración Actual

**Archivo:** `src/app/styles/osmo/_config.scss`

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `$osmo-viewport-min` | `320` | Ancho mínimo del viewport (px, unitless) |
| `$osmo-viewport-max` | `1920` | Ancho máximo/ideal del viewport |
| `$osmo-base-font` | `16` | Font-size base en desktop |
| `$osmo-mobile-base` | `14` | Font-size base en mobile |
| `$osmo-type-ratio` | `1.25` | Ratio tipográfico desktop (Major Third) |
| `$osmo-mobile-type-ratio` | `1.2` | Ratio tipográfico mobile (Minor Third) |

### Escala Tipográfica (Steps)

| Token | Exponente | Mobile (320px) | Desktop (1920px) | Uso típico |
|-------|-----------|----------------|-------------------|------------|
| `$text-6xl` | 6 | ~41.8px | ~61px | Display hero |
| `$text-5xl` | 5 | ~34.8px | ~48.8px | Heading 1 |
| `$text-4xl` | 4 | ~29px | ~39px | Heading 2 |
| `$text-3xl` | 3 | ~24.2px | ~31.25px | Heading 3 |
| `$text-2xl` | 2 | ~20.2px | ~25px | Heading 4 |
| `$text-xl` | 1 | ~16.8px | ~20px | Heading 5 |
| `$text-lg` | 0.5 | ~15.3px | ~17.9px | Heading 6 / Large body |
| `$text-base` | 0 | 14px | 16px | Body text |
| `$text-sm` | 0 | 14px | 16px | Body small (mismo que base) |
| `$text-xs` | -1 | ~11.7px | ~12.8px | Caption / Labels |

### Container Breakpoints

| Nombre | Ideal | Min | Max |
|--------|-------|-----|-----|
| `desktop` | 1920px | 1280px | 2560px |
| `tablet` | 1024px | 768px | 1279px |
| `mobile` | 390px | 320px | 767px |

---

## Tokens Disponibles

**Archivo:** `src/app/styles/_variables.scss`

### Tipografía

```scss
// Font sizes (fluid via clamp)
$text-xs    // Caption, labels (~11.7px → 12.8px)
$text-sm    // Body small (14px → 16px)
$text-base  // Body (14px → 16px)
$text-lg    // Large body (~15.3px → 17.9px)
$text-xl    // H5 (~16.8px → 20px)
$text-2xl   // H4 (~20.2px → 25px)
$text-3xl   // H3 (~24.2px → 31.25px)
$text-4xl   // H2 (~29px → 39px)
$text-5xl   // H1 (~34.8px → 48.8px)
$text-6xl   // Display (~41.8px → 61px)

// Font weights
$font-weight-light: 300;
$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;
$font-weight-extrabold: 800;

// Font family
$font-family-primary: var(--font-urbanist), 'Urbanist', ...;

// Line heights
$leading-none: 1;
$leading-tight: 1.25;
$leading-snug: 1.375;
$leading-normal: 1.5;
$leading-relaxed: 1.625;
$leading-loose: 2;
```

### Spacing

```scss
$spacing-xs:  4px;
$spacing-sm:  8px;
$spacing-md:  12px;
$spacing-lg:  16px;
$spacing-xl:  20px;
$spacing-2xl: 24px;
$spacing-3xl: 32px;
$spacing-4xl: 40px;
```

### Border Radii

```scss
$radius-xs:   4px;
$radius-sm:   6px;
$radius-md:   8px;
$radius-lg:   10px;
$radius-xl:   12px;
$radius-2xl:  16px;
$radius-full: 9999px;
```

### Colores

```scss
// Neutrals (zinc scale)
$white    // #FFFFFF
$zinc-50  // #F9FAFB
$zinc-100 // #F4F4F5
$zinc-200 // #E4E4E7
$zinc-300 // #D4D4D8
$zinc-400 // #A1A1AA
$zinc-500 // #71717A
$zinc-600 // #52525B
$zinc-700 // #3F3F46
$zinc-800 // #27272A
$zinc-900 // #18181B
$zinc-950 // #09090B
$black    // #000000

// Slate
$slate-100 // #F1F5F9
$slate-200 // #E2E8F0
$slate-500 // #64748B

// Primary accent colors (100-600 range)
$blue-100  // #DBEAFE
$blue-400  // #60A5FA
$blue-500  // #3B82F6
$blue-600  // #2563EB

$red-100   // #FEE2E2
$red-400   // #F87171
$red-500   // #EF4444
$red-600   // #DC2626

$green-100 // #DCFCE7
$green-400 // #4ADE80
$green-500 // #22C55E
$green-600 // #16A34A

$yellow-300 // #FDE047
$yellow-400 // #FACC15
$yellow-500 // #EAB308

$amber-100  // #FEF3C7
$amber-400  // #FBBF24
$amber-500  // #F59E0B

$sky-400    // #38BDF8
$sky-500    // #0EA5E9

// Other -500 variants
$purple-500, $pink-500, $indigo-500, $emerald-500,
$orange-500, $teal-500, $cyan-500, $lime-500,
$rose-500, $violet-500, $fuchsia-500, $gray-500,
$neutral-500, $stone-500

// Brand
$brand-primary       // #d0df00
$brand-primary-hover // #afbb01

// Semantic text colors (light mode)
$color-text-primary    // #0D0D0D
$color-text-secondary  // #64748b
$color-text-muted      // #6b7280

// Semantic text colors (dark mode)
$color-text-dark-primary    // #D1D1D1
$color-text-dark-secondary  // #A1A1AA
$color-text-dark-muted      // #9ca3af

// Semantic backgrounds
$color-bg-light       // #F7F9FA
$color-bg-glass       // rgba(241, 245, 249, 1)
$color-bg-dark        // rgb(15 15 15)
$color-bg-glass-dark  // rgba(39, 39, 42, 0.8)

// Status
$color-success  // #22c55e
$color-warning  // #f59e0b
$color-error    // #EF4444
$color-info     // #3B82F6
```

### Transitions

```scss
$transition-base: all 0.3s ease;
$transition-fast: all 0.2s ease;
$transition-slow: all 0.4s ease;
```

### Z-Index

```scss
$z-dropdown: 1100;
$z-popup:    2000;
$z-overlay:  9999;
$z-toast:    999999;
$z-tooltip:  100;
```

---

## Funciones Osmo

**Archivo:** `src/app/styles/osmo/_functions.scss`

### `osmo-rem($px)`

Convierte píxeles a rem usando la base de 16px.

```scss
@use './osmo/functions' as osmo;

.element {
  padding: osmo.osmo-rem(24);    // → 1.5rem
  margin: osmo.osmo-rem(12px);   // → 0.75rem (acepta con o sin px)
}
```

### `osmo-clamp($min-px, $max-px)`

Genera un `clamp()` que interpola fluidamente entre dos tamaños de píxel a través del rango 320px–1920px.

```scss
@use './osmo/functions' as osmo;

.custom-heading {
  font-size: osmo.osmo-clamp(20, 32);
  // → clamp(1.25rem, 0.9rem + 0.75vw, 2rem)
  // 20px en 320px viewport, 32px en 1920px viewport
}
```

### `osmo-fluid-type($step)`

Genera el `clamp()` para un step nombrado de la escala tipográfica.

```scss
.heading {
  font-size: osmo.osmo-fluid-type("2xl");
  // Equivalente a lo que genera --text-2xl
}
```

### `osmo-type($step)`

Devuelve el valor rem estático (desktop) para un step.

```scss
.static-heading {
  font-size: osmo.osmo-type("xl"); // → 1.25rem
}
```

---

## Cómo Usar en Componentes

### Caso 1: Usar tokens `$text-*` (lo más común)

La mayoría de los componentes solo necesitan importar variables y usar los tokens:

```scss
@use '@/app/styles/variables' as *;

.title {
  font-size: $text-xl;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;

  :global(body.dark) & {
    color: $color-text-dark-primary;
  }
}

.body {
  font-size: $text-sm;
  color: $color-text-secondary;
  line-height: $leading-normal;
}

.caption {
  font-size: $text-xs;
  color: $zinc-500;
}
```

**El escalado es automático.** No necesitas media queries para font-size.

### Caso 2: Tamaño custom con `osmo-clamp()`

Cuando necesitas un tamaño que no está en la escala predefinida:

```scss
@use '@/app/styles/osmo/functions' as osmo;

.profile-name {
  font-size: osmo.osmo-clamp(26, 36);  // 26px mobile → 36px desktop
}

.card-title {
  font-size: osmo.osmo-clamp(14, 18);  // 14px mobile → 18px desktop
}
```

### Caso 3: Convertir valores de Figma con `osmo-rem()`

Para padding, margin, y otros valores que solo necesitan conversión a rem:

```scss
@use '@/app/styles/osmo/functions' as osmo;

.card {
  padding: osmo.osmo-rem(24);   // 1.5rem
  gap: osmo.osmo-rem(16);       // 1rem
  border-radius: osmo.osmo-rem(12); // 0.75rem
}
```

### Caso 4: Módulo con variables locales

Algunos módulos (como chat) tienen su propio `_variables.scss` que re-exporta los tokens globales:

```scss
// src/modules/chat/styles/_variables.scss
@use '@/app/styles/variables' as *;
@forward '@/app/styles/variables';  // ← re-exporta para downstream

// Variables locales del módulo
$chat-bg-light: $zinc-100;
$chat-text-primary-light: $color-text-primary;
```

```scss
// src/modules/chat/styles/SomeComponent.module.scss
@use './variables' as *;  // Obtiene TANTO las locales como las globales

.message {
  font-size: $text-sm;              // ← global (via @forward)
  color: $chat-text-primary-light;  // ← local
  padding: $spacing-md;             // ← global (via @forward)
}
```

---

## Patrón Dark Mode

Siempre usar `:global(body.dark) &`:

```scss
.card {
  background: $white;
  color: $color-text-primary;
  border: 1px solid $zinc-200;

  :global(body.dark) & {
    background: $zinc-900;
    color: $color-text-dark-primary;
    border-color: rgba($white, 0.1);
  }
}
```

---

## CSS Output Generado

Lo que `@include osmo-type-scale()` produce en `globals.scss`:

```css
:root {
  --text-6xl: clamp(2.613rem, 1.411rem + 3.757vw, 3.815rem);
  --text-5xl: clamp(2.177rem, 1.207rem + 3.034vw, 3.052rem);
  --text-4xl: clamp(1.814rem, 1.032rem + 2.446vw, 2.441rem);
  --text-3xl: clamp(1.512rem, 0.883rem + 1.967vw, 1.953rem);
  --text-2xl: clamp(1.26rem, 0.756rem + 1.573vw, 1.563rem);
  --text-xl:  clamp(1.05rem, 0.65rem + 1.25vw, 1.25rem);
  --text-lg:  clamp(0.958rem, ...);
  --text-base: clamp(0.875rem, 0.75rem + 0.391vw, 1rem);
  --text-sm:  clamp(0.875rem, 0.75rem + 0.391vw, 1.2rem);
  --text-xs:  clamp(0.729rem, 0.66rem + 0.219vw, 0.8rem);
}
```

Y las SCSS variables en `_variables.scss` simplemente leen esas custom properties:

```scss
$text-xs:   var(--text-xs);
$text-sm:   var(--text-sm);
$text-base: var(--text-base);
// ... etc
```

---

## Migración de Módulos: Checklist

Cuando migres un módulo SCSS a tokens Osmo:

### 1. Font sizes → Tokens `$text-*`

```scss
// ANTES
font-size: 12px;    // → $text-xs
font-size: 13px;    // → $text-xs
font-size: 14px;    // → $text-sm
font-size: 15px;    // → $text-sm o $text-lg
font-size: 16px;    // → $text-base
font-size: 18px;    // → $text-lg
font-size: 20px;    // → $text-xl
font-size: 24px;    // → $text-2xl
font-size: 0.75rem; // → $text-xs
font-size: 0.875rem;// → $text-sm
font-size: 1rem;    // → $text-base
```

### 2. Font weights → Tokens `$font-weight-*`

```scss
font-weight: 400; // → $font-weight-normal
font-weight: 500; // → $font-weight-medium
font-weight: 600; // → $font-weight-semibold
font-weight: 700; // → $font-weight-bold
```

### 3. Colores hex → Tokens de color

```scss
// Neutrales
#FFFFFF    → $white
#F9FAFB    → $zinc-50
#F4F4F5    → $zinc-100
#E4E4E7    → $zinc-200
#D4D4D8    → $zinc-300
#A1A1AA    → $zinc-400
#71717A    → $zinc-500
#52525B    → $zinc-600
#3F3F46    → $zinc-700
#27272A    → $zinc-800
#18181B    → $zinc-900

// Slate
#F1F5F9    → $slate-100
#E2E8F0    → $slate-200

// Accent
#3B82F6    → $blue-500
#60A5FA    → $blue-400 o $sky-400
#EF4444    → $red-500
#F59E0B    → $amber-500
#22C55E    → $green-500

// Texto semántico
#0D0D0D    → $color-text-primary
#64748b    → $color-text-secondary
#6b7280    → $color-text-muted
#D1D1D1    → $color-text-dark-primary
#A1A1AA    → $color-text-dark-secondary
```

### 4. Spacing → Tokens `$spacing-*`

```scss
4px   → $spacing-xs
6px   → $spacing-sm (closest)
8px   → $spacing-sm
10px  → $spacing-md (closest)
12px  → $spacing-md
16px  → $spacing-lg
20px  → $spacing-xl
24px  → $spacing-2xl
32px  → $spacing-3xl
40px  → $spacing-4xl
```

### 5. Border radius → Tokens `$radius-*`

```scss
4px    → $radius-xs
6px    → $radius-sm
8px    → $radius-md
10px   → $radius-lg
12px   → $radius-xl
16px   → $radius-2xl
100px  → $radius-full
9999px → $radius-full
```

### 6. Transitions → Tokens `$transition-*`

```scss
all 0.2s ease          → $transition-fast
all 0.3s ease          → $transition-base
transition: 0.15s ease → $transition-fast (close enough)
```

### 7. Dark mode → Estandarizar

```scss
// ANTES (inconsistente)
:global(.dark) & { ... }
.dark & { ... }

// DESPUÉS (estándar)
:global(body.dark) & { ... }
```

---

## Agregar un Nuevo Token

Si necesitas un tamaño que no existe en la escala:

### Opción A: Usar `osmo-clamp()` inline

```scss
@use '@/app/styles/osmo/functions' as osmo;

.special-element {
  font-size: osmo.osmo-clamp(18, 24); // Custom fluid size
}
```

### Opción B: Agregar un step a la escala

En `_config.scss`:

```scss
$osmo-type-steps: (
  "6xl": 6,
  "5xl": 5,
  // ... existing ...
  "xs": -1,
  "2xs": -2,  // ← nuevo step
);
```

Esto automáticamente genera `--text-2xs` y puedes declarar `$text-2xs: var(--text-2xs)` en `_variables.scss`.

### Opción C: Agregar un color al palette

En `_variables.scss`:

```scss
$blue-700: #1D4ED8;  // Agregar junto a los otros blue-*
```

---

## Debugging

En `_config.scss`, cambiar:

```scss
$osmo-debug: true;
```

Esto muestra un overlay en la parte inferior del navegador con el breakpoint activo y las dimensiones.

---

## Resumen Rápido

| Quiero... | Uso... |
|-----------|--------|
| Font size de la escala | `$text-sm`, `$text-xl`, etc. |
| Font size custom fluido | `osmo.osmo-clamp(min, max)` |
| Convertir px de Figma a rem | `osmo.osmo-rem(24)` |
| Color neutral | `$zinc-*` (50-950) |
| Color accent | `$blue-500`, `$red-500`, etc. |
| Color semántico light | `$color-text-primary`, `$color-text-secondary` |
| Color semántico dark | `$color-text-dark-primary`, `$color-text-dark-secondary` |
| Spacing | `$spacing-xs` a `$spacing-4xl` |
| Border radius | `$radius-xs` a `$radius-full` |
| Transition | `$transition-fast`, `$transition-base` |
| Dark mode | `:global(body.dark) & { ... }` |
