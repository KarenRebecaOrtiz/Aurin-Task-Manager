"use client";

import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { Button } from './ui/Button';
import styles from './Sidebar.module.scss';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'updates' | 'ai'>('updates');

  return (
    <>
      {!isOpen && (
        <button className={styles.toggleButton} onClick={() => setIsOpen(true)}>
          Abrir Sidebar
        </button>
      )}
      {isOpen && (
        <aside className={styles.sidebar}>
          <div className={styles.header}>
            <h2>{activeTab === 'updates' ? 'Actualizaciones' : 'Chat con IA'}</h2>
            <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
          </div>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'updates' ? styles.active : ''}`}
              onClick={() => setActiveTab('updates')}
            >
              Actualizaciones
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'ai' ? styles.active : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              IA
            </button>
          </div>
          <div className={styles.chat}>
            {activeTab === 'updates' ? (
              <div className={styles.chatContent}>
                <p>Placeholder: Chat de actualizaciones por tarea</p>
              </div>
            ) : (
              <div className={styles.chatContent}>
                <p>Placeholder: Chat con IA para recomendaciones</p>
              </div>
            )}
          </div>
          <div className={styles.footer}>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </aside>
      )}
    </>
  );
}