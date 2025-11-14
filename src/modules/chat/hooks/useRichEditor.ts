/**
 * InputChat Module - Rich Editor Hook
 *
 * Manages TipTap rich text editor instance
 * @module chat/hooks/useRichEditor
 */

'use client';

import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useCallback, useEffect } from 'react';

export interface UseRichEditorOptions {
  initialContent?: string;
  onUpdate?: () => void;
  editable?: boolean;
  placeholder?: string;
}

/**
 * useRichEditor - Manages TipTap editor
 *
 * Features:
 * - TipTap editor initialization
 * - Auto-height adjustment
 * - Content management
 * - Keyboard shortcuts
 *
 * @returns Editor instance and utility functions
 */
export function useRichEditor({
  initialContent = '',
  onUpdate,
  editable = true,
  placeholder = 'Escribe un mensaje...',
}: UseRichEditorOptions = {}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
      }),
      Underline,
    ],
    content: initialContent,
    editable,
    immediatelyRender: false, // ✅ Fix SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[40px] max-h-[200px] overflow-y-auto p-3',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.();
    },
  });

  // Update content when initial content changes (e.g., editing message)
  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  // Clear content
  const clearContent = useCallback(() => {
    editor?.commands.clearContent(true);
  }, [editor]);

  // Get clean HTML
  const getHTML = useCallback(() => {
    return editor?.getHTML() || '';
  }, [editor]);

  // Get plain text
  const getText = useCallback(() => {
    return editor?.getText() || '';
  }, [editor]);

  // Check if editor is empty
  const isEmpty = useCallback(() => {
    if (!editor) return true;
    const html = editor.getHTML();
    return !html || html === '<p></p>' || html.trim() === '';
  }, [editor]);

  // Set content
  const setContent = useCallback(
    (content: string) => {
      editor?.commands.setContent(content);
    },
    [editor]
  );

  // Focus editor
  const focus = useCallback(() => {
    editor?.commands.focus('end');
  }, [editor]);

  return {
    editor,
    clearContent,
    getHTML,
    getText,
    isEmpty,
    setContent,
    focus,
  };
}
