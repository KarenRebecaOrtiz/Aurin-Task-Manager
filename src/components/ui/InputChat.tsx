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
import { saveErrorMessage, removeErrorMessage, PersistedMessage } from '@/lib/messagePersistence';
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
  onFinalizeTimer?: () => Promise<void>;
  onToggleTimerPanel: (e: React.MouseEvent) => void;
  isTimerPanelOpen: boolean;
  setIsTimerPanelOpen: (open: boolean) => void;
  containerRef: React.RefObject<HTMLElement>;
  timerPanelRef?: React.RefObject<HTMLDivElement>;
  totalHours: string;
  isRestoringTimer?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessageId?: string | null;
  editingText?: string;
  onEditMessage?: (messageId: string, newText: string) => Promise<void>;
  onCancelEdit?: () => void;
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
  editingMessageId,
  editingText,
  onEditMessage,
  onCancelEdit,
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
  const conversationId = `chat-sidebar-${taskId}`;

  const [internalReplyingTo, setInternalReplyingTo] = useState<Message | null>(null);
  const effectiveReplyingTo = typeof replyingTo !== 'undefined' ? replyingTo : internalReplyingTo;
  const setReplyingTo = typeof replyingTo !== 'undefined' && onCancelReply ? (msg: Message | null) => {
    if (!msg) onCancelReply();
  } : setInternalReplyingTo;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const editor = useEditor({
    extensions: [StarterKit.configure({ bulletList: { keepMarks: true, keepAttributes: true }, orderedList: { keepMarks: true, keepAttributes: true } }), Underline],
    content: '',
    immediatelyRender: false,
    onUpdate: () => adjustEditorHeight(),
    editable: !isSending && !isProcessing,
    editorProps: { attributes: { class: `${styles.input} ProseMirror`, 'aria-label': 'Escribir mensaje' } },
  }, [isClient]);

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

  const typeWriter = useCallback((text: string, callback: () => void) => {
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
  }, [editor, adjustEditorHeight]);

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
      if (isDropupOpen && !dropupRef.current?.contains(target)) setIsDropupOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimerPanelOpen, setIsTimerPanelOpen, timerPanelRef, isDropupOpen]);

  const handleToggleTimerPanel = useCallback((e: React.MouseEvent) => {
    if (isSending) return;
    e.stopPropagation();
    onToggleTimerPanel(e);
  }, [isSending, onToggleTimerPanel]);

  const handleCloseTimerPanel = useCallback(() => setIsTimerPanelOpen(false), [setIsTimerPanelOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (editor && editor.isEmpty) setHasReformulated(false);
  }, [editor]);

  useEffect(() => {
    if (editingMessageId && editingText && editor) {
      editor.commands.setContent(editingText);
      editor.commands.focus('end');
      adjustEditorHeight();
    } else if (!editingMessageId && editor) {
      editor.commands.clearContent();
    }
  }, [editingMessageId, editingText, editor, adjustEditorHeight]);

  const toggleFormat = useCallback((format: string) => {
    if (!editor) return;
    switch (format) {
      case 'bold': editor.chain().focus().toggleBold().run(); break;
      case 'italic': editor.chain().focus().toggleItalic().run(); break;
      case 'underline': editor.chain().focus().toggleUnderline().run(); break;
      case 'code': editor.chain().focus().toggleCode().run(); break;
      case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
      case 'numbered': editor.chain().focus().toggleOrderedList().run(); break;
    }
  }, [editor]);

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
    if (f && !f.name.includes('/paperclip.svg')) selectFile(f);
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const handleReformulate = async (mode: 'correct' | 'rewrite' | 'friendly' | 'professional' | 'concise' | 'summarize' | 'keypoints' | 'list') => {
    if (!userId || !editor || editor.isEmpty || isProcessing) return;
    setIsProcessing(true);
    setIsDropupOpen(false);
    try {
      if (!ai) throw new Error('🤖 El servicio de Gemini AI no está disponible en este momento.');
      const prompts = {
        correct: `Corrige todos los errores de ortografía, gramática, puntuación y sintaxis en el texto: "${editor.getText()}"`,
        rewrite: `Reescribe completamente el texto manteniendo el mismo significado: "${editor.getText()}"`,
        friendly: `Transforma el texto a un tono más amigable: "${editor.getText()}"`,
        professional: `Convierte el texto en una versión más profesional: "${editor.getText()}"`,
        concise: `Haz el texto más conciso: "${editor.getText()}"`,
        summarize: `Resume el texto en sus puntos más importantes: "${editor.getText()}"`,
        keypoints: `Extrae los puntos clave del texto como lista: "${editor.getText()}"`,
        list: `Convierte el texto en una lista organizada: "${editor.getText()}"`,
      };
      const generationConfig = { maxOutputTokens: 800, temperature: mode === 'rewrite' ? 0.8 : 0.6, topK: 40, topP: 0.9 };
      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];
      const systemInstruction = `Eres un asistente de escritura experto. Responde únicamente con el texto procesado.`;
      const model = getGenerativeModel(ai, { model: 'gemini-1.5-flash', generationConfig, safetySettings, systemInstruction });
      const promptText = prompts[mode];
      const result = await model.generateContent(promptText);
      const reformulatedText = await result.response.text();
      if (!reformulatedText.trim()) throw new Error('📝 Gemini devolvió una respuesta vacía.');
      typeWriter(reformulatedText.trim(), () => editor.commands.focus());
      setHasReformulated(true);
    } catch (error) {
      console.error('[InputChat:Reformulate] Error:', error);
      toast({ title: 'Error al procesar el texto con Gemini AI', description: '❌ Error al procesar el texto.', variant: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const hasText = editor && !editor.isEmpty;
    const hasFile = file !== null;
    if (!userId || (!hasText && !hasFile) || isSending || isProcessing) return;

    if (editingMessageId && onEditMessage) {
      const newText = editor.getHTML();
      if (!newText.trim()) {
        toast({ title: 'Mensaje vacío', description: 'El mensaje no puede estar vacío.', variant: 'error' });
        return;
      }
      try {
        setIsSending(true);
        await onEditMessage(editingMessageId, newText);
        editor?.commands.clearContent();
        setFile(null);
        setPreviewUrl(null);
        setHasReformulated(false);
        adjustEditorHeight();
        removeErrorMessage(conversationId);
        clearPersistedData();
        if (onCancelReply) onCancelReply();
        if (onCancelEdit) onCancelEdit();
      } catch (error) {
        console.error('[InputChat:HandleEdit] Error:', error);
        toast({ title: 'Error al editar', description: 'Error al editar el mensaje.', variant: 'error' });
      } finally {
        setIsSending(false);
      }
      return;
    }

    setHasReformulated(false);
    setIsDropupOpen(false);
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

      await onSendMessage(finalMessageData);
      editor?.commands.clearContent();
      setFile(null);
      setPreviewUrl(null);
      setHasReformulated(false);
      adjustEditorHeight();
      removeErrorMessage(conversationId);
      clearPersistedData();
      if (onCancelReply) onCancelReply();
    } catch (error) {
      console.error('[InputChat:HandleSend] Error:', error);
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
  };

  const formatButtons = [
    { id: 'bold', icon: '/input/bold.svg', label: 'Negrita', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: '/input/italic.svg', label: 'Cursiva', shortcut: 'Ctrl+I' },
    { id: 'underline', icon: '/input/underline.svg', label: 'Subrayado', shortcut: 'Ctrl+U' },
    { id: 'code', icon: '/input/square-code.svg', label: 'Código', shortcut: 'Ctrl+`' },
    { id: 'bullet', icon: '/list-bullets.svg', label: 'Lista con viñetas', shortcut: 'Ctrl+Shift+8' },
    { id: 'numbered', icon: '/list-ordered.svg', label: 'Lista numerada', shortcut: 'Ctrl+Shift+7' },
  ];

  const { watchAndSave, clearPersistedData, restoredData } = useEditorPersistence(editor, `draft_${conversationId}`, true);

  useEffect(() => {
    if (restoredData && restoredData.content && restoredData.content.trim() && restoredData.content !== '<p></p>' && restoredData.content !== '<p><br></p>' && editor && editor.isEmpty) {
      editor.commands.setContent(restoredData.content);
      console.log('[InputChat] Contenido restaurado desde cache');
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
            <button type="button" onClick={() => { clearPersistedData(); editor?.commands.clearContent(); }}>Borrar</button>
          </motion.div>
        )}
      </AnimatePresence>
      {effectiveReplyingTo && (
        <div className={styles.replyContainer}>
          <div className={styles.replyContent}>
            <div className={styles.replyHeader}>
              <span className={styles.replyLabel}>Respondiendo a {effectiveReplyingTo.senderName}</span>
              <button type="button" className={styles.replyCancelButton} onClick={() => setReplyingTo(null)} aria-label="Cancelar respuesta">
                <Image src="/x.svg" alt="Cancelar" width={16} height={16} />
              </button>
            </div>
            <div className={styles.replyPreview}>
              {effectiveReplyingTo.imageUrl && <Image src={effectiveReplyingTo.imageUrl} alt="Imagen" width={40} height={40} className={styles.replyImage} draggable="false" onError={(e) => { e.currentTarget.src = '/empty-image.png'; }} />}
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
      <TimerPanel isOpen={isTimerPanelOpen} timerInput={timerInput} setTimerInput={setTimerInput} dateInput={dateInput} setDateInput={setDateInput} commentInput={commentInput} setCommentInput={setCommentInput} totalHours={totalHours} onAddTimeEntry={onAddTimeEntry} onCancel={handleCloseTimerPanel} ref={timerPanelRef} />
      {!isTimerPanelOpen && (
        <form className={`${styles.inputContainer} ${isDragging ? styles.dragging : ''}`} ref={inputWrapperRef} onDragOver={handleDragOver} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onSubmit={handleSend}>
          <div className={styles.toolbar}>
            {formatButtons.map(({ id, icon, label, shortcut }) => (
              <button key={id} type="button" className={`${styles['format-button']} ${styles.tooltip}`} data-active={editor?.isActive(id) ? 'true' : 'false'} onClick={() => toggleFormat(id)} disabled={isSending || isProcessing} title={`${label} (${shortcut})`} aria-label={label}>
                <Image src={icon} alt={label} width={16} height={16} className={`${styles[`${id}Svg`]} ${styles.toolbarIcon}`} style={{ filter: 'none', fill: '#000000' }} draggable="false" />
              </button>
            ))}
          </div>
          {isProcessing && (
            <div className={styles.processingSpinner}>
              <svg width="16" height="16" viewBox="0 0 24 24" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
              </svg>
            </div>
          )}
          {previewUrl && (
            <div className={styles.imagePreview}>
              <Image src={previewUrl} alt="Previsualización" width={50} height={50} className={styles.previewImage} draggable="false" />
              <button className={styles.removeImageButton} onClick={handleRemoveFile} type="button" title="Eliminar imagen">
                <Image src="/x.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} draggable="false" />
              </button>
            </div>
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
              onKeyDown={(e) => {
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
                } else if (e.key === 'Enter' && !e.shiftKey && !isSending && !isProcessing) {
                  e.preventDefault();
                  handleSend(e);
                } else if (e.key === 'Enter') setTimeout(adjustEditorHeight, 0);
              }}
              onContextMenu={handleContextMenu}
            />
          </div>
          <div className={styles.actions}>
            <div className={styles.timerContainer} style={{ width: '100%' }}>
              <button 
                className={styles.playStopButton} 
                onClick={onToggleTimer} 
                onDoubleClick={async () => {
                  if (timerSeconds > 0 && onFinalizeTimer) {
                    await onFinalizeTimer();
                  }
                }}
                disabled={isProcessing} 
                type="button" 
                aria-label={isTimerRunning ? 'Detener temporizador (doble click para enviar tiempo)' : 'Iniciar temporizador'} 
                title={isTimerRunning ? 'Click: Pausar | Doble click: Enviar tiempo' : 'Iniciar temporizador'}
              >
                <Image src={isTimerRunning ? '/Stop.svg' : '/Play.svg'} alt={isTimerRunning ? 'Detener' : 'Iniciar'} width={12} height={12} draggable="false" />
              </button>
              <div className={styles.timer} onClick={handleToggleTimerPanel} title="Abrir/cerrar panel de temporizador">
                <NumberFlowGroup>
                  <div className={styles.timerNumbers}>
                    <NumberFlow trend={-1} value={Math.floor(timerSeconds / 3600)} format={{ minimumIntegerDigits: 2 }} />
                    <NumberFlow prefix=":" trend={-1} value={Math.floor((timerSeconds % 3600) / 60)} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
                    <NumberFlow prefix=":" trend={-1} value={timerSeconds % 60} digits={{ 1: { max: 5 } }} format={{ minimumIntegerDigits: 2 }} />
                  </div>
                </NumberFlowGroup>
                {isRestoringTimer && <div className={styles.restoreIndicator}>↻</div>}
                <Image src="/chevron-down.svg" alt="Abrir panel" width={12} height={12} draggable="false" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
              <div className={styles.dropupContainer} ref={dropupRef}>
                <button type="button" className={`${styles.imageButton} ${styles.tooltip} ${styles.reformulateButton} ${hasReformulated ? styles.reformulated : ''} ${isProcessing ? 'processing' : ''}`} onClick={() => setIsDropupOpen(prev => !prev)} disabled={isSending || isProcessing || !editor || editor.isEmpty} aria-label="Reformular texto con Gemini AI" title="Reformular texto con Gemini AI ✨" aria-expanded={isDropupOpen}>
                  <Image src="/gemini.svg" alt="Gemini AI" width={16} height={16} draggable="false" />
                </button>
                {isDropupOpen && (
                  <div className={styles.dropupMenu} role="menu">
                    <button type="button" className={styles.dropupItem} onClick={() => handleReformulate('correct')} disabled={isProcessing} role="menuitem" title="Corregir ortografía y gramática">✏️ Corregir</button>
                    <button type="button" className={styles.dropupItem} onClick={() => handleReformulate('rewrite')} disabled={isProcessing} role="menuitem" title="Reescribir">🔄 Re-escribir</button>
                    <button type="button" className={styles.dropupItem} onClick={() => handleReformulate('friendly')} disabled={isProcessing} role="menuitem" title="Hacer amigable">😊 Hacer amigable</button>
                    <button type="button" className={styles.dropupItem} onClick={() => handleReformulate('professional')} disabled={isProcessing} role="menuitem" title="Hacer profesional">💼 Hacer profesional</button>
                    <button type="button" className={styles.dropupItem} onClick={() => handleReformulate('concise')} disabled={isProcessing} role="menuitem" title="Hacer conciso">⚡ Hacer conciso</button>
                    <button type="button" className={styles.dropupItem} onClick={() => handleReformulate('summarize')} disabled={isProcessing} role="menuitem" title="Resumir">📝 Resumir</button>
                    <button type="button" className={styles.dropupItem} onClick={() => handleReformulate('keypoints')} disabled={isProcessing} role="menuitem" title="Puntos clave">🎯 Puntos clave</button>
                    <button type="button" className={styles.dropupItem} onClick={() => handleReformulate('list')} disabled={isProcessing} role="menuitem" title="Convertir en lista">📋 Convertir en lista</button>
                  </div>
                )}
              </div>
              <button type="button" className={`${styles.imageButton} ${styles.tooltip}`} onClick={() => fileInputRef.current?.click()} disabled={isSending || isProcessing} aria-label="Adjuntar archivo" title="Adjuntar archivo">
                <Image src="/paperclip.svg" alt="Adjuntar" width={16} height={16} style={{ filter: 'invert(100)' }} draggable="false" />
              </button>
              <EmojiSelector onEmojiSelect={(emoji) => { editor?.commands.insertContent(emoji); setTimeout(adjustEditorHeight, 0); }} disabled={isSending || isProcessing} value={editor?.getText().match(/[\p{Emoji}\p{Emoji_Component}]+$/u)?.[0] || ''} containerRef={containerRef} />
              <button type="submit" className={styles.sendButton} disabled={isSending || isProcessing || ((!editor || editor.isEmpty) && !file)} aria-label="Enviar mensaje">
                <Image src="/arrow-up.svg" alt="Enviar mensaje" width={13} height={13} />
              </button>
            </div>
          </div>
        </form>
      )}
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }} accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx" />
    </div>
  );
}