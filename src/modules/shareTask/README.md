# ShareTask Module 🔗

Sistema completo para compartir tareas con clientes externos siguiendo principios de seguridad W3C/OWASP y UX moderna (Linear-style).

## 📐 Arquitectura

```
shareTask/
├── components/
│   ├── atoms/                      # Componentes básicos reutilizables
│   │   ├── ShareToggle/            # Switch para activar/desactivar sharing
│   │   ├── TokenDisplay/           # Mostrar el token con copy button
│   │   ├── ShareStatusBadge/       # Badge de estado (público/privado)
│   │   └── index.ts
│   │
│   ├── molecules/                  # Combinaciones de atoms
│   │   ├── ShareControls/          # Controles de compartir (toggle + regen)
│   │   ├── ShareLinkInput/         # Input con URL + copy button
│   │   ├── ShareExpiryPicker/      # Selector de fecha de expiración
│   │   ├── GuestIdentityPrompt/    # Prompt para nombre de invitado
│   │   └── index.ts
│   │
│   ├── organisms/                  # Componentes complejos
│   │   ├── ShareDialog/            # Dialog principal de admin
│   │   ├── GuestChat/              # Vista de chat para invitados
│   │   ├── PublicTaskView/         # Vista pública de tarea
│   │   └── index.ts
│   │
│   └── templates/                  # Layouts de página
│       ├── AdminSharePanel/        # Panel completo de admin
│       └── GuestTaskPage/          # Página completa para invitados
│
├── services/
│   ├── shareService.ts             # Lógica de negocio de sharing
│   ├── tokenService.ts             # Generación y validación de tokens
│   ├── commentService.ts           # CRUD de comentarios (admin + guest)
│   └── sanitizationService.ts      # DTOs y data cleaning
│
├── actions/
│   ├── share.actions.ts            # Server actions para admin
│   └── comment.actions.ts          # Server actions para comentarios
│
├── api/
│   └── public/
│       ├── [token]/
│       │   └── route.ts            # GET - Obtener tarea pública
│       └── comments/
│           └── route.ts            # POST - Crear comentario guest
│
├── hooks/
│   ├── useShareControls.ts         # Hook para panel de admin
│   ├── useGuestIdentity.ts         # Hook para identidad de invitado
│   ├── usePublicTask.ts            # Hook para cargar tarea pública
│   └── useComments.ts              # Hook para comentarios
│
├── stores/
│   ├── shareStore.ts               # Estado de sharing (admin)
│   └── guestStore.ts               # Estado de invitado (localStorage)
│
├── types/
│   ├── share.types.ts              # Tipos de sharing
│   ├── comment.types.ts            # Tipos de comentarios
│   ├── guest.types.ts              # Tipos de invitado
│   └── dto.types.ts                # DTOs para sanitización
│
├── utils/
│   ├── shareHelpers.ts             # Helpers generales
│   ├── urlBuilder.ts               # Constructor de URLs públicas
│   ├── validators.ts               # Validación de inputs
│   └── constants.ts                # Constantes del módulo
│
├── config/
│   ├── security.config.ts          # Configuración de seguridad
│   ├── rateLimit.config.ts         # Rate limiting
│   └── animations.config.ts        # Animaciones framer-motion
│
├── styles/
│   ├── ShareDialog.module.scss     # Estilos del dialog
│   ├── GuestChat.module.scss       # Estilos del chat público
│   └── PublicTask.module.scss      # Estilos de la vista pública
│
└── index.ts                        # Exportaciones públicas
```

---

## 🚀 Roadmap de Implementación

### ✅ Fase 0: Fundamentos de Datos & Seguridad

#### 0.1 Schema de Firestore
- [ ] Actualizar colección `tasks` con campos de sharing
- [ ] Crear colección `comments` con segregación interna/pública
- [ ] Crear índices compuestos para queries eficientes

#### 0.2 Utilitarios de Seguridad
- [ ] Implementar generador de tokens seguros (nanoid)
- [ ] Crear validadores de entrada
- [ ] Implementar rate limiting

---

### 🎛️ Fase 1: El Panel de Control (Admin Side)

#### 1.1 Server Actions
- [ ] `toggleTaskSharing` - Activar/desactivar sharing
- [ ] `regenerateShareToken` - Crear nuevo token
- [ ] `setShareExpiry` - Configurar expiración
- [ ] `revokeShareAccess` - Revocar acceso inmediato

#### 1.2 UI de Admin
- [ ] ShareDialog (integrado con sistema de dialogs existente)
- [ ] ShareToggle atom
- [ ] ShareControls molecule
- [ ] ShareLinkInput con copy functionality

---

### 🌐 Fase 2: La Frontera Pública (Middleware & DTOs)

#### 2.1 Middleware Configuration
- [ ] Configurar rutas públicas en Clerk middleware
- [ ] Implementar rate limiting en rutas públicas

