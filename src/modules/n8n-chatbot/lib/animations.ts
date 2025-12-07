import type { Variants, Transition } from "framer-motion"

// Spring transitions
export const springTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
}

export const softSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
}

export const snappySpring: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
}

// Container animations
export const containerVariants: Variants = {
  hidden: {
    scale: 0.95,
    opacity: 0,
    y: 20,
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    y: 20,
    transition: { duration: 0.2 },
  },
}

// Message animations
export const messageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: snappySpring,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
}

// Bubble scale animation
export const bubbleVariants: Variants = {
  hidden: { scale: 0.9 },
  visible: {
    scale: 1,
    transition: { delay: 0.05, ...softSpring },
  },
}

// Avatar pop-in
export const avatarVariants: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: { delay: 0.1, type: "spring", stiffness: 300 },
  },
}

// Floating button
export const floatingButtonVariants: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
}

// Badge animation
export const badgeVariants: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: { delay: 0.2, type: "spring", stiffness: 300 },
  },
}

// Header slide-in
export const headerVariants: Variants = {
  hidden: { y: -20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { delay: 0.1, ...springTransition },
  },
}

// Input area slide-up
export const inputAreaVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { delay: 0.2, ...springTransition },
  },
}

// File preview
export const filePreviewVariants: Variants = {
  hidden: { opacity: 0, y: -20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: softSpring,
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.9,
    transition: { duration: 0.15 },
  },
}

// Drag overlay
export const dragOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

// Voice recorder pulse
export const pulseVariants: Variants = {
  idle: { scale: 1 },
  recording: {
    scale: [1, 1.15, 1],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

// Typing dots
export const typingDotVariants: Variants = {
  animate: (delay: number) => ({
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      delay,
    },
  }),
}

// File preview animation
export const fileAnimationVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.3 },
  },
}
