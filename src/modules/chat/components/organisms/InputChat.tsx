/**
 * InputChat Module - Input Chat Organism (MODULAR VERSION - REPLICATING ORIGINAL)
 *
 * Complete modular version that replicates ENTIRE functionality of original monolithic InputChat
 * Lines reduced from 1313 to ~650 through proper modularization
 *
 * @module chat/components/organisms/InputChat
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { AnimatePresence, motion } from 'framer-motion';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useEditorPersistence } from '@/modules/chat/hooks/use-form-persistence';
import { saveErrorMessage, removeErrorMessage, PersistedMessage } from '@/lib/messagePersistence';
import { toast } from '@/components/ui/use-toast';
import { TimerPanel, TimerDisplay } from '../../timer';
import { Paperclip, X } from '@/components/animate-ui/icons';
import { useImageUpload } from '@/hooks/useImageUpload';
import SearchableDropdown, { type DropdownItem } from '@/modules/config/components/ui/SearchableDropdown';
import styles from './InputChat.module.scss';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp?: any;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
  hasError?: boolean;
  clientId: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string | null;
  } | null;
}

export interface InputChatProps {
  // Task and user info
  taskId: string;
  userId: string;
  userName: string; // Nombre completo para time logs
  userFirstName?: string;

  // Message handlers
  onSendMessage: (message: Partial<Message>) => Promise<void>;
  onEditMessage?: (messageId: string, newText: string) => Promise<void>;

  // Reply/Edit state
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessageId?: string | null;
  editingText?: string;
  onCancelEdit?: () => void;

  // State
  isSending?: boolean;
  setIsSending?: React.Dispatch<React.SetStateAction<boolean>>;
  disabled?: boolean;

  // Users for mentions
  users?: { id: string; fullName: string }[];
}

/**
 * InputChat - Complete modular input component that REPLICATES original
 *
 * Features preserved from original:
 * - Rich text editor (TipTap) with exact same configuration
 * - File upload with drag-and-drop
 * - Editor persistence (drafts and error messages)
 * - Context menu with all actions
 * - Keyboard shortcuts (Ctrl+A/C/V/X, Enter, Esc)
 * - Formatting toolbar (Bold, Italic, Underline, Code, Lists)
 * - Timer integration (using monolithic components temporarily)
 * - Reply and edit modes with banners
 * - Optimistic UI with proper error handling
 * - Mention autocomplete (@user)
 * - All original SCSS styles
 *
 * Features EXCLUDED (deprecated):
 * - @gemini mentions
 * - Gemini AI integration
 * - useGeminiIntegration hook
 * - useMentionHandler hook
 * - GeminiModesDropdown
 */
