import styles from "./variants.module.scss"

/**
 * Button Variants - SCSS Modules
 * Estilo: Clean Tactile / Neutro
 */

export interface ButtonVariantProps {
  intent?: "default" | "primary" | "secondary" | "danger" | "ghost" | "outline"
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm" | "icon-lg"
  fullWidth?: boolean
  isLoading?: boolean
}

/**
 * Button variants helper function
 * Combina las clases SCSS modules según las props recibidas
 */
export const buttonVariants = ({
  intent = "default",
  size = "md",
  fullWidth = false,
  isLoading = false,
}: ButtonVariantProps = {}): string => {
  const classes = [styles.button]

  // Add intent class
  const intentMap = {
    default: styles.intentDefault,
    primary: styles.intentPrimary,
    secondary: styles.intentSecondary,
    danger: styles.intentDanger,
    ghost: styles.intentGhost,
    outline: styles.intentOutline,
  }
  classes.push(intentMap[intent])

  // Add size class
  const sizeMap = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
    icon: styles.sizeIcon,
    "icon-sm": styles.sizeIconSm,
    "icon-lg": styles.sizeIconLg,
  }
  classes.push(sizeMap[size])

  // Add modifier classes
  if (fullWidth) {
    classes.push(styles.fullWidth)
  }

  if (isLoading) {
    classes.push(styles.isLoading)
  }

  return classes.filter(Boolean).join(" ")
}