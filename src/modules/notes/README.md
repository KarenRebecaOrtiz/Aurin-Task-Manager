# Módulo Notes

Módulo para notas públicas tipo Instagram. Todos los usuarios pueden crear una nota pública que expira automáticamente en 24 horas.

## 📋 Descripción

El módulo `notes` proporciona componentes y utilidades para que los usuarios compartan notas públicas cortas (máximo 120 caracteres) que se muestran en una marquesina horizontal animada. Las notas expiran automáticamente después de 24 horas.

**Características:**
- ✅ Notas públicas para todos los usuarios (sin permisos especiales)
- ✅ Máximo 120 caracteres por nota
- ✅ Expiración automática en 24 horas
- ✅ 1 nota activa por usuario
- ✅ Animaciones suaves con Framer Motion
- ✅ Avatar con anillo gradiente (indicador visual)
- ✅ Scroll horizontal (diseño tipo Instagram)
- ✅ Integración con Firestore
- ✅ Soporte para dark mode
- ✅ Responsive design

## 🏗️ Estructura

```
notes/
├── components/
│   ├── atoms/
│   │   ├── AvatarRing.tsx          # Avatar con anillo gradiente
│   │   ├── NoteBubble.tsx          # Burbuja de nota con animación
│   │   └── index.ts
│   ├── molecules/
│   │   ├── CurrentUserAction.tsx   # Acción del usuario actual (crear/eliminar)
│   │   ├── NoteUserItem.tsx        # Item de usuario con nota
│   │   ├── DeleteNoteDialog.tsx    # Dialog de confirmación (deprecated)
│   │   └── index.ts
│   ├── organisms/
│   │   ├── NotesTray.tsx           # Contenedor principal (scroll horizontal)
│   │   └── index.ts
│   └── index.ts
├── hooks/
│   ├── useNotes.ts                 # Estado centralizado con Firestore
│   └── index.ts
├── types/
│   ├── notes.ts                    # Interfaces TypeScript
│   └── index.ts
├── lib/
│   ├── constants.ts                # Configuración y constantes
│   └── index.ts
├── index.ts                        # Exportaciones principales
└── README.md                       # Este archivo
```

## 🎯 Componentes

### Atoms

#### AvatarRing
Avatar con anillo gradiente opcional.

```tsx
<AvatarRing
  src="/avatar.jpg"
  alt="Usuario"
  hasGradient={true}
  size="md"
/>
```

**Props:**
- `src: string` - URL de la imagen
- `alt: string` - Texto alternativo
- `hasGradient?: boolean` - Mostrar anillo gradiente (default: false)
- `size?: 'sm' | 'md' | 'lg'` - Tamaño del avatar (default: 'md')
- `className?: string` - Clases CSS adicionales

#### NoteBubble
Burbuja de nota con animación de entrada.

```tsx
<NoteBubble content="¡Hola a todos! 👋" />
```

**Props:**
- `content: string` - Contenido de la nota
- `className?: string` - Clases CSS adicionales

### Molecules

#### CurrentUserAction
Acción del usuario actual (crear o eliminar nota).

```tsx
<CurrentUserAction
  currentUserNote={note}
  avatarUrl="/avatar.jpg"
  username="Karen"
  onAddNote={handleAdd}
  onDeleteNote={handleDelete}
/>
```

#### NoteUserItem
Item de usuario con su nota pública.

```tsx
<NoteUserItem note={note} />
```

### Organisms

#### NotesTray
Contenedor principal que muestra todas las notas en scroll horizontal.

```tsx
<NotesTray className="border-b" />
```

## 🔗 Hooks

### useNotes
Hook centralizado para gestionar notas con Firestore.

```tsx
const {
  notes,              // Array de notas de otros usuarios
  currentUserNote,    // Nota del usuario actual
  isLoading,          // Estado de carga
  isCreating,         // Estado de creación
  isDeleting,         // Estado de eliminación
  addNote,            // Función para crear nota
  removeNote,         // Función para eliminar nota
  error,              // Mensaje de error
} = useNotes();
```

## 📊 Tipos

```typescript
interface NoteUser {
  userId: string;
  username: string;
  avatarUrl: string;
  isCurrentUser: boolean;
}

interface Note {
  id: string;
  userId: string;
  content: string; // max 120 chars
  createdAt: Timestamp;
  expiresAt: Timestamp; // 24h from creation
  user: NoteUser;
}

interface CreateNotePayload {
  content: string;
}
```

## ⚙️ Configuración

### Constantes

```typescript
NOTE_MAX_LENGTH = 120;           // Máximo de caracteres
NOTE_EXPIRY_HOURS = 24;          // Duración en horas
NOTE_EXPIRY_MS = 86400000;       // Duración en ms
NOTES_COLLECTION = 'notes';      // Colección de Firestore
```

## 🔥 Firestore

Las notas se almacenan en la colección `notes` con la siguiente estructura:

```json
{
  "id": "note-123",
  "userId": "user-456",
  "content": "¡Hola a todos!",
  "createdAt": Timestamp,
  "expiresAt": Timestamp,
  "user": {
    "userId": "user-456",
    "username": "Karen",
    "avatarUrl": "https://...",
    "isCurrentUser": false
  }
}
```

**Índices recomendados:**
- `expiresAt` (ascending) - Para filtrar notas activas
- `userId` + `expiresAt` - Para consultas por usuario

## 📱 Uso

### Integración en Header

```tsx
import { NotesTray } from '@/modules/notes';

export function Header() {
  return (
    <header>
      <NotesTray className="border-b" />
      {/* resto del header */}
    </header>
  );
}
```

### Uso del Hook

```tsx
import { useNotes } from '@/modules/notes';

export function NotesPage() {
  const { notes, currentUserNote, addNote, removeNote } = useNotes();

  return (
    <div>
      <NotesTray />
      {/* resto del contenido */}
    </div>
  );
}
```

## 🎨 Estilos

El módulo utiliza:
- **Tailwind CSS** - Utilidades de estilos
- **Framer Motion** - Animaciones
- **Dark Mode** - Soporte automático con Tailwind

## 🚀 Características Futuras

- [ ] Reacciones a notas (emojis)
- [ ] Respuestas a notas
- [ ] Historial de notas del usuario
- [ ] Búsqueda de notas
- [ ] Filtros por usuario
- [ ] Notificaciones cuando alguien comenta

## 📝 Notas

- Las notas expiran automáticamente después de 24 horas
- Solo se puede tener 1 nota activa por usuario
- Las notas son públicas y visibles para todos
- El contenido se valida a 120 caracteres máximo
- Los errores se muestran con Sonner Toast

## 🔄 Reemplazo de Advices

Este módulo reemplaza al módulo `advices` anterior:

**Cambios principales:**
- ✅ Todos los usuarios pueden crear notas (no solo admins)
- ✅ Mejor UX: más simple e intuitivo
- ✅ Mismo diseño tipo Instagram
- ✅ Integración completa con Firestore
- ✅ Mejor manejo de errores con Sonner

**Migración:**
- El módulo `advices` puede ser eliminado
- Reemplazar `<AdviceInput />` con `<NotesTray />`
- Las notas antiguas se pueden migrar manualmente si es necesario
