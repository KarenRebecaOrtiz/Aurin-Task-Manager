"use client"

import React, { useState, useEffect, useRef } from "react"
import { gsap } from "gsap"
import Dock from "./Dock"
import ToDoDynamic from "./ToDoDynamic"
import styles from "./ToolbarContainer.module.scss"

export default function ToolbarContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeComponent, setActiveComponent] = useState<"dock" | "todo">("dock")
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Manejar animaciones de visibilidad
  const animateVisibility = (visible: boolean) => {
    gsap.to(containerRef.current, {
      y: visible ? 0 : 100,
      opacity: visible ? 1 : 0,
      duration: 0.4,
      ease: visible ? "power2.out" : "power2.in",
      onComplete: () => setIsVisible(visible),
    })
  }

  // Manejar scroll (replicando Dock)
  const handleScroll = () => {
    const currentScrollY = window.scrollY

    if (currentScrollY > lastScrollY.current && isVisible) {
      animateVisibility(false)
    } else if (currentScrollY < lastScrollY.current && !isVisible) {
      animateVisibility(true)
    }

    lastScrollY.current = currentScrollY
  }

  // Manejar teclado
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K: Ocultar/Mostrar
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !e.shiftKey) {
      e.preventDefault()
      animateVisibility(!isVisible)
    }
    // Cmd/Ctrl + Shift + K: Alternar Dock/ToDo
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
      e.preventDefault()
      setActiveComponent((prev) => (prev === "dock" ? "todo" : "dock"))
    }
  }

  useEffect(() => {
    // Animación inicial (como Dock)
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
  }, []) // Dependencias vacías para ejecutarse una vez, como en Dock

  // Actualizar animaciones cuando cambia isVisible
  useEffect(() => {
    animateVisibility(isVisible)
  }, [isVisible])

  return (
    <div ref={containerRef} className={styles.toolbarContainer}>
      <div className={styles.componentWrapper}>
        <div className={`${styles.component} ${activeComponent === "dock" ? styles.active : styles.inactive}`}>
          <Dock />
        </div>
        <div className={`${styles.component} ${activeComponent === "todo" ? styles.active : styles.inactive}`}>
          <ToDoDynamic />
        </div>
      </div>
      <div className={styles.indicator}>
        <span className={`${styles.dot} ${activeComponent === "dock" ? styles.activeDot : ""}`}></span>
        <span className={`${styles.dot} ${activeComponent === "todo" ? styles.activeDot : ""}`}></span>
      </div>
    </div>
  )
}