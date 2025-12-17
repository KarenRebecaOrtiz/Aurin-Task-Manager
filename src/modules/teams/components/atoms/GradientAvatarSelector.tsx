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
import styles from './GradientAvatarSelector.module.scss';

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

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');

      const response = await fetch('/api/upload-blob', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }

      const data = await response.json();
      const uploadedUrl = data.data?.url;

      // Debug logging
      console.log('[GradientAvatarSelector] Upload response:', {
        success: data.success,
        url: uploadedUrl,
        fullResponse: data
      });

      if (!uploadedUrl) {
        console.error('[GradientAvatarSelector] No URL in upload response:', data);
        throw new Error('No URL returned from upload');
      }

      onImageUpload(uploadedUrl);
      onSelect('custom-image'); // Select the custom image

      console.log('[GradientAvatarSelector] Image upload complete, called onImageUpload with:', uploadedUrl);
    } catch (error) {
      console.error('[GradientAvatarSelector] Error uploading image:', error);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onImageUpload, onSelect]);

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
