/**
 * GradientAvatar Component
 * Renders either an image avatar or a gradient avatar based on the provided data.
 * Used for displaying client/workspace avatars that may have custom images or gradients.
 */

'use client';

import { useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface GradientAvatarProps {
  /** Image URL for the avatar */
  imageUrl?: string;
  /** Gradient ID (used to determine if gradient should be shown) */
  gradientId?: string;
  /** Array of 3 gradient colors */
  gradientColors?: string[];
  /** Name to generate initials from */
  name: string;
  /** Additional CSS classes */
  className?: string;
  /** Size of the avatar (for the fallback gradient) */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Checks if the imageUrl is a valid custom image (not a fallback)
 */
function isValidCustomImage(imageUrl?: string): boolean {
  if (!imageUrl) return false;
  // Check if it's a fallback image
  if (imageUrl === '/empty-image.png') return false;
  if (imageUrl.includes('empty-image')) return false;
  // Check if it's a valid URL or path
  return imageUrl.startsWith('http') || imageUrl.startsWith('/');
}

/**
 * Gets the initials from a name
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  const words = trimmed.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function GradientAvatar({
  imageUrl,
  gradientId,
  gradientColors,
  name,
  className,
  size = 'md',
}: GradientAvatarProps) {
  // Determine if we should show a gradient
  const showGradient = useMemo(() => {
    // If there's a valid custom image, don't show gradient
    if (isValidCustomImage(imageUrl)) return false;
    // Show gradient if we have gradientId and gradientColors
    return gradientId && gradientId !== 'default' && gradientColors && gradientColors.length >= 3;
  }, [imageUrl, gradientId, gradientColors]);

  const initials = getInitials(name);

  // If we have a valid gradient, render it
  if (showGradient && gradientColors) {
    return (
      <div
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full',
          size === 'sm' && 'h-8 w-8',
          size === 'md' && 'h-10 w-10',
          size === 'lg' && 'h-12 w-12',
          className
        )}
      >
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]}, ${gradientColors[2]})`,
          }}
        />
        {/* Noise overlay for texture */}
        <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-multiply">
          <filter id={`noise-${gradientId}`}>
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
            filter={`url(#noise-${gradientId})`}
          />
        </svg>
      </div>
    );
  }

  // Otherwise, render standard Avatar with image or fallback
  return (
    <Avatar className={cn(className)}>
      {isValidCustomImage(imageUrl) && (
        <AvatarImage src={imageUrl} alt={name} />
      )}
      <AvatarFallback>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export default GradientAvatar;
