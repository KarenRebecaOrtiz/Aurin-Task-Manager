"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * BaseInput Atom
 *
 * WHY: A foundational input wrapper that provides consistent styling across all input variants.
 * This follows the "composition over inheritance" principle, allowing other components
 * to extend its functionality while maintaining visual consistency.
 *
 * Accessibility: Uses semantic HTML input with proper focus states for keyboard navigation.
 */

export interface BaseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visual state variants for validation feedback */
  variant?: "default" | "error" | "success"
  /** Additional wrapper class names for layout customization */
  wrapperClassName?: string
}

export const BaseInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  ({ className, variant = "default", wrapperClassName, type = "text", ...props }, ref) => {
    const variantStyles = {
      default: "border-input focus-within:ring-ring",
      error: "border-destructive focus-within:ring-destructive",
      success: "border-green-500 focus-within:ring-green-500",
    }

    return (
      <div className={cn("relative", wrapperClassName)}>
        <input
          type={type}
          className={cn(
            // Base styles - Using tel type for mobile keyboard optimization
            "flex h-11 w-full rounded-lg border bg-background px-3 py-2",
            "text-base font-normal text-foreground",
            // Placeholder styling with muted contrast
            "placeholder:text-muted-foreground",
            // Focus states - Ring for clear focus indication (WCAG 2.1 compliance)
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "focus-visible:ring-offset-background",
            // Disabled state
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Transition for smooth state changes
            "transition-colors duration-200",
            // Dark mode support
            "dark:bg-background dark:text-foreground",
            variantStyles[variant],
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  },
)

BaseInput.displayName = "BaseInput"
