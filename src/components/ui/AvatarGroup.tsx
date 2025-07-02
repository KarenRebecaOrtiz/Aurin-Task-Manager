"use client";

import { useMemo } from "react";
import Image from "next/image";
import { User } from "@/types";
import styles from "./AvatarGroup.module.scss";

interface AvatarGroupProps {
  assignedUserIds: string[];
  leadedByUserIds?: string[];
  users: User[];
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ assignedUserIds, leadedByUserIds = [], users }) => {
  const avatars = useMemo(() => {
    if (!Array.isArray(users)) {
      console.warn("[AvatarGroup] Users prop is not an array:", users);
      return [];
    }
    
    // Combinar asignados y responsables, eliminando duplicados
    const allUserIds = [...new Set([...assignedUserIds, ...leadedByUserIds])];
    
    return users
      .filter((user) => allUserIds.includes(user.id))
      .slice(0, 5);
  }, [assignedUserIds, leadedByUserIds, users]);

  return (
    <div className={styles.avatarGroup}>
      {avatars.length > 0 ? (
        avatars.map((user) => (
          <div key={user.id} className={styles.avatar}>
            <span className={styles.avatarName}>{user.fullName}</span>
            <Image
              src={user.imageUrl || "/empty-image.png"}
              alt={`${user.fullName}'s avatar`}
              width={40}
              height={40}
              className={styles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = "/empty-image.png";
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
