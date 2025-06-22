'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { getGenerativeModel, HarmCategory, HarmBlockThreshold } from '@firebase/ai';
import { ai } from '@/lib/firebase';
import styles from '../ChatSidebar.module.scss';
import { EmojiSelector } from './EmojiSelector';

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
  clientId: string; // Add this property
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
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>; // Add this
  timerSeconds: number;
  isTimerRunning: boolean;
  onToggleTimer: (e: React.MouseEvent) => void;
  onToggleTimerPanel: (e: React.MouseEvent) => void;
  isTimerPanelOpen: boolean;
  setIsTimerPanelOpen: (open: boolean) => void;
  containerRef: React.RefObject<HTMLElement>;
  timerPanelRef?: React.RefObject<HTMLDivElement>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function InputChat({
  taskId,
  userId,
  userFirstName,
  onSendMessage,
  isSending,
  setIsSending, // Add this prop
  timerSeconds,
  isTimerRunning,
  onToggleTimer,
  onToggleTimerPanel,
  isTimerPanelOpen,
  setIsTimerPanelOpen,
  containerRef,
  timerPanelRef,
}: InputChatProps) {
  const [message, setMessage] = useState('');
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasReformulated, setHasReformulated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLFormElement>(null);
  const dropupRef = useRef<HTMLDivElement>(null);

  // Auto-resize para el textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200;
      const minHeight = 36;
      textareaRef.current.style.height = `${Math.max(Math.min(scrollHeight, maxHeight), minHeight)}px`;
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, []);

  // Función para animación de typewriter mejorada
  const typeWriter = useCallback((text: string, callback: (newText: string) => void) => {
    let index = 0;
    let currentText = '';
    const speed = 15; // Más rápido para mejor UX
    
    // Limpiar el textarea primero
    callback('');
    
    const type = () => {
      if (index < text.length) {
        currentText += text.charAt(index);
        callback(currentText);
        index++;
        setTimeout(type, speed);
      } else {
        // Trigger auto-resize al final
        setTimeout(() => {
          if (textareaRef.current) {
            adjustTextareaHeight();
          }
        }, 100);
      }
    };
    
    // Pequeño delay antes de empezar para dar sensación de "pensando"
    setTimeout(type, 300);
  }, [adjustTextareaHeight]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(event.target as Node) &&
        (!timerPanelRef?.current || !timerPanelRef.current.contains(event.target as Node)) &&
        isTimerPanelOpen
      ) {
        setIsTimerPanelOpen(false);
      }
      if (
        dropupRef.current &&
        !dropupRef.current.contains(event.target as Node) &&
        isDropupOpen
      ) {
        setIsDropupOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimerPanelOpen, setIsTimerPanelOpen, timerPanelRef, isDropupOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset hasReformulated cuando se borra el mensaje
  useEffect(() => {
    if (!message.trim()) {
      setHasReformulated(false);
    }
  }, [message]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const toggleFormat = useCallback((format: string) => {
    setActiveFormats((prev) => {
      const newFormats = new Set(prev);
      if (newFormats.has(format)) {
        newFormats.delete(format);
      } else {
        newFormats.add(format);
      }
      return newFormats;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        switch (e.key.toLowerCase()) {
          case 'b':
            toggleFormat('bold');
            break;
          case 'i':
            toggleFormat('italic');
            break;
          case 'u':
            toggleFormat('underline');
            break;
          case '`':
            toggleFormat('code');
            break;
          case 'a':
            if (textareaRef.current) {
              textareaRef.current.select();
            }
            break;
          case 'c':
            if (textareaRef.current) {
              const selectedText = textareaRef.current.value.substring(
                textareaRef.current.selectionStart,
                textareaRef.current.selectionEnd,
              );
              if (selectedText) {
                navigator.clipboard.writeText(selectedText);
              }
            }
            break;
          case 'v':
            navigator.clipboard.readText().then((text) => {
              setMessage((prev) => prev + text);
              setTimeout(adjustTextareaHeight, 0);
            });
            break;
          case 'x':
            if (textareaRef.current) {
              const selectedText = textareaRef.current.value.substring(
                textareaRef.current.selectionStart,
                textareaRef.current.selectionEnd,
              );
              if (selectedText) {
                navigator.clipboard.writeText(selectedText);
                const start = textareaRef.current.selectionStart;
                const end = textareaRef.current.selectionEnd;
                setMessage((prev) => prev.slice(0, start) + prev.slice(end));
                setTimeout(adjustTextareaHeight, 0);
              }
            }
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
    [toggleFormat, adjustTextareaHeight],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const applyFormatting = (text: string) => {
    let formattedText = text;
    if (activeFormats.has('bullet')) {
      formattedText = formattedText
        .split('\n')
        .map((line) => (line.trim() ? `- ${line}` : line))
        .join('\n');
    }
    if (activeFormats.has('numbered')) {
      formattedText = formattedText
        .split('\n')
        .map((line, index) => (line.trim() ? `${index + 1}. ${line}` : line))
        .join('\n');
    }
    if (activeFormats.has('bold')) formattedText = `**${formattedText}**`;
    if (activeFormats.has('italic')) formattedText = `*${formattedText}*`;
    if (activeFormats.has('underline')) formattedText = `__${formattedText}__`;
    if (activeFormats.has('code')) formattedText = `\`${formattedText}\``;
    return formattedText;
  };

  const getDisplayText = () => {
    if (!message) return '';
    let displayText = message;
    if (activeFormats.has('bullet')) {
      displayText = displayText
        .split('\n')
        .map((line) => (line.trim() ? `• ${line}` : line))
        .join('\n');
    }
    if (activeFormats.has('numbered')) {
      displayText = displayText
        .split('\n')
        .map((line, index) => (line.trim() ? `${index + 1}. ${line}` : line))
        .join('\n');
    }
    return displayText;
  };

  const getTextStyle = () => {
    const styles: React.CSSProperties = {};
    if (activeFormats.has('bold')) styles.fontWeight = 'bold';
    if (activeFormats.has('italic')) styles.fontStyle = 'italic';
    if (activeFormats.has('underline')) styles.textDecoration = 'underline';
    if (activeFormats.has('code')) {
      styles.fontFamily = 'monospace';
      styles.backgroundColor = '#f3f4f6';
      styles.padding = '2px 4px';
      styles.borderRadius = '4px';
    }
    return styles;
  };

  const selectFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      alert('El archivo supera los 10 MB.');
      return;
    }
    const fileExtension = f.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      alert(`Extensión no permitida. Permitidas: ${validExtensions.join(', ')}`);
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f && !f.name.includes('/paperclip.svg')) {
        selectFile(f);
      }
      if (e.target) e.target.value = '';
    },
    [],
  );

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

  const handleReformulate = async (mode: 'correct' | 'rewrite' | 'friendly' | 'professional' | 'concise' | 'summarize' | 'keypoints' | 'list') => {
    if (!userId || !message.trim() || isProcessing) return;

    setIsProcessing(true);
    setIsDropupOpen(false);
    
    try {
      // Verificar que AI esté disponible
      if (!ai) {
        throw new Error('🤖 El servicio de Gemini AI no está disponible en este momento. Verifica tu conexión a internet y que Firebase esté configurado correctamente.');
      }

      // Prompts específicos para cada función
      const prompts = {
        correct: `Actúa como un corrector ortográfico y gramatical experto. Corrige todos los errores de ortografía, gramática, puntuación y sintaxis en el siguiente texto, manteniendo exactamente el mismo tono y significado original. Solo devuelve el texto corregido sin explicaciones: "${message}"`,
        
        rewrite: `Reescribe completamente el siguiente texto manteniendo exactamente el mismo significado, pero usando diferentes palabras, estructuras y expresiones. Hazlo fluido y natural, como si fuera escrito por otra persona. Solo devuelve el texto reescrito: "${message}"`,
        
        friendly: `Transforma el siguiente texto para que tenga un tono más amigable, cálido y cercano. Usa un lenguaje más informal, empático y positivo, manteniendo el mensaje principal. Solo devuelve el texto transformado: "${message}"`,
        
        professional: `Convierte el siguiente texto en una versión más profesional y formal. Usa un lenguaje empresarial apropiado, estructurado y respetuoso, manteniendo la información principal. Solo devuelve el texto profesional: "${message}"`,
        
        concise: `Haz el siguiente texto más conciso y directo, eliminando palabras innecesarias y redundancias. Mantén toda la información importante pero de forma más breve y clara. Solo devuelve el texto conciso: "${message}"`,
        
        summarize: `Resume el siguiente texto en sus puntos más importantes, manteniendo solo la información esencial. Hazlo significativamente más corto pero completo. Solo devuelve el resumen: "${message}"`,
        
        keypoints: `Extrae los puntos clave más importantes del siguiente texto y preséntalos como una lista clara y organizada. Mantén solo lo esencial. Solo devuelve los puntos clave: "${message}"`,
        
        list: `Convierte el siguiente texto en una lista organizada con viñetas o numeración, estructurando la información de manera clara y fácil de leer. Solo devuelve la lista: "${message}"`
      };

      const generationConfig = {
        maxOutputTokens: 800,
        temperature: mode === 'rewrite' ? 0.8 : 0.6,
        topK: 40,
        topP: 0.9,
      };

      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ];

      const systemInstruction = `Eres un asistente de escritura experto. Siempre respondes únicamente con el texto procesado, sin explicaciones, introducciones, comentarios adicionales o texto extra. Tu respuesta debe contener solamente el texto solicitado, nada más.`;

      console.log(`[InputChat:Reformulate] Iniciando ${mode} con Gemini...`, '[Debug Code: REFORM-001]');
      
      const model = getGenerativeModel(ai, {
        model: 'gemini-1.5-flash',
        generationConfig,
        safetySettings,
        systemInstruction,
      });

      console.log('[InputChat:Reformulate] Enviando texto a Gemini:', message, '[Debug Code: REFORM-002]');
      
      const promptText = prompts[mode];
      const result = await model.generateContent(promptText);
      
      console.log('[InputChat:Reformulate] Respuesta cruda de Gemini:', result, '[Debug Code: REFORM-003]');

      if (!result || !result.response) {
        throw new Error('🚫 No se recibió respuesta del servidor de Gemini. El servicio podría estar temporalmente no disponible.');
      }

      let reformulatedText: string;
      try {
        reformulatedText = await result.response.text();
      } catch (textError) {
        console.error('[InputChat:Reformulate] Error al extraer texto:', textError);
        throw new Error('⚠️ Error al procesar la respuesta de Gemini. La respuesta del servidor no pudo ser interpretada correctamente.');
      }

      if (!reformulatedText || reformulatedText.trim().length === 0) {
        throw new Error('📝 Gemini devolvió una respuesta vacía. Intenta con un texto diferente o inténtalo de nuevo en unos momentos.');
      }

      console.log('[InputChat:Reformulate] Texto reformulado recibido:', reformulatedText, '[Debug Code: REFORM-004]');
      
      // ✨ MAGIA TYPEWRITER ✨
      typeWriter(reformulatedText.trim(), (typedText) => {
        setMessage(typedText);
      });
      
      setHasReformulated(true);
      
      // Enfocar el textarea después de la reformulación
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      
    } catch (error) {
      console.error('[InputChat:Reformulate] Error completo:', error, '[Error Code: API-004]');
      
      let errorMessage = '❌ Error inesperado al procesar el texto con Gemini AI.';
      let errorDetails = '';
      
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          errorMessage = '🔒 Acceso denegado a Gemini AI';
          errorDetails = 'No tienes los permisos necesarios para usar esta funcionalidad. Contacta al administrador del sistema.';
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          errorMessage = '📊 Límite de uso excedido';
          errorDetails = 'Se ha alcanzado el límite de consultas a Gemini AI por hoy. Inténtalo de nuevo mañana o contacta al administrador.';
        } else if (error.message.includes('INVALID_ARGUMENT')) {
          errorMessage = '📏 Texto no válido';
          errorDetails = 'El texto es demasiado largo o contiene caracteres especiales no permitidos. Intenta con un texto más corto.';
        } else if (error.message.includes('not available') || error.message.includes('🤖')) {
          errorMessage = '🌐 Servicio no disponible';
          errorDetails = 'Gemini AI está temporalmente no disponible. Verifica tu conexión a internet e inténtalo de nuevo.';
        } else {
          errorDetails = error.message;
        }
      }
      
      // Mostrar error como alerta
      alert(`${errorMessage}\n\n${errorDetails}`);
      
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!userId || (!message.trim() && !file) || isSending || isProcessing) {
      return;
    }
  
    setHasReformulated(false);
    setIsDropupOpen(false);
    setIsSending(true); // Prevent multiple sends
  
    const clientId = crypto.randomUUID();
    const tempId = `temp-${clientId}`;
    const messageData: Partial<Message> = {
      id: tempId,
      senderId: userId,
      senderName: userFirstName || 'Usuario',
      text: message.trim() ? applyFormatting(message.trim()) : null,
      read: false,
      imageUrl: file && file.type.startsWith('image/') ? previewUrl : null, // Use local preview URL
      fileUrl: null,
      fileName: file ? file.name : null,
      fileType: file ? file.type : null,
      filePath: null,
      isPending: true,
      hasError: false,
      clientId,
    };
  
    // Optimistically send the message with the preview
    await onSendMessage(messageData);
  
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);
        formData.append('type', 'message');
        formData.append('conversationId', taskId);
  
        console.log('[InputChat:HandleSend] Enviando archivo:', { fileName: file.name, fileType: file.type }, '[Debug Code: UPLOAD-001]');
  
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: { 'x-clerk-user-id': userId },
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[InputChat:HandleSend] Upload failed with status:', response.status, errorData, '[Error Code: UPLOAD-002]');
          throw new Error(errorData.error || 'Failed to upload file');
        }
  
        const { url, fileName, fileType, filePath } = await response.json();
        console.log('[InputChat:HandleSend] Subida exitosa:', { url, fileName, fileType }, '[Debug Code: UPLOAD-003]');
  
        // Update the message with the real URL and details
        const updatedMessage: Partial<Message> = {
          ...messageData,
          imageUrl: file.type.startsWith('image/') && url ? url : null,
          fileUrl: url && !file.type.startsWith('image/') ? url : null,
          fileName,
          fileType,
          filePath,
          isPending: false,
        };
  
        await onSendMessage(updatedMessage); // Update the message
      } catch (error) {
        console.error('[InputChat:HandleSend] File upload failed:', error, '[Error Code: UPLOAD-004]');
        // Mark the message as failed
        await onSendMessage({ ...messageData, isPending: false, hasError: true });
        alert('Error al subir el archivo.');
      }
    } else {
      // For text-only messages, mark as not pending
      await onSendMessage({ ...messageData, isPending: false });
    }
  
    // Clean up
    setMessage('');
    setFile(null);
    setPreviewUrl(null);
    setActiveFormats(new Set());
    setHasReformulated(false);
    adjustTextareaHeight();
    setIsSending(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatButtons = [
    { id: 'bold', icon: '/input/bold.svg', label: 'Negrita', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: '/input/italic.svg', label: 'Cursiva', shortcut: 'Ctrl+I' },
    { id: 'underline', icon: '/input/underline.svg', label: 'Subrayado', shortcut: 'Ctrl+U' },
    { id: 'code', icon: '/input/square-code.svg', label: 'Código', shortcut: 'Ctrl+`' },
    { id: 'bullet', icon: '/list-bullets.svg', label: 'Lista con viñetas', shortcut: 'Ctrl+Shift+8' },
    { id: 'numbered', icon: '/list-ordered.svg', label: 'Lista numerada', shortcut: 'Ctrl+Shift+7' },
  ];

  return (
    <form
      className={`${styles.inputWrapper} ${isDragging ? styles.dragging : ''}`}
      ref={inputWrapperRef}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onSubmit={handleSend}
    >
      <div className={styles.inputContainer}>
        <div className={styles.toolbar}>
          {formatButtons.map(({ id, icon, label, shortcut }) => (
            <button
              key={id}
              type="button"
              className={`${styles['format-button']} ${styles.tooltip}`}
              data-active={activeFormats.has(id) ? 'true' : 'false'}
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
            <Image src={previewUrl} alt="Previsualización" width={50} height={50} className={styles.previewImage} />
            <button className={styles.removeImageButton} onClick={handleRemoveFile} type="button">
              <Image src="/x.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} />
            </button>
          </div>
        )}
        {file && !previewUrl && (
          <div className={styles.filePreview}>
            <Image src="/file.svg" alt="Archivo" width={16} height={16} />
            <span>{file.name}</span>
            <button className={styles.removeImageButton} onClick={handleRemoveFile} type="button">
              <Image src="/x.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} />
            </button>
          </div>
        )}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={getDisplayText()}
            onChange={(e) => {
              let cleanValue = e.target.value;
              if (activeFormats.has('bullet')) {
                cleanValue = cleanValue
                  .split('\n')
                  .map((line) => line.replace(/^• /, ''))
                  .join('\n');
              }
              if (activeFormats.has('numbered')) {
                cleanValue = cleanValue
                  .split('\n')
                  .map((line) => line.replace(/^\d+\. /, ''))
                  .join('\n');
              }
              setMessage(cleanValue);
              setTimeout(adjustTextareaHeight, 0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSending && !isProcessing) {
                e.preventDefault();
                handleSend(e);
              } else if (e.key === 'Enter') {
                setTimeout(adjustTextareaHeight, 0);
              }
            }}
            onInput={adjustTextareaHeight}
            placeholder="Escribe tu mensaje aquí..."
            disabled={isSending || isProcessing}
            style={{
              ...getTextStyle(),
              fontFamily: '"Inter Tight", sans-serif',
              minHeight: '36px',
              maxHeight: '200px',
              resize: 'none',
              overflow: 'hidden',
            }}
            className={`${styles.input} resize-none`}
            rows={1}
            aria-label="Escribir mensaje"
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
            >
              <Image
                src={isTimerRunning ? '/Stop.svg' : '/Play.svg'}
                alt={isTimerRunning ? 'Detener temporizador' : 'Iniciar temporizador'}
                width={12}
                height={12}
              />
            </button>
            <div className={styles.timer} onClick={onToggleTimerPanel}>
              <span>{formatTime(timerSeconds)}</span>
              <Image src="/chevron-down.svg" alt="Abrir panel de temporizador" width={12} height={12} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
            <div className={styles.dropupContainer} ref={dropupRef}>
              <button
                type="button"
                className={`${styles.imageButton} ${styles.tooltip} ${styles.reformulateButton} ${hasReformulated ? styles.reformulated : ''} ${isProcessing ? 'processing' : ''}`}
                onClick={() => setIsDropupOpen((prev) => !prev)}
                disabled={isSending || isProcessing || !message.trim()}
                aria-label="Reformular texto con Gemini AI"
                title="Reformular texto con Gemini AI ✨"
                aria-expanded={isDropupOpen}
              >
                <Image
                  src="/gemini.svg"
                  alt="Gemini AI"
                  width={16}
                  height={16}
                />
              </button>
              {isDropupOpen && (
                <div className={styles.dropupMenu} role="menu">
                  <button
                    type="button"
                    className={styles.dropupItem}
                    onClick={() => handleReformulate('correct')}
                    disabled={isProcessing}
                    role="menuitem"
                  >
                    ✏️ Corregir
                  </button>
                  <button
                    type="button"
                    className={styles.dropupItem}
                    onClick={() => handleReformulate('rewrite')}
                    disabled={isProcessing}
                    role="menuitem"
                  >
                    🔄 Re-escribir
                  </button>
                  <button
                    type="button"
                    className={styles.dropupItem}
                    onClick={() => handleReformulate('friendly')}
                    disabled={isProcessing}
                    role="menuitem"
                  >
                    😊 Hacer amigable
                  </button>
                  <button
                    type="button"
                    className={styles.dropupItem}
                    onClick={() => handleReformulate('professional')}
                    disabled={isProcessing}
                    role="menuitem"
                  >
                    💼 Hacer profesional
                  </button>
                  <button
                    type="button"
                    className={styles.dropupItem}
                    onClick={() => handleReformulate('concise')}
                    disabled={isProcessing}
                    role="menuitem"
                  >
                    ⚡ Hacer conciso
                  </button>
                  <button
                    type="button"
                    className={styles.dropupItem}
                    onClick={() => handleReformulate('summarize')}
                    disabled={isProcessing}
                    role="menuitem"
                  >
                    📝 Resumir
                  </button>
                  <button
                    type="button"
                    className={styles.dropupItem}
                    onClick={() => handleReformulate('keypoints')}
                    disabled={isProcessing}
                    role="menuitem"
                  >
                    🎯 Puntos clave
                  </button>
                  <button
                    type="button"
                    className={styles.dropupItem}
                    onClick={() => handleReformulate('list')}
                    disabled={isProcessing}
                    role="menuitem"
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
              />
            </button>
            <EmojiSelector
              onEmojiSelect={(emoji) => {
                setMessage((prev) => prev + emoji);
                setTimeout(adjustTextareaHeight, 0);
              }}
              disabled={isSending || isProcessing}
              value={message.match(/[\p{Emoji}\p{Emoji_Component}]+$/u)?.[0] || ''}
              containerRef={containerRef}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={isSending || isProcessing || (!message.trim() && !file)}
              aria-label="Enviar mensaje"
            >
              <Image src="/arrow-up.svg" alt="Enviar mensaje" width={13} height={13} />
            </button>
          </div>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        hidden
        onChange={handleFileInputChange}
        aria-label="Seleccionar archivo"
        disabled={isSending || isProcessing}
        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
      />
    </form>
  );
}