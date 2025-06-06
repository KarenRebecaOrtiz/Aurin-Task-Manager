'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import styles from './AISidebar.module.scss';

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AISidebar({ isOpen, onClose }: AISidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // GSAP animation for open/close
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current,
        { x: '100%', opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    } else if (sidebarRef.current) {
      gsap.to(sidebarRef.current, {
        x: '100%',
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      });
    }
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        isOpen
      ) {
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
  }, [isOpen, onClose]);

  const handleClick = (element: HTMLElement) => {
    gsap.to(element, {
      scale: 0.95,
      opacity: 0.8,
      duration: 0.15,
      ease: 'power1.out',
      yoyo: true,
      repeat: 1,
    });
  };

  return (
    <div className={`${styles.container} ${isOpen ? styles.open : ''}`} ref={sidebarRef}>
      <div className={styles.header}>
        <div className={styles.controls}>
          <div
            className={styles.arrowLeft}
            onClick={(e) => {
              handleClick(e.currentTarget);
              gsap.to(sidebarRef.current, {
                x: '100%',
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: onClose,
              });
            }}
          >
            <Image src="/arrow-left.svg" alt="Close" width={15} height={16} />
          </div>
          <div
            className={styles.ellipsis}
            onClick={(e) => handleClick(e.currentTarget)}
          >
            <Image src="/elipsis.svg" alt="Options" width={16} height={16} />
          </div>
        </div>
        <div className={styles.title}>Asistente de Proyectos</div>
        <div className={styles.subtitle}>
          Consulta cualquier dato de tus tareas, cuentas o deadlines. Estoy aquí para ayudarte.
        </div>
      </div>
      <div className={styles.chat}>
        <div className={styles.message}>
          <Image
            src="/user-avatar.png"
            alt="User"
            width={46}
            height={46}
            className={styles.avatar}
          />
          <div className={styles.messageContent}>
            <div className={styles.sender}>Karen Ortiz</div>
            <div className={styles.text}>¿Cuándo vence mi entrega de FintPay?</div>
          </div>
        </div>
        <div className={styles.message}>
          <Image
            src="/ai-avatar.png"
            alt="AI"
            width={46}
            height={46}
            className={styles.avatar}
          />
          <div className={styles.messageContent}>
            <div className={styles.sender}>ChatGPT</div>
            <div className={styles.text}>
              Tienes programado FintPay para el 10 de junio de 2025
            </div>
          </div>
        </div>
      </div>
      <div className={styles.inputWrapper}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            placeholder="Escribe tu mensaje aquí"
            className={styles.input}
          />
          <button
            className={styles.sendButton}
            onClick={(e) => handleClick(e.currentTarget)}
          >
            <Image src="/arrow-up.svg" alt="Send" width={13} height={13} />
          </button>
        </div>
      </div>
    </div>
  );
}