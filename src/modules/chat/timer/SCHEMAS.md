# Timer Module - Schemas Documentation

> Última actualización: 2 de diciembre de 2025

## Resumen de Colecciones

```
tasks/{taskId}                    → Documento de tarea (incluye timeTracking)
tasks/{taskId}/timers/{userId}    → Timer activo por usuario
tasks/{taskId}/time_logs/{logId}  → Entradas individuales de tiempo
tasks/{taskId}/messages/{msgId}   → Mensajes de chat (incluye timelogs legacy)
```

---

## 1. TimeTracking (Campo en Task)

**Ubicación:** `tasks/{taskId}.timeTracking`

Campo estructurado en el documento de tarea para acceso rápido a totales.

```typescript
interface TimeTracking {
  totalHours: number;              // Suma total de horas
  totalMinutes: number;            // Minutos restantes (0-59)
  lastLogDate: Timestamp | null;   // Última entrada de tiempo
  memberHours?: {                  // Horas por miembro
    [userId: string]: number;
  };
}
```

**Ejemplo Firestore:**
```json
{
  "timeTracking": {
    "totalHours": 5,
    "totalMinutes": 30,
    "lastLogDate": "2025-12-02T15:30:00Z",
    "memberHours": {
      "user_abc123": 3,
      "user_xyz789": 2.5
    }
  }
}
```

---

## 2. TimeLog (Subcolección time_logs)

**Ubicación:** `tasks/{taskId}/time_logs/{logId}`

Cada entrada individual de tiempo registrado.

```typescript
interface TimeLog {
  id: string;                      // Auto-generado por Firestore
  userId: string;                  // ID del usuario
  userName: string;                // Nombre (denormalizado)
  startTime: Timestamp | null;     // Inicio (opcional para manuales)
  endTime: Timestamp | null;       // Fin (opcional para manuales)
  durationMinutes: number;         // Duración en minutos
  description: string;             // Descripción del trabajo
  dateString: string;              // Fecha "YYYY-MM-DD"
  createdAt: Timestamp;            // Cuándo se creó el log
  source: 'timer' | 'manual' | 'legacy';  // Origen del registro
}
```

**Ejemplo Firestore:**
```json
{
  "userId": "user_2y40r8oOP4NdMrwUg3yLeJwGfr8",
  "userName": "Karen Ortiz",
  "startTime": null,
  "endTime": null,
  "durationMinutes": 120,
  "description": "Ajuste de colores en el UI",
  "dateString": "2025-12-02",
  "createdAt": "2025-12-02T15:30:00Z",
  "source": "manual"
}
```

---

## 3. TimerDocument (Subcolección timers)

**Ubicación:** `tasks/{taskId}/timers/{userId}`

Timer activo de un usuario en una tarea.

```typescript
interface TimerDocument {
  id: string;                      // Mismo que userId
  userId: string;                  // Usuario dueño
  taskId: string;                  // Tarea asociada
  status: 'idle' | 'running' | 'paused' | 'stopped';
  startedAt: Timestamp | null;     // Cuándo inició
  pausedAt: Timestamp | null;      // Cuándo pausó
  totalSeconds: number;            // Segundos acumulados
  intervals: TimerInterval[];      // Sesiones de trabajo
  deviceId: string;                // Dispositivo que modificó
  lastSync: Timestamp;             // Última sincronización
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface TimerInterval {
  start: Timestamp;
  end: Timestamp;
  duration: number;  // en segundos
}
```

---

## 4. Campos Legacy (Backward Compatibility)

⚠️ **DEPRECATED** - Mantenidos para compatibilidad con código existente.

**Ubicación:** `tasks/{taskId}`

```typescript
// En el documento de tarea (nivel raíz)
{
  totalHours?: number;             // @deprecated → usar timeTracking.totalHours
  memberHours?: {                  // @deprecated → usar timeTracking.memberHours
    [userId: string]: number;
  };
}
```

**Nota:** El servicio `createTimeLog()` actualiza AMBOS:
- ✅ Nuevos campos: `timeTracking.totalHours`, `timeTracking.memberHours`
- ✅ Legacy: `totalHours`, `memberHours`

---

## 5. TimeLog en Messages (Legacy Visual)

**Ubicación:** `tasks/{taskId}/messages/{msgId}`

Mensajes de chat con tiempo registrado (solo para historial visual).

```typescript
// Mensaje con timelog
{
  senderId: string;
  senderName: string;
  hours: number;           // Horas registradas
  dateString: string;      // Fecha del registro
  text?: string;           // Comentario opcional
  timestamp: Timestamp;
  // ... otros campos de mensaje
}
```

**Nota:** Estos mensajes NO afectan los cálculos de tiempo. Son solo visuales.

---

## Flujo de Creación de TimeLog

```
Usuario registra tiempo
        ↓
createTimeLog(taskId, input)
        ↓
    ┌───────────────────────────────────────┐
    │  TRANSACTION (atómica)                │
    │                                       │
    │  1. Crear doc en time_logs/{logId}    │
    │  2. Actualizar task.timeTracking      │
    │  3. Actualizar task.totalHours        │  ← legacy
    │  4. Actualizar task.memberHours       │  ← legacy
    └───────────────────────────────────────┘
        ↓
sendTimeLogMessage() → Mensaje visual en chat
```

---

## Constantes Importantes

```typescript
// Colecciones
TASKS_COLLECTION_NAME = 'tasks'
TIMER_COLLECTION_NAME = 'timers'
TIME_LOGS_COLLECTION_NAME = 'time_logs'

// Campos Firestore
FIRESTORE_FIELDS = {
  TIME_TRACKING: 'timeTracking',
  TIME_TRACKING_TOTAL_HOURS: 'timeTracking.totalHours',
  TIME_TRACKING_TOTAL_MINUTES: 'timeTracking.totalMinutes',
  TIME_TRACKING_LAST_LOG_DATE: 'timeTracking.lastLogDate',
  TOTAL_HOURS: 'totalHours',      // legacy
  MEMBER_HOURS: 'memberHours',    // legacy
  // ...
}
```

---

## Migración de Datos Legacy

Para migrar timelogs de mensajes existentes a la nueva estructura:

```typescript
import { migrateLegacyTimeLogs, recalculateTimeTracking } from '@/modules/chat/timer';

// Migrar mensajes con hours > 0 a time_logs
await migrateLegacyTimeLogs(taskId);

// Recalcular totales desde time_logs
await recalculateTimeTracking(taskId);
```

---

## Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `types/timer.types.ts` | Definiciones TypeScript |
| `services/timeLogFirebase.ts` | CRUD de time_logs |
| `services/timerFirebase.ts` | CRUD de timers |
| `utils/timerConstants.ts` | Constantes y campos |
| `hooks/useTimeEntry.ts` | Hook para entradas manuales |
