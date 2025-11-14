/**
 * InputChat Module - Editor Keyboard Hook
 *
 * Manages keyboard shortcuts for editor
 * @module chat/hooks/useEditorKeyboard
 */

'use client';

import { useCallback, useEffect } from 'react';
import { Editor } from '@tiptap/react';

export interface UseEditorKeyboardOptions {
  editor: Editor | null;
  onSend: () => void;
  onCancel?: () => void;
  disabled?: boolean;
}

/**
 * useEditorKeyboard - Keyboard shortcut handler
 *
 * Features:
 * - Enter to send (Shift+Enter for new line)
 * - Escape to cancel editing
 * - Ctrl/Cmd shortcuts (bold, italic, etc.)
 *
 * @returns Keyboard event handler
 */
export function useEditorKeyboard({
  editor,
  onSend,
  onCancel,
  disabled = false,
}: UseEditorKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editor || disabled) return;

      // Escape key - cancel editing
      if (e.key === 'Escape' && onCancel) {
        e.preventDefault();
        onCancel();
        return;
      }

      // Enter key - send message (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
        return;
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            editor.commands.selectAll();
            break;
          case 'c':
            // Allow default copy behavior
            break;
          case 'v':
            // Allow default paste behavior
            break;
          case 'x':
            // Allow default cut behavior
            break;
          case 'b':
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
            break;
          case 'i':
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
            break;
          case 'u':
            e.preventDefault();
            editor.chain().focus().toggleUnderline().run();
            break;
        }
      }
    },
    [editor, onSend, onCancel, disabled]
  );

  useEffect(() => {
    const editorElement = editor?.view.dom;
    if (!editorElement) return;

    editorElement.addEventListener('keydown', handleKeyDown as any);

    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [editor, handleKeyDown]);

  return { handleKeyDown };
}
