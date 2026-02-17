'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface KeyboardFloatState {
  keyboardOpen: boolean
  keyboardHeight: number
}

/**
 * Detects iOS/Android virtual keyboard via Visual Viewport API.
 * Returns keyboard state so inputs can float above the keyboard.
 *
 * How it works:
 * - `window.visualViewport.height` shrinks when the keyboard opens
 * - Keyboard height = window.innerHeight - visualViewport.height - visualViewport.offsetTop
 * - Threshold of 150px avoids false positives from browser chrome changes
 */
export function useKeyboardFloat(): KeyboardFloatState {
  const [state, setState] = useState<KeyboardFloatState>({
    keyboardOpen: false,
    keyboardHeight: 0,
  })

  const rafRef = useRef<number>(0)

  const update = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const vv = window.visualViewport
      if (!vv) return

      const keyboardHeight = Math.round(
        window.innerHeight - vv.height - vv.offsetTop
      )
      const keyboardOpen = keyboardHeight > 150

      setState((prev) => {
        if (prev.keyboardOpen === keyboardOpen && prev.keyboardHeight === keyboardHeight) {
          return prev
        }
        return { keyboardOpen, keyboardHeight: keyboardOpen ? keyboardHeight : 0 }
      })
    })
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      cancelAnimationFrame(rafRef.current)
    }
  }, [update])

  return state
}
