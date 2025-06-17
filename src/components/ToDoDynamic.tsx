"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { gsap } from "gsap"
import styles from "./ToDoDynamic.module.scss"

interface Todo {
  id: number
  text: string
  completed: boolean
}

const snappyTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 28,
  mass: 1,
}

export default function ToDoDynamic() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastScrollY = useRef(0)
  const isTemporarilyHidden = useRef(false)

  // Load todos and visibility from localStorage on mount
  useEffect(() => {
    try {
      const savedTodos = localStorage.getItem("todos")
      if (savedTodos) {
        setTodos(JSON.parse(savedTodos))
      }
      const savedVisibility = localStorage.getItem("isVisible")
      if (savedVisibility !== null) {
        const parsedVisibility = JSON.parse(savedVisibility)
        setIsVisible(parsedVisibility)
        if (containerRef.current) {
          gsap.set(containerRef.current, {
            y: parsedVisibility ? 0 : -100,
            opacity: parsedVisibility ? 1 : 0,
          })
        }
      } else {
        // Initial animation if no saved state
        gsap.fromTo(
          containerRef.current,
          { y: -100, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
        )
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error)
    }
  }, [])

  // Save todos to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("todos", JSON.stringify(todos))
    } catch (error) {
      console.error("Error saving todos to localStorage:", error)
    }
  }, [todos])

  // Save visibility to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("isVisible", JSON.stringify(isVisible))
    } catch (error) {
      console.error("Error saving visibility to localStorage:", error)
    }
  }, [isVisible])

  // Handle scroll-based visibility when isVisible is true
  useEffect(() => {
    const handleScroll = () => {
      if (!isVisible) return // Ignore scroll if permanently hidden

      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY.current && !isTemporarilyHidden.current) {
        // Scroll down: temporarily hide component
        gsap.to(containerRef.current, {
          y: -100,
          opacity: 0,
          duration: 0.4,
          ease: "power2.in",
          onComplete: () => {
            isTemporarilyHidden.current = true
          },
        })
      } else if (currentScrollY < lastScrollY.current && isTemporarilyHidden.current) {
        // Scroll up: show component
        gsap.to(containerRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => {
            isTemporarilyHidden.current = false
          },
        })
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [isVisible])

  const addTodo = () => {
    if (newTodo.trim() !== "") {
      setTodos([...todos, { id: Date.now(), text: newTodo, completed: false }])
      setNewTodo("")
    }
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)))
  }

  const removeTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo()
    }
  }

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed === b.completed) return 0
    return a.completed ? 1 : -1
  })

  const completedTodos = todos.filter((todo) => todo.completed).length
  const remainingTodos = todos.length - completedTodos

  const handleMouseEnter = () => {
    if (!isVisible || isTemporarilyHidden.current) return
    if (hoverTimeout) clearTimeout(hoverTimeout)
    const timeout = setTimeout(() => {
      setIsExpanded(true)
    }, 200)
    setHoverTimeout(timeout)
  }

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    const timeout = setTimeout(() => {
      setIsExpanded(false)
    }, 200)
    setHoverTimeout(timeout)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isExpanded &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isExpanded])

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "d") {
        event.preventDefault()
        setIsVisible((prev) => {
          const newVisible = !prev
          isTemporarilyHidden.current = false // Reset temporary hide state
          gsap.to(containerRef.current, {
            y: newVisible ? 0 : -100,
            opacity: newVisible ? 1 : 0,
            duration: 0.4,
            ease: newVisible ? "power2.out" : "power2.in",
          })
          return newVisible
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <motion.div
      className={styles.dynamicIslandTodo}
      initial={false}
      animate={{
        width: isExpanded ? "var(--di-expanded-width)" : "var(--di-collapsed-width)",
        height: isExpanded ? "auto" : "var(--di-collapsed-height)",
        borderRadius: isExpanded ? "var(--di-expanded-radius)" : "var(--di-border-radius)",
      }}
      transition={{
        ...snappyTransition,
        borderRadius: { duration: 0.15 },
      }}
      ref={containerRef}
    >
      <motion.div
        className={styles.container}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        layout
        transition={snappyTransition}
      >
        {!isExpanded && (
          <motion.div className={styles.header} layout>
            <div className={styles.counters}>
              {remainingTodos > 0 && (
                <span className={styles.remainingCount}>{remainingTodos}</span>
              )}
              {completedTodos > 0 && (
                <span className={styles.completedCount}>{completedTodos}</span>
              )}
            </div>
          </motion.div>
        )}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{
                ...snappyTransition,
                opacity: { duration: 0.15 },
                scale: { duration: 0.2 },
              }}
              className={styles.expandedContent}
            >
              <div className={styles.inputContainer}>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Añade un to-do"
                    className={styles.input}
                    ref={inputRef}
                    aria-label="New todo input"
                  />
                  <svg className={styles.inputIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  </svg>
                </div>
                <button
                  onClick={addTodo}
                  className={styles.addButton}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14"/>
                    <path d="M12 5v14"/>
                  </svg>
                </button>
              </div>
              <motion.ul className={styles.todoList} role="list" layout>
                <AnimatePresence initial={false}>
                  {sortedTodos.map((todo) => (
                    <motion.li
                      key={todo.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={snappyTransition}
                      className={styles.todoItem}
                      role="listitem"
                      layout
                    >
                      <span
                        className={`${styles.todoText} ${todo.completed ? styles.completed : styles.active}`}
                        onClick={() => toggleTodo(todo.id)}
                      >
                        {todo.text}
                      </span>
                      <div className={styles.todoActions}>
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className={styles.actionButton}
                          aria-label={`${todo.completed ? "Revert" : "Complete"} "${todo.text}"`}
                        >
                          {todo.completed ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12a9 9 0 1 1 9 9 9 9 0 0 1-9-9m9 0H3"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="m5 12 5 5L20 7"/>
                            </svg>
                          )}
                        </button>
                        <div className={styles.separator}></div>
                        <button
                          onClick={() => removeTodo(todo.id)}
                          className={styles.actionButton}
                          aria-label={`Remove "${todo.text}" from the list`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6 6 18"/>
                            <path d="m6 6 12 12"/>
                          </svg>
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}