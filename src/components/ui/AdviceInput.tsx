'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, setDoc, deleteDoc, collection, Timestamp } from 'firebase/firestore'; // Updated import
import { db } from '@/lib/firebase';
import styles from './AdviceInput.module.scss';
import Image from 'next/image';

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

  // Time intervals for announcements
  const intervals = [
    { label: '12 horas', ms: 12 * 60 * 60 * 1000 },
    { label: '1 día', ms: 24 * 60 * 60 * 1000 },
    { label: '3 días', ms: 3 * 24 * 60 * 60 * 1000 },
    { label: '1 semana', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: '2 semanas', ms: 14 * 24 * 60 * 60 * 1000 },
    { label: '1 mes', ms: 30 * 24 * 60 * 60 * 1000 },
  ];

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

    const adviceId = activeAdviceId || doc(collection(db, 'advices')).id; // Changed to 'advices'
    const expiry = Timestamp.fromMillis(Date.now() + intervalMs);

    try {
      await setDoc(doc(db, 'advices', adviceId), { // Changed to 'advices'
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
      await deleteDoc(doc(db, 'advices', activeAdviceId)); // Changed to 'advices'
      setInputText('');
      setActiveAdviceId(null);
    } catch (error) {
      console.error('Error deleting advice:', error);
      alert('Error al eliminar el anuncio');
    }
  };

  if (!isAdmin) return null;

  return (
    <div className={styles.inputWrapper}>
      <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g data-name="Layer 2">
          <g data-name="inbox">
            <rect width="24" height="24" transform="rotate(180 12 12)" opacity="0" />
            <path d="M20.79 11.34l-3.34-6.68A3 3 0 0 0 14.76 3H9.24a3 3 0 0 0-2.69 1.66l-3.34 6.68a2 2 0 0 0-.21.9V18a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-5.76a2 2 0 0 0-.21-.9zM8.34 5.55a1 1 0 0 1 .9-.55h5.52a1 1 0 0 1 .9.55L18.38 11H16a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2a1 1 0 0 0-1-1H5.62z" />
          </g>
        </g>
      </svg>
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
        className={styles.SubscribeBtn}
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
      {isDropdownOpen && (
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
        </div>
      )}
    </div>
  );
};

export default AdviceInput;
