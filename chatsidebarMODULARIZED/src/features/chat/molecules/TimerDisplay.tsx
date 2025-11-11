"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { NumberFlowGroup, NumberFlow } from "@number-flow/react"

interface TimerDisplayProps {
  timerSeconds: number
  isTimerRunning: boolean
  onToggleTimer: (e: React.MouseEvent) => void
  onFinalizeTimer: () => Promise<void>
  isRestoringTimer: boolean
  isInitializing: boolean
  isMenuOpen: boolean
  setIsMenuOpen: (open: boolean) => void
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timerSeconds,
  isTimerRunning,
  onToggleTimer,
  onFinalizeTimer,
  isRestoringTimer,
  isInitializing,
  isMenuOpen,
  setIsMenuOpen,
}) => {
  const [menuRef, setMenuRef] = useState<HTMLDivElement | null>(null)

  // Calculate timer values
  const timerValues = useMemo(() => {
    const hours = Math.floor(timerSeconds / 3600)
    const minutes = Math.floor((timerSeconds % 3600) / 60)
    const seconds = timerSeconds % 60

    return { hours, minutes, seconds }
  }, [timerSeconds])

  // Determine timer state
  const timerState = useMemo(() => {
    if (isInitializing) {
      return {
        icon: "/spinner.svg",
        alt: "Loading",
        tooltip: "Initializing timer...",
        isDisabled: true,
      }
    }

    if (isRestoringTimer) {
      return {
        icon: "/rotate-ccw.svg",
        alt: "Restoring",
        tooltip: "Restoring timer...",
        isDisabled: true,
      }
    }

    if (isTimerRunning) {
      return {
        icon: "/pause.svg",
        alt: "Pause",
        tooltip: "Pause timer",
        isDisabled: false,
      }
    }

    return {
      icon: "/play.svg",
      alt: "Play",
      tooltip: "Start timer",
      isDisabled: timerSeconds === 0,
    }
  }, [isInitializing, isRestoringTimer, isTimerRunning, timerSeconds])

  // Handle click outside to close menu
  useEffect(() => {
    if (!isMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef && !menuRef.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [isMenuOpen, setIsMenuOpen])

  const handleToggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <div className="flex items-center gap-2">
      <relative>
        {/* Clock button */}
        <button
          type="button"
          onClick={handleToggleMenu}
          className="p-1.5 rounded-md hover:bg-gray-200 cursor-pointer transition-colors"
          title="Timer menu"
        >
          <Image src="/Clock.svg" alt="Timer" width={20} height={20} />
        </button>

        {/* Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              ref={setMenuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 w-48"
            >
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-left p-2 rounded-md hover:bg-gray-100 text-sm"
              >
                Add time manually
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </relative>

      {/* Timer display */}
      <div className="flex font-mono text-sm text-gray-700 cursor-default">
        {isInitializing ? (
          <span>...</span>
        ) : (
          <>
            {isRestoringTimer && <span className="mr-1">↻</span>}
            <NumberFlowGroup>
              <NumberFlow value={timerValues.hours} />
            </NumberFlowGroup>
            <span>:</span>
            <NumberFlowGroup>
              <NumberFlow value={timerValues.minutes} format={{ minimumIntegerDigits: 2 }} />
            </NumberFlowGroup>
            <span>:</span>
            <NumberFlowGroup>
              <NumberFlow value={timerValues.seconds} format={{ minimumIntegerDigits: 2 }} />
            </NumberFlowGroup>
          </>
        )}
      </div>

      {/* Play/Pause button */}
      <button
        type="button"
        onClick={onToggleTimer}
        disabled={timerState.isDisabled}
        className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={timerState.tooltip}
      >
        <Image src={timerState.icon || "/placeholder.svg"} alt={timerState.alt} width={20} height={20} />
      </button>

      {/* Finalize button */}
      <button
        type="button"
        onClick={onFinalizeTimer}
        disabled={timerSeconds === 0 || isInitializing}
        className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Add time entry"
      >
        <Image src="/check.svg" alt="Finalize" width={20} height={20} />
      </button>
    </div>
  )
}
