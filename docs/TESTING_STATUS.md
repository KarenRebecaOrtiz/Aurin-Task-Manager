# Testing del Sistema de Estados Online/Offline

## Sistema Automático de Detección

El sistema ahora funciona de forma automática:

1. **Cada usuario actualiza su propio estado** usando el hook `useOnlineStatus`
2. **Un cron job ejecuta cada 5 minutos** la API `/api/auto-detect-inactive` que:
   - Detecta usuarios sin `lastOnlineAt` y los marca como "Fuera"
   - Detecta usuarios inactivos por más de 5 minutos y los marca como "Fuera"
3. **Un cron job ejecuta a las 12am** la API `/api/reset-status` que resetea estados "Fuera" a "Disponible"

## Pruebas Manuales

### 1. Probar Detección Automática de Usuarios Inactivos

```bash
# Llamar a la API para detectar usuarios inactivos
curl -X POST https://tu-dominio.com/api/auto-detect-inactive \
  -H "Authorization: Bearer tu-token-secreto" \
  -H "Content-Type: application/json"
```

### 2. Probar Reset de Estados

```bash
# Llamar a la API para resetear estados
curl -X POST https://tu-dominio.com/api/reset-status \
  -H "Authorization: Bearer tu-token-secreto" \
  -H "Content-Type: application/json"
```

## Debug en el Navegador

### 1. Abrir la consola del navegador
### 2. Buscar logs de UserSwiper:
```
[UserSwiper] User statuses updated: {userId: "status"}
```

## Verificación de Estados

### Estados Esperados:

1. **Usuario Activo** (pestaña abierta):
   - `status`: "Disponible", "Ocupado", "Por terminar", o "Fuera" (manual)
   - `lastOnlineAt`: Timestamp reciente (últimos 30 segundos)

2. **Usuario Inactivo** (pestaña cerrada por más de 5 minutos):
   - `status`: "Fuera"
   - `lastOnlineAt`: Timestamp de hace más de 5 minutos

3. **Después de las 12am**:
   - `status`: "Disponible" (si hay pestaña abierta)
   - `lastStatusReset`: Timestamp de hoy

## Configuración de Vercel

El sistema usa cron jobs de Vercel:

- **Cada 5 minutos**: Detecta usuarios inactivos automáticamente
- **Cada día a las 12am**: Resetea estados "Fuera" a "Disponible"

## Variables de Entorno Requeridas

Para que la detección automática funcione, necesitas configurar Firebase Admin SDK:

```env
FIREBASE_PROJECT_ID=tu-proyecto-id
FIREBASE_CLIENT_EMAIL=tu-service-account-email
FIREBASE_PRIVATE_KEY=tu-private-key
```

## Debugging

### Verificar en Firestore:

```javascript
// En la consola de Firebase
const usersRef = collection(db, 'users');
const snapshot = await getDocs(usersRef);
snapshot.forEach(doc => {
  const data = doc.data();
  console.log(`Usuario ${doc.id}:`, {
    status: data.status,
    lastOnlineAt: data.lastOnlineAt,
    lastStatusReset: data.lastStatusReset
  });
});
```

### Logs del Sistema:

1. **UserSwiper**: Debería mostrar actualizaciones de estado
2. **UserAvatar**: Debería mostrar puntos de estado con colores correctos
3. **AvatarDropdown**: Debería mostrar el estado actual del usuario

## Problemas Comunes

### Todos aparecen como "Online":
- Verificar que el cron job `/api/detect-inactive-users` esté funcionando
- Verificar que `lastOnlineAt` se esté actualizando
- Verificar que el hook `useOnlineStatus` esté funcionando

### Estados no se actualizan:
- Verificar que `onSnapshot` esté funcionando en UserSwiper y UserAvatar
- Verificar conexión a Firestore
- Verificar permisos de lectura/escritura

### Cron jobs no funcionan:
- Verificar que `vercel.json` esté desplegado
- Verificar logs en Vercel Dashboard
- Verificar que las APIs respondan correctamente

## Configuración de Desarrollo

Para probar localmente:

```bash
# Simular usuario inactivo (cambiar lastOnlineAt a hace 10 minutos)
# Luego llamar a la API de detección

# Simular reset de estados (cambiar lastStatusReset a ayer)
# Luego llamar a la API de reset
``` 