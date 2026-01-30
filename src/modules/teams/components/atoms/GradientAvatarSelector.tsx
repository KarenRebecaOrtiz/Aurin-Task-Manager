'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, RefreshCw, ImagePlus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Image from 'next/image';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import styles from './GradientAvatarSelector.module.scss';

// Max file size in bytes (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface GradientConfig {
  colors: string[];
  id: string;
  animationDelay: number;
}

interface GradientAvatarSelectorProps {
  selectedGradientId: string;
  onSelect: (gradientId: string, colors?: string[]) => void;
  teamInitials?: string;
  className?: string;
  customImageUrl?: string;
  onImageUpload?: (url: string) => void;
}

const generateRandomGradient = (index: number): GradientConfig => {
  const hue1 = Math.floor(Math.random() * 360);
  const hue2 = (hue1 + 60 + Math.floor(Math.random() * 120)) % 360;
  const hue3 = (hue2 + 60 + Math.floor(Math.random() * 120)) % 360;

  return {
    colors: [
      `hsl(${hue1}, ${95 + Math.random() * 5}%, ${60 + Math.random() * 15}%)`,
      `hsl(${hue2}, ${95 + Math.random() * 5}%, ${60 + Math.random() * 15}%)`,
      `hsl(${hue3}, ${95 + Math.random() * 5}%, ${60 + Math.random() * 15}%)`,
    ],
    id: `gradient-${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`,
    animationDelay: index * 50,
  };
};

const generateInitialGradients = () => Array.from({ length: 10 }, (_, i) => generateRandomGradient(i));

export function GradientAvatarSelector({
  selectedGradientId,
  onSelect,
  className,
  customImageUrl,
  onImageUpload,
}: GradientAvatarSelectorProps) {
  const [gradients, setGradients] = useState<GradientConfig[]>(generateInitialGradients);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error: showError } = useSonnerToast();

  const handleShuffle = useCallback(() => {
    setIsShuffling(true);
    setTimeout(() => {
      setGradients(generateInitialGradients());
      setIsShuffling(false);
    }, 300);
  }, []);

  // Handle image upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;

    // Check file size before uploading
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      showError(
        `La imagen es demasiado grande (${fileSizeMB}MB). El tamaño máximo permitido es 2MB.`,
        'Reduce el tamaño de la imagen e intenta de nuevo.'
      );
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showError('Formato no válido', 'Por favor selecciona un archivo de imagen (PNG, JPG, etc.).');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');

      const response = await fetch('/api/upload-blob', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Parse error message from API
        const errorMessage = data.error || 'Error al subir la imagen';
        if (errorMessage.includes('2MB') || errorMessage.includes('limit')) {
          showError('Imagen demasiado grande', 'El tamaño máximo permitido es 2MB.');
        } else {
          showError('Error al subir imagen', errorMessage);
        }
        return;
      }

      const uploadedUrl = data.data?.url;

      if (!uploadedUrl) {
        console.error('[GradientAvatarSelector] No URL in upload response:', data);
        showError('Error al subir imagen', 'No se recibió la URL de la imagen.');
        return;
      }

      onImageUpload(uploadedUrl);
      onSelect('custom-image'); // Select the custom image
    } catch (error) {
      console.error('[GradientAvatarSelector] Error uploading image:', error);
      showError('Error al subir imagen', 'Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onImageUpload, onSelect, showError]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Get animation class based on index
  const getAnimationClass = (index: number): string => {
    const animations = [styles.animatedGradientRandom, styles.animatedGradientSpiral, styles.animatedGradientWave];
    return animations[index % 3];
  };

  const isCustomImageSelected = selectedGradientId === 'custom-image' && customImageUrl;

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.header}>
        <span className={styles.label}>Avatar del equipo</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleShuffle}
              className={styles.shuffleButton}
              aria-label="Generar nuevos colores"
            >
              <RefreshCw
                className={cn(
                  styles.shuffleIcon,
                  isShuffling && styles.spinning
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Generar nuevos colores</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className={styles.grid}>
        {/* Upload custom image button */}
        {onImageUpload && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleUploadClick}
                className={cn(
                  styles.avatarButton,
                  styles.uploadButton,
                  isCustomImageSelected && styles.selected
                )}
                disabled={isUploading}
                aria-label="Subir imagen personalizada"
              >
                {customImageUrl ? (
                  <Image
                    src={customImageUrl}
                    alt="Avatar personalizado"
                    fill
                    className={styles.customImage}
                  />
                ) : (
                  <ImagePlus className={styles.uploadIcon} />
                )}
                {isUploading && (
                  <div className={styles.uploadingOverlay}>
                    <div className={styles.uploadSpinner} />
                  </div>
                )}
                {isCustomImageSelected && (
                  <div className={cn(styles.checkOverlay, styles.fadeIn)}>
                    <div className={cn(styles.checkCircle, styles.scaleIn)}>
                      <Check className={styles.checkIcon} />
                    </div>
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Subir logo o imagen</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className={styles.hiddenInput}
          aria-hidden="true"
        />

        {/* Gradient options */}
        {gradients.map((gradient, index) => {
          const isSelected = selectedGradientId === gradient.id;
          return (
            <button
              key={gradient.id}
              type="button"
              onClick={() => onSelect(gradient.id, gradient.colors)}
              className={cn(
                styles.avatarButton,
                isSelected && styles.selected,
                isShuffling ? styles.fadeOut : styles.fadeIn
              )}
              style={{
                animationDelay: `${gradient.animationDelay}ms`,
              }}
            >
              {/* Gradient background with animation */}
              <div
                className={cn(styles.gradientInner, getAnimationClass(index))}
                style={{
                  backgroundImage: `linear-gradient(135deg, ${gradient.colors[0]}, ${gradient.colors[1]}, ${gradient.colors[2]})`,
                  backgroundSize: '200% 200%',
                }}
              />
              {/* Noise texture */}
              <svg className={styles.noiseOverlay}>
                <filter id={`noise-${gradient.id}`}>
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.9"
                    numOctaves="4"
                    stitchTiles="stitch"
                  />
                  <feColorMatrix type="saturate" values="0" />
                  <feBlend mode="multiply" in="SourceGraphic" />
                </filter>
                <rect
                  width="100%"
                  height="100%"
                  filter={`url(#noise-${gradient.id})`}
                />
              </svg>
              {/* Selection indicator */}
              {isSelected && (
                <div className={cn(styles.checkOverlay, styles.fadeIn)}>
                  <div className={cn(styles.checkCircle, styles.scaleIn)}>
                    <Check className={styles.checkIcon} />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default GradientAvatarSelector;
