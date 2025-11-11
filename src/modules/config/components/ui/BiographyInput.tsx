"use client";

import * as React from "react";
import { useId } from "react";
import { useCharacterLimit } from "@/components/hooks/use-character-limit";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import styles from "./BiographyInput.module.scss";

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
      <div className={styles.biographyContainer}>
        <Label htmlFor={`${id}-biography`} className={styles.biographyLabel}>{label}</Label>
        <Textarea
          ref={ref}
          id={`${id}-biography`}
          placeholder={placeholder}
          value={characterValue}
          maxLength={maxLength}
          onChange={handleTextareaChange}
          disabled={disabled}
          className={`${styles.biographyTextarea} ${className || ''}`}
          aria-describedby={`${id}-description`}
        />
        <p
          id={`${id}-description`}
          className={styles.biographyCounter}
          role="status"
          aria-live="polite"
        >
          <span>{limit - characterCount}</span> caracteres restantes
        </p>
      </div>
    );
  },
);
BiographyInput.displayName = "BiographyInput";

export { BiographyInput }; 