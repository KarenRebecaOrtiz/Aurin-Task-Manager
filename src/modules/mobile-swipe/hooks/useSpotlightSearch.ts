import { useMemo } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useShallow } from 'zustand/react/shallow'

export interface SearchResultItem {
  id: string
  name: string
  subtitle?: string
  type: 'task' | 'team' | 'user'
  imageUrl?: string
  gradientId?: string
  onTap: () => void
}

export interface SearchResultGroup {
  category: string
  items: SearchResultItem[]
}

const MAX_TOTAL_RESULTS = 10

function isValidImageUrl(url?: string | null): url is string {
  if (!url) return false
  if (url === '/empty-image.png' || url.includes('empty-image')) return false
  return url.startsWith('http') || url.startsWith('/')
}

export function useSpotlightSearch(query: string) {
  const tasks = useDataStore(useShallow((s) => s.tasks))
  const clients = useDataStore(useShallow((s) => s.clients))
  const users = useDataStore(useShallow((s) => s.users))
  const teams = useDataStore(useShallow((s) => s.teams))

  const results = useMemo((): SearchResultGroup[] => {
    if (!query || query.trim().length < 2) return []

    const q = query.toLowerCase().trim()
    const groups: SearchResultGroup[] = []
    let remaining = MAX_TOTAL_RESULTS

    // Search tasks
    const matchedTasks = tasks
      .filter((t) => !t.archived && (
        t.name.toLowerCase().includes(q) ||
        t.project?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      ))
      .slice(0, Math.min(6, remaining))

    if (matchedTasks.length > 0) {
      remaining -= matchedTasks.length
      const clientMap = new Map(clients.map((c) => [c.id, c.name]))
      groups.push({
        category: 'Tareas',
        items: matchedTasks.map((t) => ({
          id: t.id,
          name: t.name,
          subtitle: clientMap.get(t.clientId) || t.project || undefined,
          type: 'task' as const,
          onTap: () => {
            const store = require('@/stores/sidebarStateStore').useSidebarStateStore.getState()
            store.openChatSidebar(t, clientMap.get(t.clientId) || 'Sin cuenta')
          },
        })),
      })
    }

    // Search teams
    const teamsArray = teams as Array<{ id: string; name: string; description?: string; memberIds: string[]; gradientId?: string; avatarUrl?: string }>
    const matchedTeams = teamsArray
      ?.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      )
      .slice(0, Math.min(4, remaining))

    if (matchedTeams?.length > 0) {
      remaining -= matchedTeams.length
      groups.push({
        category: 'Equipos',
        items: matchedTeams.map((t) => ({
          id: t.id,
          name: t.name,
          subtitle: `${t.memberIds?.length || 0} miembros`,
          type: 'team' as const,
          imageUrl: isValidImageUrl(t.avatarUrl) ? t.avatarUrl : undefined,
          gradientId: t.gradientId || undefined,
          onTap: () => {
            const store = require('@/stores/sidebarStateStore').useSidebarStateStore.getState()
            store.openTeamSidebar(t)
          },
        })),
      })
    }

    // Search users
    const matchedUsers = users
      .filter((u) => u.fullName.toLowerCase().includes(q))
      .slice(0, Math.min(4, remaining))

    if (matchedUsers.length > 0) {
      groups.push({
        category: 'Miembros',
        items: matchedUsers.map((u) => ({
          id: u.id,
          name: u.fullName,
          subtitle: u.role || undefined,
          type: 'user' as const,
          imageUrl: isValidImageUrl(u.imageUrl) ? u.imageUrl : undefined,
          onTap: () => {
            const store = require('@/stores/tasksPageStore').useTasksPageStore.getState()
            store.openProfileCard(u.id)
          },
        })),
      })
    }

    return groups
  }, [query, tasks, clients, users, teams])

  return {
    results,
    hasResults: results.length > 0,
  }
}
