"use client"

import type React from "react"
import Image from "next/image"

interface EmojiSelectorProps {
  onEmojiSelect: (emoji: string) => void
  disabled: boolean
}

export const EmojiSelector: React.FC<EmojiSelectorProps> = ({ onEmojiSelect, disabled }) => {
  return (
    <button
      type="button"
      onClick={() => onEmojiSelect("😊")}
      className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
      disabled={disabled}
      title="Add emoji"
    >
      <Image src="/emoji.svg" alt="Emoji" width={20} height={20} />
    </button>
  )
}
