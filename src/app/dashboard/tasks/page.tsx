'use client';
import { useState } from 'react';
import Header from '@/components/ui/Header';
import SyncUserToFirestore from '@/components/SyncUserToFirestore';
import styles from '@/components/ui/Button.module.scss';

export default function TasksPage() {
  const [selectedContainer, setSelectedContainer] = useState<'tareas' | 'clientes' | 'miembros'>('miembros');

  return (
    <div style={{ padding: '1rem' }}>
      <SyncUserToFirestore />
      <Header selectedContainer={selectedContainer} />
      <div style={{ marginTop: '1rem' }}>
        {/* Simulación del selector */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
          <button
            onClick={() => setSelectedContainer('tareas')}
            className={`${styles.button} ${selectedContainer === 'tareas' ? styles.active : ''}`}
          >
            Tareas
          </button>
          <button
            onClick={() => setSelectedContainer('clientes')}
            className={`${styles.button} ${selectedContainer === 'clientes' ? styles.active : ''}`}
          >
            Clientes
          </button>
          <button
            onClick={() => setSelectedContainer('miembros')}
            className={`${styles.button} ${selectedContainer === 'miembros' ? styles.active : ''}`}
          >
            Miembros
          </button>
        </div>
        <div>
          {selectedContainer === 'tareas' && <div>Tareas (próximamente)</div>}
          {selectedContainer === 'clientes' && <div>Clientes (próximamente)</div>}
          {selectedContainer === 'miembros' && <div>Miembros (próximamente)</div>}
        </div>
      </div>
    </div>
  );
}