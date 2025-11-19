# AvatarDropdown Component

Componente de dropdown de avatar de usuario siguiendo los estándares del Dropdown centralizado.

## Estructura

```
AvatarDropdown/
├── AvatarDropdown.tsx          # Componente principal
├── AvatarDropdown.module.scss  # Estilos
├── animations.ts               # Animaciones centralizadas (Framer Motion)
├── index.ts                    # Exportaciones
└── README.md                   # Este archivo
```

## Características

- ✅ **Framer Motion**: Animaciones suaves y consistentes
- ✅ **AnimatePresence**: Manejo de entrada/salida del dropdown
- ✅ **Click Outside**: Cierra al hacer click fuera
- ✅ **Keyboard Support**: Soporte para Escape (preparado)
- ✅ **Accesibilidad**: ARIA labels y roles semánticos
- ✅ **Dark Mode**: Soporte completo para tema oscuro
- ✅ **Modular**: Animaciones centralizadas en `animations.ts`

## Uso

```typescript
import { AvatarDropdown } from '@/modules/header';

<AvatarDropdown 
  onChangeContainer={(container) => {
    // 'tareas' | 'cuentas' | 'miembros' | 'config'
  }}
/>
```

## Animaciones

Las animaciones están centralizadas en `animations.ts` siguiendo el patrón del Dropdown:

- **menu**: Entrada/salida del dropdown (opacity, y, scale)
- **item**: Items individuales con stagger effect
- **trigger**: Botón con efecto tap

## Estándares Seguidos

Este componente sigue los estándares del Dropdown centralizado:
- Usa **Framer Motion** (no GSAP)
- Usa **AnimatePresence** para animaciones
- Animaciones en archivo separado (`animations.ts`)
- Sin portal (renderiza inline)
- Estructura genérica y reutilizable

## Diferencias con la Versión Anterior

| Aspecto | Antes | Después |
|---------|-------|---------|
| Librería de animación | GSAP | Framer Motion |
| Portal | Sí (createPortal) | No (inline) |
| Animaciones | Inline en useEffect | Centralizadas en animations.ts |
| AnimatePresence | No | Sí |
| Líneas de código | ~294 | ~239 |
| Performance | Pesado (GSAP) | Ligero (Motion) |

## Próximos Pasos

1. Agregar soporte completo para keyboard navigation (ArrowUp, ArrowDown, Enter)
2. Considerar hacer el componente más genérico para reutilización
3. Agregar tests unitarios
