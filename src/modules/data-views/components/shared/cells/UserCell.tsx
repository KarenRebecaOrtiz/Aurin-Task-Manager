/**
 * UserCell Component
 * Displays assigned users and leaders using AvatarGroup
 * Used in TasksTable and ArchiveTable
 */

import React from 'react';
import { AvatarGroup } from '@/modules/shared/components/atoms/Avatar/AvatarGroup';
import styles from './UserCell.module.scss';

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface UserCellProps {
  assignedUserIds: string[];
  leadedByUserIds?: string[];
  users: User[];
  currentUserId: string;
  className?: string;
}

/**
 * UserCell Component
 * Renders user avatars for assigned and leader users
 */
const UserCell: React.FC<UserCellProps> = ({
  assignedUserIds,
  leadedByUserIds = [],
  users,
  currentUserId,
  className,
}) => {
  return (
    <div className={`${styles.userWrapper} ${className || ''}`}>
      <AvatarGroup
        assignedUserIds={assignedUserIds}
        leadedByUserIds={leadedByUserIds}
        users={users}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default UserCell;
