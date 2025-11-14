/**
 * InputChat Module - Editor Toolbar Molecule
 *
 * Rich text formatting toolbar
 * @module chat/components/molecules/EditorToolbar
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Editor } from '@tiptap/react';
import { FormatButton } from '../atoms';

export interface EditorToolbarProps {
  editor: Editor | null;
  isVisible: boolean;
  disabled?: boolean;
}

interface FormatOption {
  id: string;
  icon: string;
  label: string;
  shortcut: string;
}

const formatOptions: FormatOption[] = [
  { id: 'bold', icon: '/input/bold.svg', label: 'Negrita', shortcut: 'Ctrl+B' },
  { id: 'italic', icon: '/input/italic.svg', label: 'Cursiva', shortcut: 'Ctrl+I' },
  { id: 'underline', icon: '/input/underline.svg', label: 'Subrayado', shortcut: 'Ctrl+U' },
  { id: 'code', icon: '/input/square-code.svg', label: 'Código', shortcut: 'Ctrl+`' },
  { id: 'bulletList', icon: '/list-bullets.svg', label: 'Lista con viñetas', shortcut: 'Ctrl+Shift+8' },
  { id: 'orderedList', icon: '/list-ordered.svg', label: 'Lista numerada', shortcut: 'Ctrl+Shift+7' },
];

/**
 * EditorToolbar - Rich text formatting toolbar
 *
 * Features:
 * - Bold, italic, underline
 * - Code blocks
 * - Bullet and numbered lists
 * - Animated entry/exit
 * - Active state indicators
 */
export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  isVisible,
  disabled = false,
}) => {
  if (!editor) return null;

  const handleFormat = (format: string) => {
    switch (format) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'code':
        editor.chain().focus().toggleCode().run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0, y: -10, scale: 0.95 }}
          animate={{ height: 'auto', opacity: 1, y: 0, scale: 1 }}
          exit={{ height: 0, opacity: 0, y: -10, scale: 0.95 }}
          transition={{
            duration: 0.2,
            ease: 'easeOut',
            staggerChildren: 0.05,
            delayChildren: 0.1,
          }}
          className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 overflow-x-auto"
        >
          {formatOptions.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.15,
                ease: 'easeOut',
                delay: index * 0.02,
              }}
            >
              <FormatButton
                icon={option.icon}
                alt={option.label}
                onClick={() => handleFormat(option.id)}
                active={editor.isActive(option.id)}
                disabled={disabled}
                title={`${option.label} (${option.shortcut})`}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

EditorToolbar.displayName = 'EditorToolbar';
