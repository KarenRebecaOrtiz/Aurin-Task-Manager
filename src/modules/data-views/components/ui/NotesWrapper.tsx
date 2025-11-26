'use client';

import { NotesTray } from '@/modules/notes';
import styles from './NotesWrapper.module.scss';

/**
 * NotesWrapper
 * 
 * Wrapper que renderiza el NotesTray (notas públicas tipo Instagram)
 * Se posiciona encima de TasksHeader con full width.
 * 
 * Ubicación: Encima de todas las tablas (TasksTable, TasksKanban, ArchiveTable)
 */
export function NotesWrapper() {
  return (
    <div className={styles.wrapper}>
      <NotesTray className={styles.notesTray} />
    </div>
  );
}

export default NotesWrapper;