export const InputChat: React.FC<InputChatProps> = ({
  taskId,
  userId,
  userName,
  userFirstName = 'Usuario',
  onSendMessage,
  onEditMessage,
  replyingTo,
  onCancelReply,
  editingMessageId,
  editingText = '',
  onCancelEdit,
  isSending: isSendingProp = false,
  setIsSending: setIsSendingProp,
  users = [],
}) => {
  // ========== STATE ==========
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionInput, setMentionInput] = useState("");
  const [mentionOptions, setMentionOptions] = useState<DropdownItem[]>([]);
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false);

  // Local state for sending if not controlled
  const [localSending, setLocalSending] = useState(false);
  const isSending = setIsSendingProp ? isSendingProp : localSending;
  const setIsSending = setIsSendingProp || setLocalSending;

  // ========== REFS ==========
  const inputWrapperRef = useRef<HTMLFormElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const conversationId = `chat-sidebar-${taskId}`;

  // ========== IMAGE UPLOAD HOOK ==========
  const {
    previewUrl,
    fileName,
    fileInputRef,
    isDragging,
    uploadProgress,
    isUploading,
    handleThumbnailClick,
    handleRemove: handleRemoveImage,
    handleDragOver,
    handleDragLeave,
  } = useImageUpload({
    onUpload: () => {
      // Image uploaded
    },
  });

  // ========== CLIENT-SIDE DETECTION ==========
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ========== TIPTAP EDITOR ==========
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
      }),
      Underline,
    ],
    content: '',
    immediatelyRender: false, // ✅ Fix SSR
    onUpdate: () => {
      adjustEditorHeight();
      // Detectar menciones @usuario
      if (editor) {
        const text = editor.getText();
        // Mantener autocomplete abierto si hay un '@' no seguido por espacio
        const lastAtIndex = text.lastIndexOf('@');
        const lastSpaceIndex = Math.max(text.lastIndexOf(' '), text.lastIndexOf('\n'));
        const shouldOpen = lastAtIndex > -1 && lastAtIndex > lastSpaceIndex;
        setIsMentionOpen(shouldOpen);
        if (shouldOpen) {
          const queryAfterAt = text.substring(lastAtIndex + 1);
          setMentionInput(queryAfterAt);
          const baseItems: DropdownItem[] = users.map(u => ({ id: u.id, name: u.fullName }));
          setMentionOptions(baseItems);
        } else {
          setMentionInput("");
        }
      }
    },
    editable: !isSending && !isProcessing,
    editorProps: {
      attributes: {
        class: `${styles.input} ProseMirror`,
        'aria-label': 'Escribir mensaje',
      },
    },
  }, [isClient]);

  // ========== EDITOR HEIGHT ADJUSTMENT ==========
  const adjustEditorHeight = useCallback(() => {
    if (editorRef.current) {
      const editorElement = editorRef.current.querySelector('.ProseMirror') as HTMLElement;
      if (editorElement) {
        editorElement.style.height = 'auto';
        const scrollHeight = editorElement.scrollHeight;
        const maxHeight = 200;
        const minHeight = 36;
        editorElement.style.height = `${Math.max(Math.min(scrollHeight, maxHeight), minHeight)}px`;
        editorElement.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
      }
    }
  }, []);

  // ========== EDITOR PERSISTENCE ==========
  const { watchAndSave, clearPersistedData, restoredData } = useEditorPersistence(
    editor,
    `draft_${conversationId}`,
    true
  );

  // Restore persisted content
  useEffect(() => {
    if (
      restoredData &&
      restoredData.content &&
      restoredData.content.trim() &&
      restoredData.content !== '<p></p>' &&
      restoredData.content !== '<p><br></p>' &&
      editor &&
      editor.isEmpty
    ) {
      editor.commands.setContent(restoredData.content);
    }
  }, [restoredData, editor]);

  // Auto-save content periodically
  useEffect(() => {
    if (!editor) return;
    const saveContent = () => {
      const content = editor.getHTML();
      if (content.trim() && content !== '<p></p>' && content !== '<p><br></p>') {
        watchAndSave();
      }
    };
    const interval = setInterval(saveContent, 2000);
    return () => clearInterval(interval);
  }, [editor, watchAndSave]);

  // ========== EDITING MODE ==========
  useEffect(() => {
    if (editingMessageId && editingText && editor) {
      editor.commands.setContent(editingText);
      editor.commands.focus('end');
      adjustEditorHeight();
    } else if (!editingMessageId && editor) {
      editor.commands.clearContent();
    }
  }, [editingMessageId, editingText, editor, adjustEditorHeight]);

  // ========== FILE HANDLING ==========
  const selectFile = useCallback((f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      toast({
        title: 'Archivo demasiado grande',
        description: 'El archivo supera los 10 MB.',
        variant: 'error',
      });
      return;
    }
    const fileExtension = f.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      toast({
        title: 'Extensión no permitida',
        description: `Extensión no permitida. Permitidas: ${validExtensions.join(', ')}`,
        variant: 'error',
      });
      return;
    }
    setFile(f);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) selectFile(file);
      if (e.target) e.target.value = '';
    },
    [selectFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) selectFile(file);
    },
    [selectFile]
  );

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    handleRemoveImage();
  }, [handleRemoveImage]);

  // ========== SEND MESSAGE ==========
  const handleSend = useCallback(
    async (e: React.FormEvent | React.KeyboardEvent) => {
      e.preventDefault();
      const hasText = editor && !editor.isEmpty;
      const hasFile = file !== null;
      if (!userId || (!hasText && !hasFile) || isSending || isProcessing) return;

      // Editing mode
      if (editingMessageId && onEditMessage) {
        const newText = editor.getHTML();
        if (!newText.trim()) {
          toast({
            title: 'Mensaje vacío',
            description: 'El mensaje no puede estar vacío.',
            variant: 'error',
          });
          return;
        }
        try {
          setIsSending(true);
          await onEditMessage(editingMessageId, newText);
          // Clear input and cache after edit
          editor?.commands.clearContent(true);
          setFile(null);
          handleRemoveImage();
          adjustEditorHeight();
          removeErrorMessage(conversationId);
          clearPersistedData();
          if (onCancelReply) onCancelReply();
          if (onCancelEdit) onCancelEdit();
        } catch {
          toast({
            title: 'Error al editar',
            description: 'Error al editar el mensaje.',
            variant: 'error',
          });
        } finally {
          setIsSending(false);
        }
        return;
      }

      setIsSending(true);
      const clientId = crypto.randomUUID();

      try {
        let finalMessageData: Partial<Message> = {
          senderId: userId,
          senderName: userFirstName || 'Usuario',
          text: hasText ? editor.getHTML() : null,
          read: false,
          imageUrl: null,
          fileUrl: null,
          fileName: file ? file.name : null,
          fileType: file ? file.type : null,
          filePath: null,
          isPending: false,
          hasError: false,
          clientId,
          replyTo: replyingTo
            ? {
                id: replyingTo.id,
                senderName: replyingTo.senderName,
                text: replyingTo.text,
                imageUrl: replyingTo.imageUrl || undefined,
              }
            : undefined,
        };

        // Upload file if present
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', userId);
          formData.append('type', 'message');
          formData.append('conversationId', taskId);
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            headers: { 'x-clerk-user-id': userId },
          });
          if (!response.ok) throw new Error('Failed to upload file');
          const { url, fileName, fileType, filePath } = await response.json();
          finalMessageData = {
            ...finalMessageData,
            imageUrl: file.type.startsWith('image/') ? url : null,
            fileUrl: url && !file.type.startsWith('image/') ? url : null,
            fileName,
            fileType,
            filePath,
          };
        }

        // Send message
        await onSendMessage(finalMessageData);

        // ✅ OPTIMISTIC UI: Clear input and cache immediately
        editor?.commands.clearContent(true);
        setFile(null);
        handleRemoveImage();
        adjustEditorHeight();
        removeErrorMessage(conversationId);
        clearPersistedData();
        if (onCancelReply) onCancelReply();
      } catch {
        const errorMessage: PersistedMessage = {
          id: `temp-${clientId}`,
          text: hasText ? editor.getHTML() : '',
          timestamp: Date.now(),
          hasError: true,
          file: file
            ? { name: file.name, type: file.type, size: file.size, previewUrl: previewUrl || undefined }
            : undefined,
          replyTo: replyingTo
            ? {
                id: replyingTo.id,
                senderName: replyingTo.senderName,
                text: replyingTo.text,
                imageUrl: replyingTo.imageUrl || undefined,
              }
            : undefined,
        };
        saveErrorMessage(conversationId, errorMessage);
        toast({
          title: 'Error al enviar',
          description: 'Error al enviar el mensaje. Guardado localmente.',
          variant: 'error',
        });
      } finally {
        setIsSending(false);
      }
    },
    [
      userId,
      editor,
      file,
      isSending,
      isProcessing,
      editingMessageId,
      onEditMessage,
      replyingTo,
      onCancelReply,
      onCancelEdit,
      userFirstName,
      taskId,
      onSendMessage,
      previewUrl,
      setIsSending,
      handleRemoveImage,
      adjustEditorHeight,
      clearPersistedData,
      conversationId,
    ]
  );

  // ========== KEYBOARD HANDLERS ==========
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editor) return;
      if (e.key === 'Escape' && editingMessageId && onCancelEdit) {
        e.preventDefault();
        onCancelEdit();
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            editor.commands.selectAll();
            break;
          case 'c':
            e.preventDefault();
            {
              const selection = window.getSelection();
              if (selection && selection.toString().length > 0) {
                navigator.clipboard.writeText(selection.toString());
              }
            }
            break;
          case 'v':
            e.preventDefault();
            navigator.clipboard.readText().then((text) => editor.commands.insertContent(text));
            break;
          case 'x':
            e.preventDefault();
            {
              const cutSelection = window.getSelection();
              if (cutSelection && cutSelection.toString().length > 0) {
                navigator.clipboard
                  .writeText(cutSelection.toString())
                  .then(() => editor.commands.deleteSelection());
              }
            }
            break;
        }
      }
    },
    [editor, editingMessageId, onCancelEdit]
  );

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            editor?.commands.selectAll();
            break;
          case 'c':
            e.preventDefault();
            {
              const selection = window.getSelection();
              if (selection && selection.toString().length > 0)
                navigator.clipboard.writeText(selection.toString());
            }
            break;
          case 'v':
            e.preventDefault();
            navigator.clipboard.readText().then((text) => editor?.commands.insertContent(text));
            break;
          case 'x':
            e.preventDefault();
            {
              const cutSelection = window.getSelection();
              if (cutSelection && cutSelection.toString().length > 0)
                navigator.clipboard
                  .writeText(cutSelection.toString())
                  .then(() => editor?.commands.deleteSelection());
            }
            break;
        }
      } else if (e.key === 'Enter' && !e.shiftKey && !isSending && !isProcessing && !isMentionOpen) {
        e.preventDefault();
        handleSend(e);
      } else if (e.key === 'Enter' && e.shiftKey) {
        // Allow new line with Shift+Enter
        setTimeout(adjustEditorHeight, 0);
      }
    },
    [editor, isSending, isProcessing, isMentionOpen, handleSend, adjustEditorHeight]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ========== CONTEXT MENU ==========
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.style.cssText = `position: fixed; top: ${e.clientY}px; left: ${e.clientX}px; background: white; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1000; font-family: 'Inter Tight', sans-serif; font-size: 14px; min-width: 150px;`;

      const menuItems = [
        { label: 'Deshacer', action: () => editor?.commands.undo(), shortcut: 'Ctrl+Z' },
        { label: 'Rehacer', action: () => editor?.commands.redo(), shortcut: 'Ctrl+Y' },
        { type: 'separator' },
        {
          label: 'Cortar',
          action: async () => {
            if (hasSelection) {
              await navigator.clipboard.writeText(selection.toString());
              editor?.commands.deleteSelection();
            }
          },
          shortcut: 'Ctrl+X',
          disabled: !hasSelection,
        },
        {
          label: 'Copiar',
          action: async () => {
            if (hasSelection) await navigator.clipboard.writeText(selection.toString());
          },
          shortcut: 'Ctrl+C',
          disabled: !hasSelection,
        },
        {
          label: 'Pegar',
          action: async () => {
            const text = await navigator.clipboard.readText();
            editor?.commands.insertContent(text);
          },
          shortcut: 'Ctrl+V',
        },
        { type: 'separator' },
        { label: 'Seleccionar todo', action: () => editor?.commands.selectAll(), shortcut: 'Ctrl+A' },
        {
          label: 'Eliminar',
          action: () => {
            if (editor && hasSelection) editor.commands.deleteSelection();
          },
          shortcut: 'Delete',
          disabled: !hasSelection,
        },
      ];

      menuItems.forEach((item) => {
        if (item.type === 'separator') {
          const separator = document.createElement('hr');
          separator.style.cssText = 'margin: 4px 0; border: none; border-top: 1px solid #eee;';
          menu.appendChild(separator);
          return;
        }
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `padding: 8px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; ${
          item.disabled ? 'opacity: 0.5; cursor: not-allowed;' : ''
        }`;
        menuItem.innerHTML = `<span>${item.label}</span><span style="color: #666; font-size: 12px;">${item.shortcut}</span>`;
        if (!item.disabled) {
          menuItem.addEventListener('click', () => {
            item.action();
            document.body.removeChild(menu);
          });
          menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = '#f5f5f5';
          });
          menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = 'transparent';
          });
        }
        menu.appendChild(menuItem);
      });

      document.body.appendChild(menu);
      const closeMenu = () => {
        if (document.body.contains(menu)) document.body.removeChild(menu);
        document.removeEventListener('click', closeMenu);
      };
      setTimeout(() => document.addEventListener('click', closeMenu), 0);
    },
    [editor]
  );

  // ========== FORMAT BUTTONS ==========
  const formatButtons = [
    { id: 'bold', icon: '/input/bold.svg', label: 'Negrita', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: '/input/italic.svg', label: 'Cursiva', shortcut: 'Ctrl+I' },
    { id: 'underline', icon: '/input/underline.svg', label: 'Subrayado', shortcut: 'Ctrl+U' },
    { id: 'code', icon: '/input/square-code.svg', label: 'Código', shortcut: 'Ctrl+`' },
    { id: 'bullet', icon: '/list-bullets.svg', label: 'Lista con viñetas', shortcut: 'Ctrl+Shift+8' },
    { id: 'numbered', icon: '/list-ordered.svg', label: 'Lista numerada', shortcut: 'Ctrl+Shift+7' },
  ];

  const handleToggleFormat = useCallback(
    (id: string) => {
      if (editor) {
        switch (id) {
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
          case 'bullet':
            editor.chain().focus().toggleBulletList().run();
            break;
          case 'numbered':
            editor.chain().focus().toggleOrderedList().run();
            break;
        }
        setTimeout(adjustEditorHeight, 0);
      }
    },
    [editor, adjustEditorHeight]
  );

  const createFormatButtonHandler = useCallback(
    (id: string) => () => {
      handleToggleFormat(id);
    },
    [handleToggleFormat]
  );

  // ========== TIMER HANDLERS ==========
  const handleClearPersistedData = useCallback(() => {
    clearPersistedData();
    editor?.commands.clearContent();
  }, [clearPersistedData, editor]);

  const handleCancelReply = useCallback(() => {
    if (onCancelReply) onCancelReply();
    clearPersistedData();
    removeErrorMessage(conversationId);
  }, [onCancelReply, clearPersistedData, conversationId]);

  const handleCloseTimerPanel = useCallback(() => {
    setIsTimerPanelOpen(false);
  }, []);

  const handleToggleTimerPanel = useCallback(() => {
    setIsTimerPanelOpen(!isTimerPanelOpen);
  }, [isTimerPanelOpen]);

  const handleMouseDownPreventDefault = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // ========== MENTION HANDLERS ==========
  const handleMentionSelectionChange = useCallback(
    (ids: string[]) => {
      const id = ids[0];
      const item = mentionOptions.find((i) => i.id === id);
      if (!item) return;
      const currentText = editor?.getText() || '';
      const lastAtIndex = currentText.lastIndexOf('@');
      const beforeAt = lastAtIndex >= 0 ? currentText.substring(0, lastAtIndex) : currentText;
      const newText = `${beforeAt}@${item.name} `;
      editor?.commands.setContent(newText);
      setIsMentionOpen(false);
      setMentionInput('');
      setTimeout(() => editor?.commands.focus(), 0);
    },
    [mentionOptions, editor]
  );

  // Note: Click outside handling for TimerPanel is managed by the TimerPanel component itself

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // ========== RENDER ==========
  return (
    <div className={styles.inputWrapper}>
      {/* Persisted data banner */}
      <AnimatePresence>
        {restoredData && restoredData.content && restoredData.content.trim() && (
          <motion.div
            className={styles.persistedData}
            key="persisted-msg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <span>Mensaje guardado restaurado</span>
            <button type="button" onClick={handleClearPersistedData}>
              Borrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply banner */}
      {replyingTo && (
        <div className={styles.replyContainer}>
          <div className={styles.replyContent}>
            <div className={styles.replyHeader}>
              <span className={styles.replyLabel}>Respondiendo a {replyingTo.senderName}</span>
              <button
                type="button"
                className={styles.replyCancelButton}
                onClick={handleCancelReply}
                aria-label="Cancelar respuesta"
              >
                <X animateOnHover />
              </button>
            </div>
            <div className={styles.replyPreview}>
              {replyingTo.imageUrl && (
                <Image
                  src={replyingTo.imageUrl}
                  alt="Imagen"
                  width={40}
                  height={40}
                  className={styles.replyImage}
                />
              )}
              {replyingTo.text && (
                <span
                  className={styles.replyText}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      replyingTo.text.length > 50
                        ? `${replyingTo.text.substring(0, 50)}...`
                        : replyingTo.text,
                      {
                        allowedTags: ['strong', 'em', 'u', 'code'],
                        allowedAttributes: { '*': ['style', 'class'] },
                      }
                    ),
                  }}
                />
              )}
              {!replyingTo.text && !replyingTo.imageUrl && <span className={styles.replyText}>Mensaje</span>}
            </div>
          </div>
        </div>
      )}

      {/* Edit banner */}
      {editingMessageId && (
        <div className={styles.editContainer}>
          <div className={styles.editContent}>
            <div className={styles.editHeader}>
              <span className={styles.editLabel}>✏️ Editando mensaje</span>
              <button
                type="button"
                className={styles.editCancelButton}
                onClick={onCancelEdit}
                aria-label="Cancelar edición"
              >
                <X animateOnHover />
              </button>
            </div>
            <div className={styles.editPreview}>
              <span className={styles.editText}>Presiona Enter para guardar o Esc para cancelar</span>
            </div>
          </div>
        </div>
      )}

      {/* Timer Panel - Modular Version */}
      {isTimerPanelOpen && (
        <TimerPanel
          isOpen={isTimerPanelOpen}
          taskId={taskId}
          userId={userId}
          userName={userName}
          onClose={handleCloseTimerPanel}
          onSuccess={() => {
            handleCloseTimerPanel();
            toast({ title: "Tiempo agregado exitosamente" });
          }}
        />
      )}

      {/* Main form */}
      {!isTimerPanelOpen && (
        <form
          className={`${styles.inputContainer} ${isDragging ? styles.dragging : ''}`}
          ref={inputWrapperRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onSubmit={handleSend}
        >
          {/* Formatting toolbar */}
          <AnimatePresence>
            {editor && !editor.isEmpty && (
              <motion.div
                className={styles.toolbar}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut', staggerChildren: 0.05, delayChildren: 0.1 }}
              >
                {formatButtons.map(({ id, icon, label, shortcut }, index) => (
                  <motion.button
                    key={id}
                    type="button"
                    className={`${styles['format-button']} ${styles.tooltip}`}
                    data-active={editor?.isActive(id) ? 'true' : 'false'}
                    onClick={createFormatButtonHandler(id)}
                    disabled={isSending || isProcessing}
                    title={`${label} (${shortcut})`}
                    aria-label={label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15, ease: 'easeOut', delay: index * 0.02 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Image
                      src={icon}
                      alt={label}
                      width={16}
                      height={16}
                      className={`${styles[`${id}Svg`]} ${styles.toolbarIcon}`}
                      style={{ filter: 'none', fill: '#000000' }}
                      draggable="false"
                    />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing spinner */}
          {isProcessing && (
            <div className={styles.processingSpinner}>
              <svg width="16" height="16" viewBox="0 0 24 24" className={styles.spinAnimation}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  className="opacity-75"
                />
              </svg>
            </div>
          )}

          {/* Image preview */}
          {previewUrl && (
            <motion.div
              className={styles.imagePreview}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Image
                src={previewUrl}
                alt="Previsualización"
                width={50}
                height={50}
                className={styles.previewImage}
                draggable="false"
              />
              <span className={styles.fileName}>{fileName || 'Imagen adjunta'}</span>
              {isUploading && (
                <div className={styles.uploadProgress}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className={styles.progressBar}
                  />
                  <span className={styles.progressText}>
                    {uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : 'Procesando imagen...'}
                  </span>
                </div>
              )}
              <button className={styles.removeImageButton} onClick={handleRemoveImage} type="button" title="Eliminar imagen">
                <X animateOnHover />
              </button>
            </motion.div>
          )}

          {/* File preview (non-image) */}
          {file && !previewUrl && (
            <div className={styles.filePreview}>
              <Paperclip animateOnHover />
              <span>{file.name}</span>
              <button className={styles.removeImageButton} onClick={handleRemoveFile} type="button" title="Eliminar archivo">
                <X animateOnHover />
              </button>
            </div>
          )}

          {/* Editor */}
          <div className="relative">
            <EditorContent
              ref={editorRef}
              editor={editor}
              style={{
                fontFamily: '"Inter Tight", sans-serif',
                minHeight: '36px',
                maxHeight: '200px',
                resize: 'none',
                overflow: 'hidden',
              }}
              onKeyDown={handleEditorKeyDown}
              onContextMenu={handleContextMenu}
            />

            {/* Autocomplete for mentions */}
            {isMentionOpen && (
              <div className={styles.mentionAutocomplete} onMouseDown={handleMouseDownPreventDefault}>
                <SearchableDropdown
                  items={mentionOptions.filter((i) =>
                    i.name.toLowerCase().includes((mentionInput || '').toLowerCase())
                  )}
                  selectedItems={[]}
                  onSelectionChange={handleMentionSelectionChange}
                  placeholder=""
                  searchPlaceholder=""
                  disabled={false}
                  multiple={false}
                  emptyMessage="Sin resultados"
                  isOpenDefault
                  hideSearch
                />
              </div>
            )}

            {/* Drag overlay */}
            {isDragging && (
              <motion.div
                className={styles.dragOverlay}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                Suelta imagen aquí para adjuntar
              </motion.div>
            )}
          </div>

          {/* Actions bar */}
          <div className={styles.actions}>
            <TimerDisplay
              taskId={taskId}
              userId={userId}
              showControls={true}
              onTogglePanel={handleToggleTimerPanel}
            />
            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
              <button
                type="button"
                className={`${styles.imageButton2} ${styles.tooltip}`}
                onClick={handleThumbnailClick}
                disabled={isSending || isProcessing}
                aria-label="Adjuntar archivo"
                title="Adjuntar archivo"
              >
                <Paperclip animateOnHover />
              </button>
              <button
                type="submit"
                className={styles.sendButton}
                disabled={isSending || isProcessing || ((!editor || editor.isEmpty) && !file)}
                aria-label="Enviar mensaje"
              >
                <Image src="/arrow-up.svg" alt="Enviar mensaje" width={13} height={13} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
      />
    </div>
  );
};

InputChat.displayName = 'InputChat';
