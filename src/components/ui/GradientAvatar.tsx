'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import styles from './GradientAvatar.module.scss';

interface GradientAvatarProps {
  /** Seed string to generate deterministic gradient (e.g., name, token, id) */
  seed: string;
  /** Optional initials to display (auto-generated from seed if not provided) */
  initials?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional class names */
  className?: string;
  /** Whether to animate the gradient */
  animated?: boolean;
}

/**
 * Generate a deterministic hash from a string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate deterministic gradient colors from a seed string
 */
function generateGradientFromSeed(seed: string): string[] {
  const hash = hashString(seed);

  // Use hash to generate hues that look good together
  const hue1 = hash % 360;
  const hue2 = (hue1 + 45 + (hash % 60)) % 360;
  const hue3 = (hue2 + 45 + ((hash >> 8) % 60)) % 360;

  // Generate vibrant, saturated colors
  const saturation = 85 + (hash % 15);
  const lightness = 55 + (hash % 15);

  return [
    `hsl(${hue1}, ${saturation}%, ${lightness}%)`,
    `hsl(${hue2}, ${saturation}%, ${lightness}%)`,
    `hsl(${hue3}, ${saturation}%, ${lightness}%)`,
  ];
}

/**
 * Get initials from a name string
 */
function getInitials(name: string): string {
  if (!name) return '?';

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get animation class based on seed hash
 */
function getAnimationClass(seed: string): string {
  const hash = hashString(seed);
  const animations = [styles.animatedGradientRandom, styles.animatedGradientSpiral, styles.animatedGradientWave];
  return animations[hash % 3];
}

/**
 * GradientAvatar - Renders a beautiful gradient avatar
 *
 * Generates deterministic gradients based on a seed string,
 * ensuring the same person always gets the same colors.
 */
export function GradientAvatar({
  seed,
  initials,
  size = 'md',
  className,
  animated = true,
}: GradientAvatarProps) {
  const gradientColors = useMemo(() => generateGradientFromSeed(seed), [seed]);
  const displayInitials = initials ?? getInitials(seed);
  const animationClass = animated ? getAnimationClass(seed) : '';

  return (
    <div
      className={cn(
        styles.avatar,
        styles[size],
        className
      )}
    >
      {/* Gradient background */}
      <div
        className={cn(styles.gradientInner, animationClass)}
        style={{
          backgroundImage: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]}, ${gradientColors[2]})`,
          backgroundSize: '200% 200%',
        }}
      />

      {/* Noise texture for depth */}
      <svg className={styles.noiseOverlay} aria-hidden="true">
        <filter id={`noise-${seed.replace(/\s/g, '-')}`}>
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
          filter={`url(#noise-${seed.replace(/\s/g, '-')})`}
        />
      </svg>

      {/* Initials */}
      <span className={styles.initials}>{displayInitials}</span>
    </div>
  );
}

export default GradientAvatar;
