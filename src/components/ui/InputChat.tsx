'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import {
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  Mic,
  MicOff,
  Sun,
  Moon,
} from 'lucide-react';
import styles from '../styles/ChatSidebar.module.scss';
import { EmojiSelector } from './EmojiSelector';
import TimePicker from 'react-time-picker';
import DatePicker from 'react-datepicker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-datepicker/dist/react-datepicker.css';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  timestamp: Timestamp | any;
  read: boolean;
  hours?: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;
  isPending?: boolean;
}

interface InputChatsProps {
  taskId: string;
  userId: string | undefined;
  userFirstName: string | undefined;
  onSendMessage: (
    message: Partial<Message>,
    isAudio?: boolean,
    audioUrl?: string,
    duration?: number,
  ) => Promise<void>;
  onTyping: () => void;
  isSending: boolean;
  timerSeconds: number;
  isTimerRunning: boolean;
  onToggleTimer: (e: React.MouseEvent) => void;
  onToggleTimerPanel: (e: React.MouseEvent) => void;
  isTimerPanelOpen: boolean;
  timerInput: string;
  setTimerInput: (value: string) => void;
  dateInput: Date;
  setDateInput: (date: Date) => void;
  commentInput: string;
  setCommentInput: (value: string) => void;
  onAddTimeEntry: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function InputChats({
  taskId,
  userId,
  userFirstName,
  onSendMessage,
  onTyping,
  isSending,
  timerSeconds,
  isTimerRunning,
  onToggleTimer,
  onToggleTimerPanel,
  isTimerPanelOpen,
  timerInput,
  setTimerInput,
  dateInput,
  setDateInput,
  commentInput,
  setCommentInput,
  onAddTimeEntry,
}: InputChatsProps) {
  const [message, setMessage] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerPanelRef = useRef<HTMLDivElement>(null);
  const timerButtonRef = useRef<HTMLDivElement>(null);
  const datePickerWrapperRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleFormat = (format: string) => {
    const newFormats = new Set(activeFormats);
    if (newFormats.has(format)) {
      newFormats.delete(format);
    } else {
      newFormats.add(format);
    }
    setActiveFormats(newFormats);
  };

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
      styles.backgroundColor = isDarkMode ? '#2c2c2f' : '#f3f4f6';
      styles.padding = '2px 4px';
      styles.borderRadius = '4px';
    }
    return styles;
  };

  const selectFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE) {
      alert('El archivo supera los 10 MB.');
      console.log('[InputChats] File too large:', f.size);
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
    console.log('[InputChats] File selected:', { name: f.name, type: f.type, size: f.size });
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
    console.log('[InputChats] File dropped:', f?.name);
  }, []);

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
    console.log('[InputChats] Removed selected file');
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const duration = recordingTime;

          const audioRef = ref(storage, `audio/${Date.now()}.webm`);
          await uploadBytes(audioRef, audioBlob);
          const audioUrl = await getDownloadURL(audioRef);

          await onSendMessage(
            {
              senderId: userId!,
              senderName: userFirstName || 'Usuario',
              fileUrl: audioUrl,
              fileName: `audio_${Date.now()}.webm`,
              fileType: 'audio/webm',
              hours: duration / 3600,
              timestamp: serverTimestamp(),
              read: false,
            },
            true,
            audioUrl,
            duration,
          );

          stream.getTracks().forEach((track) => track.stop());
          audioChunksRef.current = [];
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('[InputChats] Error accessing microphone:', err);
      }
    }
  };

  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!message.trim() && !file) return;

    const messageData: Partial<Message> = {
      senderId: userId!,
      senderName: userFirstName || 'Usuario',
      text: message.trim() ? applyFormatting(message.trim()) : null,
      timestamp: serverTimestamp(),
      read: false,
      imageUrl: null,
      fileUrl: null,
      fileName: file ? file.name : null,
      fileType: file ? file.type : null,
      filePath: null,
    };

    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId!);
        formData.append('type', 'message');
        formData.append('conversationId', taskId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          headers: { 'x-clerk-user-id': userId! },
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
        console.error('[InputChats] Failed to upload file:', error);
        alert('Error al subir el archivo');
        return;
      }
    }

    await onSendMessage(messageData);
    setMessage('');
    setFile(null);
    setPreviewUrl(null);
    setActiveFormats(new Set());
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatButtons = [
    { id: 'bold', icon: Bold, label: 'Negrita', shortcut: 'Ctrl+B' },
    { id: 'italic', icon: Italic, label: 'Cursiva', shortcut: 'Ctrl+I' },
    { id: 'underline', icon: Underline, label: 'Subrayado', shortcut: 'Ctrl+U' },
    { id: 'code', icon: Code, label: 'Código', shortcut: 'Ctrl+`' },
    { id: 'bullet', icon: List, label: 'Lista con viñetas', shortcut: 'Ctrl+Shift+8' },
    { id: 'numbered', icon: ListOrdered, label: 'Lista numerada', shortcut: 'Ctrl+Shift+7' },
  ];

  return (
    <form
      className={`${styles.inputWrapper} ${isDragging ? styles.dragging : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onSubmit={handleSend}
    >
      <div ref={timerPanelRef} className={styles.timerPanel} id="timerPanel">
        <div className={styles.timerPanelContent}>
          <div className={styles.timerRow}>
            <div className={styles.timerCard}>
              <TimePicker
                onChange={(value: string | null) => setTimerInput(value || '00:00')}
                value={timerInput}
                format="HH:mm"
                clockIcon={null}
                clearIcon={null}
                disableClock
                locale="es-ES"
                className={styles.timerInput}
              />
            </div>
            <div
              className={styles.timerCard}
              ref={datePickerWrapperRef}
              onMouseEnter={() => setIsCalendarOpen(true)}
              onMouseLeave={() => setTimeout(() => setIsCalendarOpen(false), 200)}
            >
              <DatePicker
                selected={dateInput}
                onChange={(date: Date | null) => setDateInput(date || new Date())}
                dateFormat="dd/MM/yy"
                className={styles.timerInput}
                popperClassName={styles.calendarPopper}
                onCalendarOpen={() => setIsCalendarOpen(true)}
                onCalendarClose={() => setIsCalendarOpen(false)}
              />
            </div>
          </div>
          <div className={styles.timerCard}>
            <textarea
              placeholder="Añadir comentario"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className={styles.timerCommentInput}
            />
          </div>
          <div className={styles.timerTotal}>
            Has invertido: {Math.floor(timerSeconds / 3600)}h {Math.floor((timerSeconds % 3600) / 60)}m en esta tarea.
          </div>
          <div className={styles.timerActions}>
            <button type="button" className={styles.timerAddButton} onClick={onAddTimeEntry}>
              Añadir entrada
            </button>
            <button
              type="button"
              className={styles.timerCancelButton}
              onClick={() => {
                setIsTimerPanelOpen(false);
                setIsCalendarOpen(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
      <div className={styles.inputContainer}>
        <div className={`${styles.timerPanel} p-2 flex items-center gap-1 mb-2`}>
          <button
            type="button"
            className={styles.imageButton}
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label={`Cambiar a modo ${isDarkMode ? 'claro' : 'oscuro'}`}
          >
            {isDarkMode ? <Sun size={16} className={styles.iconInvert} /> : <Moon size={16} className={styles.iconInvert} />}
          </button>
          {formatButtons.map(({ id, icon: Icon, label, shortcut }) => (
            <button
              key={id}
              type="button"
              className={`${styles.imageButton} ${activeFormats.has(id) ? 'bg-[#e2e8f0] dark:bg-[#2c2c2f]' : ''}`}
              onClick={() => toggleFormat(id)}
              disabled={isSending}
              title={`${label} (${shortcut})`}
            >
              <Icon size={16} className={styles.iconInvert} />
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
              onTyping();
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
          {isRecording && (
            <div className="absolute bottom-2 left-4 flex items-center gap-2 text-red-600 dark:text-red-400">
              <div className="flex items-center gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-500 rounded-full animate-pulse"
                    style={{
                      height: `${8 + Math.sin(Date.now() / 200 + i) * 4}px`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <div className={styles.timerContainer}>
            <button className={styles.playStopButton} onClick={onToggleTimer}>
              <Image
                src={isTimerRunning ? '/Stop.svg' : '/Play.svg'}
                alt={isTimerRunning ? 'Detener temporizador' : 'Iniciar temporizador'}
                width={12}
                height={12}
              />
            </button>
            <div ref={timerButtonRef} className={styles.timer} onClick={onToggleTimerPanel}>
              <span>{formatTime(timerSeconds)}</span>
              <Image src="/chevron-down.svg" alt="Abrir panel de temporizador" width={12} height={12} />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <button
              type="button"
              className={styles.imageButton}
              onClick={handleRecordToggle}
              disabled={isSending}
              aria-label={isRecording ? 'Detener grabación' : 'Grabar audio'}
            >
              {isRecording ? (
                <>
                  <MicOff size={16} className={styles.iconInvert} />
                  <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping" />
                </>
              ) : (
                <Mic size={16} className={styles.iconInvert} />
              )}
            </button>
            <button
              type="button"
              className={styles.imageButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              aria-label="Adjuntar archivo"
            >
              <Image src="/paperclip.svg" alt="Adjuntar" width={16} height={16} className={styles.iconInvert} />
            </button>
            <EmojiSelector onEmojiSelect={(emoji) => setMessage((prev) => prev + emoji)} disabled={isSending} />
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
        <input
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileInputChange}
          aria-label="Seleccionar archivo"
          disabled={isSending}
        />
      </div>
    </form>
  );
}
