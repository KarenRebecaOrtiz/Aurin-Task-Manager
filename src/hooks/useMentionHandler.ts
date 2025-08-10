// src/hooks/useMentionHandler.ts
import { useState, useCallback, useEffect } from 'react';
import { Editor } from '@tiptap/react';

export interface MentionItem {
  id: string;
  name: string;
  type: 'user' | 'ai';
  imageUrl?: string;
  svgIcon?: string;
}

export const useMentionHandler = (editor: Editor | null) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 });
  const [currentQuery, setCurrentQuery] = useState('');

  // Detectar cuando se escribe @
  const handleMention = useCallback(() => {
    if (!editor) return;
    
    const text = editor.getText();
    const lastChar = text.slice(-1);
    
    if (lastChar === '@') {
      setShowDropdown(true);
      setCurrentQuery('');
      
      // Obtener posición del cursor para posicionar el dropdown
      const { top, left } = editor.view.coordsAtPos(editor.state.selection.from);
      setMentionPosition({ x: left, y: top + 20 });
    } else if (lastChar === ' ' || lastChar === '\n') {
      // Cerrar dropdown si se escribe espacio o nueva línea
      setShowDropdown(false);
      setCurrentQuery('');
    } else if (showDropdown) {
      // Actualizar query si el dropdown está abierto
      const text = editor.getText();
      const atIndex = text.lastIndexOf('@');
      if (atIndex !== -1) {
        const query = text.slice(atIndex + 1);
        setCurrentQuery(query);
      }
    }
  }, [editor, showDropdown]);

  // Insertar mención en el editor
  const insertMention = useCallback((mention: MentionItem) => {
    if (!editor) return;
    
    const text = editor.getText();
    const atIndex = text.lastIndexOf('@');
    
    if (atIndex !== -1) {
      // Reemplazar desde @ hasta el cursor con la mención
      const beforeAt = text.slice(0, atIndex);
      const afterCursor = text.slice(editor.state.selection.from);
      const newText = beforeAt + `@${mention.name} ` + afterCursor;
      
      editor.commands.setContent(newText);
      editor.commands.focus('end');
    }
    
    setShowDropdown(false);
    setCurrentQuery('');
  }, [editor]);

  // Manejar selección de mención
  const handleSelection = useCallback((mention: MentionItem) => {
    insertMention(mention);
    
    // Si es Gemini, podríamos activar alguna funcionalidad especial
    if (mention.id === 'gemini') {
      console.log('[useMentionHandler] Gemini mencionado');
      // Aquí se podría activar un modo especial o mostrar opciones
    }
  }, [insertMention]);

  // Cerrar dropdown
  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
    setCurrentQuery('');
  }, []);

  // Escuchar cambios en el editor
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      handleMention();
    };
    
    editor.on('update', handleUpdate);
    
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, handleMention]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (showDropdown) {
        setShowDropdown(false);
        setCurrentQuery('');
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);

  return {
    showDropdown,
    mentionPosition,
    currentQuery,
    handleSelection,
    closeDropdown,
  };
};
