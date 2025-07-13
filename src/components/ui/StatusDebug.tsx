'use client';

import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTabDetection } from '@/hooks/useTabDetection';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface StatusDebugProps {
  isVisible?: boolean;
}

const StatusDebug: React.FC<StatusDebugProps> = ({ isVisible = false }) => {
  const { user } = useUser();
  const { currentStatus, isOnline, updateStatus } = useOnlineStatus(); // Remover tabCount y lastUpdate que no existen
  const { activeTabCount, isOnline: tabIsOnline, sessionId } = useTabDetection();
  const [firestoreStatus, setFirestoreStatus] = useState<string>('Loading...');
  const [lastFirestoreUpdate, setLastFirestoreUpdate] = useState<string>('Never');
  const [sessionStorageData, setSessionStorageData] = useState<string>('{}');
  const [localStorageData, setLocalStorageData] = useState<Record<string, string>>({});

  // Escuchar cambios en Firestore en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFirestoreStatus(data.status || 'Disponible');
        setLastFirestoreUpdate(new Date().toLocaleTimeString());
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Actualizar datos de SessionStorage y LocalStorage
  useEffect(() => {
    const updateStorageData = () => {
      if (typeof window !== 'undefined') {
        // SessionStorage
        const activeTabs = sessionStorage.getItem('activeTabs');
        setSessionStorageData(activeTabs || '{}');

        // LocalStorage
        const localStorageItems: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('userStatus') || key.includes('lastManualStatus') || key.includes('activeTabs'))) {
            localStorageItems[key] = localStorage.getItem(key) || '';
          }
        }
        setLocalStorageData(localStorageItems);
      }
    };

    updateStorageData();
    const interval = setInterval(updateStorageData, 2000);

    return () => clearInterval(interval);
  }, []);

  // Función para forzar estado offline
  const forceOffline = async () => {
    if (!user?.id) return;
    
    try {
      await updateDoc(doc(db, 'users', user.id), {
        status: 'Fuera',
        lastOnlineAt: new Date().toISOString(),
        lastStatusUpdate: serverTimestamp(),
        offlineDetectedAt: serverTimestamp(),
        presenceStatus: 'offline',
        isOnline: false
      });
      console.log('Estado offline forzado manualmente');
    } catch (error) {
      console.error('Error forzando estado offline:', error);
    }
  };

  // Función para limpiar todas las sesiones
  const clearAllSessions = () => {
    if (typeof window !== 'undefined') {
      // Limpiar SessionStorage
      sessionStorage.removeItem('activeTabs');
      
      // Limpiar LocalStorage relevante
      if (user?.id) {
        localStorage.removeItem(`userStatus_${user.id}`);
        localStorage.removeItem(`lastManualStatus_${user.id}`);
        localStorage.removeItem('lastOnlineUpdate');
      }
      
      console.log('Todas las sesiones limpiadas manualmente');
    }
  };

  if (!isVisible) return null;

  // Remover formatTime ya que no se usa
  // const formatTime = (timestamp: number) => {
  //   return new Date(timestamp).toLocaleTimeString();
  // };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible': return '#178d00';
      case 'Ocupado': return '#d32f2f';
      case 'Por terminar': return '#f57c00';
      case 'Fuera': return '#616161';
      default: return '#666';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '400px',
      maxHeight: '80vh',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      overflow: 'auto',
      border: '1px solid #333',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>🔍 Status Debug Panel</h3>
        <div style={{ fontSize: '10px', color: '#888' }}>
          User: {user?.id?.substring(0, 8)}... | Session: {sessionId.substring(0, 8)}...
        </div>
      </div>

      {/* Estado Actual */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>📊 Estado Actual</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <span style={{ color: '#888' }}>Hook Status:</span>
            <div style={{ 
              color: getStatusColor(currentStatus), 
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {currentStatus}
            </div>
          </div>
          <div>
            <span style={{ color: '#888' }}>Firestore Status:</span>
            <div style={{ 
              color: getStatusColor(firestoreStatus), 
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {firestoreStatus}
            </div>
          </div>
          <div>
            <span style={{ color: '#888' }}>Online:</span>
            <div style={{ color: isOnline ? '#178d00' : '#d32f2f', fontWeight: 'bold' }}>
              {isOnline ? '✅ Sí' : '❌ No'}
            </div>
          </div>
          <div>
            <span style={{ color: '#888' }}>Tab Online:</span>
            <div style={{ color: tabIsOnline ? '#178d00' : '#d32f2f', fontWeight: 'bold' }}>
              {tabIsOnline ? '✅ Sí' : '❌ No'}
            </div>
          </div>
        </div>
      </div>

      {/* Detección de Pestañas */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>📱 Detección de Pestañas</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <span style={{ color: '#888' }}>Detection Tab Count:</span>
            <div style={{ color: '#fff', fontWeight: 'bold' }}>{activeTabCount}</div>
          </div>
          <div>
            <span style={{ color: '#888' }}>Session ID:</span>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '10px' }}>{sessionId.substring(0, 8)}...</div>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>⏰ Timestamps</h4>
        <div style={{ fontSize: '10px' }}>
          <div><span style={{ color: '#888' }}>Firestore Update:</span> {lastFirestoreUpdate}</div>
        </div>
      </div>

      {/* SessionStorage */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>💾 SessionStorage</h4>
        <div style={{ 
          backgroundColor: '#2a2a2a', 
          padding: '8px', 
          borderRadius: '4px',
          fontSize: '10px',
          maxHeight: '100px',
          overflow: 'auto'
        }}>
          <pre style={{ margin: 0, color: '#0f0' }}>
            {JSON.stringify(JSON.parse(sessionStorageData), null, 2)}
          </pre>
        </div>
      </div>

      {/* LocalStorage */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>💾 LocalStorage (Relevante)</h4>
        <div style={{ 
          backgroundColor: '#2a2a2a', 
          padding: '8px', 
          borderRadius: '4px',
          fontSize: '10px',
          maxHeight: '100px',
          overflow: 'auto'
        }}>
          <pre style={{ margin: 0, color: '#0f0' }}>
            {JSON.stringify(localStorageData, null, 2)}
          </pre>
        </div>
      </div>

      {/* Acciones de Debug */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>🔧 Acciones</h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              sessionStorage.removeItem('activeTabs');
              console.log('SessionStorage limpiado manualmente');
            }}
            style={{
              backgroundColor: '#d32f2f',
              color: '#fff',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Limpiar SessionStorage
          </button>
          <button
            onClick={() => {
              localStorage.removeItem(`userStatus_${user?.id}`);
              localStorage.removeItem(`lastManualStatus_${user?.id}`);
              console.log('LocalStorage limpiado manualmente');
            }}
            style={{
              backgroundColor: '#f57c00',
              color: '#fff',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Limpiar LocalStorage
          </button>
          <button
            onClick={clearAllSessions}
            style={{
              backgroundColor: '#9c27b0',
              color: '#fff',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Limpiar Todo
          </button>
          <button
            onClick={forceOffline}
            style={{
              backgroundColor: '#616161',
              color: '#fff',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Forzar Offline
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#1976d2',
              color: '#fff',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            Recargar
          </button>
        </div>
      </div>

      {/* Cambiar Estado */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>🔄 Cambiar Estado</h4>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {['Disponible', 'Ocupado', 'Por terminar', 'Fuera'].map(status => (
            <button
              key={status}
              onClick={() => updateStatus(status)}
              style={{
                backgroundColor: currentStatus === status ? getStatusColor(status) : '#333',
                color: currentStatus === status ? '#000' : '#fff',
                border: 'none',
                padding: '3px 6px',
                borderRadius: '3px',
                fontSize: '9px',
                cursor: 'pointer'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Instrucciones */}
      <div style={{ fontSize: '10px', color: '#888', borderTop: '1px solid #333', paddingTop: '10px' }}>
        <div><strong>Para probar:</strong></div>
        <div>1. Abre múltiples pestañas</div>
        <div>2. Cierra todas las pestañas excepto una</div>
        <div>3. Cierra la última pestaña</div>
        <div>4. Verifica que el estado cambie a &quot;Fuera&quot;</div>
        <div><strong>Nota:</strong> Múltiples terminales pueden interferir</div>
      </div>
    </div>
  );
};

export default StatusDebug; 