// src/app/p/layout.tsx
import React from 'react';
import { PageProvider } from '@/contexts/PageContext';
import { AuthProvider } from '@/contexts/AuthContext';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout para páginas públicas compartidas
 *
 * PageProvider con isPublic=true:
 * - AuthProvider en modo público (devuelve valores predeterminados)
 * - SÍ carga ThemeContext (tema visual)
 * - NO carga Firestore listeners globales
 * - NO carga sistema de notificaciones
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <PageProvider isPublic={true}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </PageProvider>
  );
}
