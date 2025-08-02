# 🔥 Componente StreakCounter

## 📋 **Descripción**

Componente visual que muestra el contador de racha (streak) de un usuario. Incluye animaciones, tooltip informativo y diseño responsive. Inspirado en aplicaciones como Duolingo.

## 🎯 **Características**

- ✅ Icono de fuego animado
- ✅ Contador con número de días
- ✅ Animaciones de celebración
- ✅ Tooltip con estadísticas
- ✅ Diseño responsive
- ✅ Skeleton loading
- ✅ Soporte para múltiples usuarios

## 📦 **Uso**

### **Básico**
```typescript
import StreakCounter from '@/components/ui/StreakCounter';

const MyComponent = () => {
  return <StreakCounter />;
};
```

### **Con Usuario Específico**
```typescript
const UserProfile = ({ userId }) => {
  return <StreakCounter userId={userId} />;
};
```

### **Con Clase CSS Personalizada**
```typescript
const CustomStreak = () => {
  return <StreakCounter className="my-custom-class" />;
};
```

## 🔧 **API**

### **Props**

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `className` | `string` | No | Clase CSS adicional |
| `userId` | `string` | No | ID del usuario. Si no se proporciona, usa el usuario actual |

### **Estados**

1. **Loading**: Muestra skeleton mientras carga
2. **Sin Racha**: No se renderiza (streak = 0)
3. **Con Racha**: Muestra contador completo

## 🎨 **Diseño Visual**

### **Estructura**
```
┌─────────────────────────┐
│ 🔥 Racha 5 días        │
└─────────────────────────┘
```

### **Elementos**
- **Icono de fuego**: Animación de parpadeo
- **Texto "Racha"**: Label principal
- **Número**: Días de racha actual
- **Texto "días"**: Unidad de medida

### **Animaciones**
- **Fuego parpadeante**: Simula fuego real
- **Contador escalado**: Al cambiar número
- **Celebración**: Sparkles al incrementar
- **Hover effects**: Efectos al pasar mouse

### **Tooltip**
```
┌─────────────────────────┐
│ Racha actual: 5 días   │
│ Mejor racha: 12 días   │
│ Total de días: 45      │
└─────────────────────────┘
```

## 📱 **Responsive Design**

### **Desktop**
- Padding: 10px 14px
- Icono: 24x24px
- Fuente números: 18px
- Fuente labels: 10px

### **Mobile**
- Padding: 8px 12px
- Icono: 20x20px
- Fuente números: 16px
- Fuente labels: 9px

## 🎮 **Interacciones**

### **Hover**
- Tooltip aparece
- Efectos de elevación
- Transiciones suaves

### **Animaciones**
- **Incremento**: Escala y sparkles
- **Carga**: Skeleton shimmer
- **Entrada**: Fade in con escala

## 🔄 **Integración**

### **Con useStreak Hook**
```typescript
const StreakCounter = ({ userId }) => {
  const { streakData, updateStreak, isLoading } = useStreak(userId);
  
  // Lógica de renderizado
  if (isLoading) return <Skeleton />;
  if (streakData.currentStreak === 0) return null;
  
  return <StreakDisplay />;
};
```

### **Con ProfileCard**
```typescript
const ProfileCard = ({ userId }) => {
  return (
    <div className="profile-card">
      <StreakCounter userId={userId} />
      {/* Otros componentes */}
    </div>
  );
};
```

## 🎨 **Estilos**

### **Colores**
- **Fondo**: Gradiente naranja-rojo
- **Texto**: Blanco
- **Icono**: Blanco con sombra
- **Tooltip**: Negro semi-transparente

### **Efectos**
- **Glassmorphism**: Efecto cristalizado
- **Box-shadow**: Sombras múltiples
- **Backdrop-filter**: Desenfoque de fondo
- **Transform**: Escalas y rotaciones

## 🐛 **Debug**

### **Estados de Debug**
```typescript
console.log('StreakCounter Debug:', {
  userId,
  streakData,
  isLoading,
  isVisible
});
```

### **Logs Automáticos**
- Carga de datos
- Actualizaciones de streak
- Errores de renderizado

## ⚡ **Performance**

### **Optimizaciones**
- ✅ Lazy loading de animaciones
- ✅ Debounce en hover
- ✅ Memoización de componentes
- ✅ Cleanup de animaciones

### **Consideraciones**
- Animaciones solo en desktop
- Reducir motion en mobile
- Optimizar SVG paths

## 🚨 **Casos Edge**

### **Datos Inválidos**
- Streak negativo → Mostrar 0
- Fechas inválidas → Resetear
- Usuario no encontrado → Skeleton

### **Estados de Error**
- Error de red → Fallback UI
- Datos corruptos → Reset automático
- Timeout → Mostrar error

## 📊 **Accesibilidad**

### **ARIA Labels**
```typescript
<button aria-label="Contador de racha">
  <span aria-label={`${streak} días de racha`}>
    {streak}
  </span>
</button>
```

### **Navegación por Teclado**
- Focus visible
- Enter para abrir tooltip
- Escape para cerrar

### **Screen Readers**
- Descripción del streak
- Estado actual
- Acciones disponibles

## 🔧 **Mantenimiento**

### **Testing**
```typescript
// Test de renderizado
test('renders streak counter', () => {
  render(<StreakCounter userId="test" />);
  expect(screen.getByText('Racha')).toBeInTheDocument();
});

// Test de animaciones
test('animates on streak increase', () => {
  // Test de animaciones
});
```

### **Monitoreo**
- Performance de animaciones
- Uso de memoria
- Errores de renderizado

## 📈 **Analytics**

### **Eventos Rastreados**
- Streak incrementado
- Streak roto
- Tooltip abierto
- Animación completada

### **Métricas**
- Tiempo de carga
- Interacciones por usuario
- Errores de renderizado

## 🎯 **Roadmap**

### **Futuras Mejoras**
- [ ] Notificaciones push
- [ ] Logros por rachas
- [ ] Leaderboard
- [ ] Estadísticas avanzadas
- [ ] Temas personalizables

### **Optimizaciones**
- [ ] Lazy loading mejorado
- [ ] Animaciones más suaves
- [ ] Mejor accesibilidad
- [ ] Soporte para RTL

---

**Versión**: 1.0.0
**Última actualización**: Agosto 2025
**Autor**: Sistema de Racha Aurin 