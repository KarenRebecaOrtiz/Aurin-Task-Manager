"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { motion, type HTMLMotionProps, type Transition } from "framer-motion"
import { Loader2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonVariantProps } from "./variants"

// Spinner component for loading state
const Spinner = React.memo(({ className }: { className?: string }) => (
  <Loader2 className={cn("animate-spin", className)} aria-hidden="true" />
))
Spinner.displayName = "Spinner"

// Motion wrapper for tap animation
const MotionSlot = motion.create(Slot)

// Spring animation config for smooth interactions
const springTransition: Transition = { type: "spring", stiffness: 400, damping: 10 }

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children">, ButtonVariantProps {
  /** Renders a loading spinner and disables interaction */
  isLoading?: boolean
  /** Optional loading text (replaces children when loading) */
  loadingText?: string
  /** Icon to display on the left side */
  leftIcon?: LucideIcon
  /** Icon to display on the right side */
  rightIcon?: LucideIcon
  /** Use the asChild pattern to render as a different element */
  asChild?: boolean
  /** Button content */
  children?: React.ReactNode
  /** Full width button */
  fullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      intent,
      size,
      fullWidth,
      isLoading = false,
      loadingText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    // Determine if this is an icon-only button
    const isIconOnly = size === "icon" || size === "icon-sm" || size === "icon-lg" || 
      (!children && !loadingText && (LeftIcon || RightIcon))

    // Combine disabled states
    const isDisabled = disabled || isLoading

    // Content to render
    const content = isLoading ? (
      <>
        <Spinner className="mr-2 h-4 w-4" />
        {loadingText && (
          <motion.span
            initial={{ opacity: 1 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 0.2 }}
          >
            {loadingText}
          </motion.span>
        )}
      </>
    ) : (
      <>
        {LeftIcon && <LeftIcon aria-hidden="true" />}
        <motion.span
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.span>
        {RightIcon && <RightIcon aria-hidden="true" />}
      </>
    )

    const buttonClasses = cn(buttonVariants({ intent, size, fullWidth, isLoading }), className)

    if (asChild) {
      return (
        <MotionSlot
          className={buttonClasses}
          whileTap={!isDisabled ? { scale: 0.98 } : undefined}
          whileHover={!isDisabled ? { scale: 1.02 } : undefined}
          transition={springTransition}
          data-icon-only={isIconOnly || undefined}
          data-loading={isLoading || undefined}
        >
          {children}
        </MotionSlot>
      )
    }

    return (
      <motion.button
        ref={ref}
        className={buttonClasses}
        disabled={isDisabled}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        transition={springTransition}
        data-icon-only={isIconOnly || undefined}
        data-loading={isLoading || undefined}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        {...props}
      >
        {content}
      </motion.button>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
export type { ButtonVariantProps }