/**
 * Profile Card Wrapper - REFACTORED
 * Now uses ProfileDialog which leverages CrudDialog
 * Simplified from 160 lines to ~30 lines
 */

'use client';

import { ProfileDialog } from '../ProfileDialog';

interface ProfileCardWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode; // Kept for backwards compatibility but not used
  isLoading?: boolean; // Now handled internally
  error?: Error; // Now handled internally
  userId?: string;
  currentUserId?: string;
  onConfigClick?: () => void;
  onMessageClick?: () => void;
}

/**
 * Legacy wrapper component for backwards compatibility
 *
 * @deprecated Use ProfileDialog directly instead
 *
 * Migration example:
 * ```tsx
 * // Old
 * <ProfileCardWrapper isOpen={isOpen} onClose={onClose} userId={userId}>
 *   <ProfileCardContent />
 * </ProfileCardWrapper>
 *
 * // New
 * <ProfileDialog
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   userId={userId}
 *   currentUserId={currentUserId}
 * />
 * ```
 */
export const ProfileCardWrapper: React.FC<ProfileCardWrapperProps> = ({
  isOpen,
  onClose,
  userId = '',
  currentUserId,
  onConfigClick,
  onMessageClick,
}) => {
  return (
    <ProfileDialog
      isOpen={isOpen}
      onClose={onClose}
      userId={userId}
      currentUserId={currentUserId}
      onConfigClick={onConfigClick}
      onMessageClick={onMessageClick}
    />
  );
};
