/**
 * InputChat Module - Input Actions Molecule
 *
 * Action buttons bar (attach, send, etc.)
 * @module chat/components/molecules/InputActions
 */

'use client';

import React from 'react';
import { ActionButton, SendButton } from '../atoms';

export interface InputActionsProps {
  onAttachClick: () => void;
  canSend: boolean;
  isProcessing: boolean;
  disabled?: boolean;
}

/**
 * InputActions - Bottom action buttons
 *
 * Features:
 * - Attach file button
 * - Send button (primary)
 * - Disabled states
 */
export const InputActions: React.FC<InputActionsProps> = ({
  onAttachClick,
  canSend,
  isProcessing,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-2">
      <ActionButton
        icon="/paperclip.svg"
        alt="Adjuntar archivo"
        onClick={onAttachClick}
        disabled={disabled || isProcessing}
        title="Adjuntar archivo"
      />

      <SendButton
        disabled={!canSend || disabled}
        isProcessing={isProcessing}
      />
    </div>
  );
};

InputActions.displayName = 'InputActions';
