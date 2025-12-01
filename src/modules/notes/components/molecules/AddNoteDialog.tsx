'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/buttons';
import { CrystalInput } from '@/components/ui/inputs/crystal-input';
import { NOTE_MAX_LENGTH } from '../../lib/constants';
import type { CreateNotePayload } from '../../types';

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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Nota</DialogTitle>
          <DialogDescription>
            Escribe tu nota pública (máximo {NOTE_MAX_LENGTH} caracteres)
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <Button
            intent="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            intent="primary"
            onClick={handleSubmit}
            disabled={!noteContent.trim() || isSubmitting}
          >
            {isSubmitting ? 'Creando...' : 'Crear Nota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
