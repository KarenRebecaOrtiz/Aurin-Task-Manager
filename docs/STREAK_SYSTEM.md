# 🔥 Sistema de Racha (Streak) - Documentación

## 📋 **Descripción General**

El sistema de racha es una funcionalidad gamificada que rastrea los días consecutivos que un usuario accede a su perfil. Inspirado en aplicaciones como Duolingo, motiva la consistencia y el uso regular de la plataforma.

## 🎯 **Objetivos del Sistema**

- **Motivar consistencia**: Recompensar el uso diario de la plataforma
- **Gamificación**: Hacer el uso de la app más entretenido
- **Competencia social**: Permitir ver las rachas de otros usuarios
- **Métricas de engagement**: Medir qué tan activos son los usuarios

## 🔧 **Componentes del Sistema**

### **1. Hook `useStreak`**
- **Ubicación**: `src/hooks/useStreak.ts`
- **Función**: Maneja toda la lógica del streak
- **Parámetros**: `targetUserId` (opcional) - para mostrar streak de otros usuarios

### **2. Componente `StreakCounter`**
- **Ubicación**: `src/components/ui/StreakCounter.tsx`
- **Función**: Interfaz visual del contador de racha
- **Características**: Animaciones, tooltip, responsive design

### **3. Script de Limpieza**
- **Ubicación**: `src/scripts/resetStreaks.ts`
- **Función**: Resetear datos incorrectos en Firestore

## 📊 **Estructura de Datos en Firestore**

```typescript
interface StreakData {
  currentStreak: number;      // Racha actual (0 = sin racha)
  longestStreak: number;      // Mejor racha histórica
  lastAccessDate: string;     // Última fecha de acceso (YYYY-MM-DD)
  totalAccessDays: number;    // Total de días de acceso
}
```

### **Valores por Defecto**
```typescript
{
  currentStreak: 0,           // Sin racha
  longestStreak: 0,           // Sin récord
  lastAccessDate: null,       // Nunca accedió
  totalAccessDays: 0          // Sin días de acceso
}
```

## 🎮 **Lógica del Sistema**

### **Reglas de la Racha**

1. **Streak = 0**: Sin racha (no se muestra el contador)
2. **Streak = 1**: Primer día de racha
3. **Streak > 1**: Días consecutivos de racha
4. **Un día sin conexión**: Rompe la racha (reset a 0)
5. **Conexión después de romper**: Inicia nueva racha (streak = 1)

### **Algoritmo de Actualización**

```typescript
// Se ejecuta cada vez que un usuario accede a su perfil
if (esPrimeraVezHoy) {
  if (nuncaAccedioAntes) {
    streak = 1; // Iniciar racha
  } else if (accedioAyer) {
    streak += 1; // Continuar racha
  } else {
    streak = 0; // Romper racha
  }
  
  // Actualizar mejor racha si es necesario
  if (streak > longestStreak) {
    longestStreak = streak;
  }
  
  // Incrementar total de días
  totalAccessDays += 1;
}
```

### **Validaciones de Fechas**

```typescript
// Verificar si dos fechas son consecutivas
const areConsecutiveDays = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
};

// Verificar si es el mismo día
const isSameDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.toDateString() === d2.toDateString();
};
```

## 🎨 **Interfaz Visual**

### **Estados del StreakCounter**

1. **Sin Racha (streak = 0)**
   - No se muestra el componente
   - Usuario no tiene racha activa

2. **Con Racha (streak > 0)**
   - Muestra icono de fuego animado
   - Contador con número de días
   - Texto "Racha" y "días"
   - Animaciones de celebración al incrementar

### **Animaciones**

- **Fuego parpadeante**: Simula fuego real
- **Contador animado**: Escala al cambiar el número
- **Celebración**: Sparkles cuando aumenta la racha
- **Hover effects**: Efectos al pasar el mouse

### **Tooltip Informativo**

Muestra al hacer hover:
- Racha actual
- Mejor racha histórica
- Total de días de acceso

## 🔄 **Flujo de Actualización**

### **1. Acceso al Perfil**
```typescript
// En ProfileCard.tsx
<StreakCounter userId={userId} />
```

### **2. Hook Detecta Acceso**
```typescript
// En useStreak.ts
useEffect(() => {
  if (!isLoading) {
    updateStreak(); // Actualizar streak
  }
}, [isLoading]);
```

### **3. Validación de Fechas**
```typescript
// Verificar si es primera vez hoy
if (!lastAccessDate || !isSameDay(lastAccessDate, today)) {
  // Procesar actualización
}
```

### **4. Actualización en Firestore**
```typescript
await updateDoc(userDocRef, {
  currentStreak: newStreak,
  longestStreak: newLongestStreak,
  lastAccessDate: today,
  totalAccessDays: newTotal
});
```

## 🐛 **Debug y Logs**

### **Logs de Debug**
```typescript
console.log('[useStreak] Debug:', {
  userId,
  currentDate,
  lastAccessDate,
  yesterdayStr,
  areConsecutive,
  isSameAsYesterday
});
```

### **Script de Limpieza**
```typescript
// Ejecutar en consola del navegador
import { resetStreaks } from '@/scripts/resetStreaks';
resetStreaks();
```

## 📱 **Responsive Design**

### **Desktop**
- Padding: 10px 14px
- Icono: 24x24px
- Fuente: 18px para números

### **Mobile**
- Padding: 8px 12px
- Icono: 20x20px
- Fuente: 16px para números

## 🎯 **Casos de Uso**

### **Usuario Nuevo**
1. Accede por primera vez
2. `currentStreak = 1`
3. `lastAccessDate = "2025-08-02"`
4. Se muestra contador con "1 día"

### **Usuario Consistente**
1. Accede día 1: `streak = 1`
2. Accede día 2: `streak = 2`
3. Accede día 3: `streak = 3`
4. Continúa incrementando...

### **Usuario que Rompe Racha**
1. Accede día 1: `streak = 1`
2. Accede día 2: `streak = 2`
3. **No accede día 3**: `streak = 0` (rompe racha)
4. Accede día 4: `streak = 1` (nueva racha)

### **Visualización de Otros Usuarios**
- Muestra racha de cualquier usuario
- No actualiza su streak (solo lectura)
- Permite comparar rachas entre usuarios

## 🔧 **Mantenimiento**

### **Limpieza de Datos**
```bash
# Ejecutar script de limpieza
npm run reset-streaks
```

### **Monitoreo**
- Revisar logs en consola
- Verificar datos en Firestore
- Validar animaciones funcionando

### **Optimizaciones Futuras**
- [ ] Notificaciones push para mantener racha
- [ ] Logros por rachas específicas (7 días, 30 días, etc.)
- [ ] Leaderboard de mejores rachas
- [ ] Estadísticas más detalladas

## 🚨 **Consideraciones Importantes**

1. **Zona Horaria**: Usar UTC para consistencia
2. **Una vez por día**: Solo cuenta un acceso por día
3. **Datos persistentes**: Se guardan en Firestore
4. **Sincronización**: Real-time con onSnapshot
5. **Performance**: Optimizado para no sobrecargar

## 📈 **Métricas y Analytics**

### **Datos Recolectados**
- Días consecutivos de acceso
- Mejor racha histórica
- Total de días de actividad
- Frecuencia de uso

### **Insights Posibles**
- Usuarios más comprometidos
- Patrones de uso
- Efectividad de gamificación
- Engagement por cohorte

---

**Última actualización**: Agosto 2025
**Versión**: 1.0.0
**Autor**: Sistema de Racha Aurin 