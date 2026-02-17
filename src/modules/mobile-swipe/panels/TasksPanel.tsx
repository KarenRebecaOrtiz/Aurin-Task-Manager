'use client'

import { useMemo, useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { ClipboardList, Archive, Clock, ChevronDown, Building2, Check, Search } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import { useShallow } from 'zustand/react/shallow'
import { useAuth } from '@/contexts/AuthContext'
import { useUserDataStore } from '@/stores/userDataStore'
import { GradientAvatar } from '@/components/ui/gradient-avatar'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { VisuallyHidden } from '@/components/ui'
import {
  useWorkspacesStore,
  useWorkspaces,
  useSelectedWorkspaceId,
  ALL_WORKSPACES_ID,
  type Workspace,
} from '@/stores/workspacesStore'
import {
  useMobilePanel,
  EXIT_DURATION,
  ENTER_DURATION,
} from '../hooks/useMobilePanel'
import styles from './TasksPanel.module.scss'

const STATUS_COLORS: Record<string, string> = {
  'Por Iniciar': '#3B82F6',
  'En Proceso': '#F59E0B',
  'Por Finalizar': '#8B5CF6',
  'Finalizado': '#22C55E',
  'Cancelado': '#EF4444',
  'Backlog': '#71717A',
}

function formatTime(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return ''
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

interface TaskCardProps {
  task: {
    id: string
    name: string
    status: string
    project: string
    clientId: string
    timeTracking?: {
      totalHours: number
      totalMinutes: number
    }
    totalHours?: number
  }
  clientName: string
  clientImage: string
  onTap: () => void
}

function TaskCard({ task, clientName, clientImage, onTap }: TaskCardProps) {
  const statusColor = STATUS_COLORS[task.status] || '#71717A'

  // Time from structured field or legacy
  const totalHours = task.timeTracking?.totalHours ?? task.totalHours ?? 0
  const totalMinutes = task.timeTracking?.totalMinutes ?? 0
  const timeLabel = formatTime(totalHours, totalMinutes)

  return (
    <button
      className={styles.taskCard}
      onClick={onTap}
      type="button"
    >
      {/* Client avatar */}
      <div className={styles.clientAvatar}>
        {clientImage ? (
          <Image
            src={clientImage}
            alt={clientName}
            width={32}
            height={32}
            className={styles.avatarImage}
          />
        ) : (
          <div className={styles.avatarFallback}>
            {clientName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Task info */}
      <div className={styles.taskInfo}>
        <div className={styles.taskNameRow}>
          <div className={styles.statusDot} style={{ background: statusColor }} />
          <span className={styles.taskName}>{task.name}</span>
        </div>
        <span className={styles.taskMeta}>
          {clientName} {task.project && `· ${task.project}`}
        </span>
      </div>

      {/* Time cell */}
      {timeLabel && (
        <div className={styles.timeCell}>
          <Clock size={12} />
          <span>{timeLabel}</span>
        </div>
      )}
    </button>
  )
}

export function TasksPanel() {
  const allTasks = useDataStore(useShallow((s) => s.tasks))
  const clients = useDataStore(useShallow((s) => s.clients))
  const { isAdmin } = useAuth()
  const currentUserId = useUserDataStore((state) => state.userData?.userId || '')

  // Permission filter: only tasks the user can see (same as data-views)
  const tasks = useMemo(() => {
    if (isAdmin) return allTasks
    return allTasks.filter((task) => {
      const isCreator = task.CreatedBy === currentUserId
      const isAssigned = (task.AssignedTo || []).includes(currentUserId)
      const isLeader = (task.LeadedBy || []).includes(currentUserId)
      return isCreator || isAssigned || isLeader
    })
  }, [allTasks, isAdmin, currentUserId])

  const activePanel = useMobilePanel((s) => s.activePanel)
  const transitionPhase = useMobilePanel((s) => s.transitionPhase)
  const taskSubView = useMobilePanel((s) => s.taskSubView)

  // Workspace button GSAP enter/exit (phase-based)
  const wsBtnRef = useRef<HTMLButtonElement>(null)
  const hasWsInitRef = useRef(false)

  useEffect(() => {
    const btn = wsBtnRef.current
    if (!btn) return

    const isTasks = activePanel === 'tasks'

    if (!hasWsInitRef.current) {
      hasWsInitRef.current = true
      if (isTasks) {
        gsap.set(btn, { autoAlpha: 1, y: 0, scale: 1 })
        btn.style.pointerEvents = 'auto'
      } else {
        gsap.set(btn, { autoAlpha: 0, y: -12, scale: 0.92 })
        btn.style.pointerEvents = 'none'
      }
      return
    }

    // Phase: exiting — leaving tasks
    if (transitionPhase === 'exiting' && !isTasks) {
      gsap.killTweensOf(btn)
      gsap.to(btn, {
        autoAlpha: 0, y: -12, scale: 0.92,
        duration: EXIT_DURATION / 1000, ease: 'power2.in',
        onComplete: () => {
          if (wsBtnRef.current) wsBtnRef.current.style.pointerEvents = 'none'
        },
      })
    }

    // Phase: entering — arriving at tasks
    if (transitionPhase === 'entering' && isTasks) {
      btn.style.pointerEvents = 'auto'
      gsap.killTweensOf(btn)
      gsap.fromTo(
        btn,
        { autoAlpha: 0, y: -12, scale: 0.92 },
        { autoAlpha: 1, y: 0, scale: 1, duration: ENTER_DURATION / 1000, ease: 'power3.out' },
      )
    }
  }, [transitionPhase, activePanel])

  const [searchQuery, setSearchQuery] = useState('')
  const headerRef = useRef<HTMLDivElement>(null)
  const headerVisibleRef = useRef(true)
  const lastScrollY = useRef(0)
  const scrollThreshold = 8

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentY = e.currentTarget.scrollTop
    const delta = currentY - lastScrollY.current
    const header = headerRef.current
    if (!header) { lastScrollY.current = currentY; return }

    if (delta > scrollThreshold && currentY > 40 && headerVisibleRef.current) {
      // Scrolling down — hide header and collapse its space
      headerVisibleRef.current = false
      gsap.to(header, {
        y: '-100%',
        autoAlpha: 0,
        height: 0,
        marginBottom: 0,
        overflow: 'hidden',
        duration: 0.45,
        ease: 'power3.inOut',
        overwrite: true,
      })
    } else if (delta < -scrollThreshold && !headerVisibleRef.current) {
      // Scrolling up — show header and restore space
      headerVisibleRef.current = true
      gsap.to(header, {
        y: '0%',
        autoAlpha: 1,
        height: 'auto',
        clearProps: 'overflow,marginBottom',
        duration: 0.45,
        ease: 'power3.out',
        overwrite: true,
      })
    }

    lastScrollY.current = currentY
  }, [])

  // Workspace selector state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const workspaces = useWorkspaces()
  const selectedWorkspaceId = useSelectedWorkspaceId()
  const setSelectedWorkspace = useWorkspacesStore((s) => s.setSelectedWorkspace)

  const isViewAll = selectedWorkspaceId === ALL_WORKSPACES_ID || !selectedWorkspaceId

  const selectedWorkspace = useMemo(() => {
    if (isViewAll) return null
    return workspaces.find((ws) => ws.id === selectedWorkspaceId) || null
  }, [workspaces, selectedWorkspaceId, isViewAll])

  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => a.name.localeCompare(b.name)),
    [workspaces]
  )

  const handleWorkspaceSelect = useCallback(
    (workspaceId: string | null) => {
      setSelectedWorkspace(workspaceId || ALL_WORKSPACES_ID)
      setDrawerOpen(false)
    },
    [setSelectedWorkspace]
  )

  const clientMap = useMemo(() => {
    const map = new Map<string, { name: string; imageUrl: string }>()
    clients.forEach((c) => map.set(c.id, { name: c.name, imageUrl: c.imageUrl }))
    return map
  }, [clients])

  const activeTasks = useMemo(() => {
    let filtered = taskSubView === 'archive'
      ? tasks.filter((t) => t.archived)
      : tasks.filter((t) => !t.archived)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((t) => {
        const client = clientMap.get(t.clientId)
        return (
          t.name.toLowerCase().includes(q) ||
          t.project?.toLowerCase().includes(q) ||
          t.status?.toLowerCase().includes(q) ||
          client?.name.toLowerCase().includes(q)
        )
      })
    }

    return filtered
  }, [tasks, taskSubView, searchQuery, clientMap])

  const handleTaskTap = (taskId: string) => {
    const { openChatSidebar } = require('@/stores/sidebarStateStore').useSidebarStateStore.getState()
    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      const client = clientMap.get(task.clientId)
      openChatSidebar(task, client?.name || 'Sin cuenta')
    }
  }

  const viewIcon = taskSubView === 'archive'
    ? <Archive size={16} />
    : <ClipboardList size={16} />

  const viewLabel = taskSubView === 'archive' ? 'Inactivas' : 'Activas'

  // ---- GSAP reveal animation for task cards ----
  const taskListRef = useRef<HTMLDivElement>(null)
  const gsapRevealRef = useRef<gsap.core.Timeline | null>(null)
  const prevTaskKeyRef = useRef<string>('')

  // Stable key derived from task IDs
  const taskKey = useMemo(() => activeTasks.map((t) => t.id).join(','), [activeTasks])

  useLayoutEffect(() => {
    const container = taskListRef.current
    if (!container) return

    const cards = Array.from(container.children)
    if (cards.length === 0) return

    // Skip if same list
    if (taskKey === prevTaskKeyRef.current) return
    prevTaskKeyRef.current = taskKey

    // Kill previous animation and clear inline styles
    gsapRevealRef.current?.kill()
    gsap.killTweensOf(cards)

    // Set hidden → animate in
    gsap.set(cards, { autoAlpha: 0, y: 40, scale: 0.97 })

    const tl = gsap.timeline()
    tl.to(cards, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      stagger: { each: 0.06, ease: 'power2.out' },
      ease: 'power3.out',
    })

    gsapRevealRef.current = tl

    return () => { tl.kill() }
  }, [taskKey])

  return (
    <div className={styles.panel}>
      {/* Workspace selector (replaces section title) */}
      <button
        ref={wsBtnRef}
        type="button"
        className={styles.workspaceButton}
        onClick={() => setDrawerOpen(true)}
      >
        {isViewAll ? (
          <div className={styles.wsIconAll}>
            <Building2 size={14} />
          </div>
        ) : selectedWorkspace ? (
          <GradientAvatar
            imageUrl={selectedWorkspace.logo}
            gradientId={selectedWorkspace.gradientId}
            gradientColors={selectedWorkspace.gradientColors}
            name={selectedWorkspace.name}
            className={styles.wsAvatar}
            size="sm"
          />
        ) : null}
        <span className={styles.wsLabel}>
          {isViewAll ? 'Todas las Cuentas' : selectedWorkspace?.name || 'Tareas'}
        </span>
        <ChevronDown size={16} className={styles.wsChevron} />
      </button>

      {/* Workspace Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent compact>
          <VisuallyHidden>
            <DrawerTitle>Seleccionar cuenta</DrawerTitle>
          </VisuallyHidden>
          <div className={styles.drawerList}>
            {/* View All option */}
            <button
              type="button"
              className={`${styles.drawerItem} ${isViewAll ? styles.drawerItemActive : ''}`}
              onClick={() => handleWorkspaceSelect(null)}
            >
              <div className={styles.drawerItemIcon}>
                <Building2 size={16} />
              </div>
              <div className={styles.drawerItemText}>
                <span className={styles.drawerItemName}>Todas las Cuentas</span>
                <span className={styles.drawerItemSub}>Ver todas las tareas</span>
              </div>
              {isViewAll && <Check size={16} className={styles.drawerCheck} />}
            </button>

            {sortedWorkspaces.length > 0 && <div className={styles.drawerDivider} />}

            {sortedWorkspaces.map((ws) => {
              const isActive = !isViewAll && selectedWorkspaceId === ws.id
              return (
                <button
                  key={ws.id}
                  type="button"
                  className={`${styles.drawerItem} ${isActive ? styles.drawerItemActive : ''}`}
                  onClick={() => handleWorkspaceSelect(ws.id)}
                >
                  <GradientAvatar
                    imageUrl={ws.logo}
                    gradientId={ws.gradientId}
                    gradientColors={ws.gradientColors}
                    name={ws.name}
                    className={styles.drawerItemAvatar}
                    size="sm"
                  />
                  <div className={styles.drawerItemText}>
                    <span className={styles.drawerItemName}>{ws.name}</span>
                    {ws.taskCount !== undefined && (
                      <span className={styles.drawerItemSub}>
                        {ws.taskCount} tarea{ws.taskCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {isActive && <Check size={16} className={styles.drawerCheck} />}
                </button>
              )
            })}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Collapsible header + search wrapper — GSAP animated */}
      <div ref={headerRef} className={styles.stickyHeader}>
        {/* Sub-view header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            {viewIcon}
            <span>{viewLabel}</span>
          </div>
          <span className={styles.taskCount}>{activeTasks.length}</span>
        </div>

        {/* Search filter */}
        <div className={styles.searchBar}>
          <Search size={16} className={styles.searchBarIcon} />
          <input
            type="text"
            className={styles.searchBarInput}
            placeholder="Buscar tareas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Task list — GSAP stagger reveal */}
      <div ref={taskListRef} className={styles.taskList} onScroll={handleScroll}>
        {activeTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <Archive size={40} strokeWidth={1} />
            <span>
              {taskSubView === 'archive' ? 'Sin tareas inactivas' : 'Sin tareas activas'}
            </span>
          </div>
        ) : (
          activeTasks.map((task) => {
            const client = clientMap.get(task.clientId)
            return (
              <div key={task.id} className={styles.taskCardWrapper}>
                <TaskCard
                  task={task}
                  clientName={client?.name || 'Sin cuenta'}
                  clientImage={client?.imageUrl || ''}
                  onTap={() => handleTaskTap(task.id)}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
