'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '@clerk/nextjs'
import { Cog } from '@/components/animate-ui/icons'
import { SettingsDrawer } from '@/modules/header/components/ui/AvatarDropdown'
import { useMobilePanel } from '../hooks/useMobilePanel'
import styles from './MobileHeader.module.scss'

export function MobileHeader() {
  const { user } = useUser()
  const activePanel = useMobilePanel((s) => s.activePanel)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const isVisible = activePanel === 'home'

  const handleSettingsClick = useCallback(() => {
    setIsSettingsOpen(true)
  }, [])

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false)
  }, [])

  const userImage = user?.imageUrl || '/default-avatar.png'

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Avatar pill */}
            <div className={styles.avatarPill}>
              <div className={styles.avatarWrapper}>
                <Image
                  src={userImage}
                  alt="Avatar"
                  width={35}
                  height={35}
                  className={styles.avatarImage}
                />
              </div>
            </div>

            {/* Settings button */}
            <button
              className={styles.settingsButton}
              onClick={handleSettingsClick}
              aria-label="Ajustes"
            >
              <Cog className={styles.settingsIcon} animateOnHover />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        userId={user?.id}
      />
    </>
  )
}
