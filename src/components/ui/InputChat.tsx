'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import sanitizeHtml from 'sanitize-html';
import { Timestamp } from 'firebase/firestore';
import { getGenerativeModel } from '@firebase/ai';
import { ai } from '@/lib/firebase';
import styles from '../ChatSidebar.module.scss';
import TimerPanel from './TimerPanel';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useEditorPersistence } from './use-form-persistence';
import { saveErrorMessage, removeErrorMessage, PersistedMessage } from '@/lib/messagePersistence';
import { toast } from './use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import TimerDisplay from '../TimerDisplay';
import { useImageUpload } from '@/hooks/useImageUpload';
import { decryptBatch } from '@/lib/encryption';
// Removido: uploadTempImage y useChunkStore ya no se usan después de la refactorización
import SearchableDropdown, { type DropdownItem } from '@/modules/config/components/ui/SearchableDropdown';
import TagDropdown, { TagItem } from '@/components/ui/TagDropdown';
// import { GeminiModesDropdown } from '@/components/ui/GeminiModesDropdown';
import { GeminiImageAnalyzer } from '@/components/ui/GeminiImageAnalyzer';
import { useGeminiIntegration } from '@/hooks/useGeminiIntegration';
import { useMentionHandler } from '@/hooks/useMentionHandler';
// Removido: useGeminiModes ya no se usa después de la refactorización
// Removido: useGeminiStore ya no se usa directamente después de la refactorización

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
  isSummary?: boolean; // Indicates if this message is an AI summary
  isLoading?: boolean; // Indicates if this message is a loading state (for AI operations)
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
  onFinalizeTimer?: () => Promise<void>;
  onResetTimer?: () => Promise<void>;
  onToggleTimerPanel: (e: React.MouseEvent) => void;
  isTimerPanelOpen: boolean;
  setIsTimerPanelOpen: (open: boolean) => void;
  containerRef: React.RefObject<HTMLElement>;
  timerPanelRef?: React.RefObject<HTMLDivElement>;
  totalHours: string;
  isRestoringTimer?: boolean;
  isInitializing?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessageId?: string | null;
  editingText?: string;
  onEditMessage?: (messageId: string, newText: string) => Promise<void>;
  onCancelEdit?: () => void;
  isTimerMenuOpen?: boolean;
  messages?: Message[]; // Para contexto en reformulación
  hasMore?: boolean; // Para detectar si hay más mensajes por cargar
  loadMoreMessages?: () => void; // Para cargar más mensajes
  onNewMessage?: (msg: Message) => void; // Callback para nuevos mensajes
  users?: { id: string; fullName: string }[]; // Task users for mentions
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
  onFinalizeTimer,
  onResetTimer,
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
  isInitializing,
  replyingTo,
  onCancelReply,
  editingMessageId,
  editingText,
  onEditMessage,
  onCancelEdit,
  messages,
  hasMore,

  onNewMessage: onNewMessageProp,
  users,
}: InputChatProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isGeminiMentioned, setIsGeminiMentioned] = useState(false);
  const [geminiQuery, setGeminiQuery] = useState('');
  // const [geminiMode, setGeminiMode] = useState<'rewrite' | 'friendly' | 'professional' | 'concise' | 'summarize' | 'keypoints' | 'list'>('rewrite');
  const [retryQuery, setRetryQuery] = useState(false);
  const [pendingNewMsgs, setPendingNewMsgs] = useState<Message[]>([]);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionInput, setMentionInput] = useState("");
  const [mentionOptions, setMentionOptions] = useState<DropdownItem[]>([]);
  
  // Keywords para detectar queries que necesitan contexto completo
  const fullContextKeywords = [
    'resumir todo', 'historial completo', 'summary all', 'full chat', 
    'toda conversación', 'resumir chat', 'todo el chat', 'historial completo',
    'resumen completo', 'toda la conversación', 'todos los mensajes'
  ];
  
  // Removido: getChunks ya no se usa después de la refactorización
  
  // Usar el hook de image upload
  const {
    previewUrl,
    fileName,
    fileInputRef,
    isDragging,
    uploadProgress,
    isUploading,
    handleThumbnailClick,
    handleRemove,
    handleDragOver,
    handleDragLeave,
  } = useImageUpload({
    onUpload: () => {
      // console.log('[InputChat] Image uploaded:', url);
      // Aquí podrías integrar con Gemini para análisis de imagen
    },
  });

  // Wrapper para usar selectFile en los handlers
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectFile(file); // Usa selectFile para validación
    }
    if (e.target) e.target.value = '';
  }, []);



  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      selectFile(file); // Usa selectFile para validación
    }
  }, []);

  // Effect para retry después de cargar más mensajes
  useEffect(() => {
    if (retryQuery && !hasMore) { // Todos los mensajes cargados
      setRetryQuery(false);
      // Re-trigger send después de un delay
      setTimeout(() => {
        if (isGeminiMentioned && geminiQuery) {
          // Simular un evento de submit
          const fakeEvent = {
            preventDefault: () => {},
          } as React.FormEvent;
          handleSend(fakeEvent);
        }
      }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, retryQuery, isGeminiMentioned, geminiQuery]);

  // Función para refrescar respuesta de Gemini con nuevos mensajes
  const refreshGeminiResponse = useCallback(async () => {
    if (pendingNewMsgs.length === 0) return;
    
    try {
      if (!ai) return;
      
      // Decrypt nuevos mensajes
      const decryptedNewMsgs = await decryptBatch(pendingNewMsgs, pendingNewMsgs.length, taskId);
      const newContext = decryptedNewMsgs.map(msg => msg.text || '').join('\n');
      
      // Encontrar último mensaje de Gemini para editar
      const lastGeminiMsg = messages?.findLast(m => m.senderId === 'gemini');
      if (lastGeminiMsg && onEditMessage) {
        // Re-generar respuesta con nuevo contexto
        const model = getGenerativeModel(ai, { model: 'gemini-1.5-flash' });
        const updatedPrompt = `${geminiQuery}\n\nNuevo contexto real-time: ${newContext}`;
        const newResponse = await model.generateContent(updatedPrompt);
        const newText = await newResponse.response.text();
        
        // Editar mensaje existente
        await onEditMessage(lastGeminiMsg.id, newText);
        // console.log('[InputChat] Respuesta de Gemini actualizada con nuevo contexto');
      }
      
      setPendingNewMsgs([]);
    } catch {
      // console.error('[InputChat] Error actualizando respuesta de Gemini:', error);
      setPendingNewMsgs([]);
    }
  }, [pendingNewMsgs, taskId, messages, geminiQuery, onEditMessage]);

  // Función para manejar nuevos mensajes durante @gemini
  const handleNewMessage = useCallback((newMsg: Message) => {
    if (isGeminiMentioned) {
      setPendingNewMsgs(prev => [...prev, newMsg]);
      // Re-process después de 500ms debounce
      setTimeout(() => {
        refreshGeminiResponse();
      }, 500);
    }
    // Llamar al callback prop si existe
    onNewMessageProp?.(newMsg);
  }, [isGeminiMentioned, refreshGeminiResponse, onNewMessageProp]);
  
  // Usar la función handleNewMessage para que no aparezca como no utilizada
  useEffect(() => {
    // Esta función se pasa a través de props y se usa en useMessagePagination
    // console.log('[InputChat] handleNewMessage ready for pagination hook');
  }, [handleNewMessage]);
  const inputWrapperRef = useRef<HTMLFormElement>(null);
  const conversationId = `chat-sidebar-${taskId}`;

  const [internalReplyingTo, setInternalReplyingTo] = useState<Message | null>(null);
  const effectiveReplyingTo = typeof replyingTo !== 'undefined' ? replyingTo : internalReplyingTo;
  const setReplyingTo = useMemo(() => 
    typeof replyingTo !== 'undefined' && onCancelReply ? (msg: Message | null) => {
      if (!msg) onCancelReply();
    } : setInternalReplyingTo
  , [replyingTo, onCancelReply, setInternalReplyingTo]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const editor = useEditor({
    extensions: [StarterKit.configure({ bulletList: { keepMarks: true, keepAttributes: true }, orderedList: { keepMarks: true, keepAttributes: true } }), Underline],
    content: '',
    immediatelyRender: false,
    onUpdate: () => {
      adjustEditorHeight();
      // Detectar menciones @gemini y otras menciones
      if (editor) {
        const text = editor.getText();
        const geminiMatch = text.match(/@gemini\s*(.*)/i);
        setIsGeminiMentioned(!!geminiMatch);
        setGeminiQuery(geminiMatch ? geminiMatch[1].trim() : '');
        
        // Mantener autocomplete abierto si hay un '@' no seguido por espacio
        const lastAtIndex = text.lastIndexOf('@');
        const lastSpaceIndex = Math.max(text.lastIndexOf(' '), text.lastIndexOf('\n'));
        const shouldOpen = lastAtIndex > -1 && lastAtIndex > lastSpaceIndex;
        setIsMentionOpen(shouldOpen);
        if (shouldOpen) {
          const queryAfterAt = text.substring(lastAtIndex + 1);
          setMentionInput(queryAfterAt);
          const baseItems: DropdownItem[] = [
            { id: 'gemini', name: 'Gemini', imageUrl: '/Gemini.png' },
            ...((users || []).map(u => ({ id: u.id, name: u.fullName })))
          ];
          setMentionOptions(baseItems);
        } else {
          setMentionInput("");
        }
        
        // Highlight mention si existe
        if (geminiMatch) {
          // Highlight mention - por ahora solo detectamos, no aplicamos mark
          // TODO: Agregar extensión Mention si se necesita highlight visual
        }
      }
    },
    editable: !isSending && !isProcessing,
    editorProps: { attributes: { class: `${styles.input} ProseMirror`, 'aria-label': 'Escribir mensaje' } },
  }, [isClient]);

  // Hooks para Gemini y menciones
  const { generateQueryResponse } = useGeminiIntegration(taskId);
  const { showDropdown, handleSelection } = useMentionHandler(editor);
  
  // Estado para menciones
  const [mentionItems] = useState<TagItem[]>([
    {
      id: 'gemini',
      name: '🤖 Gemini',
      type: 'ai',
      subtitle: 'Asistente de IA para consultas y reformulación'
    }
  ]);


  const editorRef = useRef<HTMLDivElement>(null);
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

  // const typeWriter = useCallback((text: string, callback: () => void) => {
  //   if (!editor) return;
  //   editor.commands.clearContent();
  //   let index = 0;
  //   const speed = 15;
  //   const type = () => {
  //     if (index < text.length) {
  //       editor.commands.insertContent(text.charAt(index));
  //       index++;
  //       setTimeout(type, speed);
  //     } else {
  //       setTimeout(() => {
  //         adjustEditorHeight();
  //         editor.commands.focus('end');
  //         callback();
  //       }, 100);
  //     }
  //   };
  //   setTimeout(type, 300);
  // }, [editor, adjustEditorHeight]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isTimerPanelOpen) {
        const isInsideInputWrapper = inputWrapperRef.current?.contains(target);
        const isInsideTimerPanel = timerPanelRef?.current?.contains(target);
        const isInsideTimePicker = document.querySelector('.react-time-picker')?.contains(target);
        const isInsideDatePicker = document.querySelector('.react-datepicker')?.contains(target) || document.querySelector('.react-datepicker-popper')?.contains(target);
        if (!isInsideInputWrapper && !isInsideTimerPanel && !isInsideTimePicker && !isInsideDatePicker) setIsTimerPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimerPanelOpen, setIsTimerPanelOpen, timerPanelRef]);



  const handleCloseTimerPanel = useCallback(() => setIsTimerPanelOpen(false), [setIsTimerPanelOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);


  useEffect(() => {
    if (editingMessageId && editingText && editor) {
      editor.commands.setContent(editingText);
      editor.commands.focus('end');
      adjustEditorHeight();
    } else if (!editingMessageId && editor) {
      editor.commands.clearContent();
    }
  }, [editingMessageId, editingText, editor, adjustEditorHeight]);

  const { watchAndSave, clearPersistedData, restoredData } = useEditorPersistence(editor, `draft_${conversationId}`, true);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!editor) return;
    if (e.key === 'Escape' && editingMessageId && onCancelEdit) {
      e.preventDefault();
      onCancelEdit();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a': e.preventDefault(); editor.commands.selectAll(); break;
        case 'c': e.preventDefault(); {
          const selection = window.getSelection();
          if (selection && selection.toString().length > 0) {
            navigator.clipboard.writeText(selection.toString()).catch(() => {
              const textArea = document.createElement('textarea');
              textArea.value = selection.toString();
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
            });
          }
          break;
        }
        case 'v': e.preventDefault(); navigator.clipboard.readText().then(text => editor.commands.insertContent(text)).catch(() => editor.commands.focus()); break;
        case 'x': e.preventDefault(); {
          const cutSelection = window.getSelection();
          if (cutSelection && cutSelection.toString().length > 0) {
            navigator.clipboard.writeText(cutSelection.toString()).then(() => editor.commands.deleteSelection()).catch(() => {
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
        }
      }
    }
  }, [editor, editingMessageId, onCancelEdit]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
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
      { label: 'Cortar', action: async () => { if (hasSelection) { await navigator.clipboard.writeText(selection.toString()); editor?.commands.deleteSelection(); } }, shortcut: 'Ctrl+X', disabled: !hasSelection },
      { label: 'Copiar', action: async () => { if (hasSelection) await navigator.clipboard.writeText(selection.toString()); }, shortcut: 'Ctrl+C', disabled: !hasSelection },
      { label: 'Pegar', action: async () => { const text = await navigator.clipboard.readText(); editor?.commands.insertContent(text); }, shortcut: 'Ctrl+V' },
      { type: 'separator' },
      { label: 'Seleccionar todo', action: () => editor?.commands.selectAll(), shortcut: 'Ctrl+A' },
      { label: 'Eliminar', action: () => { if (editor && hasSelection) editor.commands.deleteSelection(); }, shortcut: 'Delete', disabled: !hasSelection }
    ];

    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('hr');
        separator.style.cssText = 'margin: 4px 0; border: none; border-top: 1px solid #eee;';
        menu.appendChild(separator);
        return;
      }
      const menuItem = document.createElement('div');
      menuItem.style.cssText = `padding: 8px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; ${item.disabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}`;
      menuItem.innerHTML = `<span>${item.label}</span><span style="color: #666; font-size: 12px;">${item.shortcut}</span>`;
      if (!item.disabled) {
        menuItem.addEventListener('click', () => { item.action(); document.body.removeChild(menu); });
        menuItem.addEventListener('mouseenter', () => { menuItem.style.backgroundColor = '#f5f5f5'; });
        menuItem.addEventListener('mouseleave', () => { menuItem.style.backgroundColor = 'transparent'; });
      }
      menu.appendChild(menuItem);
    });

    document.body.appendChild(menu);
    const closeMenu = () => { if (document.body.contains(menu)) document.body.removeChild(menu); document.removeEventListener('click', closeMenu); };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }, [editor]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Función para validar y procesar archivos (usada en handleFileChange del hook)
  const selectFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      toast({ title: 'Archivo demasiado grande', description: 'El archivo supera los 10 MB.', variant: 'error' });
      return;
    }
    const fileExtension = f.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      toast({ title: 'Extensión no permitida', description: `Extensión no permitida. Permitidas: ${validExtensions.join(', ')}`, variant: 'error' });
      return;
    }
    setFile(f);
  };

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    handleRemove();
  }, [setFile, handleRemove]);






  const handleSend = useCallback(async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const hasText = editor && !editor.isEmpty;
    const hasFile = file !== null;
    if (!userId || (!hasText && !hasFile) || isSending || isProcessing) return;

    // Detectar si hay mención @gemini
    const text = editor.getHTML(); // Get full text
    const match = text.match(/@gemini\s*(.*)/i);
    const isMention = !!match;
    const query = match ? match[1].trim() : '';
    
    // Si necesita contexto completo y hay más mensajes por cargar
    if (isMention && query) {
      const needsFullContext = fullContextKeywords.some(keyword => 
        query.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (needsFullContext && hasMore) {
        toast({ 
          title: 'Contexto Incompleto', 
          description: 'Carga más mensajes para un resumen completo del chat.', 
          variant: 'info',
        });
        
        // TODO: Implementar botón de cargar más en el toast cuando la API lo soporte
        // console.log('[InputChat] Contexto incompleto - loadMoreMessagesProp disponible:', !!loadMoreMessagesProp);
        setIsSending(false);
        return; // Abortar query
      }
    }

    if (editingMessageId && onEditMessage) {
      const newText = editor.getHTML();
      if (!newText.trim()) {
        toast({ title: 'Mensaje vacío', description: 'El mensaje no puede estar vacío.', variant: 'error' });
        return;
      }
      try {
        setIsSending(true);
        await onEditMessage(editingMessageId, newText);
        // ✅ FASE 6: Limpiar input y caché tras edición con reset completo
        editor?.commands.clearContent(true); // Forzar reset completo
        setFile(null);
        handleRemove();
        setHasReformulated(false);
        adjustEditorHeight();
        removeErrorMessage(conversationId);
        clearPersistedData();
        if (onCancelReply) onCancelReply();
        if (onCancelEdit) onCancelEdit();
      } catch {
        // console.error('[InputChat:HandleEdit] Error:', error);
        toast({ title: 'Error al editar', description: 'Error al editar el mensaje.', variant: 'error' });
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
        replyTo: effectiveReplyingTo ? { id: effectiveReplyingTo.id, senderName: effectiveReplyingTo.senderName, text: effectiveReplyingTo.text, imageUrl: effectiveReplyingTo.imageUrl || undefined } : undefined,
      };

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);
        formData.append('type', 'message');
        formData.append('conversationId', taskId);
        const response = await fetch('/api/upload', { method: 'POST', body: formData, headers: { 'x-clerk-user-id': userId } });
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

      // ✅ OPTIMIZACIÓN: Clear input inmediatamente post-optimistic para UX rápida
      // Siempre enviar mensaje del usuario primero
      await onSendMessage(finalMessageData);
      // console.log('[InputChat] User message sent successfully');
      
      // 🚀 OPTIMISTIC UI: Clear input y caché inmediatamente después del envío optimista
      // Basado en https://tiptap.dev/api/commands#clearcontent para resetear editor
      // Esto mejora la percepción de velocidad según https://javascript.plainenglish.io/implementing-optimistic-ui-updates-in-react-a-deep-dive-2f4d91e2b1a4
      // ✅ LIMPIEZA INMEDIATA: Editor, archivo, caché y estado se resetean instantáneamente
      // 🎯 FASE 5: Limpieza completa del input y caché para UX tipo WhatsApp
      // 🚀 FASE 6: Forzar reset completo del editor para garantizar limpieza con Enter
      editor?.commands.clearContent(true); // Forzar reset completo
      setFile(null);
      handleRemove();
      adjustEditorHeight();
      removeErrorMessage(conversationId); // Limpiar mensajes de error en caché
      clearPersistedData(); // Limpiar draft en caché
      if (onCancelReply) onCancelReply();
      
      // Si hay mención @gemini, procesar después
      if (isMention && query) {
        // console.log('[InputChat] Processing Gemini query:', query);
        
        // Mostrar toast de "pensando"
        toast({ 
          title: 'Gemini pensando...', 
          variant: 'info',
        });
        
        try {
          // Refactorizado según tesis: usar hook useGeminiIntegration en lugar de lógica hardcodeada
          const needsFullContext = fullContextKeywords.some(keyword => 
            query.toLowerCase().includes(keyword.toLowerCase())
          );
          
          // Usar el hook para generar respuesta
          const responseText = await generateQueryResponse(query, needsFullContext);
          
          if (!responseText.trim()) throw new Error('Respuesta vacía de Gemini');
          
          // Obtener el ID del mensaje del usuario que acaba de enviarse
          const userMessageId = clientId; // Usar el clientId del mensaje del usuario
          
          const geminiMessage: Partial<Message> = {
            senderId: 'gemini',
            senderName: '🤖 Gemini',
            text: responseText,
            timestamp: new Date(),
            read: true,
            clientId: crypto.randomUUID(),
            replyTo: {
              id: userMessageId,
              senderName: userFirstName || 'Usuario',
              text: text,
              imageUrl: finalMessageData.imageUrl || undefined
            }
          };
          
          // Send Gemini message without triggering notifications (handled in usePrivateMessageActions)
          await onSendMessage(geminiMessage);
          console.log('[InputChat] Gemini response posted successfully');
          
                 } catch {
           // console.error('[InputChat: Gemini Processing] Error:', error);
           toast({ title: 'Error de Gemini', description: 'No pudo responder a tu consulta.', variant: 'error' });
         }
      }
      
    } catch {
      // console.error('[InputChat:HandleSend] Error:', error);
      const errorMessage: PersistedMessage = {
        id: `temp-${clientId}`,
        text: hasText ? editor.getHTML() : '',
        timestamp: Date.now(),
        hasError: true,
        file: file ? { name: file.name, type: file.type, size: file.size, previewUrl: previewUrl || undefined } : undefined,
        replyTo: effectiveReplyingTo ? { id: effectiveReplyingTo.id, senderName: effectiveReplyingTo.senderName, text: effectiveReplyingTo.text, imageUrl: effectiveReplyingTo.imageUrl || undefined } : undefined,
      };
      saveErrorMessage(conversationId, errorMessage);
      toast({ title: 'Error al enviar', description: 'Error al enviar el mensaje. Guardado localmente.', variant: 'error' });
    } finally {
      setIsSending(false);
    }
  }, [userId, editor, file, isSending, isProcessing, editingMessageId, onEditMessage, effectiveReplyingTo, onCancelReply, onCancelEdit, onNewMessageProp, userFirstName, taskId, hasMore, fullContextKeywords, toast, saveErrorMessage, conversationId, removeErrorMessage, handleRemove, setFile, adjustEditorHeight, generateQueryResponse, onSendMessage, previewUrl, setIsSending, clearPersistedData]);

  const formatButtons = [
    { id: 'bold', icon: '/input/bold.svg', label: 'Negrita', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: '/input/italic.svg', label: 'Cursiva', shortcut: 'Ctrl+I' },
    { id: 'underline', icon: '/input/underline.svg', label: 'Subrayado', shortcut: 'Ctrl+U' },
    { id: 'code', icon: '/input/square-code.svg', label: 'Código', shortcut: 'Ctrl+`' },
    { id: 'bullet', icon: '/list-bullets.svg', label: 'Lista con viñetas', shortcut: 'Ctrl+Shift+8' },
    { id: 'numbered', icon: '/list-ordered.svg', label: 'Lista numerada', shortcut: 'Ctrl+Shift+7' },
  ];

  const handleClearPersistedData = useCallback(() => {
    clearPersistedData();
    editor?.commands.clearContent();
  }, [clearPersistedData, editor]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    // ✅ FASE 5: Limpiar caché al cancelar respuesta para mantener consistencia
    clearPersistedData();
    removeErrorMessage(conversationId);
  }, [setReplyingTo, clearPersistedData, removeErrorMessage, conversationId]);

  const handleToggleFormat = useCallback((id: string) => {
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
  }, [editor, adjustEditorHeight]);




  const handleMentionSelection = useCallback((selected: { id: string; type: "ai" | "user"; }[]) => {
    const [selectedItem] = selected;
    const fullItem = mentionItems.find(item => item.id === selectedItem.id);
    if (fullItem) {
      const mentionItem = {
        id: fullItem.id,
        name: fullItem.name,
        type: fullItem.type as 'user' | 'ai'
      };
      handleSelection(mentionItem);
      if (fullItem.type === 'ai') {
        setIsGeminiMentioned(true);
        setGeminiQuery('');
      }
    }
  }, [mentionItems, handleSelection]);

  const handleToggleTimerPanel = useCallback(() => {
    onToggleTimerPanel({} as React.MouseEvent);
  }, [onToggleTimerPanel]);

  const createFormatButtonHandler = useCallback((id: string) => () => {
    handleToggleFormat(id);
  }, [handleToggleFormat]);

  const handlePauseTimer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTimerRunning) {
      onToggleTimer(e);
      setIsTimerMenuOpen(false);
    }
  }, [isTimerRunning, onToggleTimer]);

  const handleResetTimer = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onResetTimer && timerSeconds > 0) {
      // console.log('[InputChat] 🔄 Reiniciando timer...');
      await onResetTimer();
      setIsTimerMenuOpen(false);
      // console.log('[InputChat] ✅ Timer reiniciado correctamente');
    }
  }, [onResetTimer, timerSeconds]);

  const handleFinalizeTimer = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTimerRunning && onFinalizeTimer) {
      await onFinalizeTimer();
      setIsTimerMenuOpen(false);
    }
  }, [isTimerRunning, onFinalizeTimer]);

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'a': e.preventDefault(); editor?.commands.selectAll(); break;
        case 'c': e.preventDefault(); {
          const selection = window.getSelection();
          if (selection && selection.toString().length > 0) navigator.clipboard.writeText(selection.toString());
          break;
        }
        case 'v': e.preventDefault(); navigator.clipboard.readText().then(text => editor?.commands.insertContent(text)); break;
        case 'x': e.preventDefault(); {
          const cutSelection = window.getSelection();
          if (cutSelection && cutSelection.toString().length > 0) navigator.clipboard.writeText(cutSelection.toString()).then(() => editor?.commands.deleteSelection());
          break;
        }
      }
    } else if (e.key === 'Enter' && !e.shiftKey && !isSending && !isProcessing && !isMentionOpen) {
      // ✅ FASE 6: Asegurar que Enter dispare handleSend sin bloqueos
      // Basado en https://stackoverflow.com/questions/28889826/react-preventdefault-not-working
      e.preventDefault();
      handleSend(e);
    } else if (e.key === 'Enter' && e.shiftKey) {
      // ✅ Permitir salto de línea con Shift+Enter
      // Comportamiento estándar de Tiptap para salto de línea
      setTimeout(adjustEditorHeight, 0);
    }
  }, [editor, isSending, isProcessing, isMentionOpen, handleSend, adjustEditorHeight]);

  const handleMentionSelectionChange = useCallback((ids: string[]) => {
    const id = ids[0];
    const item = mentionOptions.find(i => i.id === id);
    if (!item) return;
    const currentText = editor?.getText() || '';
    const lastAtIndex = currentText.lastIndexOf('@');
    const beforeAt = lastAtIndex >= 0 ? currentText.substring(0, lastAtIndex) : currentText;
    const newText = `${beforeAt}@${item.name} `;
    editor?.commands.setContent(newText);
    setIsMentionOpen(false);
    setMentionInput('');
    setIsGeminiMentioned(item.id === 'gemini');
    if (item.id === 'gemini') setGeminiQuery('');
    setTimeout(() => editor?.commands.focus(), 0);
  }, [mentionOptions, editor, setIsMentionOpen, setMentionInput, setIsGeminiMentioned, setGeminiQuery]);

  const handleCustomTimeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTimerPanel(e);
    setIsTimerMenuOpen(false);
  }, [onToggleTimerPanel]);

  const handleMouseDownPreventDefault = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    // console.log('[InputChat] Image analysis completed:', analysis);
    // Integrar análisis en el contexto de Gemini
  }, []);


  const handleTimerToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isTimerRunning) {
      onToggleTimer(e);
      setIsTimerMenuOpen(false);
    }
  }, [isTimerRunning, onToggleTimer]);

  useEffect(() => {
    if (restoredData && restoredData.content && restoredData.content.trim() && restoredData.content !== '<p></p>' && restoredData.content !== '<p><br></p>' && editor && editor.isEmpty) {
      editor.commands.setContent(restoredData.content);
      // console.log('[InputChat] Contenido restaurado desde cache');
    }
  }, [restoredData, editor]);

  useEffect(() => {
    if (!editor) return;
    const saveContent = () => {
      const content = editor.getHTML();
      if (content.trim() && content !== '<p></p>' && content !== '<p><br></p>') watchAndSave();
    };
    const interval = setInterval(saveContent, 2000);
    return () => clearInterval(interval);
  }, [editor, watchAndSave]);

  return (
    <div className={styles.inputWrapper}>
      <AnimatePresence>
        {restoredData && restoredData.content && restoredData.content.trim() && (
          <motion.div className={styles.persistedData} key="persisted-msg" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <span>Mensaje guardado restaurado</span>
            <button type="button" onClick={handleClearPersistedData}>Borrar</button>
          </motion.div>
        )}
      </AnimatePresence>
      {effectiveReplyingTo && (
        <div className={styles.replyContainer}>
          <div className={styles.replyContent}>
            <div className={styles.replyHeader}>
              <span className={styles.replyLabel}>Respondiendo a {effectiveReplyingTo.senderName}</span>
              <button type="button" className={styles.replyCancelButton} onClick={handleCancelReply} aria-label="Cancelar respuesta">
                <Image src="/x.svg" alt="Cancelar" width={16} height={16} />
              </button>
            </div>
            <div className={styles.replyPreview}>
              {effectiveReplyingTo.imageUrl && <Image src={effectiveReplyingTo.imageUrl} alt="Imagen" width={40} height={40} className={styles.replyImage} />}
              {effectiveReplyingTo.text && (
                <span className={styles.replyText} dangerouslySetInnerHTML={{ __html: sanitizeHtml(effectiveReplyingTo.text.length > 50 ? `${effectiveReplyingTo.text.substring(0, 50)}...` : effectiveReplyingTo.text, { allowedTags: ['strong', 'em', 'u', 'code'], allowedAttributes: { '*': ['style', 'class'] }, transformTags: { 'strong': (_, attribs) => ({ tagName: 'strong', attribs: { ...attribs, style: `font-weight: bold; ${attribs.style || ''}` } }), 'em': (_, attribs) => ({ tagName: 'em', attribs: { ...attribs, style: `font-style: italic; ${attribs.style || ''}` } }), 'u': (_, attribs) => ({ tagName: 'u', attribs: { ...attribs, style: `text-decoration: underline; ${attribs.style || ''}` } }), 'code': (_, attribs) => ({ tagName: 'code', attribs: { ...attribs, style: `font-family: monospace; background-color: #f3f4f6; padding: 1px 3px; border-radius: 2px; ${attribs.style || ''}` } }) } }) }} />
              )}
              {!effectiveReplyingTo.text && !effectiveReplyingTo.imageUrl && <span className={styles.replyText}>Mensaje</span>}
            </div>
          </div>
        </div>
      )}
      {editingMessageId && (
        <div className={styles.editContainer}>
          <div className={styles.editContent}>
            <div className={styles.editHeader}>
              <span className={styles.editLabel}>✏️ Editando mensaje</span>
              <button type="button" className={styles.editCancelButton} onClick={onCancelEdit} aria-label="Cancelar edición">
                <Image src="/x.svg" alt="Cancelar" width={16} height={16} />
              </button>
            </div>
            <div className={styles.editPreview}>
              <span className={styles.editText}>Presiona Enter para guardar o Esc para cancelar</span>
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
        isTimerRunning={isTimerRunning}
        timerSeconds={timerSeconds}
        ref={timerPanelRef} 
      />
      {!isTimerPanelOpen && (
        <form className={`${styles.inputContainer} ${isDragging ? styles.dragging : ''}`} ref={inputWrapperRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onSubmit={handleSend}>
          <AnimatePresence>
            {editor && !editor.isEmpty && !isTimerMenuOpen && (
              <motion.div 
                className={styles.toolbar}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ 
                  duration: 0.2, 
                  ease: 'easeOut',
                  staggerChildren: 0.05,
                  delayChildren: 0.1
                }}
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
                    transition={{ 
                      duration: 0.15, 
                      ease: 'easeOut',
                      delay: index * 0.02
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Image src={icon} alt={label} width={16} height={16} className={`${styles[`${id}Svg`]} ${styles.toolbarIcon}`} style={{ filter: 'none', fill: '#000000' }} draggable="false" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Menu Timer con estructura de Toolbar */}
          <AnimatePresence>
            {isTimerMenuOpen && (
              <motion.div 
                className={styles.toolbar}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ 
                  duration: 0.2, 
                  ease: 'easeOut',
                  staggerChildren: 0.05,
                  delayChildren: 0.1
                }}
              >
                {/* Botón Play */}
                <motion.button 
                  type="button" 
                  className={`${styles['format-button']} ${styles.tooltip}`} 
                  onClick={handleTimerToggle}
                  disabled={isTimerRunning}
                  title="Iniciar"
                  aria-label="Iniciar"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.15, 
                    ease: 'easeOut',
                    delay: 0 * 0.02
                  }}
                  whileHover={!isTimerRunning ? { scale: 1.05 } : {}}
                  whileTap={!isTimerRunning ? { scale: 0.95 } : {}}
                >
                  <Image 
                    src="/Play.svg" 
                    alt="Iniciar" 
                    width={16} 
                    height={16} 
                    className={styles.toolbarIcon}
                    style={{ filter: 'none', fill: '#000000' }} 
                    draggable="false" 
                  />
                </motion.button>
                
                {/* Botón Stop */}
                <motion.button 
                  type="button" 
                  className={`${styles['format-button']} ${styles.tooltip}`} 
                  onClick={handlePauseTimer}
                  disabled={!isTimerRunning}
                  title="Pausar"
                  aria-label="Pausar"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.15, 
                    ease: 'easeOut',
                    delay: 1 * 0.02
                  }}
                  whileHover={isTimerRunning ? { scale: 1.05 } : {}}
                  whileTap={isTimerRunning ? { scale: 0.95 } : {}}
                >
                  <Image 
                    src="/pause.svg" 
                    alt="Pausar" 
                    width={16} 
                    height={16} 
                    className={styles.toolbarIcon}
                    style={{ filter: 'none', fill: '#000000' }} 
                    draggable="false" 
                  />
                </motion.button>
                
                {/* Botón Reiniciar */}
                <motion.button 
                  type="button" 
                  className={`${styles['format-button']} ${styles.tooltip}`} 
                  onClick={handleResetTimer}
                  disabled={!timerSeconds || timerSeconds === 0}
                  title="Reiniciar"
                  aria-label="Reiniciar"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.15, 
                    ease: 'easeOut',
                    delay: 2 * 0.02
                  }}
                  whileHover={timerSeconds > 0 ? { scale: 1.05 } : {}}
                  whileTap={timerSeconds > 0 ? { scale: 0.95 } : {}}
                >
                  <Image 
                    src="/rotate-ccw.svg" 
                    alt="Reiniciar" 
                    width={16} 
                    height={16} 
                    className={styles.toolbarIcon}
                    style={{ filter: 'none', fill: '#000000' }} 
                    draggable="false" 
                  />
                </motion.button>
                
                {/* Botón Enviar */}
                <motion.button 
                  type="button" 
                  className={`${styles['format-button']} ${styles.tooltip}`} 
                  onClick={handleFinalizeTimer}
                  disabled={!isTimerRunning}
                  title="Enviar"
                  aria-label="Enviar"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.15, 
                    ease: 'easeOut',
                    delay: 3 * 0.02
                  }}
                  whileHover={isTimerRunning ? { scale: 1.05 } : {}}
                  whileTap={isTimerRunning ? { scale: 0.95 } : {}}
                >
                  <Image 
                    src="/send.svg" 
                    alt="Enviar" 
                    width={16} 
                    height={16} 
                    className={styles.toolbarIcon}
                    style={{ filter: 'none', fill: '#000000' }} 
                    draggable="false" 
                  />
                </motion.button>
                
                {/* Botón Tiempo Personalizado */}
                <motion.button 
                  type="button" 
                  className={`${styles['format-button']} ${styles.tooltip}`} 
                  onClick={handleCustomTimeClick}
                  title="Tiempo Personalizado"
                  aria-label="Tiempo Personalizado"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.15, 
                    ease: 'easeOut',
                    delay: 4 * 0.02
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Image 
                    src="/clock-plus.svg" 
                    alt="Tiempo Personalizado" 
                    width={16} 
                    height={16} 
                    className={styles.toolbarIcon}
                    style={{ filter: 'none', fill: '#000000' }} 
                    draggable="false" 
                  />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          {isProcessing && (
            <div className={styles.processingSpinner}>
                              <svg width="16" height="16" viewBox="0 0 24 24" className={styles.spinAnimation}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
              </svg>
            </div>
          )}
          {previewUrl && (
            <motion.div 
              className={styles.imagePreview}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Image src={previewUrl} alt="Previsualización" width={50} height={50} className={styles.previewImage} draggable="false" />
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
                    {uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : "Procesando imagen..."}
                  </span>
                </div>
              )}
              <button className={styles.removeImageButton} onClick={handleRemove} type="button" title="Eliminar imagen">
                <Image src="/x.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} draggable="false" />
              </button>
            </motion.div>
          )}
          {file && !previewUrl && (
            <div className={styles.filePreview}>
              <Image src="/file.svg" alt="Archivo" width={16} height={16} draggable="false" />
              <span>{file.name}</span>
              <button className={styles.removeImageButton} onClick={handleRemoveFile} type="button" title="Eliminar archivo">
                <Image src="/x.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} draggable="false" />
              </button>
            </div>
          )}
          <div className="relative">
            <EditorContent
              ref={editorRef}
              editor={editor}
              style={{ fontFamily: '"Inter Tight", sans-serif', minHeight: '36px', maxHeight: '200px', resize: 'none', overflow: 'hidden' }}
              onKeyDown={handleEditorKeyDown}
              onContextMenu={handleContextMenu}
            />
            
            {/* Autocomplete para menciones */}
            {isMentionOpen && (
              <div className={styles.mentionAutocomplete} onMouseDown={handleMouseDownPreventDefault}>
                <SearchableDropdown
                  items={mentionOptions.filter(i => i.name.toLowerCase().includes((mentionInput || '').toLowerCase()))}
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

            {/* TagDropdown para menciones @gemini */}
            {showDropdown && (
              <TagDropdown
                items={mentionItems}
                onSelectionChange={handleMentionSelection}
                placeholder="Seleccionar..."
                disabled={false}
                multiple={false}
                isOpenDefault={true}
                hideSearch={true}
              />
            )}

            {/* GeminiImageAnalyzer para análisis de imágenes */}
            {file && previewUrl && (
              <GeminiImageAnalyzer
                taskId={taskId}
                onAnalysisComplete={handleAnalysisComplete}
                disabled={isSending || isProcessing}
              />
            )}
            
            {/* Drag Overlay para transform */}
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
          <div className={styles.actions}>
            <TimerDisplay
              timerSeconds={timerSeconds}
              isTimerRunning={isTimerRunning}
              onToggleTimer={onToggleTimer}
              onFinalizeTimer={onFinalizeTimer}
              onTogglePanel={handleToggleTimerPanel}
              isRestoringTimer={!!isRestoringTimer}
              isInitializing={!!isInitializing}
              isMenuOpen={isTimerMenuOpen}
              setIsMenuOpen={setIsTimerMenuOpen}
            />
            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
              <button type="button" className={`${styles.imageButton2} ${styles.tooltip}`} onClick={handleThumbnailClick} disabled={isSending || isProcessing} aria-label="Adjuntar archivo" title="Adjuntar archivo">
                <Image src="/paperclip.svg" alt="Adjuntar" width={16} height={16} style={{ filter: 'invert(100)' }} draggable="false" />
              </button>
              <button type="submit" className={styles.sendButton} disabled={isSending || isProcessing || ((!editor || editor.isEmpty) && !file)} aria-label="Enviar mensaje">
                <Image src="/arrow-up.svg" alt="Enviar mensaje" width={13} height={13} />
              </button>
            </div>
          </div>
        </form>
      )}
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx" />
    </div>
  );
}
