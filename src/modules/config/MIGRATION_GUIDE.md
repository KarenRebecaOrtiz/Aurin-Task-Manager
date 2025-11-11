# Guía de Migración: ConfigPage → Módulo Config

**Estado:** 📋 Pendiente  
**Prioridad:** Media  
**Complejidad:** Alta

---

## Resumen

Esta guía detalla el proceso para migrar `ConfigPage.tsx` desde `/src/components/` hacia la estructura modular en `/src/modules/config/`.

---

## Fase 1: Preparación (1-2 horas)

### 1.1 Análisis del Componente Actual

**Ubicación actual:** `/src/components/ConfigPage.tsx`  
**Tamaño:** ~2,351 líneas  
**Dependencias:** Múltiples (Clerk, Firebase, GSAP, Framer Motion)

**Secciones identificadas:**
- Tab 0: Información Personal (Profile)
- Tab 1: Biografía y Contacto (Profile Extended)
- Tab 2: Equipos (Teams)
- Tab 3: Seguridad (Security)

### 1.2 Crear Branch de Trabajo

```bash
git checkout -b feature/modularize-config-page
```

---

## Fase 2: Extraer Types (2-3 horas)

### 2.1 Crear Types de Profile

**Archivo:** `/src/modules/config/types/profile.types.ts`

```typescript
export interface ProfileFormData {
  // Información básica
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  
  // Biografía y descripción
  biography: string;
  description: string;
  
  // Ubicación
  location: string;
  timezone: string;
  
  // Contacto
  website: string;
  
  // Stack tecnológico
  stack: string[];
  
  // Equipos
  teams: string[];
  
  // Imágenes
  profilePhoto: string;
  coverPhoto: string;
}

export interface ProfileImageUpload {
  file: File;
  preview: string;
  type: 'profile' | 'cover';
}

export interface LocationOption {
  value: string;
  label: string;
  flag: string;
}
```

### 2.2 Crear Types de Security

**Archivo:** `/src/modules/config/types/security.types.ts`

```typescript
export interface Session {
  id: string;
  userId: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface TwoFactorSettings {
  enabled: boolean;
  method: 'sms' | 'app' | 'email';
  backupCodes: string[];
}
```

### 2.3 Crear Types de Teams

**Archivo:** `/src/modules/config/types/teams.types.ts`

```typescript
export interface Team {
  name: string;
  members: TeamMember[];
  description?: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  profilePhoto?: string;
  email?: string;
}

export interface TeamOption {
  value: string;
  label: string;
}
```

---

## Fase 3: Crear Stores (3-4 horas)

### 3.1 Config Page Store

**Archivo:** `/src/modules/config/stores/configPageStore.ts`

```typescript
import { create } from 'zustand';

interface ConfigPageState {
  // UI State
  activeTab: number;
  isEditing: boolean;
  tabChanges: boolean[];
  
  // Loading States
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions
  setActiveTab: (tab: number) => void;
  setIsEditing: (editing: boolean) => void;
  setTabChange: (tab: number, hasChanges: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  reset: () => void;
}

export const useConfigPageStore = create<ConfigPageState>((set) => ({
  activeTab: 0,
  isEditing: false,
  tabChanges: [false, false, false, false],
  isLoading: false,
  isSaving: false,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsEditing: (editing) => set({ isEditing: editing }),
  setTabChange: (tab, hasChanges) => 
    set((state) => {
      const newTabChanges = [...state.tabChanges];
      newTabChanges[tab] = hasChanges;
      return { tabChanges: newTabChanges };
    }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  reset: () => set({
    activeTab: 0,
    isEditing: false,
    tabChanges: [false, false, false, false],
    isLoading: false,
    isSaving: false,
  }),
}));
```

### 3.2 Profile Form Store

**Archivo:** `/src/modules/config/stores/profileFormStore.ts`

