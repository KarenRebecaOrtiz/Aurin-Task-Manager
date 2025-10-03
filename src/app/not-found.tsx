'use client';

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import Header from '@/components/ui/Header';
import OptimizedMarquee from '@/components/ui/OptimizedMarquee';
import SyncUserToFirestore from '@/components/SyncUserToFirestore';
import Selector from '@/components/Selector';
import { CursorProvider, Cursor, CursorFollow } from '@/components/ui/Cursor';
import { AuthProvider } from '@/contexts/AuthContext';
// Removed unused imports for production build
import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import Dock from '@/components/Dock';
import Footer from '@/components/ui/Footer';
import Loader from '@/components/Loader';
import { FuzzyText } from '@/components/ui/FuzzyText';

import styles from './not-found.module.scss';

function NotFoundContent() {
  const { user } = useUser();
  // const { isAdmin } = useAuth(); // Removed unused variable
  const router = useRouter();
  
  // Refs para optimización
  const headerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
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
  
  const handleNotificationClick = useCallback((notification: { id: string }) => {
    console.log('[NotFound] Notification clicked:', notification.id);
  }, []);
  
  
  // Renderizar el contenido principal
  const mainContent = (
    <div className={styles.container}>
      <OptimizedMarquee />
      <SyncUserToFirestore />
      
      <div ref={headerRef}>
        <Header
          selectedContainer={selectedContainer}
          isArchiveTableOpen={isArchiveTableOpen}
          users={memoizedUsers}
          notifications={[]}
          onNotificationClick={handleNotificationClick}
          onLimitNotifications={() => {}}
          onChangeContainer={handleContainerChange}
        />
      </div>
      
      
      <div ref={selectorRef} className={styles.selector}>
        <Selector
          selectedContainer={selectedContainer as 'tareas' | 'cuentas' | 'miembros'}
          setSelectedContainer={(c: 'tareas' | 'cuentas' | 'miembros') => handleContainerChange(c)}
          options={[
            { value: 'tareas', label: 'Inicio' },
            { value: 'cuentas', label: 'Cuentas' },
            { value: 'miembros', label: 'Miembros' },
          ]}
        />
      </div>
      
      <CursorProvider>
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
              🔍 Estamos buscando… pero no hay nada aquí
            </h1>
            
            <p className={styles.errorMessage}>
             Parece que esta página se esfumó o nunca existió.
            </p>
            
            <p className={styles.errorSubtitle}>
              ¿Volvemos al inicio? ¡Prometemos no perdernos otra vez!
            </p>
            
            <p className={styles.instructions}>
               <strong>Instrucciones:</strong> Usa el selector de arriba para navegar a cualquier sección. 
              El botón &ldquo;Inicio&rdquo; te llevará al dashboard principal.
            </p>
          </div>
        </div>
        <Cursor>
          <svg
            className={styles.cursorIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 40 40"
          >
            <path
              fill="currentColor"
              d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
            />
          </svg>
        </Cursor>
        <CursorFollow>
          <div className={styles.cursorFollowContent}>{user?.fullName || 'Usuario'}</div>
        </CursorFollow>
      </CursorProvider>
      
      <div className={styles.vignetteTop} />
      <div className={styles.vignetteBottom} />
      <Dock />
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
    <AuthProvider>
      <NotFoundContent />
    </AuthProvider>
  );
}
