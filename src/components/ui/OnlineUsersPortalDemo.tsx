'use client';

import React from 'react';
import OnlineUsersPortal from './OnlineUsersPortal';

export function OnlineUsersPortalDemo() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: 'white',
        borderRadius: '1rem',
        padding: '2rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#1f2937'
        }}>
          OnlineUsersPortal Demo
        </h1>
        
        <p style={{ 
          fontSize: '1.125rem', 
          color: '#6b7280',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Este es un demo del componente OnlineUsersPortal. El componente aparecerá en el bottom right de la pantalla 
          mostrando los usuarios que están online (con estado "Disponible", "Ocupado" o "Por terminar").
        </p>
        
        <div style={{ 
          background: '#f3f4f6', 
          padding: '1.5rem', 
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            marginBottom: '1rem',
            color: '#374151'
          }}>
            Características del componente:
          </h2>
          
          <ul style={{ 
            listStyle: 'disc', 
            paddingLeft: '1.5rem',
            color: '#4b5563',
            lineHeight: '1.6'
          }}>
            <li>Portal que se renderiza en el body del documento</li>
            <li>Posicionado en el bottom right de la pantalla</li>
            <li>Muestra avatares de usuarios online con sus estados</li>
            <li>Tooltip con información detallada al hacer hover</li>
            <li>Indicador de usuarios adicionales si hay más de los visibles</li>
            <li>Diseño responsive</li>
            <li>Animaciones suaves y efectos hover</li>
          </ul>
        </div>
        
        <div style={{ 
          marginTop: '2rem',
          padding: '1rem',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '0.5rem'
        }}>
          <p style={{ 
            color: '#92400e',
            fontSize: '0.875rem',
            margin: 0
          }}>
            <strong>Nota:</strong> El componente solo se mostrará si hay usuarios online en tu aplicación. 
            Si no ves el componente, asegúrate de que haya usuarios con estado "Disponible", "Ocupado" o "Por terminar".
          </p>
        </div>
      </div>
      
      {/* El portal se renderizará automáticamente */}
      <OnlineUsersPortal maxVisible={4} />
    </div>
  );
}

export default OnlineUsersPortalDemo; 