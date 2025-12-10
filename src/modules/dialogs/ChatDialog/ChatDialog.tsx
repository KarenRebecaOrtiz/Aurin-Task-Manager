'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MoreHorizontal,
  CheckCheck,
  Check,
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { usePublicMessages } from '@/modules/chat/hooks/usePublicMessages';
import { ReactionChip } from '@/components/ui/reaction-chip';
import type { PublicTask } from '@/modules/shareTask/schemas/validation.schemas';
import type { Message } from '@/modules/chat/types';
import styles from './ChatDialog.module.scss';

interface Participant {
  id: string;
  name: string;
  avatar: string;
}

interface ChatDialogProps {
  task: PublicTask;
  token: string;
}

export function ChatDialog({ task, token }: ChatDialogProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestNameSet, setGuestNameSet] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Usar participantes de la tarea
  const participants = task.participants || [];

  // Hook para mensajes públicos
  const { messages, isLoading, error, sendMessage, toggleReaction, isSending } =
    usePublicMessages({
      taskId: task.id,
      enabled: task.commentsEnabled && task.isActive && isMounted,
    });

  // Detectar si estamos en el cliente (evita problemas de hidratación)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Detectar dark mode (solo en cliente)
  useEffect(() => {
    if (!isMounted) return;

    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [isMounted]);

  // Cargar nombre de invitado desde localStorage (solo en cliente)
  useEffect(() => {
    if (!isMounted) return;

    const savedName = localStorage.getItem(`guest_name_${task.id}`);
    if (savedName) {
      setGuestName(savedName);
      setGuestNameSet(true);
    }
  }, [task.id, isMounted]);

  // Auto-scroll a nuevos mensajes
  useEffect(() => {
    if (!isMounted) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMounted]);

  // Manejar configuración de nombre de invitado
  const handleSetGuestName = () => {
    if (!guestName.trim()) return;

    localStorage.setItem(`guest_name_${task.id}`, guestName.trim());
    setGuestNameSet(true);
  };

  // Enviar mensaje (autenticado o invitado)
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    // Si hay usuario autenticado, usar su nombre
    if (user && isUserLoaded) {
      const userName = user.fullName || user.firstName || 'Usuario';
      const success = await sendMessage(userName, messageInput);
      if (success) {
        setMessageInput('');
      }
    } else {
      // Si es invitado, verificar que tenga nombre configurado
      if (!guestNameSet) return;
      const success = await sendMessage(guestName, messageInput);
      if (success) {
        setMessageInput('');
      }
    }
  };

  // Manejar Enter en input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mostrar loading durante la hidratación y mientras carga el usuario (debe estar DESPUÉS de todos los hooks)
  if (!isMounted || !isUserLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Loader2 size={32} className={styles.spinner} />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Helpers (después de verificar isMounted)
  const filteredMessages = selectedParticipant
    ? messages.filter((m) => m.senderId === selectedParticipant)
    : messages;

  const MAX_DESCRIPTION_LENGTH = 150;
  const shouldTruncateDescription = task.description && task.description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription = shouldTruncateDescription && !isDescriptionExpanded
    ? `${task.description.substring(0, MAX_DESCRIPTION_LENGTH)}...`
    : task.description;

  // Formatear timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Verificar si mensaje fue leído por todos
  const isReadByAll = (message: Message) => {
    if (!message.readBy || message.readBy.length === 0) return false;
    // Un mensaje está leído por todos si todos los participantes lo leyeron
    return participants.length > 0 && message.readBy.length >= participants.length;
  };

  // Renderizar estado de lectura
  const renderReadStatus = (message: Message) => {
    if (isReadByAll(message)) {
      return <CheckCheck className="w-4 h-4 text-green-500" />;
    } else if (message.read || (message.readBy && message.readBy.length > 0)) {
      return <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
    return null;
  };

  // Renderizar reacciones
  const renderReactions = (message: Message) => {
    if (!message.reactions || message.reactions.length === 0) return null;

    return (
      <div className={styles.reactions}>
        {message.reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            onClick={() => toggleReaction(message.id, reaction.emoji, 'guest')}
            className={cn(
              styles.reactionBadge,
              reaction.userIds.includes('guest') && styles.reactionActive
            )}
          >
            {reaction.emoji} {reaction.count}
          </button>
        ))}
      </div>
    );
  };

  // Si comentarios están deshabilitados
  if (!task.commentsEnabled || !task.isActive) {
    return (
      <div className={cn(styles.container, isDarkMode && styles.dark)}>
        <div className={styles.disabledState}>
          <Users className={styles.disabledIcon} size={64} />
          <h3 className={styles.disabledTitle}>Comentarios deshabilitados</h3>
          <p className={styles.disabledText}>
            {!task.isActive
              ? 'Esta tarea está fuera del período activo'
              : 'Los comentarios están deshabilitados para esta tarea'}
          </p>
        </div>
      </div>
    );
  }

  // Prompt para nombre de invitado (solo si NO hay usuario autenticado)
  if (!guestNameSet && !user && isUserLoaded) {
    return (
      <div className={cn(styles.container, isDarkMode && styles.dark)}>
        <div className={styles.guestPrompt}>
          <Users size={64} className={styles.promptIcon} />
          <h3 className={styles.promptTitle}>Únete a la conversación</h3>
          <p className={styles.promptSubtitle}>
            Ingresa tu nombre para participar en los comentarios
          </p>
          <div className={styles.promptForm}>
            <input
              type="text"
              placeholder="Tu nombre"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSetGuestName()}
              className={styles.nameInput}
              maxLength={50}
              autoFocus={isMounted}
            />
            <button
              onClick={handleSetGuestName}
              disabled={!guestName.trim()}
              className={styles.joinButton}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.container, isDarkMode && styles.dark)}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Users className={styles.headerIcon} />
          <div className={styles.headerInfo}>
            <h2 className={styles.chatName}>{task.name}</h2>
            {task.description && (
              <div className={styles.descriptionWrapper}>
                <p className={styles.chatSubtitle}>{displayDescription}</p>
                {shouldTruncateDescription && (
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className={styles.expandButton}
                    aria-label={isDescriptionExpanded ? 'Contraer descripción' : 'Expandir descripción'}
                  >
                    {isDescriptionExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className={styles.body}>
        {/* Participants List */}
        {participants.length > 0 && (
          <aside className={styles.sidebar}>
            {participants.map((participant) => {
              const isSelected = selectedParticipant === participant.id;
              return (
                <button
                  key={participant.id}
                  onClick={() =>
                    setSelectedParticipant(isSelected ? null : participant.id)
                  }
                  className={cn(
                    styles.participantItem,
                    isSelected && styles.participantSelected
                  )}
                >
                  <div className={styles.participantAvatar}>
                    <Image
                      src={participant.avatar}
                      alt={participant.name}
                      width={40}
                      height={40}
                      className={styles.avatar}
                    />
                  </div>
                  <span className={styles.participantName}>{participant.name}</span>
                </button>
              );
            })}
          </aside>
        )}

        {/* Messages */}
        <section className={styles.messagesSection}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <Loader2 size={32} className={styles.spinner} />
              <p>Cargando mensajes...</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <p>{error}</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className={styles.emptyState}>
              <Users size={48} className={styles.emptyIcon} />
              <p className={styles.emptyText}>No hay mensajes aún</p>
              <p className={styles.emptySubtext}>Sé el primero en comentar</p>
            </div>
          ) : (
            <div className={styles.messagesList}>
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    styles.message,
                    message.senderId === 'guest' && styles.guestMessage
                  )}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.senderName}>{message.senderName}</span>
                    {message.senderId === 'guest' && (
                      <span className={styles.guestBadge}>Invitado</span>
                    )}
                  </div>
                  <p className={styles.messageText}>{message.text}</p>
                  <div className={styles.messageFooter}>
                    <div className={styles.messageInfo}>
                      {renderReadStatus(message)}
                      <span className={styles.timestamp}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    {renderReactions(message)}
                  </div>
                  {/* Hover Reaction Chip */}
                  <div className={styles.reactionChipWrapper}>
                    <ReactionChip
                      onSelect={(emoji) => toggleReaction(message.id, emoji, 'guest')}
                      emojis={['👍', '❤️', '😂', '🎉']}
                    />
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className={styles.messageInput}
          maxLength={2000}
          disabled={isSending}
        />
        <button
          aria-label="Enviar mensaje"
          onClick={handleSendMessage}
          disabled={!messageInput.trim() || isSending}
          className={styles.sendButton}
        >
          {isSending ? <Loader2 size={20} className={styles.spinner} /> : <Send size={20} />}
        </button>
      </footer>
    </div>
  );
}
