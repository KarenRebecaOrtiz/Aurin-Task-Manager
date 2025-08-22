import React, { useState, useEffect, useRef } from 'react';
import styles from './AISummaryMessage.module.scss';
import { Component as AsciiBackground } from './open-ai-codex-animated-background';
import OpenAILoader from './OpenAILoader';

interface AISummaryMessageProps {
  summary?: string;
  isLoading?: boolean;
  interval?: string;
  timestamp?: Date;
  onRetry?: () => void;
  onClose?: () => void;
  forceShowLoader?: boolean;
}

const AISummaryMessage: React.FC<AISummaryMessageProps> = ({
  summary,
  isLoading = false,
  interval,
  timestamp,
  onRetry,
  onClose,
  forceShowLoader = false,
}) => {
  const [showLoader, setShowLoader] = useState(false);
  const loaderTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Hook para mostrar loader por 5 segundos
  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      
      // Limpiar timer anterior si existe
      if (loaderTimerRef.current) {
        clearTimeout(loaderTimerRef.current);
      }
      
      // Mostrar loader por 5 segundos
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 5000);
      
      loaderTimerRef.current = timer;
    } else {
      // Si no está cargando, ocultar el loader inmediatamente
      setShowLoader(false);
      if (loaderTimerRef.current) {
        clearTimeout(loaderTimerRef.current);
        loaderTimerRef.current = null;
      }
    }
    
    // Cleanup
    return () => {
      if (loaderTimerRef.current) {
        clearTimeout(loaderTimerRef.current);
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
              <img 
                src="/ChatGPT-Logo.png" 
                alt="ChatGPT" 
                width="24" 
                height="24"
                style={{ borderRadius: '50%' }}
              />
            </div>
            <span className={styles.label}>ChatGPT</span>
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
            dangerouslySetInnerHTML={{ __html: formatSummaryText(summary || '') }}
          />
        </div>
      </div>
    </div>
  );
};

export default AISummaryMessage;
