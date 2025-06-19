'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
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
}

interface InputChatProps {
  taskId: string;
  timerInput: string; 
  setTimerInput: (value: string) => void; 
  dateInput: Date;  // Add this line
  setDateInput: (date: Date) => void;  // Add this line
  commentInput: string;  // Add this line
  setCommentInput: (value: string) => void;  // Add this line
  onAddTimeEntry: () => Promise<void>;  // Add this line
  userId: string | undefined;
  userFirstName: string | undefined;
  onSendMessage: (
    message: Partial<Message>,
    isAudio?: boolean,
    audioUrl?: string,
    duration?: number,
  ) => Promise<void>;
  isSending: boolean;
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

export function InputChat({
  taskId,
  userId,
  userFirstName,
  onSendMessage,
  isSending,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLFormElement>(null);

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimerPanelOpen, setIsTimerPanelOpen, timerPanelRef]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      switch (e.key) {
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
  }, [toggleFormat]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const applyFormatting = (text: string) => {
    let formattedText = text;
    if (activeFormats.has('bold')) formattedText = `**${formattedText}**`;
    if (activeFormats.has('italic')) formattedText = `*${formattedText}*`;
    if (activeFormats.has('underline')) formattedText = `__${formattedText}__`;
    if (activeFormats.has('code')) formattedText = `\`${formattedText}\``;
    if (activeFormats.has('bullet')) {
      formattedText = formattedText
        .split('\n')
        .map((line) => (line ? `- ${line}` : line))
        .join('\n');
    }
    if (activeFormats.has('numbered')) {
      formattedText = formattedText
        .split('\n')
        .map((line, index) => (line ? `${index + 1}. ${line}` : line))
        .join('\n');
    }
    return formattedText;
  };

  const getDisplayText = () => {
    if (!message) return '';
    let displayText = message;
    if (activeFormats.has('bullet')) {
      displayText = displayText
        .split('\n')
        .map((line) => (line ? `• ${line}` : line))
        .join('\n');
    }
    if (activeFormats.has('numbered')) {
      displayText = displayText
        .split('\n')
        .map((line, index) => (line ? `${index + 1}. ${line}` : line))
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
    setFile(f);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && !f.name.includes('/paperclip.svg')) {
      selectFile(f);
    }
    if (e.target) e.target.value = '';
  }, []);

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

  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!userId || (!message.trim() && !file) || isSending) {
      return;
    }

    const messageData: Partial<Message> = {
      senderId: userId,
      senderName: userFirstName || 'Usuario',
      text: message.trim() ? applyFormatting(message.trim()) : null,
      read: false,
      imageUrl: null,
      fileUrl: null,
      fileName: file ? file.name : null,
      fileType: file ? file.type : null,
      filePath: null,
      isPending: true,
    };

    if (file) {
      try {
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
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload file');
        }

        const { url, fileName, fileType, filePath } = await response.json();

        if (fileName) messageData.fileName = fileName;
        if (fileType) messageData.fileType = fileType;
        if (filePath) messageData.filePath = filePath;

        if (file.type.startsWith('image/') && url) {
          messageData.imageUrl = url;
        } else if (url) {
          messageData.fileUrl = url;
        }
      } catch (error) {
        console.error('[InputChat:HandleSend] File upload failed', error);
        messageData.hasError = true;
      }
    }

    try {
      await onSendMessage(messageData);
      setMessage('');
      setFile(null);
      setPreviewUrl(null);
      setActiveFormats(new Set());
    } catch (error) {
      console.error('[InputChat:HandleSend] Failed to send message', error);
      alert('Error al enviar el mensaje');
    }
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
              className={`${styles.imageButton} ${activeFormats.has(id) ? styles.activeFormat : ''}`}
              onClick={() => toggleFormat(id)}
              disabled={isSending}
              title={`${label} (${shortcut})`}
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
        {previewUrl && (
          <div className={styles.imagePreview}>
            <Image src={previewUrl} alt="Previsualización" width={50} height={50} className={styles.previewImage} />
            <button className={styles.removeImageButton} onClick={handleRemoveFile}>
              <Image src="/elipsis.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} />
            </button>
          </div>
        )}
        {file && !previewUrl && (
          <div className={styles.filePreview}>
            <Image src="/file.svg" alt="Archivo" width={16} height={16} />
            <span>{file.name}</span>
            <button className={styles.removeImageButton} onClick={handleRemoveFile}>
              <Image src="/elipsis.svg" alt="Eliminar" width={16} height={16} style={{ filter: 'invert(100)' }} />
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
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Escribe tu mensaje aquí"
            disabled={isSending}
            style={{
              ...getTextStyle(),
              fontFamily: '"Inter Tight", sans-serif',
            }}
            className={`${styles.input} min-h-[36px] max-h-[200px] resize-none`}
          />
        </div>
        <div className={styles.actions}>
          <div className={styles.timerContainer} style={{ width: '100%' }}>
            <button className={styles.playStopButton} onClick={onToggleTimer}>
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
            <button
              type="button"
              className={styles.imageButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              aria-label="Adjuntar archivo"
            >
              <Image
                src="/paperclip.svg"
                alt="Adjuntar"
                width={16}
                height={16}
                className={styles.iconInvert}
                style={{ filter: 'invert(100)' }}
              />
            </button>
            <EmojiSelector
              onEmojiSelect={(emoji) => setMessage((prev) => prev + emoji)}
              disabled={isSending}
              value={message.match(/[\p{Emoji}\p{Emoji_Component}]+$/u)?.[0] || ''}
              containerRef={containerRef}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={isSending || (!message.trim() && !file)}
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
        disabled={isSending}
      />
    </form>
  );
}