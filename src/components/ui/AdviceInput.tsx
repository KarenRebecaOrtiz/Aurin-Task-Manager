'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, setDoc, deleteDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './AdviceInput.module.scss';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

interface AdviceInputProps {
  isAdmin: boolean;
}

const AdviceInput: React.FC<AdviceInputProps> = ({ isAdmin }) => {
  const { user } = useUser();
  const [inputText, setInputText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeAdviceId, setActiveAdviceId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRootRef = useRef<HTMLElement | null>(null);

  // Time intervals for announcements
  const intervals = [
    { label: '12 horas', ms: 12 * 60 * 60 * 1000 },
    { label: '1 día', ms: 24 * 60 * 60 * 1000 },
    { label: '3 días', ms: 3 * 24 * 60 * 60 * 1000 },
    { label: '1 semana', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: '2 semanas', ms: 14 * 24 * 60 * 60 * 1000 },
    { label: '1 mes', ms: 30 * 24 * 60 * 60 * 1000 },
  ];

  // Initialize portal root
  useEffect(() => {
    portalRootRef.current = document.body;
  }, []);

  // Position dropdown and animate with GSAP
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdown = dropdownRef.current;

      // Position dropdown above the button
      dropdown.style.position = 'fixed';
      dropdown.style.top = `${buttonRect.top - dropdown.offsetHeight - 5}px`;
      dropdown.style.left = `${buttonRect.left + (buttonRect.width - dropdown.offsetWidth) / 2}px`;

      // GSAP animation for opening
      gsap.fromTo(
        dropdown,
        { scale: 0.8, opacity: 0, y: 10 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    } else if (!isDropdownOpen && dropdownRef.current) {
      // GSAP animation for closing
      gsap.to(dropdownRef.current, {
        scale: 0.8,
        opacity: 0,
        y: 10,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          if (dropdownRef.current) {
            dropdownRef.current.style.display = 'none';
          }
        },
      });
    }
  }, [isDropdownOpen]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle posting an announcement
  const handlePostAdvice = async (intervalMs: number) => {
    if (!user?.id || !user?.firstName || !inputText.trim()) return;

    const adviceId = activeAdviceId || doc(collection(db, 'advices')).id;
    const expiry = Timestamp.fromMillis(Date.now() + intervalMs);

    try {
      await setDoc(doc(db, 'advices', adviceId), {
        message: inputText.trim(),
        creatorId: user.id,
        creatorFirstName: user.firstName,
        expiry,
        createdAt: Timestamp.now(),
      });
      setActiveAdviceId(adviceId);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error posting advice:', error);
      alert('Error al publicar el anuncio');
    }
  };

  // Handle deleting an announcement
  const handleDeleteAdvice = async () => {
    if (!activeAdviceId) return;

    try {
      await deleteDoc(doc(db, 'advices', activeAdviceId));
      setInputText('');
      setActiveAdviceId(null);
    } catch (error) {
      console.error('Error deleting advice:', error);
      alert('Error al eliminar el anuncio');
    }
  };

  if (!isAdmin) return null;

  const DropdownPortal = () =>
    portalRootRef.current && isDropdownOpen
      ? createPortal(
          <div ref={dropdownRef} className={styles.dropdown}>
            {intervals.map((interval) => (
              <button
                key={interval.label}
                className={styles.dropdownItem}
                onClick={() => handlePostAdvice(interval.ms)}
              >
                {interval.label}
              </button>
            ))}
          </div>,
          portalRootRef.current
        )
      : null;

  return (
    <div className={styles.inputWrapper}>
      <input
        type="text"
        name="text"
        className={styles.input}
        placeholder="Escribe un anuncio..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        disabled={!!activeAdviceId}
      />
      <button
        ref={buttonRef}
        className={styles.subscribeBtn}
        onClick={() => {
          if (activeAdviceId) {
            handleDeleteAdvice();
          } else {
            setIsDropdownOpen(!isDropdownOpen);
          }
        }}
      >
        {activeAdviceId ? (
          <Image src="/trash-can.svg" alt="Eliminar" width={20} height={20} />
        ) : (
          <Image src="/plus-icon.svg" alt="Agregar" width={20} height={20} />
        )}
      </button>
      <DropdownPortal />
    </div>
  );
};

export default AdviceInput;