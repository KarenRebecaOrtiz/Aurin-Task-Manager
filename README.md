# 🚀 Sodio Task App

Una aplicación moderna de gestión de tareas con sistema de notificaciones avanzado y integración de email.

## ✨ Características Principales

### 🎯 Gestión de Tareas
- Creación y edición de tareas con información detallada
- Sistema de asignación y roles de equipo
- Kanban board para visualización de flujo de trabajo
- Archivo y eliminación de tareas
- Seguimiento de tiempo y actividad

### 🔔 Sistema de Notificaciones Avanzado
- **Notificaciones en tiempo real** para todas las acciones importantes
- **Integración con email** automática para usuarios involucrados
- **Sistema de cola** con reintentos automáticos para máxima confiabilidad
- **Templates HTML personalizados** para emails profesionales
- **Exclusión inteligente** del trigger creator de las notificaciones

### 👥 Gestión de Usuarios
- Autenticación segura con Clerk
- Sistema de roles y permisos
- Estados de disponibilidad en tiempo real
- Perfiles de usuario personalizables

### 🎨 Interfaz Moderna
- Diseño responsive y accesible
- Tema claro/oscuro
- Animaciones suaves y transiciones
- Componentes reutilizables y modulares

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Cuenta de Firebase
- Cuenta de Clerk
- Cuenta de Gmail (para notificaciones por email)

### Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/your-username/task-app-sodio.git
cd task-app-sodio
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales:
```bash
# Email (Gmail con App Password)
EMAIL_USER=sodioinfo@gmail.com
EMAIL_PASS=your_app_password_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Clerk
CLERK_SECRET_KEY=your_clerk_secret_key
```

4. **Configurar Gmail App Password**
   - Ve a tu [Cuenta de Google](https://myaccount.google.com/)
   - Navega a **Seguridad** > **Verificación en 2 pasos**
   - Genera una **Contraseña de aplicación** para "Sodio Task App"
   - Usa esa contraseña en `EMAIL_PASS`

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

6. **Probar el sistema de notificaciones**
```bash
npm run test:notifications
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run start            # Servidor de producción

# Linting
npm run lint             # Verificar código
npm run lint:fix         # Corregir problemas automáticamente
npm run lint:detailed    # Linting detallado
npm run lint:check       # Verificación estricta

# Testing
npm run test:notifications  # Probar sistema de notificaciones
```

## 📁 Estructura del Proyecto

```
src/
├── app/                 # App Router de Next.js
├── components/          # Componentes React
├── hooks/              # Custom hooks
├── lib/                # Utilidades y configuración
├── services/           # Servicios de negocio
├── stores/             # Estado global (Zustand)
├── types/              # Tipos TypeScript
└── scripts/            # Scripts de utilidad
```

### Archivos Clave del Sistema de Notificaciones

- `src/services/notificationService.ts` - Servicio principal de notificaciones
- `src/services/notificationQueue.ts` - Sistema de cola con reintentos
- `src/lib/emailService.ts` - Servicio de email con Nodemailer
- `src/lib/userUtils.ts` - Utilidades para obtener datos de usuarios
- `src/lib/config.ts` - Configuración centralizada

## 🔔 Sistema de Notificaciones

### Características
- ✅ **Notificaciones en tiempo real** para todas las acciones
- ✅ **Emails automáticos** a usuarios involucrados
- ✅ **Sistema de cola** con reintentos automáticos
- ✅ **Templates HTML** profesionales y personalizables
- ✅ **Exclusión inteligente** del trigger creator
- ✅ **Logging detallado** para debugging y monitoreo

### Tipos de Notificaciones
- `task_created` - Nueva tarea asignada
- `task_status_changed` - Tarea actualizada
- `task_deleted` - Tarea eliminada
- `task_archived` - Tarea archivada
- `group_message` - Nuevo mensaje en tarea
- `private_message` - Mensaje privado
- `time_log` - Registro de tiempo

### Flujo de Notificaciones
1. **Trigger de acción** (crear tarea, enviar mensaje, etc.)
2. **Crear notificación** en Firestore (batch)
3. **Obtener emails** de destinatarios desde Clerk
4. **Generar template** de email personalizado
5. **Enviar email** via Nodemailer
6. **Logging** de todo el proceso

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Next.js 15** - Framework React con App Router
- **React 19** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **SCSS** - Estilos modulares
- **Framer Motion** - Animaciones
- **GSAP** - Animaciones avanzadas

### Backend & Base de Datos
- **Firebase Firestore** - Base de datos NoSQL
- **Firebase Auth** - Autenticación
- **Firebase Storage** - Almacenamiento de archivos
- **Clerk** - Gestión de usuarios y autenticación

### Notificaciones & Email
- **Nodemailer** - Envío de emails
- **Firebase Cloud Messaging** - Notificaciones push
- **Sistema de cola personalizado** - Manejo de fallbacks

### Estado & Gestión
- **Zustand** - Estado global
- **React Query** - Gestión de datos del servidor
- **Custom hooks** - Lógica reutilizable

## 📚 Documentación

- [📧 Configuración de Email](docs/EMAIL_CONFIGURATION.md)
- [🔔 Sistema de Notificaciones](docs/NOTIFICATION_SYSTEM_IMPROVEMENTS.md)
- [⚡ Optimizaciones de Performance](docs/PERFORMANCE_OPTIMIZATIONS.md)
- [🎨 Sistema de Temas](docs/THEME_SYSTEM_DOCUMENTATION.md)

## 🧪 Testing

### Pruebas del Sistema de Notificaciones
```bash
npm run test:notifications
```

El script verifica:
- ✅ Configuración del sistema
- ✅ Obtención de emails de usuarios
- ✅ Envío de emails individuales
- ✅ Creación de notificaciones
- ✅ Creación de notificaciones en batch

## 🚨 Troubleshooting

### Problemas Comunes

#### Emails no se envían
- Verifica que `EMAIL_PASS` sea una App Password válida de Gmail
- Confirma que la verificación en 2 pasos esté habilitada
- Revisa los logs en la consola del servidor

#### Notificaciones no aparecen
- Verifica la conexión a Firebase
- Confirma que las reglas de Firestore permitan lectura/escritura
- Revisa los logs del servicio de notificaciones

#### Error de configuración
- Ejecuta `npm run test:notifications` para validar configuración
- Verifica que todas las variables de entorno estén configuradas
- Reinicia el servidor después de cambiar variables

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

- 📧 Email: sodioinfo@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/task-app-sodio/issues)
- 📚 Documentación: [Wiki del proyecto](https://github.com/your-username/task-app-sodio/wiki)

---

**Desarrollado con ❤️ por el equipo de Sodio**
