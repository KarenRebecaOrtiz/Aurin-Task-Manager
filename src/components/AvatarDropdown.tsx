'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
    console.log('[AvatarDropdown] Creating portal container');
    const container = document.createElement('div');
    container.id = 'avatar-dropdown-portal';
    document.body.appendChild(container);
    setPortalContainer(container);
    console.log('[AvatarDropdown] Portal container created:', container);
    return () => {
      console.log('[AvatarDropdown] Removing portal container');
      document.body.removeChild(container);
    };
  }, []);

  // Fetch profile photo and status
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id && isLoaded) {
        console.log('[AvatarDropdown] Fetching user data for ID:', user.id);
        const userDocRef = doc(db, 'users', user.id);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfilePhoto(data.profilePhoto || '/default-avatar.png');
          setStatus(data.status || 'Disponible');
          console.log('[AvatarDropdown] Data fetched - Photo:', data.profilePhoto, 'Status:', data.status);
        } else {
          console.log('[AvatarDropdown] User document not found');
        }
      }
    };
    fetchUserData();
  }, [user?.id, isLoaded]);

  // Update status in Firestore
  const handleStatusChange = async (newStatus: string) => {
    if (!user?.id) {
      console.log('[AvatarDropdown] No user ID for status update');
      return;
    }
    try {
      console.log('[AvatarDropdown] Updating status to:', newStatus);
      await updateDoc(doc(db, 'users', user.id), { status: newStatus });
      setStatus(newStatus);
      setIsDropdownOpen(false);
      console.log('[AvatarDropdown] Status updated successfully:', newStatus);
    } catch (error) {
      console.error('[AvatarDropdown] Error updating status:', error);
    }
  };

  // GSAP animation for dropdown
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current && portalContainer) {
      console.log('[AvatarDropdown] Starting open animation - isDropdownOpen:', isDropdownOpen);
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
          onStart: () => console.log('[AvatarDropdown] GSAP: Open animation started'),
          onComplete: () => console.log('[AvatarDropdown] GSAP: Open animation completed'),
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
          onStart: () => console.log('[AvatarDropdown] GSAP: Items animation started'),
          onComplete: () => console.log('[AvatarDropdown] GSAP: Items animation completed'),
        },
      );
    } else if (!isDropdownOpen && dropdownRef.current) {
      console.log('[AvatarDropdown] Starting close animation - isDropdownOpen:', isDropdownOpen);
      gsap.to(dropdownRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onStart: () => console.log('[AvatarDropdown] GSAP: Close animation started'),
        onComplete: () => {
          dropdownRef.current!.style.display = 'none';
          console.log('[AvatarDropdown] GSAP: Close animation completed');
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
        console.log('[AvatarDropdown] Outside click detected, closing dropdown');
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      console.log('[AvatarDropdown] Removing outside click listener');
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Hover handlers
  const handleMouseEnterButton = () => {
    console.log('[AvatarDropdown] MouseEnter button detected, opening dropdown');
    setIsDropdownOpen(true);
  };

  const handleMouseLeaveButton = () => {
    console.log('[AvatarDropdown] MouseLeave button detected');
    // Don’t close immediately, wait for dropdown leave
  };

  const handleMouseEnterDropdown = () => {
    console.log('[AvatarDropdown] MouseEnter dropdown detected, keeping open');
    setIsDropdownOpen(true);
  };

  const handleMouseLeaveDropdown = () => {
    console.log('[AvatarDropdown] MouseLeave dropdown detected, closing');
    setIsDropdownOpen(false);
  };

  // Menu item handlers
  const handleConfig = () => {
    console.log('[AvatarDropdown] Configuration selected');
    onChangeContainer('config');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    console.log('[AvatarDropdown] Logout selected');
    signOut();
    setIsDropdownOpen(false);
  };

  const currentStatus = statusOptions.find((opt) => opt.value === status) || statusOptions[0];

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) {
      console.log('[AvatarDropdown] No buttonRef found for position calculation');
      return { top: 0, right: 0 };
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const position = {
      top: rect.bottom + window.scrollY + 8, // 8px margin, like StatusDropdown
      right: window.innerWidth - rect.right,
    };
    console.log('[AvatarDropdown] Dropdown position calculated:', position);
    return position;
  };

  const dropdownPosition = getDropdownPosition();

  const DropdownMenu = () => {
    // Moved console.log here, outside JSX
    console.log('[AvatarDropdown] Rendering DropdownMenu, position:', dropdownPosition);
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
                            style={{backgroundColor:'transparent'}}
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