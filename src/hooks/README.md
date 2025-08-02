# 🔥 Hook useStreak

## 📋 **Descripción**

Hook personalizado que maneja toda la lógica del sistema de racha (streak) de usuarios. Permite rastrear días consecutivos de acceso al perfil y mantener estadísticas de engagement.

## 🎯 **Funcionalidades**

- ✅ Rastrear días consecutivos de acceso
- ✅ Calcular mejor racha histórica
- ✅ Contar total de días de actividad
- ✅ Sincronización en tiempo real con Firestore
- ✅ Soporte para múltiples usuarios
- ✅ Logs de debug detallados

## 📦 **Uso**

### **Básico (Usuario Actual)**
```typescript
import { useStreak } from '@/hooks/useStreak';

const MyComponent = () => {
  const { streakData, updateStreak, isLoading } = useStreak();
  
  return (
    <div>
      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <p>Tu racha: {streakData.currentStreak} días</p>
      )}
    </div>
  );
};
```

### **Usuario Específico**
```typescript
const OtherUserStreak = ({ userId }) => {
  const { streakData, isLoading } = useStreak(userId);
  
  return (
    <div>
      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <p>Racha de {userId}: {streakData.currentStreak} días</p>
      )}
    </div>
  );
};
```

## 🔧 **API**

### **Parámetros**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `targetUserId` | `string` | No | ID del usuario. Si no se proporciona, usa el usuario actual |

### **Retorno**

```typescript
{
  streakData: {
    currentStreak: number;      // Racha actual (0 = sin racha)
    longestStreak: number;      // Mejor racha histórica
    lastAccessDate: string;     // Última fecha de acceso
    totalAccessDays: number;    // Total de días de acceso
  };
  updateStreak: () => Promise<void>;  // Función para actualizar streak
  isLoading: boolean;                  // Estado de carga
  isUpdating: boolean;                 // Estado de actualización
}
```

## 🎮 **Lógica del Streak**

### **Reglas**
1. **Streak = 0**: Sin racha (no se muestra contador)
2. **Streak = 1**: Primer día de racha
3. **Streak > 1**: Días consecutivos
4. **Un día sin conexión**: Rompe racha (reset a 0)
5. **Conexión después de romper**: Inicia nueva racha (streak = 1)

### **Algoritmo**
```typescript
if (esPrimeraVezHoy) {
  if (nuncaAccedioAntes) {
    streak = 1; // Iniciar racha
  } else if (accedioAyer) {
    streak += 1; // Continuar racha
  } else {
    streak = 0; // Romper racha
  }
}
```

## 📊 **Estructura de Datos**

### **Firestore Schema**
```typescript
interface UserStreak {
  currentStreak: number;      // Racha actual
  longestStreak: number;      // Mejor racha
  lastAccessDate: string;     // Último acceso (YYYY-MM-DD)
  totalAccessDays: number;    // Total de días
}
```

### **Valores por Defecto**
```typescript
{
  currentStreak: 0,
  longestStreak: 0,
  lastAccessDate: null,
  totalAccessDays: 0
}
```

## 🔄 **Flujo de Actualización**

1. **Usuario accede al perfil**
2. **Hook detecta acceso**
3. **Valida si es primera vez hoy**
4. **Calcula nueva racha**
5. **Actualiza Firestore**
6. **Sincroniza en tiempo real**

## 🐛 **Debug**

### **Logs Automáticos**
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

### **Estados de Debug**
- `isLoading`: Cargando datos iniciales
- `isUpdating`: Actualizando streak
- `streakData`: Datos actuales del streak

## ⚡ **Performance**

### **Optimizaciones**
- ✅ Sincronización real-time con onSnapshot
- ✅ Actualización solo cuando es necesario
- ✅ Debounce en actualizaciones
- ✅ Cache local de datos

### **Consideraciones**
- Una actualización por día por usuario
- Logs solo en desarrollo
- Manejo de errores robusto

## 🚨 **Casos Edge**

### **Manejo de Errores**
```typescript
try {
  await updateStreak();
} catch (error) {
  console.error('[useStreak] Error:', error);
  // Fallback: mantener datos anteriores
}
```

### **Zona Horaria**
- Usa UTC para consistencia
- Maneja cambios de zona horaria
- Valida fechas correctamente

### **Datos Corruptos**
- Valida estructura de datos
- Resetea datos inválidos
- Logs de recuperación

## 📱 **Integración**

### **Con StreakCounter**
```typescript
const StreakCounter = ({ userId }) => {
  const { streakData, updateStreak, isLoading } = useStreak(userId);
  // Renderizar componente visual
};
```

### **Con ProfileCard**
```typescript
const ProfileCard = ({ userId }) => {
  return (
    <div>
      <StreakCounter userId={userId} />
      {/* Otros componentes */}
    </div>
  );
};
```

## 🔧 **Mantenimiento**

### **Limpieza de Datos**
```typescript
// Script para resetear datos incorrectos
import { resetStreaks } from '@/scripts/resetStreaks';
resetStreaks();
```

### **Monitoreo**
- Revisar logs en consola
- Verificar datos en Firestore
- Validar actualizaciones correctas

## 📈 **Métricas**

### **Datos Recolectados**
- Días consecutivos de acceso
- Mejor racha histórica
- Total de días de actividad
- Frecuencia de uso

### **Insights**
- Usuarios más comprometidos
- Patrones de uso
- Efectividad de gamificación

---

**Versión**: 1.0.0
**Última actualización**: Agosto 2025
**Autor**: Sistema de Racha Aurin 