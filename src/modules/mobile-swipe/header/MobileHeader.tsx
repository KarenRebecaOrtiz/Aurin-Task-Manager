'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { useUser } from '@/lib/demo/clerk-mock'
import { Cog } from '@/components/animate-ui/icons'
import { SettingsDrawer } from '@/modules/header/components/ui/AvatarDropdown'
import { ConfigDialog } from '@/modules/config/components/ConfigModal/ConfigDialog'
import {
  useMobilePanel,
  EXIT_DURATION,
  ENTER_DURATION,
} from '../hooks/useMobilePanel'
import styles from './MobileHeader.module.scss'

export function MobileHeader() {
  const { user } = useUser()
  const activePanel = useMobilePanel((s) => s.activePanel)
  const transitionPhase = useMobilePanel((s) => s.transitionPhase)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  const headerRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLButtonElement>(null)
  const settingsRef = useRef<HTMLButtonElement>(null)
  const hasInitRef = useRef(false)

  const isVisible = activePanel === 'home'

  useEffect(() => {
    const avatar = avatarRef.current
    const settings = settingsRef.current
    const header = headerRef.current
    if (!avatar || !settings || !header) return

    const targets = [avatar, settings]

    // First mount — set initial state, no animation
    if (!hasInitRef.current) {
      hasInitRef.current = true
      if (isVisible) {
        gsap.set(targets, { autoAlpha: 1, y: 0, scale: 1 })
        header.style.pointerEvents = 'auto'
      } else {
        gsap.set(targets, { autoAlpha: 0, y: -15, scale: 0.9 })
        header.style.pointerEvents = 'none'
      }
      return
    }

    // Phase: exiting — if we WERE visible (now leaving home), animate out
    if (transitionPhase === 'exiting' && !isVisible) {
      gsap.killTweensOf(targets)
      gsap.to(targets, {
        autoAlpha: 0,
        y: -15,
        scale: 0.9,
        duration: EXIT_DURATION / 1000,
        stagger: 0.04,
        ease: 'power2.in',
        onComplete: () => {
          if (headerRef.current) headerRef.current.style.pointerEvents = 'none'
        },
      })
    }

    // Phase: entering — if we ARE visible (just arrived at home), animate in
    if (transitionPhase === 'entering' && isVisible) {
      header.style.pointerEvents = 'auto'
      gsap.killTweensOf(targets)
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: -15, scale: 0.9 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: ENTER_DURATION / 1000,
          stagger: 0.08,
          ease: 'power3.out',
        },
      )
    }
  }, [transitionPhase, isVisible])

  const handleSettingsClick = useCallback(() => {
    setIsSettingsOpen(true)
  }, [])

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false)
  }, [])

  const userImage = user?.imageUrl || '/default-avatar.png'

  return (
    <>
      <div ref={headerRef} className={styles.header}>
        {/* Avatar pill — opens config dialog */}
        <button
          ref={avatarRef}
          className={styles.avatarPill}
          onClick={() => setIsConfigOpen(true)}
          aria-label="Abrir configuración"
        >
          <div className={styles.avatarWrapper}>
            <Image
              src={userImage}
              alt="Avatar"
              width={35}
              height={35}
              className={styles.avatarImage}
            />
          </div>
        </button>

        {/* Settings button */}
        <button
          ref={settingsRef}
          className={styles.settingsButton}
          onClick={handleSettingsClick}
          aria-label="Ajustes"
        >
          <Cog className={styles.settingsIcon} animateOnHover />
        </button>
      </div>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        userId={user?.id}
      />

      {user?.id && (
        <ConfigDialog
          isOpen={isConfigOpen}
          onOpenChange={setIsConfigOpen}
          userId={user.id}
        />
      )}
    </>
  )
}
