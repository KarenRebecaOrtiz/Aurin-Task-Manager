"use client";

import { useEffect, useRef } from "react";

interface ChatScrollAnchorProps {
  /**
   * Referencia al contenedor con scroll
   */
  scrollAreaRef: React.RefObject<HTMLDivElement>;

  /**
   * Si el usuario está en el bottom del chat
   */
  isAtBottom: boolean;

  /**
   * Si debe trackear visibilidad (activar auto-scroll)
   * Típicamente true cuando hay mensajes nuevos llegando
   */
  trackVisibility: boolean;
}

/**
 * ChatScrollAnchor Component
 *
 * Componente invisible que actúa como ancla en el bottom del chat.
 * Usa IntersectionObserver para detectar visibilidad y hacer auto-scroll
 * inteligente cuando llegan mensajes nuevos.
 *
 * Basado en el patrón de WhatsApp/Messenger para auto-scroll.
 *
 * @see https://tuffstuff9.hashnode.dev/intuitive-scrolling-for-chatbot-message-streaming
 */
export const ChatScrollAnchor: React.FC<ChatScrollAnchorProps> = ({
  scrollAreaRef,
  isAtBottom,
  trackVisibility,
}) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    const anchor = anchorRef.current;

    if (!scrollArea || !anchor) return;

    // Cleanup observer anterior
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Crear IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const anchorEntry = entries[0];

        // Solo hacer auto-scroll si:
        // 1. El usuario está en el bottom (isAtBottom)
        // 2. Estamos trackeando (hay mensajes nuevos llegando)
        // 3. El ancla NO está visible (mensajes nuevos lo empujaron fuera)
        if (isAtBottom && trackVisibility && !anchorEntry.isIntersecting) {
          // Scroll suave al bottom
          scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.clientHeight;
        }
      },
      {
        root: scrollArea,
        threshold: 0.1,
        rootMargin: "0px 0px 10px 0px", // Margen para activar antes
      }
    );

    // Observar el ancla
    observerRef.current.observe(anchor);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [scrollAreaRef, isAtBottom, trackVisibility]);

  // Elemento invisible en el bottom
  return <div ref={anchorRef} className="h-px w-full" style={{ height: "1px" }} />;
};
