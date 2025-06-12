'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import styles from './InviteSidebar.module.scss';

interface InviteSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const InviteSidebar: React.FC<InviteSidebarProps> = ({ isOpen, onClose }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Invite email:', inviteEmail);
      alert(`Invitación enviada a ${inviteEmail}`);
      gsap.to(sidebarRef.current, {
        x: '100%',
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          setInviteEmail('');
          onClose();
        },
      });
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Error al enviar la invitación');
    }
  };

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ''}`} ref={sidebarRef}>
      <div className={styles.header}>
        <div className={styles.controls}>
          <div style={{display:'flex', flexDirection: 'row'}}>
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
        <h2 className={styles.title}>Invita a un nuevo miembro</h2>
        </div>
        <p className={styles.subtitle}>
          Escribe el correo electrónico de la persona que quieres invitar a tu organización.
        </p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="inviteEmail" className={styles.label}>
            Correo electrónico:
          </label>
          <input
            id="inviteEmail"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="mail@example.com"
            className={styles.input}
            required
            aria-required="true"
          />
        </div>
        <button type="submit" className={styles.submitButton}>
          Enviar Invitación
        </button>
        <button
          type="button"
          onClick={() => {
            gsap.to(sidebarRef.current, {
              x: '100%',
              opacity: 0,
              duration: 0.3,
              ease: 'power2.in',
              onComplete: onClose,
            });
          }}
          className={styles.cancelButton}
        >
          Cancelar
        </button>
      </form>
    </div>
  );
};

export default InviteSidebar;