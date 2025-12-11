/**
 * Chat Animations Module
 *
 * Centralized animation definitions for the chat module
 * using Motion Dev (framer-motion).
 *
 * @module chat/animations
 */

export {
  // Sidebar container animations
  sidebarContainerVariants,
  sidebarScaleVariants,
  sidebarSlideVariants,
  chatSidebarWrapperVariants,

  // Overlay animations
  overlayVariants,

  // Sidebar content animations
  sidebarHeaderVariants,
  sidebarContentVariants,
  sidebarInputVariants,

  // Mobile drawer animations
  drawerContainerVariants,
  drawerContentVariants,

  // Image preview animations
  imagePreviewOverlayVariants,
  imagePreviewContentVariants,

  // Message animations
  messageEntryVariants,

  // Utility functions
  getSidebarTransition,
  withDelay,

  // Preset configurations
  sidebarAnimationPresets,

  // Types
  type SidebarAnimationPreset,
  type DesktopSidebarVariants,
  type MobileSidebarVariants,
} from './sidebarAnimations';