```typescript
import { create } from 'zustand';
import { ProfileFormData } from '../types/profile.types';

interface ProfileFormState {
  formData: ProfileFormData;
  originalData: ProfileFormData;
  errors: Record<string, string>;
  
  setFormData: (data: Partial<ProfileFormData>) => void;
  setOriginalData: (data: ProfileFormData) => void;
  setError: (field: string, error: string) => void;
  clearErrors: () => void;
  hasChanges: () => boolean;
  reset: () => void;
}

export const useProfileFormStore = create<ProfileFormState>((set, get) => ({
  formData: {} as ProfileFormData,
  originalData: {} as ProfileFormData,
  errors: {},
  
  setFormData: (data) => 
    set((state) => ({ 
      formData: { ...state.formData, ...data } 
    })),
  
  setOriginalData: (data) => 
    set({ originalData: data, formData: data }),
  
  setError: (field, error) => 
    set((state) => ({ 
      errors: { ...state.errors, [field]: error } 
    })),
  
  clearErrors: () => set({ errors: {} }),
  
  hasChanges: () => {
    const { formData, originalData } = get();
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  },
  
  reset: () => set((state) => ({ 
    formData: state.originalData,
    errors: {} 
  })),
}));
```

---

## Fase 4: Crear Hooks (4-5 horas)

### 4.1 useProfileForm Hook

**Archivo:** `/src/modules/config/hooks/useProfileForm.ts`

```typescript
import { useCallback } from 'react';
import { useProfileFormStore } from '../stores/profileFormStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useProfileForm(userId: string) {
  const { formData, setFormData, setError, clearErrors, hasChanges } = useProfileFormStore();
  
  const validateField = useCallback((field: string, value: any) => {
    // Validación específica por campo
    switch (field) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setError(field, 'Email inválido');
          return false;
        }
        break;
      case 'phone':
        if (value && !/^\+?[\d\s-()]+$/.test(value)) {
          setError(field, 'Teléfono inválido');
          return false;
        }
        break;
      // ... más validaciones
    }
    return true;
  }, [setError]);
  
  const saveProfile = useCallback(async () => {
    clearErrors();
    
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, formData);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }, [userId, formData, clearErrors]);
  
  return {
    formData,
    setFormData,
    validateField,
    saveProfile,
    hasChanges: hasChanges(),
  };
}
```

### 4.2 useImageUpload Hook

**Archivo:** `/src/modules/config/hooks/useImageUpload.ts`

```typescript
import { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const uploadImage = useCallback(async (
    file: File,
    userId: string,
    type: 'profile' | 'cover'
  ) => {
    setIsUploading(true);
    setProgress(0);
    
    try {
      // Validar tamaño
      const maxSize = type === 'profile' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`Archivo muy grande. Máximo ${maxSize / 1024 / 1024}MB`);
      }
      
      // Subir a Storage
      const storageRef = ref(storage, `users/${userId}/${type}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      
      // Obtener URL
      const url = await getDownloadURL(storageRef);
      
      setProgress(100);
      return { success: true, url };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsUploading(false);
    }
  }, []);
  
  return {
    uploadImage,
    isUploading,
    progress,
  };
}
```

---

## Fase 5: Separar Componentes (6-8 horas)

### 5.1 Componente Principal

**Archivo:** `/src/modules/config/components/ConfigPage/ConfigPage.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useConfigPageStore } from '../../stores/configPageStore';
import TabNavigation from '../ui/TabNavigation';
import ProfileSection from '../profile/ProfileSection';
import SecuritySection from '../security/SecuritySection';
import TeamsSection from '../teams/TeamsSection';
import styles from './ConfigPage.module.scss';

interface ConfigPageProps {
  userId: string;
  onClose: () => void;
  onShowSuccessAlert: (message: string) => void;
  onShowFailAlert: (message: string) => void;
}

export default function ConfigPage({
  userId,
  onClose,
  onShowSuccessAlert,
  onShowFailAlert,
}: ConfigPageProps) {
  const { user } = useUser();
  const { activeTab, setActiveTab } = useConfigPageStore();
  
  const isOwnProfile = user?.id === userId;
  
  return (
    <div className={styles.container}>
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { label: 'Perfil', icon: '/user.svg' },
          { label: 'Seguridad', icon: '/shield.svg' },
          { label: 'Equipos', icon: '/users.svg' },
        ]}
      />
      
      {activeTab === 0 && (
        <ProfileSection
          userId={userId}
          isOwnProfile={isOwnProfile}
          onShowSuccessAlert={onShowSuccessAlert}
          onShowFailAlert={onShowFailAlert}
        />
      )}
      
      {activeTab === 1 && (
        <SecuritySection
          userId={userId}
          isOwnProfile={isOwnProfile}
          onShowSuccessAlert={onShowSuccessAlert}
          onShowFailAlert={onShowFailAlert}
        />
      )}
      
      {activeTab === 2 && (
        <TeamsSection
          userId={userId}
          isOwnProfile={isOwnProfile}
          onShowSuccessAlert={onShowSuccessAlert}
          onShowFailAlert={onShowFailAlert}
        />
      )}
    </div>
  );
}
```

### 5.2 Migrar TeamsTable

```bash
# Mover TeamsTable a módulo
mv src/components/TeamsTable.tsx src/modules/config/components/teams/TeamsTable/
mv src/components/TeamsTable.module.scss src/modules/config/components/teams/TeamsTable/

