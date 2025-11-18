# Typography Components

Componentes de tipografía estandarizados según los estándares de **shadcn/ui**.

Estos componentes forman parte del **Design System Global** y están disponibles para ser consumidos por todos los módulos de la aplicación.

## Ubicación

```
/src/components/ui/Typography/
├── Typography.tsx
├── Typography.module.scss
├── index.ts
└── README.md
```

## Componentes Disponibles

### Headings

#### H1 - Main Page Heading
- **Font Size**: 2rem (32px)
- **Font Weight**: 700 (bold)
- **Line Height**: 1.2
- **Letter Spacing**: -0.02em

```tsx
import { H1 } from '@/components/ui/Typography';

<H1>Main Title</H1>
```

#### H2 - Section Heading
- **Font Size**: 1.875rem (30px)
- **Font Weight**: 700 (bold)
- **Line Height**: 1.3
- **Letter Spacing**: -0.02em

```tsx
import { H2 } from '@/components/ui/Typography';

<H2>Section Title</H2>
```

#### H3 - Subsection Heading
- **Font Size**: 1.5rem (24px)
- **Font Weight**: 600 (semibold)
- **Line Height**: 1.4
- **Letter Spacing**: -0.01em

```tsx
import { H3 } from '@/components/ui/Typography';

<H3>Subsection Title</H3>
```

#### H4 - Minor Heading
- **Font Size**: 1.25rem (20px)
- **Font Weight**: 600 (semibold)
- **Line Height**: 1.4

```tsx
import { H4 } from '@/components/ui/Typography';

<H4>Minor Heading</H4>
```

### Body Text

#### P - Paragraph Text
- **Font Size**: 1rem (16px)
- **Font Weight**: 400 (normal)
- **Line Height**: 1.6

```tsx
import { P } from '@/components/ui/Typography';

<P>This is a paragraph with standard body text styling.</P>
```

#### Lead - Large Introductory Text
- **Font Size**: 1.25rem (20px)
- **Font Weight**: 400 (normal)
- **Line Height**: 1.6
- **Color**: Secondary (muted)

```tsx
import { Lead } from '@/components/ui/Typography';

<Lead>A modal dialog that interrupts the user with important content.</Lead>
```

#### Large - Large Text with Semibold Weight
- **Font Size**: 1.125rem (18px)
- **Font Weight**: 600 (semibold)
- **Line Height**: 1.5

```tsx
import { Large } from '@/components/ui/Typography';

<Large>Are you absolutely sure?</Large>
```

#### Small - Small Text with Medium Weight
- **Font Size**: 0.875rem (14px)
- **Font Weight**: 500 (medium)
- **Line Height**: 1.4

```tsx
import { Small } from '@/components/ui/Typography';

<Small>Email address</Small>
```

#### Muted - Muted Secondary Text
- **Font Size**: 0.875rem (14px)
- **Font Weight**: 400 (normal)
- **Line Height**: 1.5
- **Color**: Secondary (muted)

```tsx
import { Muted } from '@/components/ui/Typography';

<Muted>Enter your email address.</Muted>
```

### Specialized Text

#### InlineCode - Inline Code Snippet
- **Font Size**: 0.875rem (14px)
- **Font Weight**: 600 (semibold)
- **Font Family**: Monospace
- **Background**: Muted
- **Padding**: 0.125rem 0.3rem (2px 5px)
- **Border Radius**: 0.25rem (4px)

```tsx
import { InlineCode } from '@/components/ui/Typography';

<InlineCode>@radix-ui/react-alert-dialog</InlineCode>
```

#### Blockquote - Block Quote
- **Font Size**: 1rem (16px)
- **Font Weight**: 400 (normal)
- **Line Height**: 1.6
- **Font Style**: Italic
- **Border Left**: 4px solid muted
- **Padding Left**: 1rem (16px)
- **Margin**: 1rem 0

```tsx
import { Blockquote } from '@/components/ui/Typography';

<Blockquote>
  "The only way to do great work is to love what you do." - Steve Jobs
</Blockquote>
```

### Lists

#### List - Unordered List
- **Margin**: 1rem 0
- **Padding Left**: 2rem
- **List Style**: Disc

```tsx
import { List, ListItem } from '@/components/ui/Typography';

<List>
  <ListItem>First item</ListItem>
  <ListItem>Second item</ListItem>
  <ListItem>Third item</ListItem>
</List>
```

#### ListItem - List Item
- **Margin Top**: 0.5rem (8px)
- **Line Height**: 1.6

```tsx
import { ListItem } from '@/components/ui/Typography';

<ListItem>List item content</ListItem>
```

## Dark Mode Support

Todos los componentes de tipografía incluyen soporte automático para **Dark Mode**:

- Los colores se adaptan automáticamente cuando está activado el modo oscuro
- Usa la clase `body.dark` para detectar el tema
- Las variables de color se definen en `/src/app/styles/variables.scss`

## Customización

Todos los componentes aceptan un prop `className` opcional para agregar estilos personalizados:

```tsx
import { H1 } from '@/components/ui/Typography';

<H1 className="text-center mb-4">Centered Title</H1>
```

## Consumo desde Otros Módulos

### Desde el módulo header

```tsx
import { H1, P, Lead } from '@/modules/header';
```

### Desde el design system global

```tsx
import { H1, P, Lead } from '@/components/ui/Typography';
```

### Desde otros módulos

```tsx
import { H1, P, Lead } from '@/components/ui/Typography';
```

## Migración Gradual

Los componentes de tipografía están diseñados para ser adoptados gradualmente en toda la aplicación:

1. **Fase 1**: Implementación en el módulo header
2. **Fase 2**: Implementación en módulos de data-views
3. **Fase 3**: Implementación en módulos de chat y otros
4. **Fase 4**: Reemplazo completo de tipografía legacy

## Variables de Estilo

Los componentes utilizan las siguientes variables SCSS del design system:

- `$color-text-primary`: Color de texto principal (light mode)
- `$color-text-dark-primary`: Color de texto principal (dark mode)
- `$color-text-secondary`: Color de texto secundario (light mode)
- `$color-text-dark-secondary`: Color de texto secundario (dark mode)
- `$color-bg-muted`: Fondo muted (light mode)
- `$color-border-subtle`: Borde sutil (light mode)

## Referencias

- [shadcn/ui Typography](https://ui.shadcn.com/docs/components/typography)
- [Design System Variables](/src/app/styles/variables.scss)
