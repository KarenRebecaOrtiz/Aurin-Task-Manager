/**
 * InputChat Module - Input Actions Molecule
 *
 * Action buttons bar (attach, send, web search, audio)
 * @module chat/components/molecules/InputActions
 */

'use client';

import React from 'react';
import { ActionButton, SendButton } from '../atoms';
import { InputToggleButtons } from './InputToggleButtons';

export interface InputActionsProps {
  onAttachClick: () => void;
  canSend: boolean;
  isProcessing: boolean;
  disabled?: boolean;
  
  // Web search & audio features
  audioModeEnabled?: boolean;
  onToggleAudioMode?: () => void;
  audioTime?: number;
  showAdvancedFeatures?: boolean;
}

/**
 * InputActions - Bottom action buttons
 *
 * Features:
 * - Attach file button
 * - Web search toggle (opcional)
 * - Audio recording toggle (opcional)
 * - Send button (primary)
 * - Disabled states
 */
export const InputActions: React.FC<InputActionsProps> = ({
  onAttachClick,
  canSend,
  isProcessing,
  disabled = false,
  audioModeEnabled = false,
  onToggleAudioMode,
  audioTime = 0,
  showAdvancedFeatures = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 w-full">
      {/* Left side - Attach & Toggles */}
      <div className="flex items-center gap-2">
        <ActionButton
          icon="/paperclip.svg"
          alt="Adjuntar archivo"
          onClick={onAttachClick}
          disabled={disabled || isProcessing || audioModeEnabled}
          title="Adjuntar archivo"
        />

        {/* Advanced features toggles */}
        {showAdvancedFeatures && onToggleAudioMode && (
          <InputToggleButtons
            audioModeEnabled={audioModeEnabled}
            onToggleAudioMode={onToggleAudioMode}
            audioTime={audioTime}
            disabled={disabled || isProcessing}
          />
        )}
      </div>

      {/* Right side - Send */}
      <SendButton
        disabled={!canSend || disabled}
        isProcessing={isProcessing}
      />
    </div>
  );
};

InputActions.displayName = 'InputActions';
