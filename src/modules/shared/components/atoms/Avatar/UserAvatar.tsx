'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import { useUserNote, NoteBubble } from '@/modules/notes';

interface UserAvatarProps {
  userId: string;
  imageUrl?: string;
  userName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  isOnline?: boolean;
  className?: string;
  /** Whether to show the note bubble if user has an active note */
  showNote?: boolean;
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const statusSizeMap = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
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
 * Displays user avatar with optional online status indicator and note bubble
 * Supports multiple sizes and automatic fallback to initials
 */
export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  imageUrl,
  userName = 'User',
  size = 'md',
  showStatus = false,
  isOnline = false,
  className = '',
  showNote = false,
}) => {
  // Fetch user's note if showNote is enabled
  const { note } = useUserNote(showNote ? userId : undefined);

  // Generate fallback initials from userName
  const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const fallback = getInitials(userName);

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Note bubble above avatar */}
      {showNote && note?.content && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10">
          <NoteBubble content={note.content} className="scale-75" />
        </div>
      )}
      
      <Avatar className={cn(sizeMap[size], 'border-2 border-white shadow-sm', note?.content && showNote && 'ring-2 ring-gradient-to-r from-purple-500 to-pink-500')}>
        <AvatarImage
          src={imageUrl || '/default-avatar.png'}
          alt={userName}
        />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>

      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            statusSizeMap[size],
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

UserAvatar.displayName = 'UserAvatar';
