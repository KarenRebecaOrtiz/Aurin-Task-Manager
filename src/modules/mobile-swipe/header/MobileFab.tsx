'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useMobilePanel } from '../hooks/useMobilePanel'
import { useTasksPageStore } from '@/stores/tasksPageStore'
import { useWorkspacesStore, ALL_WORKSPACES_ID } from '@/stores/workspacesStore'
import { CreateTeamDialog } from '@/modules/teams'
import styles from './MobileFab.module.scss'

export function MobileFab() {
  const activePanel = useMobilePanel((s) => s.activePanel)
  const openCreateTask = useTasksPageStore((s) => s.openCreateTask)
  const selectedWorkspaceId = useWorkspacesStore((s) => s.selectedWorkspaceId)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)

  const isVisible = activePanel === 'tasks' || activePanel === 'teams'

  const handleTap = useCallback(() => {
    if (activePanel === 'tasks') {
      openCreateTask()
    } else if (activePanel === 'teams') {
      setIsCreateTeamOpen(true)
    }
  }, [activePanel, openCreateTask])

  const showTeamDialog = selectedWorkspaceId && selectedWorkspaceId !== ALL_WORKSPACES_ID

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.button
            className={styles.fab}
            onClick={handleTap}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            whileTap={{ scale: 0.9 }}
            aria-label={activePanel === 'tasks' ? 'Crear tarea' : 'Crear equipo'}
          >
            <Plus size={18} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {showTeamDialog && (
        <CreateTeamDialog
          isOpen={isCreateTeamOpen}
          onOpenChange={setIsCreateTeamOpen}
          clientId={selectedWorkspaceId}
        />
      )}
    </>
  )
}
