'use client'

import { useMemo, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ClipboardList, Archive, Clock, ChevronDown, Building2, Check } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import { useShallow } from 'zustand/react/shallow'
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
import { useMobilePanel } from '../hooks/useMobilePanel'
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
    <motion.button
      className={styles.taskCard}
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      layout
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
    </motion.button>
  )
}

export function TasksPanel() {
  const tasks = useDataStore(useShallow((s) => s.tasks))
  const clients = useDataStore(useShallow((s) => s.clients))
  const taskSubView = useMobilePanel((s) => s.taskSubView)

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
    if (taskSubView === 'archive') {
      return tasks.filter((t) => t.archived)
    }
    return tasks.filter((t) => !t.archived)
  }, [tasks, taskSubView])

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

  return (
    <div className={styles.panel}>
      {/* Workspace selector (replaces section title) */}
      <button
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

      {/* Sub-view header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          {viewIcon}
          <span>{viewLabel}</span>
        </div>
        <span className={styles.taskCount}>{activeTasks.length}</span>
      </div>

      {/* Task list */}
      <div className={styles.taskList}>
        {activeTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <Archive size={40} strokeWidth={1} />
            <span>
              {taskSubView === 'archive' ? 'Sin tareas inactivas' : 'Sin tareas activas'}
            </span>
          </div>
        ) : (
          activeTasks.map((task, i) => {
            const client = clientMap.get(task.clientId)
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
              >
                <TaskCard
                  task={task}
                  clientName={client?.name || 'Sin cuenta'}
                  clientImage={client?.imageUrl || ''}
                  onTap={() => handleTaskTap(task.id)}
                />
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
