# Módulo Advices

Este módulo maneja la funcionalidad de anuncios/avisos del sistema Aurin Task Manager.

## 📋 Descripción

El módulo `advices` proporciona componentes y utilidades para mostrar anuncios importantes a los usuarios del sistema. Los anuncios se muestran en una marquesina animada en la parte superior de la aplicación y son gestionados por administradores.

## 🏗️ Estructura

```
advices/
├── components/
│   ├── OptimizedMarquee.tsx          # Componente de marquesina optimizado
│   └── OptimizedMarquee.module.scss  # Estilos del componente
├── types/
│   └── index.ts                      # Tipos TypeScript del módulo
├── hooks/                            # Hooks personalizados (futuro)
├── utils/                            # Utilidades (futuro)
├── index.ts                          # Exportaciones principales
└── README.md                         # Este archivo
```

## 🎯 Componentes

### OptimizedMarquee

Componente principal que muestra los anuncios activos en una marquesina animada.

**Características:**
- Animación suave con Framer Motion
- Tooltip interactivo que muestra el nombre del creador
- Eliminación automática de anuncios expirados
- Responsive y optimizado para rendimiento
- Soporte para modo oscuro

**Props:**
```typescript
interface OptimizedMarqueeProps {
  speed?: number;        // Velocidad de animación (default: 30)
  showTooltip?: boolean; // Mostrar tooltip al hover (default: true)
  fontSize?: string;     // Tamaño de fuente (default: "1rem")
  textColor?: string;    // Color del texto
  hoverColor?: string;   // Color al hacer hover (default: "#000000")
}
```

**Uso:**
```tsx
import { OptimizedMarquee } from '@/modules/advices';

function App() {
  return <OptimizedMarquee speed={30} showTooltip={true} />;
}
```

## 📊 Tipos

### Advice

Representa un anuncio en el sistema.

```typescript
interface Advice {
  id: string;
  message: string;
  creatorFirstName: string;
  creatorId: string;
  expiry: Timestamp;
  createdAt?: Timestamp;
}
```

## 🔗 Integración

### Gestión de Anuncios

La creación y gestión de anuncios se realiza a través del componente `AdviceInput` ubicado en el módulo `header`:
- **Ubicación:** `@/modules/header/components/ui/AdviceInput`
- **Acceso:** Solo administradores
- **Funcionalidad:** Crear, editar y eliminar anuncios con tiempo de expiración

### Firebase

Los anuncios se almacenan en Firestore en la colección `advices`:
- Se eliminan automáticamente cuando expiran
- Consulta en tiempo real con `onSnapshot`
- Operaciones batch para eliminación eficiente

## 🎨 Estilos

El componente utiliza SCSS modules con las siguientes características:
- Variables CSS personalizadas
- Soporte para modo oscuro
- Optimizaciones de rendimiento con `will-change` y `transform`
- Responsive design

## 🚀 Futuras Mejoras

- [ ] Hook personalizado `useAdvices` para reutilizar lógica
- [ ] Utilidades para formateo de fechas de expiración
- [ ] Componente de gestión de anuncios integrado
- [ ] Soporte para diferentes tipos de anuncios (info, warning, error)
- [ ] Animaciones personalizables

## 📝 Notas

- Los anuncios expirados se eliminan automáticamente de Firestore
- El componente no se renderiza si no hay anuncios activos
- Optimizado para evitar re-renders innecesarios
