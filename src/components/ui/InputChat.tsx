'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { Timestamp } from 'firebase/firestore';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from '@firebase/ai';
import { ai } from '@/lib/firebase';
import NumberFlow, { NumberFlowGroup } from '@number-flow/react';
import styles from '../ChatSidebar.module.scss';
import { EmojiSelector } from './EmojiSelector';
import TimerPanel from './TimerPanel';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useEditorPersistence } from './use-form-persistence';
import { 
  saveErrorMessage,
  removeErrorMessage,
  PersistedMessage
} from '@/lib/messagePersistence';
import { toast } from './use-toast';
import { AnimatePresence, motion } from 'framer-motion';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | Date | null;
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

interface InputChatProps {
  taskId: string;
  timerInput: string;
  setTimerInput: (value: string) => void;
  dateInput: Date;
  setDateInput: (date: Date) => void;
  commentInput: string;
  setCommentInput: (value: string) => void;
  onAddTimeEntry: () => Promise<void>;
  userId: string | undefined;
  userFirstName: string | undefined;
  onSendMessage: (
    message: Partial<Message>,
    isAudio?: boolean,
    audioUrl?: string,
    duration?: number,
  ) => Promise<void>;
  isSending: boolean;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
  timerSeconds: number;
  isTimerRunning: boolean;
  onToggleTimer: (e: React.MouseEvent) => void;
  onToggleTimerPanel: (e: React.MouseEvent) => void;
  isTimerPanelOpen: boolean;
  setIsTimerPanelOpen: (open: boolean) => void;
  containerRef: React.RefObject<HTMLElement>;
  timerPanelRef?: React.RefObject<HTMLDivElement>;
  totalHours: string;
  isRestoringTimer?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function InputChat({
  taskId,
  userId,
  userFirstName,
  onSendMessage,
  isSending,
  setIsSending,
  timerSeconds,
  isTimerRunning,
  onToggleTimer,
  onToggleTimerPanel,
  isTimerPanelOpen,
  setIsTimerPanelOpen,
  containerRef,
  timerPanelRef,
  timerInput,
  setTimerInput,
  dateInput,
  setDateInput,
  commentInput,
  setCommentInput,
  onAddTimeEntry,
  totalHours,
  isRestoringTimer,
  replyingTo,
  onCancelReply,
}: InputChatProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasReformulated, setHasReformulated] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLFormElement>(null);
  const dropupRef = useRef<HTMLDivElement>(null);
  const conversationId = `chat-sidebar-${taskId}`; // ID único para esta conversación

