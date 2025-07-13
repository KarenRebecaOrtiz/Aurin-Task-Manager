import React, { useState, useCallback } from 'react';
import Image from 'next/image';

interface SafeImageProps {
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
  onClick?: () => void;
}

const SafeImage: React.FC<SafeImageProps> = ({
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
  onClick,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (retryCount < maxRetries) {
      // Reintentar con delay
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setCurrentSrc(src); // Reintentar con la imagen original
      }, retryDelay);
    } else {
      // Usar fallback después de agotar los reintentos
      console.warn(`Failed to load image after ${maxRetries} attempts: ${src}, using fallback`);
      setCurrentSrc(fallbackSrc);
      
      if (onError) {
        onError(e);
      }
    }
  }, [src, fallbackSrc, retryCount, maxRetries, retryDelay, onError]);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Reset retry count on successful load
    setRetryCount(0);
    
    if (onLoad) {
      onLoad(e);
    }
  }, [onLoad]);

  // Reset when src changes
  React.useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
    setRetryCount(0);
  }, [src, fallbackSrc]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      onClick={onClick}
      {...props}
    />
  );
};

export default SafeImage; 