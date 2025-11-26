'use client';

import { useCallback, useState } from 'react';
import { useNotes } from '../../hooks/useNotes';
import { CurrentUserAction } from '../molecules/CurrentUserAction';
import { NoteUserItem } from '../molecules/NoteUserItem';
import { cn } from '@/lib/utils';
import { useDialog } from '@/modules/dialog';
import { CrystalInput } from '@/components/ui/inputs/crystal-input';

interface NotesTrayProps {
  className?: string;
}

export function NotesTray({ className }: NotesTrayProps) {
  const { notes, currentUserNote, currentUserAvatar, currentUserName, isLoading, addNote, removeNote } = useNotes();
  const { openDialog } = useDialog();
  const [noteContent, setNoteContent] = useState('');

  const handleAddNote = useCallback(() => {
    setNoteContent('');
    openDialog({
      variant: 'form',
      title: 'Agregar Nota',
      description: 'Escribe tu nota pública (máximo 120 caracteres)',
      size: 'sm',
      content: (
        <div className="space-y-4">
          <CrystalInput
            value={noteContent}
            onChange={setNoteContent}
            placeholder="Escribe tu nota..."
            maxLength={120}
            variant="no-icon"
            className="w-full"
          />
          <div className="text-xs text-white">
            {noteContent.length}/120 caracteres
          </div>
        </div>
      ),
      confirmLabel: 'Crear Nota',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        if (noteContent.trim()) {
          await addNote({ content: noteContent.trim() });
        }
      },
    });
  }, [addNote, noteContent, openDialog]);

  const handleDeleteRequest = useCallback(() => {
    openDialog({
      variant: 'confirm',
      title: 'Eliminar Nota',
      description: '¿Estás seguro de que deseas eliminar tu nota?',
      isDanger: true,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        await removeNote();
      },
    });
  }, [openDialog, removeNote]);

  // Si está cargando, mostrar un contenedor vacío (las notas cargan rápido desde Firestore)
  if (isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-6 px-4 py-3',
        'cursor-grab overflow-x-auto active:cursor-grabbing',
        'scrollbar-hide',
        '[&::-webkit-scrollbar]:hidden',
        '[-ms-overflow-style:none]',
        '[scrollbar-width:none]',
        className
      )}
    >
      {/* Current user is always first */}
      <CurrentUserAction
        currentUserNote={currentUserNote}
        avatarUrl={currentUserAvatar}
        username={currentUserName}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteRequest}
      />

      {/* Other users' notes */}
      {notes.map((note) => (
        <NoteUserItem key={note.id} note={note} />
      ))}
    </div>
  );
}

export { NotesTray as InstagramNotesTray };
