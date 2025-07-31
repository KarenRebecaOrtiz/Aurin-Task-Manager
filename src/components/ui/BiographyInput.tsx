"use client";

import * as React from "react";
import { useId } from "react";
import { useCharacterLimit } from "@/components/hooks/use-character-limit";
import { Textarea } from "./Textarea";
import { Label } from "./Label";

interface BiographyInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  label?: string;
  className?: string;
}

const BiographyInput = React.forwardRef<HTMLTextAreaElement, BiographyInputProps>(
  ({ 
    value = "", 
    onChange, 
    placeholder = "Write a few sentences about yourself", 
    disabled, 
    maxLength = 180,
    label = "Biography",
    className 
  }, ref) => {
    const id = useId();
    
    const {
      value: characterValue,
      characterCount,
      handleChange,
      maxLength: limit,
    } = useCharacterLimit({
      maxLength,
      initialValue: value,
    });

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleChange(e);
      onChange?.(e.target.value);
    };

    return (
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <Label htmlFor={`${id}-biography`}>{label}</Label>
        <Textarea
          ref={ref}
          id={`${id}-biography`}
          placeholder={placeholder}
          value={characterValue}
          maxLength={maxLength}
          onChange={handleTextareaChange}
          disabled={disabled}
          className={className}
          aria-describedby={`${id}-description`}
          style={{
            width: '100%',
            minHeight: '100px',
            display: 'flex',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(241, 245, 249, 0.8)',
            padding: '8px 12px',
            fontSize: '14px',
            color: '#0F172A',
            boxShadow: '-4px -4px 8px rgba(255, 255, 255, 0.8), 4px 4px 8px rgba(0, 0, 0, 0.05), inset -2px -2px 4px rgba(255, 255, 255, 0.9), inset 2px 2px 6px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            outline: 'none',
            resize: 'vertical'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2), -4px -4px 8px rgba(255, 255, 255, 0.8), 4px 4px 8px rgba(0, 0, 0, 0.05)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.boxShadow = '-4px -4px 8px rgba(255, 255, 255, 0.8), 4px 4px 8px rgba(0, 0, 0, 0.05), inset -2px -2px 4px rgba(255, 255, 255, 0.9), inset 2px 2px 6px rgba(0, 0, 0, 0.05)';
          }}
        />
        <p
          id={`${id}-description`}
          style={{
            marginTop: '8px',
            textAlign: 'right',
            fontSize: '14px',
            color: 'rgba(100, 116, 139, 0.5)'
          }}
          role="status"
          aria-live="polite"
        >
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{limit - characterCount}</span> caracteres restantes
        </p>
      </div>
    );
  },
);
BiographyInput.displayName = "BiographyInput";

export { BiographyInput }; 