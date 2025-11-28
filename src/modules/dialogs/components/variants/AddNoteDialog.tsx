'use client';

import { useState, useCallback } from 'react';
import { CrudDialog } from '../organisms/CrudDialog';
import { Button } from '@/components/ui/button';
import { CrystalInput } from '@/components/ui/inputs/crystal-input';
import { NOTE_MAX_LENGTH } from '@/modules/notes/lib/constants';
import type { CreateNotePayload } from '@/modules/notes/types';

interface AddNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteAdded: (payload: CreateNotePayload) => Promise<void>;
}

export function AddNoteDialog({ isOpen, onOpenChange, onNoteAdded }: AddNoteDialogProps) {
  const [noteContent, setNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContentChange = useCallback((value: string) => {
    if (value.length <= NOTE_MAX_LENGTH) {
      setNoteContent(value);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!noteContent.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onNoteAdded({ content: noteContent.trim() });
      setNoteContent('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [noteContent, onNoteAdded, onOpenChange]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setNoteContent('');
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  const handleCancel = useCallback(() => {
    setNoteContent('');
    onOpenChange(false);
  }, [onOpenChange]);

  // Custom footer with buttons
  const customFooter = (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        onClick={handleCancel}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!noteContent.trim() || isSubmitting}
      >
        {isSubmitting ? 'Creando...' : 'Crear Nota'}
      </Button>
    </div>
  );

  return (
    <CrudDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      mode="create"
      title="Agregar Nota"
      description={`Escribe tu nota pública (máximo ${NOTE_MAX_LENGTH} caracteres)`}
      isSubmitting={isSubmitting}
      footer={customFooter}
      size="sm"
      closeOnOverlayClick={true}
    >
      <div className="space-y-4">
        <CrystalInput
          value={noteContent}
          onChange={handleContentChange}
          placeholder="Escribe tu nota..."
          maxLength={NOTE_MAX_LENGTH}
          variant="no-icon"
          className="w-full"
        />
        <div className="text-xs text-muted-foreground">
          {noteContent.length}/{NOTE_MAX_LENGTH} caracteres
        </div>
      </div>
    </CrudDialog>
  );
}
