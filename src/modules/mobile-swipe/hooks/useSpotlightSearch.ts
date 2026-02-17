import { useMemo } from 'react'
import { ClipboardList, Users, User } from 'lucide-react'
import { createElement } from 'react'
import { useDataStore } from '@/stores/dataStore'
import { useShallow } from 'zustand/react/shallow'

interface SearchResultItem {
  id: string
  name: string
  subtitle?: string
  icon: React.ReactNode
  onTap: () => void
}

interface SearchResultGroup {
  category: string
  items: SearchResultItem[]
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

    // Search tasks
    const matchedTasks = tasks
      .filter((t) => !t.archived && (
        t.name.toLowerCase().includes(q) ||
        t.project?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      ))
      .slice(0, 5)

    if (matchedTasks.length > 0) {
      const clientMap = new Map(clients.map((c) => [c.id, c.name]))
      groups.push({
        category: 'Tareas',
        items: matchedTasks.map((t) => ({
          id: t.id,
          name: t.name,
          subtitle: clientMap.get(t.clientId) || t.project || undefined,
          icon: createElement(ClipboardList, { size: 16 }),
          onTap: () => {
            const store = require('@/stores/sidebarStateStore').useSidebarStateStore.getState()
            store.openChatSidebar(t, clientMap.get(t.clientId) || 'Sin cuenta')
          },
        })),
      })
    }

    // Search teams
    const teamsArray = teams as Array<{ id: string; name: string; description?: string; memberIds: string[] }>
    const matchedTeams = teamsArray
      ?.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      )
      .slice(0, 3)

    if (matchedTeams?.length > 0) {
      groups.push({
        category: 'Equipos',
        items: matchedTeams.map((t) => ({
          id: t.id,
          name: t.name,
          subtitle: `${t.memberIds?.length || 0} miembros`,
          icon: createElement(Users, { size: 16 }),
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
      .slice(0, 3)

    if (matchedUsers.length > 0) {
      groups.push({
        category: 'Miembros',
        items: matchedUsers.map((u) => ({
          id: u.id,
          name: u.fullName,
          subtitle: u.role || undefined,
          icon: createElement(User, { size: 16 }),
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
