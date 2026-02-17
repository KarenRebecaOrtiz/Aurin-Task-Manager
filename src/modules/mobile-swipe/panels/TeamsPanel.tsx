'use client'

import { useMemo, useRef, useLayoutEffect } from 'react'
import Image from 'next/image'
import gsap from 'gsap'
import { Users, Lock, Globe, ChevronRight } from 'lucide-react'
import { useDataStore } from '@/stores/dataStore'
import { useShallow } from 'zustand/react/shallow'
import { useUserDataStore } from '@/stores/userDataStore'
import styles from './TeamsPanel.module.scss'

const GRADIENTS: Record<string, string> = {
  'gradient-1': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'gradient-2': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'gradient-3': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'gradient-4': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'gradient-5': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'gradient-6': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
}

const MAX_AVATARS = 4

interface TeamData {
  id: string
  name: string
  description?: string
  memberIds: string[]
  isPublic: boolean
  gradientId: string
  clientId: string
  createdBy: string
  createdAt: string
}

function MemberAvatarStack({
  memberIds,
  userMap,
}: {
  memberIds: string[]
  userMap: Map<string, { fullName: string; imageUrl: string }>
}) {
  const visible = memberIds.slice(0, MAX_AVATARS)
  const overflow = memberIds.length - MAX_AVATARS

  return (
    <div className={styles.avatarStack}>
      {visible.map((id, i) => {
        const user = userMap.get(id)
        return (
          <div
            key={id}
            className={styles.stackAvatar}
            style={{ zIndex: MAX_AVATARS - i }}
          >
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName || ''}
                width={24}
                height={24}
                className={styles.stackAvatarImg}
              />
            ) : (
              <span className={styles.stackAvatarFallback}>
                {(user?.fullName || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )
      })}
      {overflow > 0 && (
        <div className={styles.stackAvatar} style={{ zIndex: 0 }}>
          <span className={styles.stackAvatarOverflow}>+{overflow}</span>
        </div>
      )}
    </div>
  )
}

export function TeamsPanel() {
  const teams = useDataStore(useShallow((s) => s.teams)) as TeamData[]
  const users = useDataStore(useShallow((s) => s.users))
  const clients = useDataStore(useShallow((s) => s.clients))
  const userId = useUserDataStore((s) => s.userData?.userId || '')

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
      const client = clients.find((c: any) => c.id === team.clientId)
      const clientName = client?.name || 'Sin cuenta'
      openTeamSidebar(team, clientName)
    }
  }

  // ---- GSAP reveal for header + team cards ----
  const headerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const prevTeamKeyRef = useRef<string>('')

  const teamKey = useMemo(() => visibleTeams.map((t) => t.id).join(','), [visibleTeams])

  useLayoutEffect(() => {
    const header = headerRef.current
    const grid = gridRef.current
    if (!header || !grid) return

    // Animate header
    gsap.set(header, { autoAlpha: 0, y: 30 })
    gsap.to(header, {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
      ease: 'power3.out',
      delay: 0.05,
    })

    // Animate team cards
    const cards = Array.from(grid.children)
    if (cards.length === 0) return
    if (teamKey === prevTeamKeyRef.current) return
    prevTeamKeyRef.current = teamKey

    gsap.killTweensOf(cards)
    gsap.set(cards, { autoAlpha: 0, y: 40, scale: 0.97 })
    gsap.to(cards, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      stagger: { each: 0.07, ease: 'power2.out' },
      ease: 'power3.out',
      delay: 0.15,
    })
  }, [teamKey])

  return (
    <div className={styles.panel}>
      <h1 className={styles.sectionTitle}>Equipos</h1>

      <div ref={headerRef} className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <Users size={16} />
          <span>Mis equipos</span>
        </div>
        <span className={styles.teamCount}>{visibleTeams.length}</span>
      </div>

      <div ref={gridRef} className={styles.teamGrid}>
        {visibleTeams.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={40} strokeWidth={1} />
            <span>Sin equipos</span>
          </div>
        ) : (
          visibleTeams.map((team) => {
            const gradient = GRADIENTS[team.gradientId] || GRADIENTS['gradient-1']
            const memberCount = team.memberIds?.length || 0

            return (
              <button
                key={team.id}
                className={styles.teamCard}
                onClick={() => handleTeamTap(team.id)}
                type="button"
              >
                {/* Team gradient avatar */}
                <div className={styles.teamAvatar} style={{ background: gradient }}>
                  <span className={styles.teamInitials}>
                    {team.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Team info */}
                <div className={styles.teamInfo}>
                  <div className={styles.teamNameRow}>
                    <span className={styles.teamName}>{team.name}</span>
                    <div className={styles.visibilityBadge}>
                      {team.isPublic ? <Globe size={10} /> : <Lock size={10} />}
                    </div>
                  </div>
                  {team.description && (
                    <span className={styles.teamDescription}>{team.description}</span>
                  )}
                  <div className={styles.teamMeta}>
                    <MemberAvatarStack memberIds={team.memberIds || []} userMap={userMap} />
                    <span className={styles.memberLabel}>
                      {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <div className={styles.teamChevron}>
                  <ChevronRight size={16} />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
