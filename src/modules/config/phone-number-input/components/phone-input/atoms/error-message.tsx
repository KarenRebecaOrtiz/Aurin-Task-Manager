"use client"

import type * as React from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * ErrorMessage Atom
 *
 * WHY: Error messages need special accessibility consideration. Using aria-live="polite"
 * ensures screen readers announce errors without interrupting the user's current action.
 * The visual design uses destructive color with an icon for immediate recognition.
 */

export interface ErrorMessageProps {
  /** The error message to display */
  message?: string
  /** Additional class names */
  className?: string
  /** Unique ID for aria-describedby association */
  id?: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className, id }) => {
  if (!message) return null

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        "mt-2 flex items-center gap-1.5",
        "text-sm text-destructive",
        // Animation for smooth appearance
        "animate-in fade-in-0 slide-in-from-top-1 duration-200",
        className,
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

ErrorMessage.displayName = "ErrorMessage"
