import React, { useState } from 'react';
import styles from './Footer.module.scss';

const Footer: React.FC = () => {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      setMessage('Por favor, escribe tus comentarios.');
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
        setMessage('¡Gracias por tus comentarios!');
        setFeedback('');
        console.log('[Footer] Feedback enviado correctamente', { data, timestamp: new Date().toISOString() });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage('No se pudo enviar. Intenta de nuevo, por favor.');
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
      setMessage('Ocurrió un error. Intenta nuevamente.');
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
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.info}>
        <p>
          Hecho con cariño para facilitarte el día <span>· v1.0.0 💛</span>
        </p>
      </div>
      <form className={styles.feedbackForm} onSubmit={handleSubmit}>
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Escribe aquí tus comentarios..."
          className={styles.feedbackInput}
          disabled={isSubmitting}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={isSubmitting}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7.4 6.32l8.49-2.83c3.81-1.27 5.88.8 4.61 4.61l-2.83 8.49c-1.9 5.71-5.02 5.71-6.92 0l-.84-2.52-2.52-.84c-5.71-1.9-5.71-5.02 0-6.91z" />
            <path d="M10.11 13.65l3.58-3.59" />
          </svg>
          Enviar
        </button>
      </form>
      {message && <p className={styles.message}>{message}</p>}
    </footer>
  );
};

export default Footer;
