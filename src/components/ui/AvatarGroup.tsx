'use client';

import { useEffect, useState } from 'react';
import styles from './AvatarGroup.module.scss';

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
}

interface AvatarGroupProps {
  assignedUserIds: string[]; // Array of user IDs from task.AssignedTo
  users: User[]; // Array of all users for lookup
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ assignedUserIds, users }) => {
  const [avatars, setAvatars] = useState<User[]>([]);

  useEffect(() => {
    // Filter users to only those in assignedUserIds, limit to 5
    const matchedUsers = users
      .filter((user) => assignedUserIds.includes(user.id))
      .slice(0, 5);
    setAvatars(matchedUsers);
  }, [assignedUserIds, users]);

  return (
    <div className={styles.avatarGroup}>
      {avatars.length > 0 ? (
        avatars.map((user) => (
          <div key={user.id} className={styles.avatar}>
            <span className={styles.avatarName}>{user.fullName}</span>
            <img
              src={user.imageUrl || '/default-avatar.png'}
              alt={`${user.fullName}'s avatar`}
              className={styles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png';
              }}
            />
          </div>
        ))
      ) : (
        <span>No asignados</span>
      )}
    </div>
  );
};

export default AvatarGroup;
