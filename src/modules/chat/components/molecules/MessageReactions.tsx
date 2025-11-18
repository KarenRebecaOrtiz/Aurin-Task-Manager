"use client";

import React, { useState, useRef } from "react";
import { Smile } from "lucide-react";
import { ReactionButton } from "../atoms/ReactionButton";
import { ReactionPicker } from "../atoms/ReactionPicker";
import type { MessageReaction } from "../../types";
import styles from "../../styles/MessageReactions.module.scss";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  currentUserId: string;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const handleReactionClick = (reaction: MessageReaction) => {
    const hasReacted = reaction.userIds.includes(currentUserId);

    if (hasReacted) {
      onRemoveReaction(reaction.emoji);
    } else {
      onAddReaction(reaction.emoji);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const existingReaction = reactions.find((r) => r.emoji === emoji);

    if (existingReaction?.userIds.includes(currentUserId)) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
  };

  return (
    <div className={styles.reactionsContainer}>
      {/* Existing reactions */}
      <div className={styles.reactionsList}>
        {reactions.map((reaction) => (
          <ReactionButton
            key={reaction.emoji}
            emoji={reaction.emoji}
            count={reaction.count}
            isActive={reaction.userIds.includes(currentUserId)}
            onClick={() => handleReactionClick(reaction)}
          />
        ))}
      </div>

      {/* Add reaction button */}
      <button
        ref={addButtonRef}
        className={styles.addReactionButton}
        onClick={() => setIsPickerOpen(!isPickerOpen)}
        aria-label="Añadir reacción"
      >
        <Smile size={16} />
      </button>

      {/* Reaction picker */}
      <ReactionPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectEmoji={handleEmojiSelect}
        triggerRef={addButtonRef}
      />
    </div>
  );
};
