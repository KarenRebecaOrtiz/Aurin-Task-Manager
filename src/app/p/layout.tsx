// src/app/p/layout.tsx
import React from 'react';
import { PageProvider } from '@/contexts/PageContext';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout para páginas públicas compartidas
 * 
 * PageProvider con isPublic=true:
 * - NO carga AuthContext (no requiere autenticación)
 * - SÍ carga ThemeContext (tema visual)
 * - NO carga Firestore listeners globales
 * - NO carga sistema de notificaciones
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <PageProvider isPublic={true}>
      {children}
    </PageProvider>
  );
}
