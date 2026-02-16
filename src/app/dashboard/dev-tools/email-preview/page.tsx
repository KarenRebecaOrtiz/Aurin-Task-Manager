'use client';

import { useState } from 'react';

const TEMPLATES = [
  { id: 'task-created', label: 'Tarea Creada' },
  { id: 'task-updated-status', label: 'Actualizada - Estado' },
  { id: 'task-updated-priority', label: 'Actualizada - Prioridad' },
  { id: 'task-updated-dates', label: 'Actualizada - Fechas' },
  { id: 'task-updated-assignment', label: 'Actualizada - Equipo' },
  { id: 'task-updated-general', label: 'Actualizada - General' },
  { id: 'task-deleted', label: 'Tarea Eliminada' },
  { id: 'task-archived', label: 'Tarea Archivada' },
  { id: 'task-unarchived', label: 'Tarea Reactivada' },
  { id: 'team-member-added-you', label: 'Equipo - Te agregaron' },
  { id: 'team-member-added-other', label: 'Equipo - Nuevo miembro' },
  { id: 'team-new-message', label: 'Equipo - Nuevo mensaje' },
];

export default function EmailPreviewPage() {
  const [selected, setSelected] = useState<string>('task-created');

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#111' }}>
      {/* Sidebar */}
      <div
        style={{
          width: 260,
          background: '#1a1a1a',
          borderRight: '1px solid #333',
          padding: 16,
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        <h2 style={{ color: '#D3DE48', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          Email Templates
        </h2>
        <p style={{ color: '#666', fontSize: 11, marginBottom: 16 }}>
          DEV ONLY - Preview
        </p>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              marginBottom: 4,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              background: selected === t.id ? '#D3DE48' : 'transparent',
              color: selected === t.id ? '#0C0C0C' : '#aaa',
              fontWeight: selected === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '12px 20px',
            background: '#1a1a1a',
            borderBottom: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ color: '#aaa', fontSize: 13 }}>
            {TEMPLATES.find((t) => t.id === selected)?.label}
          </span>
          <span style={{ color: '#555', fontSize: 11 }}>
            /api/dev-tools/email-preview?template={selected}
          </span>
        </div>
        <div style={{ flex: 1, background: '#e5e5e5', display: 'flex', justifyContent: 'center', padding: 24 }}>
          <iframe
            key={selected}
            src={`/api/dev-tools/email-preview?template=${selected}`}
            style={{
              width: 650,
              height: '100%',
              border: 'none',
              borderRadius: 8,
              background: '#fff',
            }}
            title={`Preview: ${selected}`}
          />
        </div>
      </div>
    </div>
  );
}
