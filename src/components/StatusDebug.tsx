'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTabDetection } from '@/hooks/useTabDetection';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export default function StatusDebug() {
  const { user } = useUser();
  const { currentStatus, isOnline, tabCount, updateStatus } = useOnlineStatus();
  const { activeTabCount, isOnline: tabIsOnline, sessionId } = useTabDetection();
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    currentStatus: string;
    isOnline: boolean;
    tabCount: number;
    cachedStatus: string | null;
    cachedManualStatus: string | null;
    lastUpdate: string;
    timestamp: string;
    sessionStorage: string | null;
    activeTabs: Record<string, number> | null;
    tabDetectionActiveTabCount: number;
    tabDetectionIsOnline: boolean;
    sessionId: string;
  }>({
    currentStatus: '',
    isOnline: false,
    tabCount: 0,
    cachedStatus: null,
    cachedManualStatus: null,
    lastUpdate: '',
    timestamp: '',
    sessionStorage: null,
    activeTabs: null,
    tabDetectionActiveTabCount: 0,
    tabDetectionIsOnline: false,
    sessionId: ''
  });

  useEffect(() => {
    // Solo mostrar en desarrollo
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const updateDebugInfo = () => {
      const cachedStatus = localStorage.getItem(`userStatus_${user.id}`);
      const cachedManualStatus = localStorage.getItem(`lastManualStatus_${user.id}`);
      const lastUpdate = localStorage.getItem('lastOnlineUpdate');
      
      // Obtener información de SessionStorage
      const activeTabsData = sessionStorage.getItem('activeTabs');
      let activeTabs = null;
      if (activeTabsData) {
        try {
          activeTabs = JSON.parse(activeTabsData);
        } catch {
          activeTabs = null;
        }
      }

      setDebugInfo({
        currentStatus,
        isOnline,
        tabCount,
        cachedStatus,
        cachedManualStatus,
        lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)).toLocaleString() : 'N/A',
        timestamp: new Date().toLocaleString(),
        sessionStorage: activeTabsData,
        activeTabs,
        tabDetectionActiveTabCount: activeTabCount,
        tabDetectionIsOnline: tabIsOnline,
        sessionId
      });
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);

    return () => clearInterval(interval);
  }, [user?.id, currentStatus, isOnline, tabCount, activeTabCount, tabIsOnline, sessionId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus(newStatus, true);
      console.log(`Status changed to: ${newStatus}`);
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#1a1a1a',
      color: '#fff',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '450px',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid #333'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>🔧 Status Debug</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Estado Actual:</strong> {currentStatus}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Online (useOnlineStatus):</strong> {isOnline ? '✅ Sí' : '❌ No'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Online (useTabDetection):</strong> {tabIsOnline ? '✅ Sí' : '❌ No'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Pestañas (useOnlineStatus):</strong> {tabCount}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Pestañas (useTabDetection):</strong> {activeTabCount}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Session ID:</strong> {sessionId}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Cache Status:</strong> {debugInfo.cachedStatus || 'N/A'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Manual Status:</strong> {debugInfo.cachedManualStatus || 'N/A'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Última Actualización:</strong> {debugInfo.lastUpdate}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Timestamp:</strong> {debugInfo.timestamp}
      </div>
      
      {debugInfo.activeTabs && (
        <div style={{ marginBottom: '10px' }}>
          <strong>Pestañas en SessionStorage:</strong>
          <div style={{ marginTop: '5px', fontSize: '10px' }}>
            {Object.entries(debugInfo.activeTabs).map(([id, timestamp]) => (
              <div key={id} style={{ 
                color: id === sessionId ? '#00ff00' : '#fff',
                fontWeight: id === sessionId ? 'bold' : 'normal'
              }}>
                {id}: {new Date(timestamp).toLocaleTimeString()}
                {id === sessionId ? ' (esta pestaña)' : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '10px' }}>
        <strong>Cambiar Estado:</strong>
        <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
          {['Disponible', 'Ocupado', 'Por terminar', 'Fuera'].map(status => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                background: currentStatus === status ? '#00ff00' : '#333',
                color: currentStatus === status ? '#000' : '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 