# 📧 Plantillas de Email - Sodio Task App

## 🎯 **Descripción General**

Sistema de plantillas de email HTML responsivas y hermosas para diferentes tipos de notificaciones en Sodio Task App. Las plantillas están diseñadas con un estilo moderno y consistente, siguiendo los diseños proporcionados.

## 🎨 **Características de las Plantillas**

- **🎨 Diseño Consistente**: Mismo estilo visual para todas las plantillas
- **📱 Responsive**: Optimizadas para móviles y desktop
- **🌙 Dark Mode Ready**: Preparadas para futuras implementaciones de tema oscuro
- **🔗 Enlaces Directos**: Botones CTA que llevan directamente a las tareas
- **📊 Información Completa**: Todos los detalles relevantes de la notificación
- **🚫 Unsubscribe**: Enlaces para desuscribirse de notificaciones por email

## 📋 **Tipos de Plantillas**

### **1. Plantilla de Tarea (Create/Edit)**
- **Casos de uso**: `task_created`, `task_status_changed`, `task_priority_changed`, `task_dates_changed`, `task_assignment_changed`
- **Contenido**:
  - Saludo personalizado al destinatario
  - Información completa de la tarea (descripción, objetivos, fechas, estado, prioridad)
  - Lista del equipo (líderes y asignados)
  - Botón CTA "Ir a la tarea"
  - Ilustración: `Create-EditMail.png`

### **2. Plantilla de Mensaje**
- **Casos de uso**: `group_message`, `private_message`
- **Contenido**:
  - Saludo personalizado al destinatario
  - Mensaje del remitente
  - Información de timelog (si aplica)
  - Botón CTA "Ir a la tarea"
  - Ilustración: `MessageMail.png`

### **3. Plantilla de Timelog**
- **Casos de uso**: `time_log`
- **Contenido**:
  - Saludo personalizado al destinatario
  - Horas registradas
  - Fecha de registro
  - Comentario (si existe)
  - Botón CTA "Ir a la tarea"
  - Ilustración: `TimeLogMail.png`

## 🛠️ **Implementación Técnica**

### **Servicio de Plantillas**
```typescript
import { emailTemplateService } from '@/services/emailTemplates';

// Generar plantilla automáticamente por tipo
const template = emailTemplateService.generateTemplate(notificationType, templateData);

// O generar plantilla específica
const taskTemplate = emailTemplateService.generateTaskTemplate(templateData);
const messageTemplate = emailTemplateService.generateMessageTemplate(templateData);
const timelogTemplate = emailTemplateService.generateTimelogTemplate(templateData);
```

### **Datos de la Plantilla**
```typescript
interface EmailTemplateData {
  recipientName: string;        // Nombre del destinatario
  creatorName?: string;         // Nombre del creador/remitente
  senderName?: string;          // Nombre del remitente del mensaje
  loggerName?: string;          // Nombre del usuario que registró tiempo
  taskName: string;             // Nombre de la tarea
  taskDescription?: string;     // Descripción de la tarea
  taskObjectives?: string;      // Objetivos de la tarea
  startDate?: string;           // Fecha de inicio
  endDate?: string;             // Fecha de finalización
  taskStatus?: string;          // Estado de la tarea
  taskPriority?: string;        // Prioridad de la tarea
  leadersList?: string;         // Lista de líderes
  assignedList?: string;        // Lista de asignados
  messageText?: string;         // Texto del mensaje
  timelogHours?: number;        // Horas del timelog
  hoursLogged?: number;         // Horas registradas
  logDate?: string;             // Fecha del registro
  comment?: string;             // Comentario del timelog
  taskUrl: string;              // URL directa a la tarea
  configPageUrl: string;        // URL a la página de configuración
}
```

## 🎨 **Estilos y Diseño**

### **Colores Principales**
- **Background**: `#D3DE48` (Verde limón claro)
- **Content Box**: `#DDE761` (Verde limón más claro)
- **Botón CTA**: `#0C0C0C` (Negro)
- **Texto**: `#000000` (Negro puro)

### **Tipografía**
- **Fuente Principal**: Urbanist (fallback: Arial, sans-serif)
- **Títulos**: 24px, weight 700
- **Texto Principal**: 16px, weight 400
- **Call-to-Action**: 20px, weight 700
- **Botón CTA**: 16px, weight 700, uppercase

### **Layout**
- **Ancho máximo**: 442px (iPhone 16 Pro Max)
- **Padding**: 20px 34px
- **Border radius**: 10px para content boxes, 4px para botones
- **Espaciado**: 30px entre secciones principales

## 🚀 **Uso en el Sistema**

### **Integración con NotificationService**
```typescript
// En sendEmailNotificationsToRecipients
const emailData = await Promise.all(validEmails.map(async user => {
  const templateData = await this.prepareEmailTemplateData(params, user.userId);
  const template = emailTemplateService.generateTemplate(params.type, templateData);
  
  return {
    email: user.email,
    subject: template.subject,
    body: template.html,
  };
}));
```

### **Preparación Automática de Datos**
El sistema automáticamente:
1. Obtiene datos de la tarea desde Firestore
2. Obtiene nombres de usuarios desde Clerk
3. Construye URLs directas a las tareas
4. Prepara enlaces de configuración para unsubscribe

## 🧪 **Pruebas**

### **Script de Prueba**
```bash
npm run test:email-templates
```

### **Verificar Plantillas**
- Genera HTML para cada tipo de plantilla
- Valida que los datos se inserten correctamente
- Guarda ejemplo en `test-output/email-template-example.html`

## 📁 **Archivos de Imágenes**

### **Ubicación**
```
public/mailing/
├── AurinWhiteLogoTopMail.png    # Logo principal
├── Create-EditMail.png          # Ilustración para tareas
├── MessageMail.png              # Ilustración para mensajes
└── TimeLogMail.png              # Ilustración para timelogs
```

### **Especificaciones**
- **Logo**: 96x36px
- **Ilustraciones**: 371-372x372-374px
- **Formato**: PNG con transparencia
- **Optimización**: WebP ready para futuras implementaciones

## 🔧 **Configuración**

### **Variables de Entorno**
```bash
# URLs de la aplicación
NEXT_PUBLIC_APP_URL=https://app.sodio.com
```

### **Configuración del Servicio**
```typescript
// src/lib/config.ts
export const config = {
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  // ... otras configuraciones
};
```

## 🚀 **Próximas Mejoras**

- [ ] **🌙 Dark Mode**: Plantillas adaptativas para tema oscuro
- [ ] **📱 Mobile First**: Optimización específica para dispositivos móviles
- [ ] **🎨 Temas Personalizables**: Diferentes esquemas de colores
- [ ] **📊 Analytics**: Tracking de apertura y clicks en emails
- [ ] **🔔 Notificaciones Push**: Integración con FCM para notificaciones push
- [ ] **🌍 Internacionalización**: Soporte para múltiples idiomas

## 📞 **Soporte**

Para preguntas o problemas con las plantillas de email:
1. Revisar logs del servidor
2. Verificar configuración de variables de entorno
3. Probar con el script de testing
4. Contactar al equipo de desarrollo

---

**¡Las plantillas están listas para usar y se integran perfectamente con el sistema de notificaciones! 🎉**