  // Local state for replyingTo if not provided as prop
  const [internalReplyingTo, setInternalReplyingTo] = useState<Message | null>(null);
  const effectiveReplyingTo = typeof replyingTo !== 'undefined' ? replyingTo : internalReplyingTo;
  const setReplyingTo = typeof replyingTo !== 'undefined' && onCancelReply ? (msg: Message | null) => {
    if (msg) {
      // No setter provided, so do nothing
    } else {
      onCancelReply();
    }
  } : setInternalReplyingTo;

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
  }, []);

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

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (isTimerPanelOpen) {
        const isInsideInputWrapper = inputWrapperRef.current?.contains(target);
        const isInsideTimerPanel = timerPanelRef?.current?.contains(target);
        const isInsideTimePicker = document.querySelector('.react-time-picker')?.contains(target);
        const isInsideDatePicker =
          document.querySelector('.react-datepicker')?.contains(target) ||
          document.querySelector('.react-datepicker-popper')?.contains(target);

        if (!isInsideInputWrapper && !isInsideTimerPanel && !isInsideTimePicker && !isInsideDatePicker) {
          setIsTimerPanelOpen(false);
        }
      }

      if (isDropupOpen && !dropupRef.current?.contains(target)) {
        setIsDropupOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimerPanelOpen, setIsTimerPanelOpen, timerPanelRef, isDropupOpen]);

  // Handle timer panel toggle
  const handleToggleTimerPanel = useCallback(
    (e: React.MouseEvent) => {
      if (isSending) return;
      e.stopPropagation();
      onToggleTimerPanel(e);
    },
    [isSending, onToggleTimerPanel],
  );

  // Handle timer panel close
  const handleCloseTimerPanel = useCallback(() => {
    setIsTimerPanelOpen(false);
  }, [setIsTimerPanelOpen]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset reformulation state
  useEffect(() => {
    if (editor && editor.isEmpty) {
      setHasReformulated(false);
    }
  }, [editor]);

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

  // Handle keydown for shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editor) return;
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            editor.commands.selectAll();
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
              editor.commands.insertContent(text);
            }).catch(() => {
              // Fallback for older browsers or when clipboard access is denied
              editor.commands.focus();
              document.execCommand('paste');
            });
            break;
          case 'x':
            e.preventDefault();
            const cutSelection = window.getSelection();
            if (cutSelection && cutSelection.toString().length > 0) {
              navigator.clipboard.writeText(cutSelection.toString()).then(() => {
                editor.commands.deleteSelection();
              }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = cutSelection.toString();
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                editor.commands.deleteSelection();
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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        switch (e.key) {
          case '8':
            toggleFormat('bullet');
            break;
          case '7':
            toggleFormat('numbered');
            break;
        }
      }
    },
    [toggleFormat, editor],
  );

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

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
    const newPreviewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
    setPreviewUrl(newPreviewUrl);
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

  // Reformulate with Gemini AI
  const handleReformulate = async (
    mode: 'correct' | 'rewrite' | 'friendly' | 'professional' | 'concise' | 'summarize' | 'keypoints' | 'list',
  ) => {
    if (!userId || !editor || editor.isEmpty || isProcessing) return;

    setIsProcessing(true);
    setIsDropupOpen(false);

    try {
      if (!ai) {
        throw new Error('🤖 El servicio de Gemini AI no está disponible en este momento.');
      }

      const prompts = {
        correct: `Corrige todos los errores de ortografía, gramática, puntuación y sintaxis en el siguiente texto, manteniendo el tono y significado original. Solo devuelve el texto corregido: "${editor.getText()}"`,
        rewrite: `Reescribe completamente el siguiente texto manteniendo el mismo significado, pero usando diferentes palabras y estructuras. Solo devuelve el texto reescrito: "${editor.getText()}"`,
        friendly: `Transforma el siguiente texto a un tono más amigable, cálido y cercano. Solo devuelve el texto transformado: "${editor.getText()}"`,
        professional: `Convierte el siguiente texto en una versión más profesional y formal. Solo devuelve el texto profesional: "${editor.getText()}"`,
        concise: `Haz el siguiente texto más conciso y directo, eliminando redundancias. Solo devuelve el texto conciso: "${editor.getText()}"`,
        summarize: `Resume el siguiente texto en sus puntos más importantes, manteniendo solo lo esencial. Solo devuelve el resumen: "${editor.getText()}"`,
        keypoints: `Extrae los puntos clave del siguiente texto y preséntalos como lista. Solo devuelve los puntos clave: "${editor.getText()}"`,
        list: `Convierte el siguiente texto en una lista organizada con viñetas o numeración. Solo devuelve la lista: "${editor.getText()}"`,
      };

      const generationConfig = {
        maxOutputTokens: 800,
        temperature: mode === 'rewrite' ? 0.8 : 0.6,
        topK: 40,
        topP: 0.9,
      };

      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];

      const systemInstruction = `Eres un asistente de escritura experto. Responde únicamente con el texto procesado, sin explicaciones ni comentarios adicionales.`;

      const model = getGenerativeModel(ai, {
        model: 'gemini-1.5-flash',
        generationConfig,
        safetySettings,
        systemInstruction,
      });

      const promptText = prompts[mode];
      const result = await model.generateContent(promptText);
      const reformulatedText = await result.response.text();

      if (!reformulatedText.trim()) {
        throw new Error('📝 Gemini devolvió una respuesta vacía.');
      }

      typeWriter(reformulatedText.trim(), () => {
        editor.commands.focus();
      });
      setHasReformulated(true);
    } catch (error) {
      console.error('[InputChat:Reformulate] Error:', error);
      toast({
        title: 'Error al procesar el texto con Gemini AI',
        description: '❌ Error al procesar el texto con Gemini AI.',
        variant: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Send message
  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    // Permitir envío si hay texto O archivo (o ambos)
    const hasText = editor && !editor.isEmpty;
    const hasFile = file !== null;
    
    if (!userId || (!hasText && !hasFile) || isSending || isProcessing) {
      return;
    }

    setHasReformulated(false);
    setIsDropupOpen(false);
    setIsSending(true);

    const clientId = crypto.randomUUID();
    const tempId = `temp-${clientId}`;

    try {
      let finalMessageData: Partial<Message> = {
        id: tempId,
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
        replyTo: effectiveReplyingTo ? {
          id: effectiveReplyingTo.id,
          senderName: effectiveReplyingTo.senderName,
          text: effectiveReplyingTo.text,
          ...(effectiveReplyingTo.imageUrl && { imageUrl: effectiveReplyingTo.imageUrl }),
        } : undefined,
      };

      if (file) {
        const optimisticMessage: Partial<Message> = {
          ...finalMessageData,
          imageUrl: file.type.startsWith('image/') ? previewUrl : null,
          isPending: true,
        };

        await onSendMessage(optimisticMessage);

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

        if (!response.ok) {
          throw new Error('Failed to upload file');
        }

        const { url, fileName, fileType, filePath } = await response.json();

        finalMessageData = {
          ...finalMessageData,
          imageUrl: file.type.startsWith('image/') && url ? url : null,
          fileUrl: url && !file.type.startsWith('image/') ? url : null,
          fileName,
          fileType,
          filePath,
          isPending: false,
        };

        await onSendMessage(finalMessageData);
      } else {
        await onSendMessage(finalMessageData);
      }

      editor?.commands.clearContent();
      setFile(null);
      setPreviewUrl(null);
      setHasReformulated(false);
      adjustEditorHeight();
      
      // Limpiar mensaje guardado al enviar exitosamente
      removeErrorMessage(conversationId);
      clearPersistedData();
      
      // Limpiar reply después de enviar
      if (onCancelReply) {
        onCancelReply();
      }
    } catch (error) {
      console.error('[InputChat:HandleSend] Error:', error);
      
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
        replyTo: effectiveReplyingTo ? {
          id: effectiveReplyingTo.id,
          senderName: effectiveReplyingTo.senderName,
          text: effectiveReplyingTo.text,
          imageUrl: effectiveReplyingTo.imageUrl || undefined,
        } : undefined,
      };
      saveErrorMessage(conversationId, errorMessage);
      
      if (file) {
        await onSendMessage({
          id: tempId,
          senderId: userId,
          senderName: userFirstName || 'Usuario',
          text: hasText ? editor.getHTML() : null,
          isPending: false,
          hasError: true,
          clientId,
        });
      }
      toast({
        title: 'Error al enviar',
        description: 'Error al enviar el mensaje. Se ha guardado localmente para reintentar.',
        variant: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatButtons = [
    { id: 'bold', icon: '/input/bold.svg', label: 'Negrita', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: '/input/italic.svg', label: 'Cursiva', shortcut: 'Ctrl+I' },
    { id: 'underline', icon: '/input/underline.svg', label: 'Subrayado', shortcut: 'Ctrl+U' },
    { id: 'code', icon: '/input/square-code.svg', label: 'Código', shortcut: 'Ctrl+`' },
    { id: 'bullet', icon: '/list-bullets.svg', label: 'Lista con viñetas', shortcut: 'Ctrl+Shift+8' },
    { id: 'numbered', icon: '/list-ordered.svg', label: 'Lista numerada', shortcut: 'Ctrl+Shift+7' },
  ];

  // Usar el hook de persistencia del editor
  const { watchAndSave, clearPersistedData, restoredData } = useEditorPersistence(
    editor,
    `draft_${conversationId}`,
    true
  );

  // Restaurar contenido del editor desde cache
  useEffect(() => {
    if (restoredData && restoredData.content && restoredData.content.trim() && 
        restoredData.content !== '<p></p>' && restoredData.content !== '<p><br></p>' && 
        editor && editor.isEmpty) {
      editor.commands.setContent(restoredData.content);
      console.log('[InputChat] Contenido restaurado desde cache');
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
                onClick={() => setReplyingTo(null)}
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
      <TimerPanel
        isOpen={isTimerPanelOpen}
        timerInput={timerInput}
        setTimerInput={setTimerInput}
        dateInput={dateInput}
        setDateInput={setDateInput}
        commentInput={commentInput}
        setCommentInput={setCommentInput}
        totalHours={totalHours}
        onAddTimeEntry={onAddTimeEntry}
        onCancel={handleCloseTimerPanel}
        ref={timerPanelRef}
      />
      {!isTimerPanelOpen && (
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
              <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin">
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
              <Image src={previewUrl} alt="Previsualización" width={50} height={50} className={styles.previewImage} draggable="false" />
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
              onKeyDown={(e) => {
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
                } else if (e.key === 'Enter' && !e.shiftKey && !isSending && !isProcessing) {
                  e.preventDefault();
                  handleSend(e);
                } else if (e.key === 'Enter') {
                  setTimeout(adjustEditorHeight, 0);
                }
              }}
              onContextMenu={handleContextMenu}
            />
          </div>
          <div className={styles.actions}>
            <div className={styles.timerContainer} style={{ width: '100%' }}>
              <button
                className={styles.playStopButton}
                onClick={onToggleTimer}
                disabled={isProcessing}
                type="button"
                aria-label={isTimerRunning ? 'Detener temporizador' : 'Iniciar temporizador'}
                title={isTimerRunning ? 'Detener temporizador' : 'Iniciar temporizador'}
              >
                <Image
                  src={isTimerRunning ? '/Stop.svg' : '/Play.svg'}
                  alt={isTimerRunning ? 'Detener temporizador' : 'Iniciar temporizador'}
                  width={12}
                  height={12}
                  draggable="false"
                />
              </button>
              <div
                className={styles.timer}
                onClick={handleToggleTimerPanel}
                title="Abrir/cerrar panel de temporizador"
              >
                <NumberFlowGroup>
                  <div className={styles.timerNumbers}>
                    <NumberFlow 
                      trend={-1} 
                      value={Math.floor(timerSeconds / 3600)} 
                      format={{ minimumIntegerDigits: 2 }} 
                    />
                    <NumberFlow
                      prefix=":"
                      trend={-1}
                      value={Math.floor((timerSeconds % 3600) / 60)}
                      digits={{ 1: { max: 5 } }}
                      format={{ minimumIntegerDigits: 2 }}
                    />
                    <NumberFlow
                      prefix=":"
                      trend={-1}
                      value={timerSeconds % 60}
                      digits={{ 1: { max: 5 } }}
                      format={{ minimumIntegerDigits: 2 }}
                    />
                  </div>
                </NumberFlowGroup>
                {isRestoringTimer && (
                  <div className={styles.restoreIndicator}>
                    ↻
                  </div>
                )}
                <Image src="/chevron-down.svg" alt="Abrir panel de temporizador" width={12} height={12} draggable="false" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
              <div className={styles.dropupContainer} ref={dropupRef}>
                <button
                  type="button"
                  className={`${styles.imageButton} ${styles.tooltip} ${styles.reformulateButton} ${
                    hasReformulated ? styles.reformulated : ''
                  } ${isProcessing ? 'processing' : ''}`}
                  onClick={() => setIsDropupOpen((prev) => !prev)}
                  disabled={isSending || isProcessing || !editor || editor.isEmpty}
                  aria-label="Reformular texto con Gemini AI"
                  title="Reformular texto con Gemini AI ✨"
                  aria-expanded={isDropupOpen}
                >
                  <Image src="/gemini.svg" alt="Gemini AI" width={16} height={16} draggable="false" />
                </button>
                {isDropupOpen && (
                  <div className={styles.dropupMenu} role="menu">
                    <button
                      type="button"
                      className={styles.dropupItem}
                      onClick={() => handleReformulate('correct')}
                      disabled={isProcessing}
                      role="menuitem"
                      title="Corregir ortografía y gramática"
                    >
                      ✏️ Corregir
                    </button>
                    <button
                      type="button"
                      className={styles.dropupItem}
                      onClick={() => handleReformulate('rewrite')}
                      disabled={isProcessing}
                      role="menuitem"
                      title="Reescribir el texto con diferentes palabras"
                    >
                      🔄 Re-escribir
                    </button>
                    <button
                      type="button"
                      className={styles.dropupItem}
                      onClick={() => handleReformulate('friendly')}
                      disabled={isProcessing}
                      role="menuitem"
                      title="Transformar a un tono más amigable y cercano"
                    >
                      😊 Hacer amigable
                    </button>
                    <button
                      type="button"
                      className={styles.dropupItem}
                      onClick={() => handleReformulate('professional')}
                      disabled={isProcessing}
                      role="menuitem"
                      title="Convertir a un tono más profesional y formal"
                    >
                      💼 Hacer profesional
                    </button>
                    <button
                      type="button"
                      className={styles.dropupItem}
                      onClick={() => handleReformulate('concise')}
                      disabled={isProcessing}
                      role="menuitem"
                      title="Hacer el texto más conciso y directo"
                    >
                      ⚡ Hacer conciso
                    </button>
                    <button
                      type="button"
                      className={styles.dropupItem}
                      onClick={() => handleReformulate('summarize')}
                      disabled={isProcessing}
                      role="menuitem"
                      title="Resumir los puntos más importantes"
                    >
                      📝 Resumir
                    </button>
                    <button
                      type="button"
                      className={styles.dropupItem}
                      onClick={() => handleReformulate('keypoints')}
                      disabled={isProcessing}
                      role="menuitem"
                      title="Extraer los puntos clave como lista"
                    >
                      🎯 Puntos clave
                    </button>
                    <button
                      type="button"
                      className={styles.dropupItem}
                      onClick={() => handleReformulate('list')}
                      disabled={isProcessing}
                      role="menuitem"
                      title="Convertir en lista organizada"
                    >
                      📋 Convertir en lista
                    </button>
                  </div>
                )}
              </div>
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
              <EmojiSelector
                onEmojiSelect={(emoji) => {
                  editor?.commands.insertContent(emoji);
                  setTimeout(adjustEditorHeight, 0);
                }}
                disabled={isSending || isProcessing}
                value={editor?.getText().match(/[\p{Emoji}\p{Emoji_Component}]+$/u)?.[0] || ''}
                containerRef={containerRef}
              />
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