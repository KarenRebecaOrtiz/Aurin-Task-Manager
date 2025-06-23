'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import styles from './ProfileSidebar.module.scss';

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
}

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  users: User[];
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ isOpen, onClose, userId, users }) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const user = users.find((u) => u.id === userId);

  useEffect(() => {
    if (sidebarRef.current) {
      if (isOpen) {
        gsap.fromTo(
          sidebarRef.current,
          { x: '100%', opacity: 0 },
          { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' },
        );
      } else {
        gsap.to(sidebarRef.current, {
          x: '100%',
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
      }
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        gsap.to(sidebarRef.current, {
          x: '100%',
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!user) {
    return null;
  }

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ''}`} ref={sidebarRef}>
      <div className={styles.header}>
        <div className={styles.controls}>
          <div
            className={styles.arrowLeft}
            onClick={() => {
              gsap.to(sidebarRef.current, {
                x: '100%',
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: onClose,
              });
            }}
          >
            <Image src="/arrow-left.svg" alt="Cerrar" width={15} height={16} />
          </div>
        </div>
        <h2 className={styles.title}>Perfil de {user.fullName}</h2>
      </div>
      <div className={styles.content}>
        <Image
          src={user.imageUrl}
          alt={user.fullName}
          width={100}
          height={100}
          className={styles.avatar}
          onError={(e) => {
            e.currentTarget.src = '';
          }}
        />
        <div className={styles.info}>
          <div className={styles.label}>Nombre:</div>
          <div className={styles.value}>{user.fullName}</div>
          <div className={styles.label}>Rol:</div>
          <div className={styles.value}>{user.role}</div>
          <div className={styles.label}>Descripción:</div>
          <div className={styles.value}>{user.description || 'Sin descripción'}</div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSidebar;