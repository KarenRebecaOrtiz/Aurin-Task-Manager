'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';

interface PageContextType {
  isPublicPage: boolean;
  // Permisos basados en si es página pública o privada
  canUseAuth: boolean;
  canUseTheme: boolean;
  canUseFirestore: boolean;
  canUseNotifications: boolean;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export const usePageContext = () => {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePageContext must be used within a PageProvider');
  }
  return context;
};

interface PageProviderProps {
  children: ReactNode;
  isPublic?: boolean; // Si es página pública (ej: /p/[token])
}

/**
 * PageProvider - Contexto que determina si estamos en página pública o privada
 * 
 * Páginas PÚBLICAS (/p/[token], /share/*):
 * - NO requieren autenticación
 * - NO cargan AuthContext
 * - SÍ pueden usar ThemeContext
 * - NO pueden usar Firestore listeners globales
 * - NO pueden usar notificaciones
 * 
 * Páginas PRIVADAS (/app/*, /dashboard/*):
 * - Requieren autenticación
 * - Cargan AuthContext completo
 * - Cargan ThemeContext
 * - Cargan Firestore listeners
 * - Cargan sistema de notificaciones
 */
export const PageProvider: React.FC<PageProviderProps> = ({ 
  children, 
  isPublic = false 
}) => {
  const contextValue = useMemo<PageContextType>(() => ({
    isPublicPage: isPublic,
    // Permisos según tipo de página
    canUseAuth: !isPublic,           // Auth solo en privadas
    canUseTheme: true,                 // Theme en ambas
    canUseFirestore: !isPublic,       // Firestore solo en privadas
    canUseNotifications: !isPublic,   // Notifications solo en privadas
  }), [isPublic]);

  return (
    <PageContext.Provider value={contextValue}>
      {children}
    </PageContext.Provider>
  );
};
