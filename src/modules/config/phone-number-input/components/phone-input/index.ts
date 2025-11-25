/**
 * Phone Input Module - Public API
 *
 * This file exports all public components from the phone-input module.
 * The Atomic Design structure is internal; consumers only need the organism.
 */

// Main component
export { PhoneNumberInput, type PhoneNumberInputProps, type PhoneNumberValue } from "./organisms/phone-number-input"

// Expose atoms and molecules for advanced customization
export { BaseInput, type BaseInputProps } from "./atoms/base-input"
export { FlagIcon, type FlagIconProps } from "./atoms/flag-icon"
export { Label, type LabelProps } from "./atoms/label"
export { ErrorMessage, type ErrorMessageProps } from "./atoms/error-message"
export { CountrySelect, type CountrySelectProps } from "./molecules/country-select"
export { PhoneField, type PhoneFieldProps } from "./molecules/phone-field"

// Data exports for custom implementations
export { countries, getCountryByCode, getCountryByDialCode, getDefaultCountry, type Country } from "./data/countries"
