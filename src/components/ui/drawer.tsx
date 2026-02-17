"use client"

import * as React from "react"
import { useEffect, useRef, useState, useCallback, forwardRef } from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import gsap from "gsap"

import { cn } from "@/lib/utils"
import styles from "./drawer.module.scss"

// ============================================================================
// Drawer Root - Wraps vaul with GSAP close interception
// ============================================================================

type DrawerRootProps = React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Root> & {
  children: React.ReactNode
}

const Drawer = ({
  shouldScaleBackground = true,
  open,
  onOpenChange,
  ...props
}: DrawerRootProps) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const isClosingRef = useRef(false)
  const wipePanelsRef = useRef<HTMLDivElement[]>([])
  const contentElRef = useRef<HTMLElement | null>(null)
  const innerElRef = useRef<HTMLElement | null>(null)

  // Controlled or uncontrolled
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  // Register refs from DrawerContent
  const registerContentEl = useCallback((el: HTMLElement | null) => {
    contentElRef.current = el
  }, [])
  const registerInnerEl = useCallback((el: HTMLElement | null) => {
    innerElRef.current = el
  }, [])
  const registerWipePanels = useCallback((panels: HTMLDivElement[]) => {
    wipePanelsRef.current = panels
  }, [])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      // Opening - let vaul handle it, GSAP mount animation runs via useEffect in DrawerContent
      if (isControlled) {
        onOpenChange?.(true)
      } else {
        setInternalOpen(true)
      }
    } else {
      // Closing - play GSAP exit animation, THEN close vaul
      if (isClosingRef.current) return
      isClosingRef.current = true

      const content = contentElRef.current
      const panels = wipePanelsRef.current
      const inner = innerElRef.current

      // If no content ref yet, just close immediately
      if (!content) {
        isClosingRef.current = false
        if (isControlled) onOpenChange?.(false)
        else setInternalOpen(false)
        return
      }

      const tl = gsap.timeline({
        onComplete: () => {
          isClosingRef.current = false
          if (isControlled) onOpenChange?.(false)
          else setInternalOpen(false)
        },
      })

      // Animate children out first
      if (inner && inner.children.length > 0) {
        tl.to(Array.from(inner.children).reverse(), {
          autoAlpha: 0,
          y: 15,
          stagger: 0.03,
          duration: 0.2,
          ease: "power2.in",
        })
      }

      // Slide content + wipe panels down
      const targets = [content, ...panels].filter(Boolean)
      tl.to(targets, {
        yPercent: 110,
        duration: 0.4,
        ease: "power3.in",
        stagger: 0.04,
      }, inner && inner.children.length > 0 ? "-=0.1" : "0")

    }
  }, [isControlled, onOpenChange])

  return (
    <DrawerGSAPContext.Provider value={{ registerContentEl, registerInnerEl, registerWipePanels, isOpen }}>
      <DrawerPrimitive.Root
        shouldScaleBackground={shouldScaleBackground}
        open={isOpen}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {props.children}
      </DrawerPrimitive.Root>
    </DrawerGSAPContext.Provider>
  )
}
Drawer.displayName = "Drawer"

// ============================================================================
// GSAP Context - shared between Drawer and DrawerContent
// ============================================================================

interface DrawerGSAPContextValue {
  registerContentEl: (el: HTMLElement | null) => void
  registerInnerEl: (el: HTMLElement | null) => void
  registerWipePanels: (panels: HTMLDivElement[]) => void
  isOpen: boolean
}

const DrawerGSAPContext = React.createContext<DrawerGSAPContextValue | null>(null)

// ============================================================================
// Vaul primitives
// ============================================================================

const DrawerTrigger = DrawerPrimitive.Trigger
const DrawerPortal = DrawerPrimitive.Portal
const DrawerClose = DrawerPrimitive.Close

// ============================================================================
// Overlay
// ============================================================================

const DrawerOverlay = forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(styles.overlay, className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

// ============================================================================
// DrawerContent - Vaul + GSAP mount/unmount animations
// ============================================================================

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  compact?: boolean
}

const DrawerContent = forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  DrawerContentProps
>(({ className, children, compact = false, ...props }, ref) => {
  const gsapCtx = React.useContext(DrawerGSAPContext)

  // Refs for wipe panels
  const panel1Ref = useRef<HTMLDivElement>(null)
  const panel2Ref = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const contentLocalRef = useRef<HTMLDivElement>(null)
  const hasAnimatedIn = useRef(false)

  // Merge refs
  const setContentRef = useCallback((node: HTMLDivElement | null) => {
    contentLocalRef.current = node
    gsapCtx?.registerContentEl(node)
    if (typeof ref === "function") ref(node)
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
  }, [ref, gsapCtx])

  // Register inner ref
  useEffect(() => {
    gsapCtx?.registerInnerEl(innerRef.current)
  }, [gsapCtx])

  // Register wipe panels
  useEffect(() => {
    const panels = [panel1Ref.current, panel2Ref.current].filter(Boolean) as HTMLDivElement[]
    gsapCtx?.registerWipePanels(panels)
  }, [gsapCtx])

  // ---- GSAP Mount Animation ----
  useEffect(() => {
    if (!gsapCtx?.isOpen) {
      hasAnimatedIn.current = false
      return
    }
    if (hasAnimatedIn.current) return

    const content = contentLocalRef.current
    const panel1 = panel1Ref.current
    const panel2 = panel2Ref.current
    const inner = innerRef.current
    if (!content || !inner) return

    // Small delay to let vaul render the content
    const timer = setTimeout(() => {
      hasAnimatedIn.current = true

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
      })

      // Wipe panels slide in (non-compact only)
      if (!compact && panel1 && panel2) {
        // Set initial state
        gsap.set([panel1, panel2], { yPercent: 101, autoAlpha: 1 })
        tl.to([panel1, panel2], {
          yPercent: 0,
          stagger: 0.1,
          duration: 0.55,
        })
      }

      // Stagger children in
      if (inner.children.length > 0) {
        gsap.set(inner.children, { autoAlpha: 0, y: 25 })
        tl.to(inner.children, {
          autoAlpha: 1,
          y: 0,
          stagger: 0.06,
          duration: 0.4,
        }, compact ? "0.15" : "-=0.25")
      }
    }, 60)

    return () => clearTimeout(timer)
  }, [gsapCtx?.isOpen, compact])

  return (
    <DrawerPortal>
      <DrawerOverlay />

      {/* Wipe panels - behind content, same shape */}
      {!compact && (
        <>
          <div
            ref={panel1Ref}
            className={cn(styles.wipePanel, styles.wipePanelFirst)}
            style={{ transform: "translateY(101%)" }}
          />
          <div
            ref={panel2Ref}
            className={cn(styles.wipePanel, styles.wipePanelSecond)}
            style={{ transform: "translateY(101%)" }}
          />
        </>
      )}

      <DrawerPrimitive.Content
        ref={setContentRef}
        className={cn(
          styles.content,
          compact && styles.contentCompact,
          className
        )}
        {...props}
      >
        <div className={styles.handleContainer}>
          <div className={styles.handle} />
        </div>
        <div ref={innerRef} className={styles.innerContainer}>
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = "DrawerContent"

// ============================================================================
// Simple sub-components (unchanged from vaul wrapper)
// ============================================================================

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(styles.header, className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(styles.footer, className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(styles.title, className)}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn(styles.description, className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
