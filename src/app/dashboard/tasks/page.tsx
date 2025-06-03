'use client';
import SyncUserToFirestore from '@/components/SyncUserToFirestore';

export default function TasksPage() {
  return (
    <div style={{ padding: '1rem' }}>
      <SyncUserToFirestore />
      <h1>Tareas</h1>
      <p>Tabla de tareas (próximamente)</p>
    </div>
  );
}