#### 2.2 Data Sanitization
- [ ] Crear DTOs para sanitizar datos de tareas
- [ ] Filtrar comentarios internos
- [ ] Ocultar información sensible

---

### 👁️ Fase 3: La Página Pública (Guest View)

#### 3.1 Public Task Page
- [ ] Layout de página pública (`/p/[token]`)
- [ ] PublicTaskView organism
- [ ] GuestChat organism
- [ ] Manejo de 404 para tokens inválidos

#### 3.2 Guest Experience
- [ ] Sistema de identidad persistente (localStorage)
- [ ] GuestIdentityPrompt molecule
- [ ] Chat en tiempo real para invitados

---

### 💬 Fase 4: Comentarios & Interacción

#### 4.1 Comment System
- [ ] API pública de comentarios
- [ ] Validación y sanitización de inputs
- [ ] Rate limiting por IP
- [ ] Notificaciones en tiempo real

#### 4.2 Admin Tools
- [ ] Vista de comentarios internos vs públicos
- [ ] Toggle para marcar comentarios como internos
- [ ] Moderación de comentarios de invitados

---

## 🛡️ Seguridad (OWASP & W3C)

### Capability URLs
- ✅ Tokens de alta entropía (~140 bits) con nanoid
- ✅ No usar IDs secuenciales en URLs públicas
- ✅ Validación de tokens en cada request

### Data Sanitization
- ✅ DTOs estrictos para datos públicos
- ✅ Filtrado de campos sensibles (presupuesto, IDs internos)
- ✅ Escape de HTML en comentarios

### Rate Limiting
- ✅ Límite de requests por IP
- ✅ Límite de comentarios por sesión
- ✅ Protección contra spam

### Input Validation
- ✅ Validación con Zod en todos los endpoints
- ✅ Sanitización de nombres de invitados
- ✅ Límites de longitud en comentarios

---

## 📊 Estados & Flujos

### Estados de una Tarea Compartida

```typescript
type ShareStatus = 
  | 'private'       // No compartida
  | 'public'        // Compartida activamente
  | 'expired'       // Expirada por fecha
  | 'revoked';      // Revocada manualmente
```

### Flujo de Admin

1. Admin abre ShareDialog desde ChatHeader
2. Toggle activa el sharing → genera token
3. Se muestra la URL pública para copiar
4. Admin puede regenerar token o revocar acceso
5. Admin configura fecha de expiración (opcional)

### Flujo de Invitado

1. Invitado accede a `/p/{token}`
2. Sistema valida token y estado público
3. Se carga vista sanitizada de la tarea
4. Primera vez: prompt para nombre (localStorage)
5. Puede ver comentarios públicos y responder
6. Comentarios aparecen en tiempo real para admin

---

## 🔗 Integración con Módulos Existentes

### Con `dialogs`
```typescript
import { ShareDialog } from '@/modules/shareTask';

// Usa la infraestructura existente de dialogs
<ShareDialog
  isOpen={isOpen}
  onOpenChange={setIsOpen}
  taskId={taskId}
  taskName={taskName}
/>
```

### Con `chat`
```typescript
// Integración en ChatHeader
import { ShareButton } from '@/modules/shareTask';

<ShareButton
  taskId={task.id}
  taskName={task.name}
  isPublic={task.isPublic}
/>
```

### Con `firebase`
```typescript
// Usa servicios existentes de Firebase
import { db } from '@/lib/firebase';
import { shareService } from '@/modules/shareTask';

await shareService.createPublicAccess(taskId, userId);
```

---

## 📝 Checklist de "Definition of Done"

### Seguridad
- [ ] ¿Tokens usan nanoid con alta entropía?
- [ ] ¿DTOs filtran todos los datos sensibles?
- [ ] ¿Comentarios internos son invisibles para invitados?
- [ ] ¿Rate limiting implementado en endpoints públicos?
- [ ] ¿Validación Zod en todos los inputs?

### Funcionalidad
- [ ] ¿Toggle activa/desactiva sharing inmediatamente?
- [ ] ¿Regenerar token invalida el anterior?
- [ ] ¿Revocar acceso funciona en tiempo real?
- [ ] ¿Invitados pueden comentar sin registro?
- [ ] ¿Identidad de invitado persiste en localStorage?

### UX
- [ ] ¿Copy button funciona correctamente?
- [ ] ¿Feedback visual al copiar (toast/checkmark)?
- [ ] ¿Loading states durante operaciones?
- [ ] ¿Error handling claro para invitados?
- [ ] ¿Responsive en mobile?

### Performance
- [ ] ¿Queries optimizadas con índices?
- [ ] ¿Caché de datos públicos?
- [ ] ¿Lazy loading de comentarios?

---

**Mantenido por**: Equipo de Desarrollo Aurin  
**Última actualización**: 2025-01-08
