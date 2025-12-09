/**
 * Plan Details Component
 * Displays plan information in a card format
 */

'use client'

import type { SharedPlanData } from '../types'
import { AvatarGroup } from '@/components/ui/avatar-group'

interface PlanDetailsProps {
  plan: SharedPlanData
}

export function PlanDetails({ plan }: PlanDetailsProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No definida'
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Por Iniciar': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      'En Proceso': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Backlog': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Por Finalizar': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Finalizado': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Cancelado': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return statusColors[status] || statusColors['Por Iniciar']
  }

  const getPriorityColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      'Alta': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Media': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Baja': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
    return priorityColors[priority] || priorityColors['Media']
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold mb-2">{plan.name}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.status)}`}>
            {plan.status}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(plan.priority)}`}>
            Prioridad {plan.priority}
          </span>
        </div>
      </div>

      {/* Client */}
      {plan.clientName && (
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Cliente</h3>
          <p className="text-lg font-semibold">{plan.clientName}</p>
        </div>
      )}

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">📅 Fecha de Inicio</h3>
          <p className="text-lg font-semibold">{formatDate(plan.startDate)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">🎯 Fecha de Entrega</h3>
          <p className="text-lg font-semibold">{formatDate(plan.endDate)}</p>
        </div>
      </div>

      {/* Description */}
      {plan.description && (
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">📝 Descripción</h3>
          <p className="text-base whitespace-pre-wrap">{plan.description}</p>
        </div>
      )}

      {/* Team Members */}
      {plan.involvedUsers.length > 0 && (
        <div className="bg-card rounded-lg p-4 border">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">👥 Equipo Involucrado</h3>
          <div className="flex items-center gap-4">
            <AvatarGroup
              avatars={plan.involvedUsers.map(user => ({
                src: user.imageUrl,
                alt: user.fullName,
                label: user.fullName
              }))}
              maxVisible={6}
              size={48}
              overlap={16}
            />
            <div className="text-sm text-muted-foreground">
              {plan.involvedUsers.length} {plan.involvedUsers.length === 1 ? 'miembro' : 'miembros'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
