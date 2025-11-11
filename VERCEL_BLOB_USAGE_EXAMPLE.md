# Vercel Blob Storage - Guía de Uso

Esta guía explica cómo usar la nueva API `/api/upload-blob` para subir archivos pequeños a Vercel Blob Storage.

---

## 📋 Tabla de Contenidos

1. [Cuándo usar Vercel Blob vs GCS](#cuándo-usar-vercel-blob-vs-gcs)
2. [Configuración inicial](#configuración-inicial)
3. [Ejemplo de uso en React](#ejemplo-de-uso-en-react)
4. [Ejemplo de eliminación (futuro)](#ejemplo-de-eliminación-futuro)
5. [Troubleshooting](#troubleshooting)

---

## Cuándo usar Vercel Blob vs GCS

### Usa `/api/upload-blob` (Vercel Blob) cuando:
- ✅ El archivo es < 5MB
- ✅ Necesitas velocidad de carga rápida
- ✅ Es un archivo temporal (avatares, thumbnails, cache)
- ✅ Quieres CDN automático sin configuración

### Usa `/api/upload` (GCS) cuando:
- ✅ El archivo es > 5MB
- ✅ Necesitas persistencia a largo plazo
- ✅ Es un documento importante (PDFs, contratos, archivos de proyecto)
- ✅ Ya tienes infraestructura de GCS configurada

---

## Configuración Inicial

### 1. Obtener el token de Vercel Blob

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Settings → Storage → Blob
3. Crea un nuevo Blob Store (si no existe)
4. Copia el token de "Read-Write Token"

### 2. Agregar variable de entorno

**Archivo:** `.env.local`

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxxx
```

**IMPORTANTE:** Este token NO debe commitarse a Git. Ya está en `.gitignore`.

### 3. Verificar que funciona

```bash
curl http://localhost:3000/api/upload-blob
```

Deberías ver:
```json
{
  "success": true,
  "data": {
    "message": "Vercel Blob Storage API",
    "configured": true,
    "supportedTypes": ["avatar", "thumbnail", "attachment", "cache"]
  }
}
```

---

## Ejemplo de Uso en React

### Hook personalizado: `useUploadBlob`

Crea un hook reutilizable para subir archivos a Vercel Blob:

```typescript
// src/hooks/useUploadBlob.ts
import { useState } from 'react';

type UploadType = 'avatar' | 'thumbnail' | 'attachment' | 'cache';

interface UploadBlobResult {
  url: string;
  pathname: string;
  fileName: string;
  fileType: string;
  size: number;
  downloadUrl: string;
  contentType: string;
  uploadedAt: string;
}

interface UseUploadBlobReturn {
  upload: (file: File, type: UploadType, conversationId?: string) => Promise<UploadBlobResult>;
  isUploading: boolean;
  error: string | null;
  progress: number;
}

export function useUploadBlob(): UseUploadBlobReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = async (
    file: File,
    type: UploadType,
    conversationId?: string
  ): Promise<UploadBlobResult> => {
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Crear FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      // Simular progreso (Vercel Blob no soporta upload progress nativo)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      // Subir archivo
      const response = await fetch('/api/upload-blob', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir archivo');
      }

      const result = await response.json();
      console.log('[useUploadBlob] Upload successful:', result);

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('[useUploadBlob] Error:', err);
      throw err;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return { upload, isUploading, error, progress };
}
```

### Componente de ejemplo: Avatar Upload

```typescript
// src/components/AvatarUploadBlob.tsx
'use client';

import { useState, useRef } from 'react';
import { useUploadBlob } from '@/hooks/useUploadBlob';
import Image from 'next/image';

export function AvatarUploadBlob() {
  const { upload, isUploading, error, progress } = useUploadBlob();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (2MB max para avatares)
    if (file.size > 2 * 1024 * 1024) {
      alert('El avatar debe ser menor a 2MB');
      return;
    }

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten imágenes (JPG, PNG, GIF, WebP)');
      return;
    }

    try {
      const result = await upload(file, 'avatar');
      setAvatarUrl(result.url);
      console.log('Avatar subido exitosamente:', result);

      // Aquí puedes actualizar Firestore con la nueva URL
      // await updateUserAvatar(userId, result.url);
    } catch (err) {
      console.error('Error al subir avatar:', err);
    }
  };

  return (
    <div className="avatar-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {avatarUrl ? (
        <div className="avatar-preview">
          <Image
            src={avatarUrl}
            alt="Avatar"
            width={128}
            height={128}
            className="rounded-full"
          />
          <button onClick={() => fileInputRef.current?.click()}>
            Cambiar avatar
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? `Subiendo... ${progress}%` : 'Subir avatar'}
        </button>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### Ejemplo: Chat Attachment Upload

```typescript
// src/components/ChatAttachmentBlob.tsx
'use client';

import { useState } from 'react';
import { useUploadBlob } from '@/hooks/useUploadBlob';

interface ChatAttachmentProps {
  conversationId: string;
  onAttachmentUploaded: (url: string, fileName: string) => void;
}

export function ChatAttachmentBlob({
  conversationId,
  onAttachmentUploaded
}: ChatAttachmentProps) {
  const { upload, isUploading, error } = useUploadBlob();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (4MB max para adjuntos)
    if (file.size > 4 * 1024 * 1024) {
      alert('El archivo debe ser menor a 4MB. Para archivos más grandes, usa el sistema de GCS.');
      return;
    }

    try {
      const result = await upload(file, 'attachment', conversationId);
      onAttachmentUploaded(result.url, result.fileName);

      console.log('Adjunto subido:', {
        url: result.url,
        downloadUrl: result.downloadUrl, // Para descargar directamente
        fileName: result.fileName,
      });
    } catch (err) {
      console.error('Error al subir adjunto:', err);
    }
  };

  return (
    <div className="chat-attachment">
      <label htmlFor="file-upload" className="cursor-pointer">
        📎 {isUploading ? 'Subiendo...' : 'Adjuntar archivo (max 4MB)'}
      </label>
      <input
        id="file-upload"
        type="file"
        onChange={handleFileSelect}
        disabled={isUploading}
        accept="image/jpeg,image/png,image/gif,application/pdf"
        style={{ display: 'none' }}
      />
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

---

## Ejemplo de Eliminación

La API `/api/delete-blob` ya está implementada y lista para usar:

### Hook: `useDeleteBlob`

```typescript
// src/hooks/useDeleteBlob.ts
import { useState } from 'react';

interface UseDeleteBlobReturn {
  deleteBlob: (pathname: string) => Promise<void>;
  isDeleting: boolean;
  error: string | null;
}

export function useDeleteBlob(): UseDeleteBlobReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteBlob = async (pathname: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/delete-blob', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar archivo');
      }

      const result = await response.json();
      console.log('[useDeleteBlob] Blob deleted successfully:', result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('[useDeleteBlob] Error:', err);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteBlob, isDeleting, error };
}
```

### Ejemplo Completo: Avatar con Upload y Delete

```typescript
// src/components/AvatarManagerBlob.tsx
'use client';

import { useState } from 'react';
import { useUploadBlob } from '@/hooks/useUploadBlob';
import { useDeleteBlob } from '@/hooks/useDeleteBlob';
import Image from 'next/image';

interface AvatarData {
  url: string;
  pathname: string;
}

export function AvatarManagerBlob() {
  const { upload, isUploading } = useUploadBlob();
  const { deleteBlob, isDeleting } = useDeleteBlob();
  const [avatar, setAvatar] = useState<AvatarData | null>(null);

  const handleUpload = async (file: File) => {
    try {
      // 1. Eliminar avatar anterior si existe
      if (avatar?.pathname) {
        await deleteBlob(avatar.pathname);
      }

      // 2. Subir nuevo avatar
      const result = await upload(file, 'avatar');

      // 3. Guardar nueva información del avatar
      setAvatar({
        url: result.url,
        pathname: result.pathname, // ¡IMPORTANTE! Guardar pathname para futuras eliminaciones
      });

      // 4. Opcional: Actualizar Firestore con el pathname
      // await updateDoc(doc(db, 'users', userId), {
      //   avatarUrl: result.url,
      //   avatarPathname: result.pathname,
      // });

      console.log('Avatar actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar avatar:', error);
    }
  };

  const handleDelete = async () => {
    if (!avatar?.pathname) return;

    try {
      await deleteBlob(avatar.pathname);
      setAvatar(null);

      // Opcional: Actualizar Firestore
      // await updateDoc(doc(db, 'users', userId), {
      //   avatarUrl: null,
      //   avatarPathname: null,
      // });

      console.log('Avatar eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar avatar:', error);
    }
  };

  return (
    <div>
      {avatar ? (
        <div>
          <Image src={avatar.url} alt="Avatar" width={128} height={128} />
          <button onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Eliminando...' : 'Eliminar avatar'}
          </button>
        </div>
      ) : (
        <div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            disabled={isUploading}
          />
          {isUploading && <p>Subiendo...</p>}
        </div>
      )}
    </div>
  );
}
```

### Guardar pathname en Firestore

**IMPORTANTE:** Debes guardar el `pathname` en Firestore para poder eliminar el archivo después:

```typescript
// Cuando subes un archivo
const uploadResult = await upload(file, 'avatar');

// Guardar en Firestore (IMPORTANTE)
await updateDoc(doc(db, 'users', userId), {
  avatarUrl: uploadResult.url,          // Para mostrar la imagen
  avatarPathname: uploadResult.pathname, // Para eliminar después
  uploadedAt: serverTimestamp(),
});
```

```typescript
// Cuando eliminas un archivo
const userDoc = await getDoc(doc(db, 'users', userId));
const pathname = userDoc.data()?.avatarPathname;

if (pathname) {
  await deleteBlob(pathname);

  // Limpiar Firestore
  await updateDoc(doc(db, 'users', userId), {
    avatarUrl: null,
    avatarPathname: null,
  });
}
```

---

## Troubleshooting

### Error: "Vercel Blob Storage not configured"

**Causa:** `BLOB_READ_WRITE_TOKEN` no está configurado o es inválido.

**Solución:**
1. Verifica que `.env.local` tiene `BLOB_READ_WRITE_TOKEN`
2. Reinicia el servidor de desarrollo (`npm run dev`)
3. Verifica que el token es de tipo "Read-Write", no "Read-Only"

---

### Error: "Type 'profile' is not supported by Vercel Blob"

**Causa:** Estás intentando usar un tipo que no es compatible con Vercel Blob.

**Tipos soportados:**
- `avatar` (2MB max)
- `thumbnail` (1MB max)
- `attachment` (4MB max)
- `cache` (5MB max)

**Solución:** Para `profile` o `cover` (archivos grandes), usa `/api/upload` (GCS) en su lugar.

---

### Error: "avatar must not exceed 2MB"

**Causa:** El archivo excede el límite de tamaño para ese tipo.

**Solución:**
- Comprimir la imagen antes de subir
- Usar un servicio de compresión como TinyPNG
- Si es > 5MB, usar `/api/upload` (GCS) en su lugar

---

### El archivo se sube pero no se ve

**Causa:** Vercel Blob usa URLs con dominio público, pero puede haber cache.

**Solución:**
1. Verifica que `result.url` es una URL válida
2. Intenta abrir `result.url` en una nueva pestaña
3. Espera unos segundos (propagación CDN)
4. Verifica que `access: 'public'` está configurado en la API

---

### Error: "You can only delete your own files"

**Causa:** Intentaste eliminar un archivo que no te pertenece.

**Solución:**
El pathname debe contener tu userId. Ejemplo válido:
- ✅ `avatars/user_abc123/avatar.jpg` (contiene user_abc123)
- ❌ `avatars/user_xyz789/avatar.jpg` (otro usuario)

Verifica que estás eliminando tus propios archivos.

---

### Error al eliminar: "Blob not found" (404)

**Causa:** El blob ya fue eliminado o nunca existió.

**Solución:**
1. Verifica que el pathname es correcto
2. Verifica que el archivo fue subido exitosamente
3. Verifica que no lo eliminaste anteriormente
4. Puedes ignorar el error si el objetivo era eliminar el archivo

---

### ¿Cómo limpiar archivos viejos?

✅ **Usa `/api/delete-blob`** (recomendado):
```typescript
// Eliminar avatar viejo antes de subir uno nuevo
if (oldAvatarPathname) {
  await deleteBlob(oldAvatarPathname);
}
const newAvatar = await upload(file, 'avatar');
```

**Alternativa: TTL (Time To Live)**:
```typescript
// En route.ts, agregar TTL de 30 días
await put(blobPath, buffer, {
  access: 'public',
  contentType: file.type,
  addRandomSuffix: false,
  cacheControlMaxAge: 60 * 60 * 24 * 30, // 30 días
});
```

**Limpieza manual desde Vercel Dashboard:**
- Ve a Settings → Storage → Blob
- Selecciona archivos viejos
- Delete

---

## Comparación de Costos

### Vercel Blob (Hobby - Gratis)
- ✅ 500 GB de almacenamiento
- ✅ 100 GB de transferencia/mes
- ✅ Gratis hasta estos límites

### Google Cloud Storage (Pay-as-you-go)
- 💰 $0.020 por GB/mes (almacenamiento)
- 💰 $0.12 por GB (transferencia salida)
- 💰 $0.004 por 10,000 operaciones

**Recomendación:** Usa Vercel Blob para archivos pequeños y temporales (avatares, thumbnails), GCS para archivos permanentes y grandes.

---

## Próximos Pasos Opcionales

- [x] ✅ Implementar `/api/delete-blob` para eliminar archivos
- [ ] Agregar TTL automático para archivos de cache
- [ ] Implementar webhook para limpiar archivos huérfanos
- [ ] Agregar metrics/logging para tracking de uso
- [ ] Agregar `/api/list-blobs` para listar archivos de un usuario

---

**Documentado por:** Claude Code
**Fecha:** Noviembre 11, 2025
**Versión API:** 1.0
