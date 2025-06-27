# Sistema de Estados Online/Offline

## Descripción
Este sistema maneja automáticamente los estados de los usuarios basándose en su actividad en la aplicación.

## Estados Disponibles

### Estados Online (persisten entre sesiones):
- **Disponible** (verde) - Usuario está disponible para trabajar
- **Ocupado** (rojo) - Usuario está ocupado con tareas
- **Por terminar** (naranja) - Usuario está terminando algo

### Estado Offline (se resetea automáticamente):
- **Fuera** (gris) - Usuario está offline o configurado manualmente

## Lógica del Sistema

### Detección Online/Offline:
- **Online**: Al menos 1 pestaña con sesión iniciada (puede estar en segundo plano)
- **Offline**: 0 pestañas abiertas → automáticamente "Fuera"

### Reset Automático:
- **A las 12:00 AM**: Cualquier estado se resetea a "Disponible" (solo si hay pestaña abierta)
- **Sin pestañas abiertas**: El estado "Fuera" persiste hasta que el usuario vuelva a abrir la app

### Persistencia:
- Los estados online persisten entre sesiones
- El estado "Fuera" se resetea automáticamente a las 12am

## Implementación

### Archivos Modificados:
1. `src/hooks/useOnlineStatus.ts` - Hook para manejar estado online/offline
2. `src/components/AvatarDropdown.tsx` - Integración del hook
3. `src/app/api/reset-status/route.ts` - API para reset automático

### Configuración del Cron Job:

#### Opción 1: Cron del sistema (producción) - RECOMENDADO
```bash
# Agregar al crontab
0 0 * * * curl -X POST https://tu-dominio.com/api/reset-status -H "Authorization: Bearer tu-token"
```

#### Opción 2: Servicios de cron (Vercel, Netlify, etc.)
Configurar un cron job que llame a `/api/reset-status` a las 12:00 AM

#### Opción 3: Servicios externos (cron-job.org, EasyCron)
Ver documentación completa en `docs/CRON_SETUP.md`

## Variables de Entorno

```env
API_TOKEN=tu-token-secreto
API_URL=https://tu-dominio.com/api/reset-status
```

## Campos de Firestore

### Colección: `users`
- `status`: string - Estado actual del usuario
- `lastOnlineAt`: timestamp - Última vez que estuvo online
- `lastStatusReset`: timestamp - Último reset automático

## Flujo de Usuario

1. **Usuario abre la app** → Online (mantiene estado anterior o "Disponible")
2. **Usuario cambia estado** → Se actualiza en tiempo real
3. **Usuario cierra todas las pestañas** → Offline (automáticamente "Fuera")
4. **Usuario vuelve a abrir** → Online (mantiene estado anterior)
5. **A las 12:00 AM** → Reset automático a "Disponible" (si hay pestaña abierta)

## Notas Importantes

- El sistema funciona con múltiples pestañas (sincronización automática)
- Los estados se sincronizan en tiempo real entre todas las pestañas
- El reset a las 12am solo afecta si hay al menos una pestaña abierta
- El estado "Fuera" manual persiste hasta las 12am del día siguiente 