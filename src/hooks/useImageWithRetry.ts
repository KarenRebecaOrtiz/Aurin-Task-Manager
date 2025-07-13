import { useState, useRef, useCallback } from 'react';

interface UseImageWithRetryOptions {
  maxRetries?: number;
  fallbackSrc?: string;
  retryDelay?: number;
}

export const useImageWithRetry = (options: UseImageWithRetryOptions = {}) => {
  const {
    maxRetries = 3,
    fallbackSrc = '/empty-image.png',
    retryDelay = 1000
  } = options;

  const [src, setSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadImage = useCallback((imageSrc: string) => {
    if (!imageSrc || imageSrc === fallbackSrc) {
      setSrc(fallbackSrc);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    retryCountRef.current = 0;

    const attemptLoad = () => {
      const img = new Image();
      
      img.onload = () => {
        setSrc(imageSrc);
        setIsLoading(false);
        setHasError(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      img.onerror = () => {
        retryCountRef.current++;
        
        if (retryCountRef.current < maxRetries) {
          // Reintentar después de un delay
          timeoutRef.current = setTimeout(() => {
            attemptLoad();
          }, retryDelay);
        } else {
          // Usar fallback después de agotar los reintentos
          console.warn(`Failed to load image after ${maxRetries} attempts: ${imageSrc}, using fallback`);
          setSrc(fallbackSrc);
          setIsLoading(false);
          setHasError(true);
        }
      };

      img.src = imageSrc;
    };

    attemptLoad();
  }, [maxRetries, fallbackSrc, retryDelay]);

  const reset = useCallback(() => {
    setSrc('');
    setIsLoading(false);
    setHasError(false);
    retryCountRef.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    src,
    isLoading,
    hasError,
    loadImage,
    reset
  };
}; 