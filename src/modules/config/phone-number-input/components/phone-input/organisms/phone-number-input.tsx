"use client"

import * as React from "react"
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Label } from "../atoms/label"
import { ErrorMessage } from "../atoms/error-message"
import { CountrySelect } from "../molecules/country-select"
import { PhoneField } from "../molecules/phone-field"
import { getCountryByCode, getDefaultCountry, type Country } from "../data/countries"

/**
 * PhoneNumberInput Organism
 *
 * WHY: The composite component that orchestrates the entire phone input experience.
 * It manages:
 * - Country selection with automatic validation rule updates
 * - Real-time phone number validation using libphonenumber-js
 * - Unified visual state for the entire input group
 * - Accessibility through proper label and error associations
 *
 * The visual design merges CountrySelect and PhoneField into a single unified
 * element, following modern design patterns seen in Stripe/Vercel forms.
 */

export interface PhoneNumberValue {
  /** ISO country code */
  country: string
  /** Raw phone number (digits only) */
  number: string
}

export interface PhoneNumberInputProps {
  /** The current value */
  value?: PhoneNumberValue
  /** Callback when value changes */
  onChange?: (value: PhoneNumberValue, isValid: boolean) => void
  /** Custom error message (overrides built-in validation) */
  error?: string
  /** Label text */
  label?: string
  /** Whether the field is required */
  required?: boolean
  /** Whether the field is disabled */
  disabled?: boolean
  /** Additional class name for the container */
  className?: string
  /** Unique ID for the input */
  id?: string
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  error,
  label = "Phone Number",
  required = false,
  disabled = false,
  className,
  id = "phone-input",
}) => {
  // Initialize with default country if no value provided
  const [internalValue, setInternalValue] = React.useState<PhoneNumberValue>(() => ({
    country: value?.country || getDefaultCountry().code,
    number: value?.number || "",
  }))

  // Track validation state
  const [validationError, setValidationError] = React.useState<string | undefined>()
  const [hasBlurred, setHasBlurred] = React.useState(false)

  // Sync with external value changes
  React.useEffect(() => {
    if (value) {
      setInternalValue(value)
    }
  }, [value])

  // Validate phone number
  const validatePhoneNumber = React.useCallback(
    (phoneValue: PhoneNumberValue): { isValid: boolean; error?: string } => {
      if (!phoneValue.number) {
        return { isValid: false }
      }

      try {
        const phoneNumber = parsePhoneNumberFromString(phoneValue.number, phoneValue.country as CountryCode)

        if (!phoneNumber) {
          return { isValid: false, error: "Please enter a valid phone number" }
        }

        if (!phoneNumber.isValid()) {
          return { isValid: false, error: "Please enter a valid phone number" }
        }

        return { isValid: true }
      } catch {
        return { isValid: false, error: "Please enter a valid phone number" }
      }
    },
    [],
  )

  // Handle country change
  const handleCountryChange = (country: Country) => {
    const newValue: PhoneNumberValue = {
      country: country.code,
      number: internalValue.number,
    }
    setInternalValue(newValue)

    // Re-validate with new country
    const validation = validatePhoneNumber(newValue)
    if (hasBlurred && newValue.number) {
      setValidationError(validation.error)
    }
    onChange?.(newValue, validation.isValid)
  }

  // Handle phone number change
  const handleNumberChange = (number: string) => {
    const newValue: PhoneNumberValue = {
      country: internalValue.country,
      number,
    }
    setInternalValue(newValue)

    // Validate
    const validation = validatePhoneNumber(newValue)

    // Only show error after blur
    if (hasBlurred) {
      setValidationError(validation.error)
    }

    onChange?.(newValue, validation.isValid)
  }

  // Handle blur - trigger validation display
  const handleBlur = () => {
    setHasBlurred(true)
    if (internalValue.number) {
      const validation = validatePhoneNumber(internalValue)
      setValidationError(validation.error)
    }
  }

  // Determine error state (external error takes precedence)
  const displayError = error || validationError
  const hasError = !!displayError

  const selectedCountry = getCountryByCode(internalValue.country) || getDefaultCountry()
  const inputId = `${id}-input`
  const errorId = `${id}-error`

  return (
    <div className={cn("w-full", className)}>
      {/* Label */}
      {label && (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      )}

      {/* Input Group - Unified visual container */}
      <motion.div
        className="relative flex items-stretch"
        animate={{
          // Subtle shake animation on error
          x: hasError && hasBlurred ? [0, -4, 4, -4, 4, 0] : 0,
        }}
        transition={{ duration: 0.4 }}
      >
        {/* Country Select */}
        <CountrySelect
          value={internalValue.country}
          onChange={handleCountryChange}
          disabled={disabled}
          hasError={hasError}
        />

        {/* Phone Field */}
        <PhoneField
          id={inputId}
          value={internalValue.number}
          onChange={handleNumberChange}
          countryCode={internalValue.country}
          hasError={hasError}
          disabled={disabled}
          aria-describedby={hasError ? errorId : undefined}
          onBlur={handleBlur}
        />
      </motion.div>

      {/* Error Message */}
      <ErrorMessage id={errorId} message={displayError} />
    </div>
  )
}

PhoneNumberInput.displayName = "PhoneNumberInput"
