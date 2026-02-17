'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import gsap from 'gsap'
import { Plus } from 'lucide-react'
import {
  useMobilePanel,
  EXIT_DURATION,
  ENTER_DURATION,
} from '../hooks/useMobilePanel'
import { useTasksPageStore } from '@/stores/tasksPageStore'
import { useWorkspacesStore, ALL_WORKSPACES_ID } from '@/stores/workspacesStore'
import { CreateTeamDialog } from '@/modules/teams'
import styles from './MobileFab.module.scss'

export function MobileFab() {
  const activePanel = useMobilePanel((s) => s.activePanel)
  const transitionPhase = useMobilePanel((s) => s.transitionPhase)
  const openCreateTask = useTasksPageStore((s) => s.openCreateTask)
  const selectedWorkspaceId = useWorkspacesStore((s) => s.selectedWorkspaceId)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)

  const fabRef = useRef<HTMLButtonElement>(null)
  const hasInitRef = useRef(false)

  const isVisible = activePanel === 'tasks' || activePanel === 'teams'
  const canCreateTeam = !!selectedWorkspaceId && selectedWorkspaceId !== ALL_WORKSPACES_ID

  useEffect(() => {
    const fab = fabRef.current
    if (!fab) return

    // First mount
    if (!hasInitRef.current) {
      hasInitRef.current = true
      if (isVisible) {
        gsap.set(fab, { autoAlpha: 1, scale: 1 })
        fab.style.pointerEvents = 'auto'
      } else {
        gsap.set(fab, { autoAlpha: 0, scale: 0.7 })
        fab.style.pointerEvents = 'none'
      }
      return
    }

    // Phase: exiting — fab is leaving (was visible, now isn't)
    if (transitionPhase === 'exiting' && !isVisible) {
      gsap.killTweensOf(fab)
      gsap.to(fab, {
        autoAlpha: 0,
        scale: 0.7,
        duration: EXIT_DURATION / 1000,
        ease: 'power2.in',
        onComplete: () => {
          if (fabRef.current) fabRef.current.style.pointerEvents = 'none'
        },
      })
    }

    // Phase: entering — fab is arriving (now visible)
    if (transitionPhase === 'entering' && isVisible) {
      fab.style.pointerEvents = 'auto'
      gsap.killTweensOf(fab)
      gsap.fromTo(
        fab,
        { autoAlpha: 0, scale: 0.7 },
        {
          autoAlpha: 1,
          scale: 1,
          duration: ENTER_DURATION / 1000,
          ease: 'back.out(1.7)',
        },
      )
    }
  }, [transitionPhase, isVisible])

  const handleTap = useCallback(() => {
    if (activePanel === 'tasks') {
      openCreateTask()
    } else if (activePanel === 'teams') {
      if (canCreateTeam) {
        setIsCreateTeamOpen(true)
      }
    }
  }, [activePanel, openCreateTask, canCreateTeam])

  return (
    <>
      <button
        ref={fabRef}
        className={styles.fab}
        onClick={handleTap}
        aria-label={activePanel === 'tasks' ? 'Crear tarea' : 'Crear equipo'}
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>

      {canCreateTeam && (
        <CreateTeamDialog
          isOpen={isCreateTeamOpen}
          onOpenChange={setIsCreateTeamOpen}
          clientId={selectedWorkspaceId}
        />
      )}
    </>
  )
}
