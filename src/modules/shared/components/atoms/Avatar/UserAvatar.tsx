'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

export type AvailabilityStatus = 'Disponible' | 'Ocupado' | 'Por terminar' | 'Fuera';

// Umbral de inactividad en milisegundos (5 minutos)
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;

interface UserAvatarProps {
  userId: string;
  imageUrl?: string;
  userName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showStatus?: boolean;
  /** @deprecated Use availabilityStatus instead */
  isOnline?: boolean;
  /** El status de disponibilidad del usuario */
  availabilityStatus?: AvailabilityStatus;
  /** Timestamp ISO de última actividad para detección automática de inactividad */
  lastActive?: string;
  className?: string;
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-2xl', // 40% larger than xl (96px)
};

const statusSizeMap = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
  '2xl': 'h-5 w-5',
};

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-[inherit] bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/**
 * UserAvatar Component
 *
 * Displays user avatar with optional availability status indicator
 * Supports multiple sizes and automatic fallback to initials
 *
 * Status colors:
 * - Disponible: Green (#178d00)
 * - Ocupado: Red (#d32f2f)
 * - Por terminar: Orange (#f57c00)
 * - Fuera/Inactivo: Gray (#616161)
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  imageUrl,
  userName = 'User',
  size = 'md',
  showStatus = false,
  isOnline = false,
  availabilityStatus,
  lastActive,
  className = '',
}) => {
  // Generate fallback initials from userName
  const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Check if user is inactive based on lastActive timestamp
  const isUserInactive = React.useMemo(() => {
    if (!lastActive) return true;
    const lastActiveTime = new Date(lastActive).getTime();
    const now = Date.now();
    return now - lastActiveTime > INACTIVITY_THRESHOLD_MS;
  }, [lastActive]);

  // Get status color based on availability status and activity
  const getStatusColor = React.useCallback((): string => {
    // Si está inactivo, mostrar gris
    if (lastActive && isUserInactive) {
      return '#616161';
    }

    // Si tiene availabilityStatus, usarlo
    if (availabilityStatus) {
      switch (availabilityStatus) {
        case 'Disponible':
          return '#178d00';
        case 'Ocupado':
          return '#d32f2f';
        case 'Por terminar':
          return '#f57c00';
        case 'Fuera':
          return '#616161';
        default:
          return '#616161';
      }
    }

    // Fallback al comportamiento legacy con isOnline
    return isOnline ? '#178d00' : '#616161';
  }, [availabilityStatus, lastActive, isUserInactive, isOnline]);

  // Get status label for aria-label
  const getStatusLabel = React.useCallback((): string => {
    if (lastActive && isUserInactive) {
      return 'Inactivo';
    }
    if (availabilityStatus) {
      return availabilityStatus;
    }
    return isOnline ? 'Online' : 'Offline';
  }, [availabilityStatus, lastActive, isUserInactive, isOnline]);

  const fallback = getInitials(userName);

  // Only pass imageUrl to AvatarImage if it's not empty
  const validImageUrl = imageUrl && imageUrl.trim() !== '' ? imageUrl : undefined;

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={cn(sizeMap[size], 'border-2 border-white shadow-sm')}>
        {validImageUrl && (
          <AvatarImage
            src={validImageUrl}
            alt={userName}
          />
        )}
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>

      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            statusSizeMap[size]
          )}
          style={{ backgroundColor: getStatusColor() }}
          aria-label={getStatusLabel()}
          title={getStatusLabel()}
        />
      )}
    </div>
  );
};

UserAvatar.displayName = 'UserAvatar';
