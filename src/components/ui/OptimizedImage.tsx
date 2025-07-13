import React, { useEffect } from 'react';
import Image from 'next/image';
import { useImageWithRetry } from '@/hooks/useImageWithRetry';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
  maxRetries?: number;
  fallbackSrc?: string;
  retryDelay?: number;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  maxRetries = 3,
  fallbackSrc = '/empty-image.png',
  retryDelay = 1000,
  onError,
  onLoad,
  ...props
}) => {
  const { src: optimizedSrc, loadImage } = useImageWithRetry({
    maxRetries,
    fallbackSrc,
    retryDelay
  });

  useEffect(() => {
    loadImage(src);
  }, [src, loadImage]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Si ya estamos usando el fallback, no hacer nada más
    if (optimizedSrc === fallbackSrc) {
      return;
    }
    
    // Cargar el fallback inmediatamente
    loadImage(fallbackSrc);
    
    if (onError) {
      onError(e);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (onLoad) {
      onLoad(e);
    }
  };

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
};

export default OptimizedImage; 