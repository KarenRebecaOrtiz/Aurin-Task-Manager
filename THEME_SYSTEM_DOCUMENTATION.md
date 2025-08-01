# 🎨 Sistema de Temas - Documentación Completa

## 📋 Índice
1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Implementación Técnica](#implementación-técnica)
3. [Sintaxis SCSS](#sintaxis-scss)
4. [Variables de Color](#variables-de-color)
5. [Mixins y Utilidades](#mixins-y-utilidades)
6. [Contexto React](#contexto-react)
7. [Componente ThemeToggler](#componente-themetoggler)
8. [Mejores Prácticas](#mejores-prácticas)
9. [Ejemplos de Uso](#ejemplos-de-uso)

---

## 🏗️ Arquitectura del Sistema

### Estructura de Archivos
```
src/
├── contexts/
│   └── ThemeContext.tsx          # Contexto React para gestión de temas
├── components/ui/
│   └── ThemeToggler.tsx          # Componente de cambio de tema
├── app/styles/
│   ├── _variables.scss           # Variables de color y diseño
│   └── _mixins.scss              # Mixins para temas y utilidades
└── components/
    └── AvatarDropdown.tsx        # Ejemplo de implementación
```

### Flujo de Datos
1. **ThemeContext** maneja el estado global del tema
2. **localStorage** persiste la preferencia del usuario
3. **CSS Classes** se aplican al `body` y `html`
4. **SCSS Mixins** detectan el tema activo
5. **Componentes** reaccionan automáticamente

---

## ⚙️ Implementación Técnica

### 1. Contexto React (`ThemeContext.tsx`)

```typescript
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Cargar tema desde localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  useEffect(() => {
    // Aplicar tema al DOM
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
};
```

### 2. Clases CSS Aplicadas

**Light Mode:**
```html
<body>
<html data-theme="light">
```

**Dark Mode:**
```html
<body class="dark">
<html data-theme="dark" class="dark">
```

---

## 🎨 Sintaxis SCSS

### ⚠️ IMPORTANTE: Mixin Dark Mode NO FUNCIONA

**El mixin `@include dark-mode` NO funciona correctamente en este proyecto.**

**❌ NO USAR:**
```scss
@include dark-mode {
  background: $color-bg-dark;
  color: $color-text-dark-primary;
}
```

**✅ USAR EN SU LUGAR:**
```scss
:global(body.dark) & {
  background: $color-bg-dark;
  color: $color-text-dark-primary;
}
```

### Selector Directo (Recomendado)
```scss
:global(body.dark) {
    @content;
  }
}
```

### Uso en Componentes
```scss
.myComponent {
  background: rgba(241, 245, 249, 0.8);
  color: #1e293b;
  
  @include dark-mode {
    background: rgba(30, 30, 30, 0.8);
    color: #e2e8f0;
  }
}
```

### Variables de Color
```scss
// Light Mode Colors
$color-text-primary: #0D0D0D;
$color-text-secondary: #64748b;
$color-bg-glass: rgba(241, 245, 249, 0.8);
$color-border-light: #e4e4e7;

// Dark Mode Colors (aplicadas via mixin)
$color-text-dark-primary: #e2e8f0;
$color-text-dark-secondary: #94a3b8;
$color-bg-glass-dark: rgba(30, 30, 30, 0.8);
$color-border-dark: rgba(255, 255, 255, 0.1);
```

---

## 🎯 Variables de Color

### Paleta Principal

#### **Light Mode**
```scss
// Textos
$color-text-primary: #0D0D0D;        // Texto principal
$color-text-secondary: #64748b;       // Texto secundario
$color-text-muted: #6b7280;          // Texto atenuado

// Fondos
$color-bg-light: #F7F9FA;            // Fondo principal
$color-bg-glass: rgba(241, 245, 249, 0.8);  // Fondo cristalizado
$color-bg-glass-hover: rgba(241, 245, 249, 0.85);

// Bordes
$color-border-light: #e4e4e7;        // Bordes claros
$color-border-subtle: rgba(255, 255, 255, 0.2);
```

#### **Dark Mode**
```scss
// Textos
$color-text-dark-primary: #e2e8f0;   // Texto principal
$color-text-dark-secondary: #94a3b8; // Texto secundario
$color-text-dark-muted: #64748b;     // Texto atenuado

// Fondos
$color-bg-dark: #0f0f0f;             // Fondo principal
$color-bg-glass-dark: rgba(30, 30, 30, 0.8);  // Fondo cristalizado
$color-bg-glass-dark-hover: rgba(30, 30, 30, 0.85);

// Bordes
$color-border-dark: rgba(255, 255, 255, 0.1); // Bordes oscuros
$color-border-dark-subtle: rgba(255, 255, 255, 0.05);
```

### Colores de Estado

```scss
// Estados de disponibilidad
$status-available: #178d00;          // Verde - Disponible
$status-busy: #d32f2f;               // Rojo - Ocupado
$status-away: #f57c00;               // Naranja - Por terminar
$status-offline: #616161;            // Gris - Fuera

// Estados de interacción
$color-success: #22c55e;             // Verde - Éxito
$color-warning: #f59e0b;             // Amarillo - Advertencia
$color-error: #ef4444;               // Rojo - Error
$color-info: #3b82f6;                // Azul - Información
```

---

## 🔧 Mixins y Utilidades

### Mixins de Tema
```scss
// Mixin para dark mode
@mixin dark-mode {
  :global(body.dark) {
    @content;
  }
}

// Mixin para glassmorphism
@mixin glassmorphism($bg: $color-bg-glass, $border: $color-border-subtle, $blur: 8px) {
  background: $bg;
  border: 1px solid $border;
  backdrop-filter: blur($blur);
  -webkit-backdrop-filter: blur($blur);
}

// Mixin para neumorphism
@mixin neomorphic-shadow($mode: light) {
  @if $mode == light {
    box-shadow: 
      -4px -4px 8px rgba(255, 255, 255, 0.8),
      4px 4px 8px rgba(0, 0, 0, 0.05);
  } @else {
    box-shadow: 
      -4px -4px 8px rgba(0, 0, 0, 0.3),
      4px 4px 8px rgba(255, 255, 255, 0.05);
  }
}
```

### Mixins de Layout
```scss
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@mixin responsive($breakpoint) {
  @if $breakpoint == sm {
    @media (max-width: $breakpoint-sm) { @content; }
  } @else if $breakpoint == md {
    @media (max-width: $breakpoint-md) { @content; }
  }
}
```

---

## ⚛️ Contexto React

### Hook Personalizado
```typescript
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

### Uso en Componentes
```typescript
const MyComponent = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  
  return (
    <div className={styles.container}>
      <button onClick={toggleTheme}>
        {isDarkMode ? '☀️' : '🌙'}
      </button>
    </div>
  );
};
```

---

## 🎛️ Componente ThemeToggler

### Características
- **Animaciones suaves** con Framer Motion
- **Estilo neumórfico** con sombras dinámicas
- **Transiciones fluidas** entre estados
- **Accesibilidad** con ARIA labels

### Implementación
```typescript
const ThemeToggler = memo(() => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <motion.div
      className={styles.sunMoon}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="toggle"
        animate={{
          boxShadow: isDarkMode 
            ? '8px 8px 16px rgba(0, 0, 0, 0.6)' 
            : '-8px -4px 8px 0px #ffffff'
        }}
      >
        <input
          type="checkbox"
          checked={isDarkMode}
          onChange={toggleTheme}
        />
        <motion.div
          className="indicator"
          animate={{
            x: isDarkMode ? '25%' : '-75%',
            background: isDarkMode ? '#1a1a1a' : '#ecf0f3'
          }}
        />
      </motion.div>
    </motion.div>
  );
});
```

---

## 📋 Mejores Prácticas

### 1. **Estructura de Archivos SCSS**
```scss
// ✅ Correcto
.myComponent {
  // Estilos base (light mode)
  background: $color-bg-glass;
  color: $color-text-primary;
  
  // Dark mode
  @include dark-mode {
    background: $color-bg-glass-dark;
    color: $color-text-dark-primary;
  }
  
  // Estados
  &:hover {
    background: $color-bg-glass-hover;
    
    @include dark-mode {
      background: $color-bg-glass-dark-hover;
    }
  }
}
```

### 2. **Variables de Color**
```scss
// ✅ Usar variables del sistema
color: $color-text-primary;

// ❌ Evitar colores hardcodeados
color: #000000;
```

### 3. **Mixins Reutilizables**
```scss
// ✅ Crear mixins para patrones comunes
@mixin card-style {
  @include glassmorphism;
  border-radius: $radius-lg;
  padding: $spacing-lg;
}

// ✅ Usar en componentes
.myCard {
  @include card-style;
}
```

### 4. **Responsive Design**
```scss
// ✅ Combinar temas con responsive
.myComponent {
  @include glassmorphism;
  
  @include responsive(sm) {
    padding: $spacing-sm;
  }
  
  @include dark-mode {
    @include glassmorphism($color-bg-glass-dark, $color-border-dark);
  }
}
```

---

## 🎯 Ejemplos de Uso

### 1. **Botón Neumórfico**
```scss
.neumorphicButton {
  @include flex-center;
  padding: 12px 24px;
  border-radius: $radius-lg;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  
  // Light mode
  background: $color-bg-glass;
  @include neomorphic-shadow(light);
  
  &:hover {
    transform: translateY(-2px);
    @include neomorphic-shadow-hover(light);
  }
  
  // Dark mode
  @include dark-mode {
    background: $color-bg-glass-dark;
    @include neomorphic-shadow(dark);
    
    &:hover {
      @include neomorphic-shadow-hover(dark);
    }
  }
}
```

### 2. **Card Cristalizada**
```scss
.glassCard {
  @include glassmorphism;
  border-radius: $radius-xl;
  padding: $spacing-xl;
  
  @include dark-mode {
    @include glassmorphism($color-bg-glass-dark, $color-border-dark);
  }
  
  @include responsive(sm) {
    padding: $spacing-lg;
  }
}
```

### 3. **Input con Tema**
```scss
.themedInput {
  width: 100%;
  padding: 12px 16px;
  border-radius: $radius-md;
  border: 1px solid $color-border-light;
  background: $color-bg-glass;
  color: $color-text-primary;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: $color-primary;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  @include dark-mode {
    background: $color-bg-glass-dark;
    border-color: $color-border-dark;
    color: $color-text-dark-primary;
    
    &:focus {
      border-color: $color-primary;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
  }
}
```

---

## 🔍 Debugging y Testing

### 1. **Verificar Estado del Tema**
```javascript
// En consola del navegador
console.log('Body classes:', document.body.classList);
console.log('HTML data-theme:', document.documentElement.getAttribute('data-theme'));
console.log('localStorage theme:', localStorage.getItem('theme'));
```

### 2. **Forzar Tema para Testing**
```javascript
// Forzar dark mode
document.body.classList.add('dark');
document.documentElement.setAttribute('data-theme', 'dark');

// Forzar light mode
document.body.classList.remove('dark');
document.documentElement.setAttribute('data-theme', 'light');
```

### 3. **Inspeccionar Variables CSS**
```scss
// Agregar temporalmente para debug
.debug-theme {
  &::before {
    content: 'Theme: ' attr(data-theme);
    position: fixed;
    top: 10px;
    right: 10px;
    background: red;
    color: white;
    padding: 5px;
    z-index: 9999;
  }
}
```

---

## 🚀 Optimizaciones

### 1. **Performance**
- ✅ Usar `useMemo` para valores calculados
- ✅ Implementar `memo` en componentes que no cambian
- ✅ Evitar re-renders innecesarios

### 2. **Accesibilidad**
- ✅ Contraste adecuado (WCAG 2.1)
- ✅ ARIA labels en controles
- ✅ Soporte para `prefers-color-scheme`

### 3. **Mantenibilidad**
- ✅ Variables centralizadas
- ✅ Mixins reutilizables
- ✅ Documentación actualizada

---

## 📚 Recursos Adicionales

- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **CSS Custom Properties**: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- **Framer Motion**: https://www.framer.com/motion/
- **Sass Documentation**: https://sass-lang.com/documentation

---

*Última actualización: Diciembre 2024* 