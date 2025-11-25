"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { motion, type HTMLMotionProps } from "framer-motion"
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      intent,
      size,
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
    const isIconOnly = size === "icon" || (!children && !loadingText && (LeftIcon || RightIcon))

    // Combine disabled states
    const isDisabled = disabled || isLoading

    // Content to render
    const content = isLoading ? (
      <>
        <Spinner />
        {loadingText && <span>{loadingText}</span>}
      </>
    ) : (
      <>
        {LeftIcon && <LeftIcon aria-hidden="true" />}
        {children}
        {RightIcon && <RightIcon aria-hidden="true" />}
      </>
    )

    const buttonClasses = cn(buttonVariants({ intent, size, isLoading }), className)

    // Tap animation config
    const tapAnimation = {
      scale: 0.98,
      transition: { duration: 0.1, ease: "easeInOut" },
    }

    if (asChild) {
      return (
        <MotionSlot
          className={buttonClasses}
          whileTap={!isDisabled ? tapAnimation : undefined}
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
        whileTap={!isDisabled ? tapAnimation : undefined}
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