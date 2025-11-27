'use client';

import { useCallback, useState } from 'react';
import { useNotes } from '../../hooks/useNotes';
import { CurrentUserAction } from '../molecules/CurrentUserAction';
import { NoteUserItem } from '../molecules/NoteUserItem';
import { cn } from '@/lib/utils';
import { useDialog } from '@/modules/dialog';
import { AddNoteDialog } from '../molecules/AddNoteDialog';

interface NotesTrayProps {
  className?: string;
}

export function NotesTray({ className }: NotesTrayProps) {
  const { notes, currentUserNote, currentUserAvatar, currentUserName, isLoading, addNote, removeNote } = useNotes();
  const { openConfirm } = useDialog();
  const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);

  const handleAddNote = useCallback(() => {
    setIsAddNoteDialogOpen(true);
  }, []);

  const handleDeleteRequest = useCallback(() => {
    openConfirm({
      title: 'Eliminar Nota',
      description: '¿Estás seguro de que deseas eliminar tu nota?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        await removeNote();
      },
    });
  }, [openConfirm, removeNote]);

  // Si está cargando, mostrar un contenedor vacío (las notas cargan rápido desde Firestore)
  if (isLoading) {
    return null;
  }

  return (
    <>
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

      {/* Add Note Dialog */}
      <AddNoteDialog
        isOpen={isAddNoteDialogOpen}
        onOpenChange={setIsAddNoteDialogOpen}
        onNoteAdded={addNote}
      />
    </>
  );
}

export { NotesTray as InstagramNotesTray };
