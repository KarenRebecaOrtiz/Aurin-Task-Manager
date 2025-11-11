"use client"

import React, { useEffect, useRef, useCallback } from "react"
import { gsap } from "gsap"
import ToDoDynamic from "./ToDoDynamic"
import styles from "./ToolbarContainer.module.scss"

export default function ToolbarContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollY = useRef(0)
  const isVisible = useRef(true)

  // Manejar animaciones de visibilidad
  const animateVisibility = useCallback((visible: boolean) => {
    gsap.to(containerRef.current, {
      y: visible ? 0 : 100,
      opacity: visible ? 1 : 0,
      duration: 0.4,
      ease: visible ? "power2.out" : "power2.in",
      onComplete: () => { isVisible.current = visible },
    })
  }, [])

  // Manejar scroll
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY

    if (currentScrollY > lastScrollY.current && isVisible.current) {
      animateVisibility(false)
    } else if (currentScrollY < lastScrollY.current && !isVisible.current) {
      animateVisibility(true)
    }

    lastScrollY.current = currentScrollY
  }, [animateVisibility])

  // Manejar teclado
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd/Ctrl + K: Ocultar/Mostrar
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault()
      animateVisibility(!isVisible.current)
    }
  }, [animateVisibility])

  useEffect(() => {
    // Animación inicial
    gsap.fromTo(
      containerRef.current,
      { y: 100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    )

    // Añadir listeners
    window.addEventListener("scroll", handleScroll)
    window.addEventListener("keydown", handleKeyDown)

    // Limpieza
    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleScroll, handleKeyDown])

  return (
    <div ref={containerRef} className={styles.toolbarContainer}>
      <ToDoDynamic />
    </div>
  )
}
