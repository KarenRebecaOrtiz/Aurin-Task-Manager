/**
 * UserCell Component - Migrado para usar usersDataStore
 *
 * Cambios:
 * - Ya NO recibe array de users como prop
 * - AvatarGroup obtiene los datos directamente de usersDataStore
 * - Solo necesita los IDs de usuarios y el currentUserId
 *
 * Beneficios:
 * - Componente más simple y desacoplado
 * - Cache compartido entre múltiples UserCells
 * - Actualizaciones en tiempo real automáticas
 */

import React from 'react';
import { AvatarGroup } from '@/modules/shared/components/atoms/Avatar/AvatarGroup';
import styles from './UserCell.module.scss';

interface UserCellProps {
  assignedUserIds: string[];
  leadedByUserIds?: string[];
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
  currentUserId,
  className,
}) => {
  return (
    <div className={`${styles.userWrapper} ${className || ''}`}>
      <AvatarGroup
        assignedUserIds={assignedUserIds}
        leadedByUserIds={leadedByUserIds}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default UserCell;
