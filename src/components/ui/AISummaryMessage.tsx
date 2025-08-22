import React, { useState, useEffect } from 'react';
import styles from './AISummaryMessage.module.scss';
import { Component as AsciiBackground } from './open-ai-codex-animated-background';
import OpenAILoader from './OpenAILoader';

interface AISummaryMessageProps {
  summaryText?: string;
  interval: string;
  timestamp: Date;
  onClose: () => void;
  isLoading?: boolean;
}

const AISummaryMessage: React.FC<AISummaryMessageProps> = ({
  summaryText,
  interval,
  timestamp,
  onClose,
  isLoading = false,
}) => {
  const [showLoader, setShowLoader] = useState(false);
  const [loaderTimer, setLoaderTimer] = useState<NodeJS.Timeout | null>(null);

  // ✅ Hook para mostrar loader por 5 segundos
  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      
      // Limpiar timer anterior si existe
      if (loaderTimer) {
        clearTimeout(loaderTimer);
      }
      
      // Mostrar loader por 5 segundos
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 5000);
      
      setLoaderTimer(timer);
    }
    
    // Cleanup
    return () => {
      if (loaderTimer) {
        clearTimeout(loaderTimer);
      }
    };
  }, [isLoading]);

  // ✅ FUNCIÓN HELPER PARA FORMATEAR EL TEXTO DEL RESUMEN
  const formatSummaryText = (text: string): string => {
    if (!text) return '';
    
    // Convertir markdown básico a HTML
    let formatted = text
      // Títulos
      .replace(/^## (.*$)/gim, '<h2 class="summary-h2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="summary-h3">$1</h3>')
      
      // Negritas
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      
      // Cursivas
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      
      // Listas
      .replace(/^• (.*$)/gim, '<li class="summary-li">$1</li>')
      .replace(/^\- (.*$)/gim, '<li class="summary-li">$1</li>')
      
      // Saltos de línea
      .replace(/\n/g, '<br/>')
      
      // Envolver listas en <ul>
      .replace(/(<li class="summary-li">.*?<\/li>)/g, '<ul class="summary-ul">$1</ul>');
    
    // Limpiar listas duplicadas
    formatted = formatted.replace(/<\/ul>\s*<ul class="summary-ul">/g, '');
    
    return formatted;
  };

  const getIntervalLabel = (interval: string) => {
    switch (interval) {
      case '1day': return 'último día';
      case '3days': return 'últimos 3 días';
      case '1week': return 'última semana';
      case '1month': return 'último mes';
      case '6months': return 'últimos 6 meses';
      case '1year': return 'último año';
      default: return interval;
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City',
    });
  };

  // ✅ Mostrar loader si está cargando O si showLoader es true
  if (isLoading || showLoader) {
    return (
      <div className={styles.aiSummaryMessage}>
        {/* Fondo ASCII */}
        <AsciiBackground />
        
        {/* Card minimalista de OpenAI */}
        <div className={styles.openaiCard}>
          <OpenAILoader text="Generando" size="medium" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.aiSummaryMessage}>
      {/* Fondo ASCII */}
      <AsciiBackground />
      
      {/* Card con resumen */}
      <div className={styles.openaiCard}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.openaiLogo}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="24" height="24">
                <path d="M45.403,25.562c-0.506-1.89-1.518-3.553-2.906-4.862c1.134-2.665,0.963-5.724-0.487-8.237	c-1.391-2.408-3.636-4.131-6.322-4.851c-1.891-0.506-3.839-0.462-5.669,0.088C28.276,5.382,25.562,4,22.647,4	c-4.906,0-9.021,3.416-10.116,7.991c-0.01,0.001-0.019-0.003-0.029-0.002c-2.902,0.36-5.404,2.019-6.865,4.549	c-1.391,2.408-1.76,5.214-1.04,7.9c0.507,1.891,1.519,3.556,2.909,4.865c-1.134,2.666-0.97,5.714,0.484,8.234	c1.391,2.408,3.636,4.131,6.322,4.851c0.896,0.24,1.807,0.359,2.711,0.359c1.003,0,1.995-0.161,2.957-0.45	C21.722,44.619,24.425,46,27.353,46c4.911,0,9.028-3.422,10.12-8.003c2.88-0.35,5.431-2.006,6.891-4.535	C45.754,31.054,46.123,28.248,45.403,25.562z M35.17,9.543c2.171,0.581,3.984,1.974,5.107,3.919c1.049,1.817,1.243,4,0.569,5.967	c-0.099-0.062-0.193-0.131-0.294-0.19l-9.169-5.294c-0.312-0.179-0.698-0.177-1.01,0.006l-10.198,6.041l-0.052-4.607l8.663-5.001	C30.733,9.26,33,8.963,35.17,9.543z M29.737,22.195l0.062,5.504l-4.736,2.805l-4.799-2.699l-0.062-5.504l4.736-2.805L29.737,22.195z M14.235,14.412C14.235,9.773,18.009,6,22.647,6c2.109,0,4.092,0.916,5.458,2.488C28,8.544,27.891,8.591,27.787,8.651l-9.17,5.294	c-0.312,0.181-0.504,0.517-0.5,0.877l0.133,11.851l-4.015-2.258V14.412z M6.528,23.921c-0.581-2.17-0.282-4.438,0.841-6.383	c1.06-1.836,2.823-3.074,4.884-3.474c-0.004,0.116-0.018,0.23-0.018,0.348V25c0,0.361,0.195,0.694,0.51,0.872l10.329,5.81	L19.11,34.03l-8.662-5.002C8.502,27.905,7.11,26.092,6.528,23.921z M14.83,40.457c-2.171-0.581-3.984-1.974-5.107-3.919	c-1.053-1.824-1.249-4.001-0.573-5.97c0.101,0.063,0.196,0.133,0.299,0.193l9.169,5.294c0.154,0.089,0.327,0.134,0.5,0.134	c0.177,0,0.353-0.047,0.51-0.14l10.198-6.041l0.052,4.607l-8.663-5.001C19.269,40.741,17.001,41.04,14.83,40.457z M35.765,35.588	c0,4.639-3.773,8.412-8.412,8.412c-2.119,0-4.094-0.919-5.459-2.494c0.105-0.056,0.216-0.098,0.32-0.158l9.17-5.294	c0.312-0.181,0.504-0.517,0.5-0.877L31.75,23.327l4.015,2.258V35.588z M42.631,32.462c-1.056,1.83-2.84,3.086-4.884,3.483	c0.004-0.12,0.018-0.237,0.018-0.357V25c0-0.361-0.195-0.694-0.51-0.872l-10.329-5.81l3.964-2.348l8.662,5.002	c1.946,1.123,3.338,2.937,3.92,5.107C44.053,28.249,43.754,30.517,42.631,32.462z" fill="currentColor"/>
              </svg>
            </div>
            <span className={styles.label}>OpenAI</span>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            title="Cerrar resumen"
            aria-label="Cerrar resumen"
          >
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <div 
            className={styles.summaryText}
            dangerouslySetInnerHTML={{ __html: formatSummaryText(summaryText || '') }}
          />
        </div>
      </div>
    </div>
  );
};

export default AISummaryMessage;
