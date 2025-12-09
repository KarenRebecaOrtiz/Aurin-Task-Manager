'use client';

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { House } from 'lucide-react';

import { Header } from '@/modules/header';
import { AuthProvider } from '@/contexts/AuthContext';
import { PageProvider } from '@/contexts/PageContext';
// Removed unused imports for production build
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { Footer } from '@/modules/footer';
import Loader from '@/modules/loader';
import { FuzzyText } from '@/components/ui/FuzzyText';
import { Button } from '@/components/ui/buttons';

import styles from './not-found.module.scss';

function NotFoundContent() {
  const { user } = useUser();
  // const { isAdmin } = useAuth(); // Removed unused variable
  const router = useRouter();
  
  // Refs para optimización
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Estados del store
  const selectedContainer = useTasksPageStore(useShallow(state => state.container));
  const isArchiveTableOpen = useTasksPageStore(useShallow(state => state.isArchiveTableOpen));
  const showLoader = useTasksPageStore(useShallow(state => state.showLoader));
  const contentReady = useTasksPageStore(useShallow(state => state.contentReady));
  const setShowLoader = useTasksPageStore(useShallow(state => state.setShowLoader));
  const setContentReady = useTasksPageStore(useShallow(state => state.setContentReady));
  
  // Estado para el loader de navegación
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Estados de datos
  const users = useDataStore(useShallow(state => state.users));
  
  // Memoización de usuarios
  const memoizedUsers = useMemo(() => users, [users]);
  
  // Efecto para manejar el loader en la página 404
  useEffect(() => {
    // Ocultar el loader y marcar el contenido como listo inmediatamente
    setShowLoader(false);
    setContentReady(true);
  }, [setShowLoader, setContentReady]);
  
  // Handlers
  const handleContainerChange = useCallback((container: 'tareas' | 'cuentas' | 'miembros' | 'config') => {
    const { setContainer } = useTasksPageStore.getState();
    setContainer(container);
    
    // Mostrar loader de navegación
    setIsNavigating(true);
    
    // Navegar a la página de tasks (que maneja todos los containers)
    router.push('/dashboard/tasks');
    
    // Ocultar el loader después de un breve delay para permitir la animación
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  }, [router]);

  const handleGoHome = useCallback(() => {
    // Navegación directa sin loader
    window.location.href = 'https://pm.aurincloud.com/dashboard/tasks';
  }, []);
  
  const handleNotificationClick = useCallback((notification: { id: string }) => {
    console.log('[NotFound] Notification clicked:', notification.id);
  }, []);
  
  
  // Renderizar el contenido principal
  const mainContent = (
    <div className={styles.container}>
      <div ref={headerRef}>
        <Header
          selectedContainer={selectedContainer}
          isArchiveTableOpen={isArchiveTableOpen}
          onChangeContainer={handleContainerChange}
        />
      </div>
      
      <div ref={contentRef} className={styles.content}>
          <div className={styles.errorContainer}>
            <div className={styles.fuzzyTextContainer}>
              <FuzzyText
                baseIntensity={0.2}
                hoverIntensity={0.4}
                enableHover={true}
              >
                404
              </FuzzyText>
            </div>
            
            <h1 className={styles.errorTitle}>
              Parece que esta página se esfumó o nunca existió.
            </h1>
            
            <p className={styles.errorSubtitle}>
              ¿Volvemos al inicio? ¡Prometemos no perdernos otra vez!
            </p>
            
            <div className={styles.buttonContainer}>
              <Button
                intent="primary"
                size="lg"
                leftIcon={House}
                onClick={handleGoHome}
              >
                Ir al Inicio
              </Button>
            </div>
          </div>
        </div>
      
      <div className={styles.vignetteTop} />
      <div className={styles.vignetteBottom} />
      <Footer />
    </div>
  );

  return (
    <>
      {showLoader && <Loader />}
      {isNavigating && (
        <Loader 
          isFullPage={true} 
          message="Navegando al dashboard..." 
          isVisible={isNavigating}
          onAnimationComplete={() => {
            console.log('Navigation loader completed');
            setIsNavigating(false);
          }}
        />
      )}
      {contentReady && mainContent}
    </>
  );
}

export default function NotFound() {
  return (
    <PageProvider isPublic={false}>
      <AuthProvider>
        <NotFoundContent />
      </AuthProvider>
    </PageProvider>
  );
}