# Crear index.ts
echo "export { default } from './TeamsTable';" > src/modules/config/components/teams/TeamsTable/index.ts
```

---

## Fase 6: Actualizar Imports (1-2 horas)

### 6.1 Actualizar en page.tsx

```typescript
// Antes
import ConfigPage from '@/components/ConfigPage';

// Después
import ConfigPage from '@/modules/config/components/ConfigPage';
```

### 6.2 Actualizar Referencias Internas

Buscar y reemplazar todos los imports dentro del módulo para usar rutas relativas o alias correctos.

---

## Fase 7: Testing (2-3 horas)

### 7.1 Tests Manuales

- [ ] Cargar página de configuración
- [ ] Cambiar entre tabs
- [ ] Editar perfil y guardar
- [ ] Subir imagen de perfil
- [ ] Subir imagen de cover
- [ ] Agregar/eliminar equipos
- [ ] Ver sesiones activas
- [ ] Cambiar contraseña (Clerk)

### 7.2 Tests Automatizados (Opcional)

Crear tests unitarios para:
- Hooks
- Stores
- Utilidades de validación

---

## Fase 8: Limpieza (1 hora)

### 8.1 Eliminar Archivos Antiguos

```bash
rm src/components/ConfigPage.tsx
rm src/components/ConfigPage.module.scss
rm src/components/TeamsTable.tsx
rm src/components/TeamsTable.module.scss
```

### 8.2 Actualizar Documentación

- Actualizar README.md del módulo
- Marcar migración como completada
- Documentar nuevos componentes

---

## Checklist de Migración

### Preparación
- [ ] Crear branch de trabajo
- [ ] Analizar componente actual
- [ ] Identificar dependencias

### Types
- [ ] Crear profile.types.ts
- [ ] Crear security.types.ts
- [ ] Crear teams.types.ts

### Stores
- [ ] Crear configPageStore.ts
- [ ] Crear profileFormStore.ts
- [ ] Crear securityStore.ts (opcional)

### Hooks
- [ ] Crear useProfileForm.ts
- [ ] Crear useImageUpload.ts
- [ ] Crear useTeamsManagement.ts
- [ ] Crear useSecuritySettings.ts

### Componentes
- [ ] Crear ConfigPage principal
- [ ] Separar ProfileSection
- [ ] Separar SecuritySection
- [ ] Separar TeamsSection
- [ ] Migrar TeamsTable
- [ ] Crear componentes UI compartidos

### Integración
- [ ] Actualizar imports en page.tsx
- [ ] Actualizar imports internos
- [ ] Verificar que no hay errores de TypeScript

### Testing
- [ ] Tests manuales completos
- [ ] Verificar en diferentes navegadores
- [ ] Verificar responsive design

### Limpieza
- [ ] Eliminar archivos antiguos
- [ ] Actualizar documentación
- [ ] Crear PR y review

---

## Estimación de Tiempo

| Fase | Tiempo Estimado |
|------|----------------|
| Preparación | 1-2 horas |
| Types | 2-3 horas |
| Stores | 3-4 horas |
| Hooks | 4-5 horas |
| Componentes | 6-8 horas |
| Imports | 1-2 horas |
| Testing | 2-3 horas |
| Limpieza | 1 hora |
| **TOTAL** | **20-28 horas** |

---

## Notas Importantes

1. **No hacer todo de una vez:** Migrar por secciones (Profile → Security → Teams)
2. **Mantener funcionalidad:** Asegurar que todo funciona antes de eliminar código antiguo
3. **Commits frecuentes:** Hacer commits pequeños y descriptivos
4. **Testing continuo:** Probar después de cada cambio importante
5. **Documentar cambios:** Actualizar documentación conforme se avanza

---

**Última actualización:** 11 de noviembre, 2025  
**Estado:** 📋 Pendiente de inicio
