/**
 * @module config/utils/imageProcessing
 * @description Funciones para procesamiento y subida de imágenes
 */

/**
 * Tipos de imagen soportados
 */
export type ImageType = 'profile' | 'cover';

/**
 * Configuración de tamaños máximos por tipo de imagen
 */
export const IMAGE_SIZE_LIMITS = {
  profile: 5 * 1024 * 1024, // 5MB
  cover: 10 * 1024 * 1024,  // 10MB
} as const;

/**
 * Formatos de imagen permitidos
 */
export const ALLOWED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/**
 * Valida si un archivo es una imagen válida
 */
export const validateImageFile = (
  file: File,
  type: ImageType
): { valid: boolean; error?: string } => {
  // Validar tipo de archivo
  if (!ALLOWED_IMAGE_FORMATS.includes(file.type as typeof ALLOWED_IMAGE_FORMATS[number])) {
    return {
      valid: false,
      error: 'Formato de imagen no válido. Usa JPG, PNG, WEBP o GIF.',
    };
  }

  // Validar tamaño
  const maxSize = IMAGE_SIZE_LIMITS[type];
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `La imagen no debe exceder ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * Sube una imagen de perfil al servidor
 */
export const uploadProfileImage = async (
  file: File,
  userId: string
): Promise<string> => {
  if (!file) throw new Error('No file provided for upload');

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('type', 'profile');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers: { 'x-clerk-user-id': userId },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.details || data.error || 'Error al subir la imagen de perfil');
    }

    const { url } = await response.json();
    return url;
  } catch (err) {
    console.error('[imageProcessing] uploadProfileImage: Error', err);
    throw err;
  }
};

/**
 * Sube una imagen de portada al servidor
 */
export const uploadCoverImage = async (
  file: File,
  userId: string
): Promise<string> => {
  if (!file) throw new Error('No file provided for upload');

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('type', 'cover');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers: { 'x-clerk-user-id': userId },
    });

    if (!response.ok) {
      const data = await response.text();
      throw new Error(data || 'Error al subir la imagen de portada');
    }

    const { url } = await response.json();
    return url;
  } catch (err) {
    console.error('[imageProcessing] uploadCoverImage: Error', err);
    throw err;
  }
};

/**
 * Elimina una imagen del servidor (Google Cloud Storage)
 */
export const deleteImageFromGCS = async (filePath: string): Promise<void> => {
  try {
    console.log('[imageProcessing] Attempting to delete image from GCS:', filePath);
    const response = await fetch('/api/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        console.warn('[imageProcessing] Delete failed: File not found in GCS:', filePath);
      } else {
        throw new Error(errorText || 'Error deleting image from GCS');
      }
    } else {
      console.log('[imageProcessing] Image deleted from GCS:', filePath);
    }
  } catch (err) {
    console.error('[imageProcessing] deleteImageFromGCS: Error', err);
    throw err;
  }
};

/**
 * Extrae el path de un archivo desde una URL de GCS
 */
export const extractFilePathFromUrl = (url: string, bucket = 'aurin-plattform'): string | null => {
  if (!url) return null;
  
  const parts = url.split(`${bucket}/`);
  return parts.length > 1 ? parts[1] : null;
};

/**
 * Verifica si una URL es una imagen de Clerk
 */
export const isClerkImage = (url: string): boolean => {
  return url.includes('clerk.com');
};

/**
 * Verifica si una URL es una imagen por defecto
 */
export const isDefaultImage = (url: string, type: ImageType): boolean => {
  if (type === 'profile') {
    return url.includes('empty-image.png');
  }
  return url === '/empty-cover.png';
};

/**
 * Crea una URL de preview para un archivo
 */
export const createImagePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Redimensiona una imagen manteniendo el aspect ratio
 */
export const resizeImage = (
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calcular nuevas dimensiones manteniendo aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          file.type,
          0.9
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Comprime una imagen si excede el tamaño máximo
 */
export const compressImageIfNeeded = async (
  file: File,
  maxSize: number
): Promise<File> => {
  if (file.size <= maxSize) {
    return file;
  }
  
  // Redimensionar la imagen
  const blob = await resizeImage(file, 1920, 1080);
  
  // Crear un nuevo archivo con el blob comprimido
  return new File([blob], file.name, { type: file.type });
};
