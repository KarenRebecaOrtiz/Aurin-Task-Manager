"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Label Atom
 *
 * WHY: Semantic labels are crucial for accessibility. Screen readers rely on
 * proper label-input associations. This component ensures consistent typography
 * and proper contrast ratios (WCAG AA compliance).
 */

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Whether the associated field is required */
  required?: boolean
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          // Typography - Using semibold for clear hierarchy
          "text-sm font-medium leading-none text-foreground",
          // Spacing from input
          "mb-2 block",
          // Disabled state handling via peer
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          // High contrast in both modes
          "dark:text-foreground",
          className,
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
    )
  },
)

Label.displayName = "Label"
