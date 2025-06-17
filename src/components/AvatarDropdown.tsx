'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './AvatarDropdown.module.scss';
import { gsap } from 'gsap';
import { createPortal } from 'react-dom';

const statusOptions = [
  { label: 'Disponible', value: 'Disponible', color: '#178d00' },
  { label: 'Ocupado', value: 'Ocupado', color: '#d32f2f' },
  { label: 'Por terminar', value: 'Por terminar', color: '#f57c00' },
  { label: 'Fuera', value: 'Fuera', color: '#616161' },
];

const AvatarDropdown = ({ onChangeContainer }: { onChangeContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void }) => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [status, setStatus] = useState('Disponible');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Create portal container
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'avatar-dropdown-portal';
    document.body.appendChild(container);
    setPortalContainer(container);
    return () => {
      document.body.removeChild(container);
    };
  }, []);

  // Listen to Firestore user document changes with onSnapshot
  useEffect(() => {
    if (!user?.id || !isLoaded) return;

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfilePhoto(data.profilePhoto || '/default-avatar.png');
        setStatus(data.status || 'Disponible');
      } else {
        setProfilePhoto('/default-avatar.png');
        setStatus('Disponible');
      }
    }, (error) => {
      console.error('Error listening to Firestore:', error);
      setProfilePhoto('/default-avatar.png');
      setStatus('Disponible');
    });

    return () => unsubscribe();
  }, [user?.id, isLoaded]);

  // Update status in Firestore
  const handleStatusChange = async (newStatus: string) => {
    if (!user?.id) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { status: newStatus });
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // GSAP animation for dropdown
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current && portalContainer) {
      dropdownRef.current.style.display = 'block';
      gsap.fromTo(
        dropdownRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
        },
      );
      gsap.fromTo(
        dropdownRef.current.querySelectorAll(`.${styles.dropdownItem}, .${styles.statusOption}`),
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.2,
          stagger: 0.05,
          ease: 'power2.out',
          delay: 0.1,
        },
      );
    } else if (!isDropdownOpen && dropdownRef.current) {
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          dropdownRef.current!.style.display = 'none';
        },
      });
    }
  }, [isDropdownOpen, portalContainer]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Hover handlers
  const handleMouseEnterButton = () => {
    setIsDropdownOpen(true);
  };

  const handleMouseLeaveButton = () => {
    // Don’t close immediately, wait for dropdown leave
  };

  const handleMouseEnterDropdown = () => {
    setIsDropdownOpen(true);
  };

  const handleMouseLeaveDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Menu item handlers
  const handleConfig = () => {
    onChangeContainer('config');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    signOut();
    setIsDropdownOpen(false);
  };

  const currentStatus = statusOptions.find((opt) => opt.value === status) || statusOptions[0];

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) {
      return { top: 0, right: 0 };
    }
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 8,
      right: window.innerWidth - rect.right,
    };
  };

  const dropdownPosition = getDropdownPosition();

  const DropdownMenu = () => {
    return (
      <div
        ref={dropdownRef}
        className={styles.dropdownMenu}
        style={{
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
          width: '200px',
        }}
        onMouseEnter={handleMouseEnterDropdown}
        onMouseLeave={handleMouseLeaveDropdown}
      >
        {statusOptions.map((option) => (
          <div
            key={option.value}
            className={`${styles.statusOption} ${option.value.replace(' ', '_')}`}
            onClick={() => handleStatusChange(option.value)}
            role="option"
            aria-selected={status === option.value}
          >
            <div
              className={styles.statusDot}
              style={{ backgroundColor: option.color }}
            />
            {option.label}
          </div>
        ))}
        <div className={styles.separator} />
        <button onClick={handleConfig} className={styles.dropdownItem}>
          <Image
            src="/settings.svg"
            alt="Configuración"
            width={16}
            height={16}
            className={styles.dropdownIcon}
          />
          Configuración
        </button>
        <button onClick={handleLogout} className={styles.dropdownItem}>
          <Image
            src="/log-out.svg"
            alt="Cerrar Sesión"
            width={16}
            height={16}
            className={styles.dropdownIcon}
          />
          Cerrar Sesión
        </button>
      </div>
    );
  };

  return (
    <div className={styles.avatarContainer}>
      <button
        ref={buttonRef}
        className={styles.avatarButton}
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        onMouseEnter={handleMouseEnterButton}
        onMouseLeave={handleMouseLeaveButton}
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
        aria-label="Abrir menú de usuario"
      >
        {profilePhoto ? (
          <Image
            src={profilePhoto}
            alt="Profile"
            width={40}
            height={40}
            className={styles.avatarImage}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>U</div>
        )}
        <div
          className={styles.statusDot}
          style={{ backgroundColor: currentStatus.color }}
        />
      </button>
      {isDropdownOpen && portalContainer && createPortal(<DropdownMenu />, portalContainer)}
    </div>
  );
};

export default AvatarDropdown;