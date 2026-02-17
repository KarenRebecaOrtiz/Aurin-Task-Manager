'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, Lock, Globe } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import { useShallow } from 'zustand/react/shallow'
import { useUserDataStore } from '@/stores/userDataStore'
import styles from './TeamsPanel.module.scss'

// Gradient presets for team cards
const GRADIENTS: Record<string, string> = {
  'gradient-1': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'gradient-2': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'gradient-3': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'gradient-4': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'gradient-5': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'gradient-6': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
}

interface TeamData {
  id: string
  name: string
  description?: string
  memberIds: string[]
  isPublic: boolean
  gradientId: string
}

export function TeamsPanel() {
  const teams = useDataStore(useShallow((s) => s.teams)) as TeamData[]
  const users = useDataStore(useShallow((s) => s.users))
  const userId = useUserDataStore((s) => s.userData?.userId || '')

  // Filter teams user has access to
  const visibleTeams = useMemo(() => {
    if (!teams) return []
    return teams.filter(
      (t) => t.isPublic || t.memberIds?.includes(userId)
    )
  }, [teams, userId])

  const userMap = useMemo(() => {
    const map = new Map<string, { fullName: string; imageUrl: string }>()
    users.forEach((u) => map.set(u.id, { fullName: u.fullName, imageUrl: u.imageUrl }))
    return map
  }, [users])

  const handleTeamTap = (teamId: string) => {
    const { openTeamSidebar } = require('@/stores/sidebarStateStore').useSidebarStateStore.getState()
    const team = teams.find((t) => t.id === teamId)
    if (team) {
      openTeamSidebar(team)
    }
  }

  return (
    <div className={styles.panel}>
      {/* Section title */}
      <h1 className={styles.sectionTitle}>Equipos</h1>

      {/* Sub-header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <Users size={16} />
          <span>Mis equipos</span>
        </div>
        <span className={styles.teamCount}>{visibleTeams.length}</span>
      </div>

      <div className={styles.teamGrid}>
        {visibleTeams.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={40} strokeWidth={1} />
            <span>Sin equipos</span>
          </div>
        ) : (
          visibleTeams.map((team, i) => (
            <motion.button
              key={team.id}
              className={styles.teamCard}
              onClick={() => handleTeamTap(team.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div
                className={styles.teamGradient}
                style={{ background: GRADIENTS[team.gradientId] || GRADIENTS['gradient-1'] }}
              />
              <div className={styles.teamInfo}>
                <div className={styles.teamNameRow}>
                  <span className={styles.teamName}>{team.name}</span>
                  {team.isPublic ? (
                    <Globe size={12} className={styles.visibilityIcon} />
                  ) : (
                    <Lock size={12} className={styles.visibilityIcon} />
                  )}
                </div>
                {team.description && (
                  <span className={styles.teamDescription}>{team.description}</span>
                )}
                <div className={styles.teamMembers}>
                  <Users size={11} />
                  <span>{team.memberIds?.length || 0} miembros</span>
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  )
}
