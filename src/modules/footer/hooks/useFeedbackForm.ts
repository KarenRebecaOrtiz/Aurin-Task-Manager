import { useState, useCallback } from 'react';
import { FEEDBACK_MESSAGES } from '../constants';

export const useFeedbackForm = () => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      setMessage(FEEDBACK_MESSAGES.EMPTY);
      console.log('[Footer] Feedback vacío', { feedback, timestamp: new Date().toISOString() });
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const requestBody = JSON.stringify({ feedback });
      console.log('[Footer] Iniciando fetch a /api/sendFeedback', {
        method: 'POST',
        url: '/api/sendFeedback',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        navigatorOnline: navigator.onLine,
        windowLocation: window.location.href,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch('/api/sendFeedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      const responseHeaders = Object.fromEntries(response.headers.entries());
      console.log('[Footer] Respuesta recibida', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: responseHeaders,
        url: response.url,
        redirected: response.redirected,
        type: response.type,
        timestamp: new Date().toISOString(),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(FEEDBACK_MESSAGES.SUCCESS);
        setFeedback('');
        console.log('[Footer] Feedback enviado correctamente', { data, timestamp: new Date().toISOString() });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage(FEEDBACK_MESSAGES.ERROR);
        console.error('[Footer] Error al enviar', {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          errorData,
          url: response.url,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      setMessage(FEEDBACK_MESSAGES.NETWORK_ERROR);
      console.error('[Footer] Error en fetch', {
        error: error instanceof Error ? error.message : JSON.stringify(error),
        stack: error instanceof Error ? error.stack : undefined,
        navigatorOnline: navigator.onLine,
        windowLocation: window.location.href,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
      console.log('[Footer] Fetch finalizado', { isSubmitting: false, timestamp: new Date().toISOString() });
    }
  }, [feedback]);

  return {
    feedback,
    isSubmitting,
    message,
    setFeedback,
    handleSubmit,
  };
};
