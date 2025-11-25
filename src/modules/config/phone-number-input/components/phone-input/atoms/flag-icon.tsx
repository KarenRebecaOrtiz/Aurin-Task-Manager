"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"

/**
 * FlagIcon Atom
 *
 * WHY: Renders country flags using emoji-based representation for simplicity and
 * cross-platform consistency. Emoji flags are universally supported and avoid
 * the need for external flag assets.
 *
 * The conversion uses Unicode Regional Indicator Symbols to generate flag emojis
 * from ISO 3166-1 alpha-2 country codes.
 */

export interface FlagIconProps {
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "MX", "GB") */
  countryCode: string
  /** Size variant for the flag display */
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * Converts a country code to its corresponding flag emoji
 * Each letter is converted to a Regional Indicator Symbol
 */
function countryCodeToEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export const FlagIcon: React.FC<FlagIconProps> = ({ countryCode, size = "md", className }) => {
  const sizeStyles = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  }

  const flag = countryCodeToEmoji(countryCode)

  return (
    <span
      className={cn("inline-flex items-center justify-center leading-none", sizeStyles[size], className)}
      role="img"
      aria-label={`${countryCode} flag`}
    >
      {flag}
    </span>
  )
}

FlagIcon.displayName = "FlagIcon"
