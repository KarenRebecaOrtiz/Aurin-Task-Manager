import React from 'react';
import styles from './AISummaryMessage.module.scss';

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
      .replace(/(<li class="summary-li">.*?<\/li>)/gs, '<ul class="summary-ul">$1</ul>');
    
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

  if (isLoading) {
    return (
      <div className={styles.aiSummaryMessage}>
        <div className={styles.header}>
          <div className={styles.title}>
            <span className={styles.icon}>🤖</span>
            <span className={styles.label}>Gemini</span>
            <span className={styles.interval}>({getIntervalLabel(interval)})</span>
          </div>
          <div className={styles.metadata}>
            <span className={styles.timestamp}>{formatTimestamp(timestamp)}</span>
            <div className={styles.loadingIndicator}>
              <div className={styles.thinkingDots}>
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </div>
              <span className={styles.thinkingText}>Pensando...</span>
            </div>
          </div>
        </div>
        
        <div className={styles.content}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingMessage}>
              <div className={styles.loadingIcon}>💭</div>
              <div className={styles.loadingText}>
                <p>Analizando la actividad de la tarea...</p>
                <p>Generando resumen ejecutivo...</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.footer}>
          <span className={styles.note}>
            ⏳ Generando resumen privado solo para ti
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.aiSummaryMessage}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.icon}>🤖</span>
          <span className={styles.label}>Resumen IA</span>
          <span className={styles.interval}>({getIntervalLabel(interval)})</span>
        </div>
        <div className={styles.metadata}>
          <span className={styles.timestamp}>{formatTimestamp(timestamp)}</span>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            title="Cerrar resumen"
            aria-label="Cerrar resumen"
          >
            ×
          </button>
        </div>
      </div>
      
      <div className={styles.content}>
        <div 
          className={styles.summaryText}
          dangerouslySetInnerHTML={{ __html: summaryText?.replace(/\n/g, '<br/>') || '' }}
        />
      </div>
      
      <div className={styles.footer}>
        <span className={styles.note}>
          💡 Este resumen es privado y solo visible para ti
        </span>
      </div>
    </div>
  );
};

export default AISummaryMessage;
