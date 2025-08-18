# Configuración del Sistema de Email y Notificaciones

## Variables de Entorno Requeridas

Para que el sistema de notificaciones por email funcione correctamente, necesitas configurar las siguientes variables de entorno:

### 1. Configuración de Email (Gmail)

```bash
# Usuario de Gmail
EMAIL_USER=sodioinfo@gmail.com

# Contraseña de aplicación (NO tu contraseña normal de Gmail)
EMAIL_PASS=your_app_password_here
```

**⚠️ IMPORTANTE**: Para Gmail, debes usar una "App Password" en lugar de tu contraseña normal:

1. Ve a tu [Cuenta de Google](https://myaccount.google.com/)
2. Navega a **Seguridad** > **Verificación en 2 pasos**
3. En la parte inferior, selecciona **Contraseñas de aplicación**
4. Genera una nueva contraseña para "Sodio Task App"
5. Usa esa contraseña en `EMAIL_PASS`

### 2. URL de la Aplicación

```bash
# URL de tu aplicación (para enlaces en emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Firebase Configuration

```bash
# ID del proyecto de Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

### 4. Clerk Configuration

```bash
# Clave secreta de Clerk
CLERK_SECRET_KEY=your_clerk_secret_key
```

## Archivo .env.local

Crea un archivo `.env.local` en la raíz de tu proyecto con el siguiente contenido:

```bash
# Email Configuration
EMAIL_USER=sodioinfo@gmail.com
EMAIL_PASS=abcd_efgh_ijkl_mnop

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Clerk
CLERK_SECRET_KEY=sk_test_...
```

## Verificación de Configuración

El sistema incluye validación automática de configuración. Si alguna variable crítica falta, verás errores en la consola indicando qué variables necesitas configurar.

## Testing

Para probar el sistema:

1. Asegúrate de que todas las variables estén configuradas
2. Crea una tarea nueva o envía un mensaje
3. Verifica que los usuarios involucrados reciban:
   - Notificación en la aplicación
   - Email de notificación

## Troubleshooting

### Error: "Missing required environment variables"
- Verifica que todas las variables estén configuradas en `.env.local`
- Reinicia el servidor de desarrollo después de cambiar las variables

### Error: "Authentication failed" en Gmail
- Verifica que `EMAIL_PASS` sea una App Password válida
- Asegúrate de que la verificación en 2 pasos esté habilitada en tu cuenta de Google

### Emails no se envían
- Verifica los logs en la consola del servidor
- Confirma que los usuarios tengan emails válidos en Clerk
- Verifica que `CLERK_SECRET_KEY` sea correcta

## Seguridad

- **NUNCA** commits las variables de entorno al repositorio
- Usa `.env.local` para desarrollo local
- En producción, configura las variables en tu plataforma de hosting
- Las App Passwords de Gmail son más seguras que las contraseñas normales
