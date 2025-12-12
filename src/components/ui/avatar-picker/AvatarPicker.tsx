'use client';

import { useState, useCallback, useMemo } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './AvatarPicker.module.scss';

// ============================================================================
// TYPES
// ============================================================================

export interface GradientConfig {
  colors: string[];
  id: string;
  animationDelay: number;
}

export interface AvatarPickerProps {
  /** Currently selected gradient ID */
  selectedId?: string | null;
  /** Callback when a gradient is selected */
  onSelect?: (gradient: GradientConfig) => void;
  /** Number of gradients to display */
  count?: number;
  /** Label for the section */
  label?: string;
  /** Show the shuffle button */
  showShuffle?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// GRADIENT GENERATOR
// ============================================================================

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
    id: `gradient-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    animationDelay: index * 50,
  };
};

const generateGradients = (count: number): GradientConfig[] => {
  return Array.from({ length: count }, (_, i) => generateRandomGradient(i));
};

// ============================================================================
// COMPONENT
// ============================================================================

export function AvatarPicker({
  selectedId,
  onSelect,
  count = 6,
  label = 'Elige un avatar',
  showShuffle = true,
  className,
}: AvatarPickerProps) {
  const [gradients, setGradients] = useState<GradientConfig[]>(() =>
    generateGradients(count)
  );
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    selectedId || null
  );
  const [isShuffling, setIsShuffling] = useState(false);

  // Use external or internal selected ID
  const currentSelectedId = selectedId !== undefined ? selectedId : internalSelectedId;

  const handleShuffle = useCallback(() => {
    setIsShuffling(true);
    setTimeout(() => {
      setGradients(generateGradients(count));
      setInternalSelectedId(null);
      setIsShuffling(false);
    }, 300);
  }, [count]);

  const handleSelect = useCallback(
    (gradient: GradientConfig) => {
      setInternalSelectedId(gradient.id);
      onSelect?.(gradient);
    },
    [onSelect]
  );

  // Get animation class based on index
  const getAnimationClass = (index: number) => {
    const classes = [styles.animatedRandom, styles.animatedSpiral, styles.animatedWave];
    return classes[index % 3];
  };

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {showShuffle && (
          <button
            type="button"
            onClick={handleShuffle}
            className={styles.shuffleButton}
            aria-label="Generar nuevos avatares"
          >
            <RefreshCw
              className={cn(
                styles.shuffleIcon,
                isShuffling && styles.spinning
              )}
            />
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {gradients.map((gradient, index) => (
          <button
            key={gradient.id}
            type="button"
            onClick={() => handleSelect(gradient)}
            className={cn(
              styles.avatarButton,
              currentSelectedId === gradient.id && styles.selected,
              isShuffling ? styles.fadeOut : styles.fadeIn
            )}
            style={{
              animationDelay: `${gradient.animationDelay}ms`,
            }}
          >
            <div
              className={cn(styles.gradientBg, getAnimationClass(index))}
              style={{
                background: `linear-gradient(135deg, ${gradient.colors[0]}, ${gradient.colors[1]}, ${gradient.colors[2]})`,
                backgroundSize: '200% 200%',
              }}
            />
            {/* Noise texture overlay */}
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
            {currentSelectedId === gradient.id && (
              <div className={styles.checkOverlay}>
                <div className={styles.checkCircle}>
                  <Check className={styles.checkIcon} />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AvatarPicker;
