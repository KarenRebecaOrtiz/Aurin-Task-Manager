import { useState, useCallback, useRef, useEffect } from 'react';

interface UseMessageDragProps {
  onReplyActivated: (messageId: string) => void;
}

export const useMessageDrag = ({ onReplyActivated }: UseMessageDragProps) => {
  const [isDraggingMessage, setIsDraggingMessage] = useState(false);
  const [draggedMessageId, setDraggedMessageId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  
  const messageDragStartX = useRef(0);
  const messageDragStartY = useRef(0);
  const isDraggingMessageRef = useRef(false);

  const handleMessageDragStart = useCallback((messageId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[MessageDrag] Drag start for message:', messageId);
    
    // Guardar posición inicial
    if ('touches' in e) {
      messageDragStartX.current = e.touches[0].clientX;
      messageDragStartY.current = e.touches[0].clientY;
    } else {
      messageDragStartX.current = e.clientX;
      messageDragStartY.current = e.clientY;
    }
    
    setIsDraggingMessage(true);
    isDraggingMessageRef.current = true;
    setDraggedMessageId(messageId);
    setDragOffset(0);
  }, []);

  const handleMessageDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingMessageRef.current || !draggedMessageId) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Calcular delta desde la posición inicial
    const deltaX = messageDragStartX.current - currentX;
    const deltaY = Math.abs(messageDragStartY.current - currentY);
    
    console.log('[MessageDrag] Drag move - deltaX:', deltaX, 'deltaY:', deltaY);
    
    // Solo permitir drag horizontal si el movimiento vertical es menor
    if (deltaY < 50) {
      const maxOffset = 80; // Máximo desplazamiento
      
      // Permitir drag en ambas direcciones
      if (Math.abs(deltaX) > 0) {
        const clampedOffset = Math.max(-maxOffset, Math.min(deltaX, maxOffset));
        setDragOffset(clampedOffset);
        console.log('[MessageDrag] Drag offset set to:', clampedOffset);
      } else {
        setDragOffset(0);
      }
    }
  }, [draggedMessageId]);

  const handleMessageDragEnd = useCallback(() => {
    if (!isDraggingMessageRef.current || !draggedMessageId) return;
    
    console.log('[MessageDrag] Drag end - final offset:', dragOffset);
    
    const threshold = 60; // Umbral para activar la respuesta
    
    // Activar respuesta si se arrastra hacia la izquierda más allá del umbral
    if (dragOffset >= threshold) {
      onReplyActivated(draggedMessageId);
      console.log('[MessageDrag] Reply activated for message:', draggedMessageId);
    }
    
    // Resetear estados con animación
    setIsDraggingMessage(false);
    isDraggingMessageRef.current = false;
    setDraggedMessageId(null);
    
    // Animar el regreso a la posición original
    setTimeout(() => {
      setDragOffset(0);
    }, 50);
  }, [draggedMessageId, dragOffset, onReplyActivated]);

  // Eventos globales para el drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingMessageRef.current) {
        handleMessageDragMove(e as unknown as React.MouseEvent);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingMessageRef.current) {
        handleMessageDragEnd();
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDraggingMessageRef.current) {
        handleMessageDragMove(e as unknown as React.TouchEvent);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDraggingMessageRef.current) {
        handleMessageDragEnd();
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [handleMessageDragMove, handleMessageDragEnd]);

  return {
    isDraggingMessage,
    draggedMessageId,
    dragOffset,
    handleMessageDragStart,
  };
}; 