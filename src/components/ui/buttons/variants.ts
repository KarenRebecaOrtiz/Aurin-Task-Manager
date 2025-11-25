import { cva, type VariantProps } from "class-variance-authority"

/**
 * Button Variants Definition
 *
 * "Dual-Personality" Design System:
 * - Light Mode: "Modern Crystallized" - Glassmorphism with subtle transparency, backdrop blur, soft shadows
 * - Dark Mode: "High-Contrast Flat" - Solid opaque colors, no shadows, sharp digital feel
 */

export const buttonVariants = cva(
  // Base styles - shared across all variants
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium whitespace-nowrap",
    "rounded-lg",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50 disabled:grayscale",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      intent: {
        primary: [
          // Light Mode: Glassy gradient with blur
          "bg-primary/80 text-primary-foreground",
          "backdrop-blur-md",
          "border border-primary/20",
          "shadow-lg shadow-primary/20",
          "hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25",
          // Dark Mode: Solid primary, no shadows
          "dark:bg-primary dark:text-primary-foreground",
          "dark:backdrop-blur-none",
          "dark:border-transparent",
          "dark:shadow-none",
          "dark:hover:bg-primary/90 dark:hover:shadow-none",
        ],
        secondary: [
          // Light Mode: Frosted white glass
          "bg-white/60 text-foreground",
          "backdrop-blur-lg",
          "border border-white/40",
          "shadow-md shadow-black/5",
          "hover:bg-white/80 hover:shadow-lg hover:shadow-black/10",
          // Dark Mode: Solid dark grey
          "dark:bg-secondary dark:text-secondary-foreground",
          "dark:backdrop-blur-none",
          "dark:border-secondary/50",
          "dark:shadow-none",
          "dark:hover:bg-secondary/80 dark:hover:shadow-none",
        ],
        ghost: [
          // Light Mode: Transparent with subtle hover
          "bg-transparent text-foreground",
          "border border-transparent",
          "shadow-none",
          "hover:bg-black/5 hover:border-black/10",
          // Dark Mode: Transparent with high-contrast hover
          "dark:bg-transparent dark:text-foreground",
          "dark:hover:bg-white/10 dark:hover:border-white/10",
          "dark:shadow-none",
        ],
        danger: [
          // Light Mode: Glassy red
          "bg-destructive/80 text-white",
          "backdrop-blur-md",
          "border border-destructive/30",
          "shadow-lg shadow-destructive/25",
          "hover:bg-destructive/90 hover:shadow-xl hover:shadow-destructive/30",
          // Dark Mode: Solid error red
          "dark:bg-destructive dark:text-white",
          "dark:backdrop-blur-none",
          "dark:border-transparent",
          "dark:shadow-none",
          "dark:hover:bg-destructive/90 dark:hover:shadow-none",
        ],
        outline: [
          // Light Mode: Transparent with border
          "bg-transparent text-foreground",
          "border-2 border-border",
          "shadow-sm",
          "hover:bg-accent hover:text-accent-foreground",
          // Dark Mode: Transparent with high-contrast border
          "dark:bg-transparent dark:text-foreground",
          "dark:border-border",
          "dark:shadow-none",
          "dark:hover:bg-accent dark:hover:text-accent-foreground",
        ],
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "size-10 p-0 [&_svg]:size-5",
      },
      isLoading: {
        true: "pointer-events-none",
        false: "",
      },
    },
    compoundVariants: [
      // Icon size adjustments for square buttons
      {
        size: "sm",
        className: "data-[icon-only=true]:size-8",
      },
      {
        size: "lg",
        className: "data-[icon-only=true]:size-12",
      },
    ],
    defaultVariants: {
      intent: "primary",
      size: "md",
      isLoading: false,
    },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>