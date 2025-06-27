# Configuración del Cron Job para Reset de Estados

## Opción 1: Cron del Sistema (Recomendado para Producción)

### Linux/Mac:
```bash
# Editar el crontab
crontab -e

# Agregar esta línea para ejecutar a las 12:00 AM todos los días
0 0 * * * curl -X POST https://tu-dominio.com/api/reset-status -H "Authorization: Bearer tu-token-secreto"
```

### Windows (Task Scheduler):
1. Abrir "Task Scheduler"
2. Crear nueva tarea
3. Programar para ejecutarse diariamente a las 12:00 AM
4. Acción: Ejecutar programa
5. Programa: `curl`
6. Argumentos: `-X POST https://tu-dominio.com/api/reset-status -H "Authorization: Bearer tu-token-secreto"`

## Opción 2: Servicios de Hosting

### Vercel:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/reset-status",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Netlify:
```toml
# netlify.toml
[functions]
  directory = "functions"

[[headers]]
  for = "/api/reset-status"
  [headers.values]
    Authorization = "Bearer tu-token-secreto"
```

### Railway/Render:
Configurar un cron job que llame a la API endpoint.

## Opción 3: Servicios de Cron Externos

### Cron-job.org:
1. Crear cuenta en cron-job.org
2. Agregar nueva tarea
3. URL: `https://tu-dominio.com/api/reset-status`
4. Método: POST
5. Headers: `Authorization: Bearer tu-token-secreto`
6. Programar: Diariamente a las 12:00 AM

### EasyCron:
1. Crear cuenta en EasyCron
2. Configurar tarea similar a cron-job.org

## Variables de Entorno Requeridas

```env
# En tu servidor/hosting
API_TOKEN=tu-token-secreto-muy-seguro
```

## Verificación

Para verificar que el cron job funciona:

```bash
# Llamada manual de prueba
curl -X POST https://tu-dominio.com/api/reset-status \
  -H "Authorization: Bearer tu-token-secreto" \
  -H "Content-Type: application/json"
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Status reset completed for X users"
}
```

## Notas Importantes

1. **Zona Horaria**: Asegúrate de que el cron job use la zona horaria correcta
2. **Token Seguro**: Usa un token largo y aleatorio para la autorización
3. **Logs**: Revisa los logs del servidor para verificar que se ejecute correctamente
4. **Backup**: Considera tener un backup del cron job en caso de fallos 