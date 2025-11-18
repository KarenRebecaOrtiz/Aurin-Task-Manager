"use client";

import React, { useRef, useEffect } from "react";
import styles from "../../styles/ReactionPicker.module.scss";

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  triggerRef: React.RefObject<HTMLElement>;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥"];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  triggerRef,
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div ref={pickerRef} className={styles.reactionPicker}>
      <div className={styles.emojiGrid}>
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className={styles.emojiButton}
            onClick={() => {
              onSelectEmoji(emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
