"use client"

import * as React from "react"
import { AsYouType, type CountryCode, getExampleNumber } from "libphonenumber-js"
import examples from "libphonenumber-js/mobile/examples"
import { cn } from "@/lib/utils"

/**
 * PhoneField Molecule
 *
 * WHY: This input handles the actual phone number entry with intelligent formatting:
 * - Uses `type="tel"` to trigger numeric keyboard on mobile devices
 * - Implements "As You Type" formatting from libphonenumber-js for real-time masking
 * - Strictly accepts only numeric input while displaying formatted output
 *
 * The formatting follows each country's national format standard, making the
 * number easier to read and verify.
 */

export interface PhoneFieldProps {
  /** The raw phone number value (digits only) */
  value: string
  /** Callback when the number changes */
  onChange: (value: string) => void
  /** The selected country code for formatting */
  countryCode: string
  /** Whether the field has an error */
  hasError?: boolean
  /** Whether the field is disabled */
  disabled?: boolean
  /** Placeholder text (auto-generated from country if not provided) */
  placeholder?: string
  /** Additional class names */
  className?: string
  /** ID for accessibility */
  id?: string
  /** aria-describedby for error association */
  "aria-describedby"?: string
  /** Callback when the field loses focus */
  onBlur?: () => void
}

export const PhoneField = React.forwardRef<HTMLInputElement, PhoneFieldProps>(
  (
    {
      value,
      onChange,
      countryCode,
      hasError = false,
      disabled = false,
      placeholder,
      className,
      id,
      "aria-describedby": ariaDescribedBy,
      onBlur,
    },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    // Generate placeholder from country example number
    const generatedPlaceholder = React.useMemo(() => {
      if (placeholder) return placeholder
      try {
        const example = getExampleNumber(countryCode as CountryCode, examples)
        if (example) {
          // Format as national number for cleaner placeholder
          return example.formatNational()
        }
      } catch {
        // Fallback if country not supported
      }
      return "Enter phone number"
    }, [countryCode, placeholder])

    // Format the displayed value using AsYouType
    const formattedValue = React.useMemo(() => {
      if (!value) return ""
      try {
        const formatter = new AsYouType(countryCode as CountryCode)
        return formatter.input(value)
      } catch {
        return value
      }
    }, [value, countryCode])

    // Handle input changes - extract only digits
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target.value
      // Extract only digits from input (handles paste with formatted numbers)
      const digitsOnly = input.replace(/\D/g, "")
      onChange(digitsOnly)
    }

    // Handle keydown to prevent non-numeric input
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows
      const allowedKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ]

      if (allowedKeys.includes(event.key)) return

      // Allow Ctrl/Cmd combinations (copy, paste, select all)
      if (event.ctrlKey || event.metaKey) return

      // Block non-numeric keys
      if (!/^\d$/.test(event.key)) {
        event.preventDefault()
      }
    }

    return (
      <input
        ref={inputRef}
        id={id}
        // WHY tel: Triggers numeric keyboard on mobile devices for better UX
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formattedValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={generatedPlaceholder}
        aria-invalid={hasError}
        aria-describedby={ariaDescribedBy}
        className={cn(
          // Layout - Grows to fill available space
          "h-11 flex-1 rounded-r-lg border-y border-r px-3 py-2",
          // Remove left border to merge with country select
          "border-l-0",
          // Typography
          "text-base font-normal text-foreground",
          "placeholder:text-muted-foreground",
          // Background
          "bg-background",
          // Focus state
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "focus-visible:ring-offset-background focus-visible:z-10",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Transition
          "transition-colors duration-200",
          // Border color based on error state
          hasError ? "border-destructive" : "border-input",
          className,
        )}
      />
    )
  },
)

PhoneField.displayName = "PhoneField"
