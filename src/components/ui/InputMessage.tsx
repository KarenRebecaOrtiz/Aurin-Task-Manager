'use client';

/**
 * 🎯 FASE 5: LIMPIEZA DEL INPUT AL ENVIAR MENSAJE CON ENTER
 * 🚀 FASE 6: CORRECCIÓN DE LIMPIEZA DEL INPUT AL ENVIAR CON ENTER
 * 
 * Implementación de limpieza optimista del input y caché para mejorar UX:
 * - Clear inmediato del editor Tiptap tras envío optimista
 * - Limpieza de archivos adjuntos y estado de respuesta
 * - Eliminación de mensajes persistidos en caché (drafts y errores)
 * - Integración con sistema existente de persistencia
 * - Corrección de limpieza al presionar Enter (Fase 6)
 * 
 * Basado en:
 * - https://tiptap.dev/api/commands#clearcontent para resetear editor
 * - https://javascript.plainenglish.io/implementing-optimistic-ui-updates-in-react-a-deep-dive-2f4d91e2b1a4
 * - https://stackoverflow.com/questions/28889826/react-preventdefault-not-working para event handling
 * 
 * @author Optimistic UI Implementation Team
 * @version 6.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { Timestamp } from 'firebase/firestore';
import styles from '../ChatSidebar.module.scss';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { 
  saveErrorMessage,
  removeErrorMessage,
  PersistedMessage
} from '@/lib/messagePersistence';
import { useEditorPersistence } from './use-form-persistence';
import { toast } from './use-toast';
import { AnimatePresence, motion } from 'framer-motion';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp;
  read: boolean;
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
  isSummary?: boolean; // Indicates if this message is an AI summary
  isLoading?: boolean; // Indicates if this message is a loading state (for AI operations)
}

interface InputMessageProps {
  userId: string | undefined;
  userFirstName: string | undefined;
  onSendMessage: (
    message: Partial<Message>,
    isAudio?: boolean,
    audioUrl?: string,
  ) => Promise<void>;
  isSending: boolean;
  containerRef: React.RefObject<HTMLElement>;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessageId?: string | null;
  editingText?: string;
  onEditMessage?: (messageId: string, newText: string) => Promise<void>;
  onCancelEdit?: () => void;
  conversationId?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function InputMessage({
  userId,
  userFirstName,
  onSendMessage,
  isSending,
  containerRef,
  replyingTo,
  onCancelReply,
  editingMessageId,
  editingText,
  onEditMessage,
  onCancelEdit,
  conversationId,
}: InputMessageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLFormElement>(null);
  const currentConversationId = conversationId || 'default-conversation'; // Usar el prop o un fallback

  // Local state for replyingTo if not provided as prop
  const [internalReplyingTo, setInternalReplyingTo] = useState<Message | null>(null);
  const effectiveReplyingTo = typeof replyingTo !== 'undefined' ? replyingTo : internalReplyingTo;

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
      }),
      Underline,
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: () => {
      adjustEditorHeight();
    },
    editable: !isSending && !isProcessing,
    editorProps: {
      attributes: {
        class: `${styles.input} ProseMirror`,
        'aria-label': 'Escribir mensaje',
      },
    },
  }, [isClient]);

  // Auto-resize editor height
  const editorRef = useRef<HTMLDivElement>(null);
  const adjustEditorHeight = useCallback(() => {
    if (editorRef.current) {
      const editorElement = editorRef.current.querySelector('.ProseMirror');
      if (editorElement instanceof HTMLElement) {
        editorElement.style.height = 'auto';
        const scrollHeight = editorElement.scrollHeight;
        const maxHeight = 200;
        const minHeight = 36;
        editorElement.style.height = `${Math.max(Math.min(scrollHeight, maxHeight), minHeight)}px`;
        editorElement.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
      }
    }
  }, [editorRef]);

  // Typewriter effect for reformulation
  const typeWriter = useCallback(
    (text: string, callback: () => void) => {
      if (!editor) return;
      editor.commands.clearContent();
      let index = 0;
      const speed = 15;

      const type = () => {
        if (index < text.length) {
          editor.commands.insertContent(text.charAt(index));
          index++;
          setTimeout(type, speed);
        } else {
          setTimeout(() => {
            adjustEditorHeight();
            editor.commands.focus('end');
            callback();
          }, 100);
        }
      };

      setTimeout(type, 300);
    },
    [editor, adjustEditorHeight],
  );


  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  // Handle editing state
  useEffect(() => {
    if (editingMessageId && editingText && editor) {
      editor.commands.setContent(editingText);
      editor.commands.focus('end');
      adjustEditorHeight();
    } else if (!editingMessageId && editor) {
      editor.commands.clearContent();
    }
  }, [editingMessageId, editingText, editor, adjustEditorHeight]);

  // Toggle formatting
  const toggleFormat = useCallback(
    (format: string) => {
      if (!editor) return;
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
        case 'bullet':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'numbered':
          editor.chain().focus().toggleOrderedList().run();
          break;
      }
    },
    [editor],
  );

  // Usar el hook de persistencia del editor
  const { watchAndSave, clearPersistedData, restoredData } = useEditorPersistence(
    editor,
    `draft_${currentConversationId}`,
    true
  );

  // Send message
  const handleSend = useCallback(async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    // Permitir envío si hay texto O archivo (o ambos)
    const hasText = editor && !editor.isEmpty;
    const hasFile = file !== null;
    
    if (!userId || (!hasText && !hasFile) || isSending || isProcessing) {
      return;
    }


    const clientId = crypto.randomUUID();
    const tempId = `temp-${clientId}`;
    const finalMessageData: Partial<Message> = {
      id: tempId,
      senderId: userId,
      senderName: userFirstName || 'Usuario',
      text: hasText ? editor.getHTML() : null,
      timestamp: Timestamp.now(),
      read: false,
      imageUrl: null,
      fileUrl: null,
      fileName: file ? file.name : null,
      fileType: file ? file.type : null,
      filePath: null,
      isPending: false,
      hasError: false,
      clientId,
      replyTo: effectiveReplyingTo ? {
        id: effectiveReplyingTo.id,
        senderName: effectiveReplyingTo.senderName,
        text: effectiveReplyingTo.text,
        imageUrl: effectiveReplyingTo.imageUrl || undefined,
      } : undefined,
    };

    try {
      // Handle editing mode
      if (editingMessageId && onEditMessage) {
        const newText = editor.getHTML();
        if (!newText.trim()) {
          alert('El mensaje no puede estar vacío.');
          return;
        }
        await onEditMessage(editingMessageId, newText);
        // ✅ FASE 6: Limpiar input y caché tras edición con reset completo
        editor?.commands.clearContent(true); // Forzar reset completo
        setFile(null);
        setPreviewUrl(null);
        adjustEditorHeight();
        removeErrorMessage(currentConversationId);
        clearPersistedData();
        if (onCancelReply) onCancelReply();
        if (onCancelEdit) onCancelEdit();
        console.log('[InputMessage] Message edited successfully');
        return;
      }

      // Handle sending new message
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'message');
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload image');
        const data = await response.json();
        finalMessageData.imageUrl = data.success ? data.data.url : data.imageUrl;
      }

      // ✅ OPTIMIZACIÓN: Clear input inmediatamente post-optimistic para UX rápida
      await onSendMessage(finalMessageData);
      // console.log('[InputMessage] User message sent successfully');
      
      // 🚀 OPTIMISTIC UI: Clear input y caché inmediatamente después del envío optimista
      // Basado en https://tiptap.dev/api/commands#clearcontent para resetear editor
      // Esto mejora la percepción de velocidad según https://javascript.plainenglish.io/implementing-optimistic-ui-updates-in-react-a-deep-dive-2f4d91e2b1a4
      // ✅ LIMPIEZA INMEDIATA: Editor, archivo, caché y estado se resetean instantáneamente
      // 🎯 FASE 5: Limpieza completa del input y caché para UX tipo WhatsApp
      // 🚀 FASE 6: Forzar reset completo del editor para garantizar limpieza con Enter
      editor?.commands.clearContent(true); // Forzar reset completo
      setFile(null);
      setPreviewUrl(null);
      setHasReformulated(false);
      adjustEditorHeight();
      removeErrorMessage(currentConversationId); // Limpiar mensajes de error en caché
      clearPersistedData(); // Limpiar draft en caché
      if (onCancelReply) onCancelReply();
      
      console.log('[InputMessage] Message sent successfully');
    } catch (error) {
      console.error('[InputMessage] Error sending message:', error);
      
      // Guardar mensaje con error para poder reintentarlo
      const errorMessage: PersistedMessage = {
        id: tempId,
        text: hasText ? editor.getHTML() : '',
        timestamp: Date.now(),
        hasError: true,
        file: file ? {
          name: file.name,
          type: file.type,
          size: file.size,
          previewUrl: previewUrl || undefined,
        } : undefined,
      };
      saveErrorMessage(currentConversationId, errorMessage);
      
      // Mark message as failed
      finalMessageData.hasError = true;
      await onSendMessage(finalMessageData);
    }
  }, [userId, editor, file, isSending, isProcessing, userFirstName, onSendMessage, currentConversationId, previewUrl, effectiveReplyingTo, onCancelReply, clearPersistedData, adjustEditorHeight, editingMessageId, onCancelEdit, onEditMessage]);

  // Handle keydown for shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle Escape to cancel editing
    if (e.key === 'Escape' && editingMessageId && onCancelEdit) {
      e.preventDefault();
      onCancelEdit();
      return;
    }
    
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          editor?.commands.selectAll();
          break;
        case 'c':
          e.preventDefault();
          const selection = window.getSelection();
          if (selection && selection.toString().length > 0) {
            navigator.clipboard.writeText(selection.toString()).catch(() => {
              // Fallback for older browsers
              const textArea = document.createElement('textarea');
              textArea.value = selection.toString();
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
        case 'v':
          e.preventDefault();
          navigator.clipboard.readText().then(text => {
            editor?.commands.insertContent(text);
          }).catch(() => {
            // Fallback for older browsers or when clipboard access is denied
            editor?.commands.focus();
            document.execCommand('paste');
          });
          break;
        case 'x':
          e.preventDefault();
          const cutSelection = window.getSelection();
          if (cutSelection && cutSelection.toString().length > 0) {
            navigator.clipboard.writeText(cutSelection.toString()).then(() => {
              editor?.commands.deleteSelection();
            }).catch(() => {
              // Fallback for older browsers
              const textArea = document.createElement('textarea');
              textArea.value = cutSelection.toString();
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              editor?.commands.deleteSelection();
            });
          }
          break;
        case 'z':
          // Undo - let browser handle it naturally
          break;
        case 'y':
          // Redo - let browser handle it naturally
          break;
      }
    }
    
    // ✅ FASE 6: Asegurar que Enter dispare handleSend sin bloqueos
    // Basado en https://stackoverflow.com/questions/28889826/react-preventdefault-not-working
    if (e.key === 'Enter' && !e.shiftKey && !isSending && !isProcessing) {
      e.preventDefault();
      handleSend(e);
    } else if (e.key === 'Enter' && e.shiftKey) {
      // ✅ Permitir salto de línea con Shift+Enter
      // Comportamiento estándar de Tiptap para salto de línea
      setTimeout(adjustEditorHeight, 0);
    }
  }, [isSending, isProcessing, handleSend, editor, editingMessageId, onCancelEdit]);

  // Handle context menu for editor
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      font-family: 'Inter Tight', sans-serif;
      font-size: 14px;
      min-width: 150px;
    `;

    const menuItems = [
      { label: 'Deshacer', action: () => editor?.commands.undo(), shortcut: 'Ctrl+Z' },
      { label: 'Rehacer', action: () => editor?.commands.redo(), shortcut: 'Ctrl+Y' },
      { type: 'separator' },
      { 
        label: 'Cortar', 
        action: async () => {
          if (hasSelection) {
            try {
              await navigator.clipboard.writeText(selection.toString());
              editor?.commands.deleteSelection();
            } catch {
              // Fallback for older browsers
              const textArea = document.createElement('textarea');
              textArea.value = selection.toString();
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              editor?.commands.deleteSelection();
            }
          }
        }, 
        shortcut: 'Ctrl+X', 
        disabled: !hasSelection 
      },
      { 
        label: 'Copiar', 
        action: async () => {
          if (hasSelection) {
            try {
              await navigator.clipboard.writeText(selection.toString());
            } catch {
              // Fallback for older browsers
              const textArea = document.createElement('textarea');
              textArea.value = selection.toString();
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            }
          }
        }, 
        shortcut: 'Ctrl+C', 
        disabled: !hasSelection 
      },
      { 
        label: 'Pegar', 
        action: async () => {
          try {
            const text = await navigator.clipboard.readText();
            editor?.commands.insertContent(text);
          } catch {
            // Fallback for older browsers or when clipboard access is denied
            editor?.commands.focus();
            document.execCommand('paste');
          }
        }, 
        shortcut: 'Ctrl+V' 
      },
      { type: 'separator' },
      { label: 'Seleccionar todo', action: () => editor?.commands.selectAll(), shortcut: 'Ctrl+A' },
      { 
        label: 'Eliminar', 
        action: () => {
          if (editor && hasSelection) {
            editor.commands.deleteSelection();
          }
        }, 
        shortcut: 'Delete', 
        disabled: !hasSelection 
      }
    ];

    menuItems.forEach((item) => {
      if (item.type === 'separator') {
        const separator = document.createElement('hr');
        separator.style.cssText = 'margin: 4px 0; border: none; border-top: 1px solid #eee;';
        menu.appendChild(separator);
        return;
      }

      const menuItem = document.createElement('div');
      menuItem.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        ${item.disabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}
      `;
      menuItem.innerHTML = `
        <span>${item.label}</span>
        <span style="color: #666; font-size: 12px;">${item.shortcut}</span>
      `;
      
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

    // Close menu when clicking outside
    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', closeMenu);
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }, [editor]);

  // File handling
  const selectFile = (f: File) => {
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
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !f.name.includes('/paperclip.svg')) {
      selectFile(f);
    }
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const formatButtons = [
    { id: 'bold', icon: '/input/bold.svg', label: 'Negrita', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: '/input/italic.svg', label: 'Cursiva', shortcut: 'Ctrl+I' },
    { id: 'underline', icon: '/input/underline.svg', label: 'Subrayado', shortcut: 'Ctrl+U' },
    { id: 'code', icon: '/input/square-code.svg', label: 'Código', shortcut: 'Ctrl+`' },
    { id: 'bullet', icon: '/list-bullets.svg', label: 'Lista con viñetas', shortcut: 'Ctrl+Shift+8' },
    { id: 'numbered', icon: '/list-ordered.svg', label: 'Lista numerada', shortcut: 'Ctrl+Shift+7' },
  ];

  // Restaurar contenido del editor desde cache
  useEffect(() => {
    if (restoredData && restoredData.content && restoredData.content.trim() && 
        restoredData.content !== '<p></p>' && restoredData.content !== '<p><br></p>' && 
        editor && editor.isEmpty) {
      editor.commands.setContent(restoredData.content);
      console.log('[InputMessage] Contenido restaurado desde cache');
      toast({
        title: 'Progreso restaurado',
        description: 'Se ha restaurado el mensaje guardado.',
        variant: 'info',
      });
    }
  }, [restoredData, editor]);

  // Guardar contenido automáticamente cuando cambie
  useEffect(() => {
    if (!editor) return;
    
    const saveContent = () => {
      const content = editor.getHTML();
      if (content.trim() && content !== '<p></p>' && content !== '<p><br></p>') {
        watchAndSave();
      }
    };

    // Guardar cada 2 segundos mientras se escribe
    const interval = setInterval(saveContent, 2000);
    
    return () => clearInterval(interval);
  }, [editor, watchAndSave]);

  // ✅ FASE 5: Limpiar caché al cancelar respuesta para mantener consistencia
  const handleCancelReply = useCallback(() => {
    if (typeof replyingTo !== 'undefined' && onCancelReply) {
      onCancelReply();
    } else {
      setInternalReplyingTo(null);
    }
    // ✅ Limpiar caché al cancelar respuesta para mantener consistencia
    clearPersistedData();
    removeErrorMessage(currentConversationId);
    console.log('[InputMessage] Reply cancelled, keeping draft text');
  }, [replyingTo, onCancelReply, clearPersistedData, removeErrorMessage, currentConversationId]);

  return (
    <div className={styles.inputWrapper}>
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
            <button
              type="button"
              onClick={() => {
                clearPersistedData();
                editor?.commands.clearContent();
              }}
            >
              Borrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {effectiveReplyingTo && (
        <div className={styles.replyContainer}>
          <div className={styles.replyContent}>
            <div className={styles.replyHeader}>
              <span className={styles.replyLabel}>Respondiendo a {effectiveReplyingTo.senderName}</span>
              <button
                type="button"
                className={styles.replyCancelButton}
                onClick={handleCancelReply}
                aria-label="Cancelar respuesta"
              >
                <Image src="/x.svg" alt="Cancelar" width={16} height={16} />
              </button>
            </div>
            <div className={styles.replyPreview}>
              {effectiveReplyingTo.imageUrl && (
                <Image
                  src={effectiveReplyingTo.imageUrl}
                  alt="Imagen"
                  width={40}
                  height={40}
                  className={styles.replyImage}
                  draggable="false"
                />
              )}
              {effectiveReplyingTo.text && (
                <span 
                  className={styles.replyText}
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeHtml(effectiveReplyingTo.text.length > 50 
                      ? `${effectiveReplyingTo.text.substring(0, 50)}...` 
                      : effectiveReplyingTo.text, {
                      allowedTags: ['strong', 'em', 'u', 'code'],
                      allowedAttributes: {
                        '*': ['style', 'class']
                      },
                      transformTags: {
                        'strong': (tagName: string, attribs: Record<string, string>) => ({
                          tagName,
                          attribs: {
                            ...attribs,
                            style: `font-weight: bold; ${attribs.style || ''}`
                          }
                        }),
                        'em': (tagName: string, attribs: Record<string, string>) => ({
                          tagName,
                          attribs: {
                            ...attribs,
                            style: `font-style: italic; ${attribs.style || ''}`
                          }
                        }),
                        'u': (tagName: string, attribs: Record<string, string>) => ({
                          tagName,
                          attribs: {
                            ...attribs,
                            style: `text-decoration: underline; ${attribs.style || ''}`
                          }
                        }),
                        'code': (tagName: string, attribs: Record<string, string>) => ({
                          tagName,
                          attribs: {
                            ...attribs,
                            style: `font-family: monospace; background-color: #f3f4f6; padding: 1px 3px; border-radius: 2px; ${attribs.style || ''}`
                          }
                        })
                      }
                    })
                  }}
                />
              )}
              {!effectiveReplyingTo.text && !effectiveReplyingTo.imageUrl && (
                <span className={styles.replyText}>Mensaje</span>
              )}
            </div>
          </div>
        </div>
      )}
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
                <Image src="/x.svg" alt="Cancelar" width={16} height={16} />
              </button>
            </div>
            <div className={styles.editPreview}>
              <span className={styles.editText}>Presiona Enter para guardar o Esc para cancelar</span>
            </div>
          </div>
        </div>
      )}
      <form
        className={`${styles.inputContainer} ${isDragging ? styles.dragging : ''}`}
        ref={inputWrapperRef}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onSubmit={handleSend}
      >
        <div className={styles.toolbar}>
          {formatButtons.map(({ id, icon, label, shortcut }) => (
            <button
              key={id}
              type="button"
              className={`${styles['format-button']} ${styles.tooltip}`}
              data-active={editor?.isActive(id) ? 'true' : 'false'}
              onClick={() => toggleFormat(id)}
              disabled={isSending || isProcessing}
              title={`${label} (${shortcut})`}
              aria-label={label}
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
            </button>
          ))}
        </div>
        {isProcessing && (
          <div className={styles.processingSpinner}>
                            <svg width="16" height="16" viewBox="0 0 24 24" className={styles.spinAnimation}>
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="opacity-25"
              />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                className="opacity-75"
              />
            </svg>
          </div>
        )}
        {previewUrl && (
          <div className={styles.imagePreview}>
            <Image 
              src={previewUrl} 
              alt="Previsualización" 
              width={100}
              height={100}
              sizes="100px"
              className={styles.previewImage}
              draggable="false"
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '100px',
                maxHeight: '100px',
                objectFit: 'contain'
              }}
            />
            <button
              className={styles.removeImageButton}
              onClick={handleRemoveFile}
              type="button"
              title="Eliminar imagen"
            >
              <Image src="/x.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} draggable="false" />
            </button>
          </div>
        )}
        {file && !previewUrl && (
          <div className={styles.filePreview}>
            <Image src="/file.svg" alt="Archivo" width={16} height={16} draggable="false" />
            <span>{file.name}</span>
            <button
              className={styles.removeImageButton}
              onClick={handleRemoveFile}
              type="button"
              title="Eliminar archivo"
            >
              <Image src="/x.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} draggable="false" />
            </button>
          </div>
        )}
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
            onKeyDown={handleKeyDown}
            onContextMenu={handleContextMenu}
          />
        </div>
        <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
            <button
              type="button"
              className={`${styles.imageButton} ${styles.tooltip}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isProcessing}
              aria-label="Adjuntar archivo"
              title="Adjuntar archivo"
            >
              <Image
                src="/paperclip.svg"
                alt="Adjuntar"
                width={16}
                height={16}
                style={{ filter: 'invert(100)' }}
                draggable="false"
              />
            </button>
            <button
              type="submit"
              className={styles.sendButton}
              disabled={isSending || isProcessing || ((!editor || editor.isEmpty) && !file)}
              aria-label="Enviar mensaje"
            >
              <Image src="/arrow-up.svg" alt="Enviar mensaje" width={13} height={13} draggable="false" />
            </button>
          </div>
        </div>
      </form>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) selectFile(f);
        }}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
      />
    </div>
  );
}