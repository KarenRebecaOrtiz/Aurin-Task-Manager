/**
 * Shared Plan Page - PUBLIC
 * Public page for clients to view plan details and chat
 * Route: /share/plan/[planId]?token=xxx
 * 
 * SECURITY:
 * - Completely isolated from main app
 * - Token validation required for all data access
 * - No access to internal routes or APIs
 * - Comments stored in isolated subcollection
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'
import { PlanDetails } from '@/modules/shared-plan/components/PlanDetails'
import { SharedPlanChat } from '@/modules/shared-plan/components/organisms/SharedPlanChat'
import type { SharedPlanData } from '@/modules/shared-plan/types'

interface PageProps {
  params: Promise<{
    planId: string
  }>
}

export default function SharedPlanPage({ params }: PageProps) {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')
  const { user } = useUser()
  
  const [planId, setPlanId] = useState<string | null>(null)
  const [plan, setPlan] = useState<SharedPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firstAccess, setFirstAccess] = useState(false)

  // Unwrap params
  useEffect(() => {
    params.then(({ planId: id }) => setPlanId(id))
  }, [params])

  useEffect(() => {
    if (!planId) return
    
    async function validateAndLoadPlan() {
      if (!token) {
        setError('Token no proporcionado en el enlace')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/plans/${planId}/validate?token=${token}`)
        const data = await response.json()

        if (!data.valid) {
          setError(data.error || 'Enlace inválido o expirado')
          setLoading(false)
          return
        }

        setPlan(data.plan)
        setFirstAccess(data.firstAccess || false)
        setError(null)
      } catch {
        setError('Error al cargar el plan')
      } finally {
        setLoading(false)
      }
    }

    validateAndLoadPlan()
  }, [planId, token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Cargando plan...</p>
        </div>
      </div>
    )
  }

  if (error || !plan || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center border">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'No se pudo acceder a este plan'}
          </p>
          <div className="text-sm text-muted-foreground">
            <p>Posibles razones:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>El enlace ha expirado</li>
              <li>El enlace es inválido</li>
              <li>El plan ya no está compartido</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  const userName = user?.fullName || user?.firstName || undefined
  const userId = user?.id

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl">
                A
              </div>
              <div>
                <h1 className="font-bold text-lg">Plan Compartido</h1>
                <p className="text-sm text-muted-foreground">Aurin Task Manager</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden relative">
                  {user.imageUrl && (
                    <Image 
                      src={user.imageUrl} 
                      alt={userName} 
                      fill
                      className="object-cover" 
                    />
                  )}
                </div>
                <span className="text-sm font-medium">{userName}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* First Access Banner */}
      {firstAccess && (
        <div className="bg-primary/10 border-b border-primary/20 py-3">
          <div className="container mx-auto px-4">
            <p className="text-sm text-center">
              <span className="font-semibold">⏰ Importante:</span> Este enlace expirará en 7 días desde ahora
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Plan Details */}
          <div className="space-y-6">
            <PlanDetails plan={plan} />
          </div>

          {/* Right Column: Chat */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div style={{ height: 'calc(100vh - 12rem)' }}>
              <SharedPlanChat
                planId={planId}
                token={token}
                userName={userName}
                userId={userId}
                userType={user ? 'team' : 'client'}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2025 Aurin Task Manager - Plan compartido de forma segura</p>
        </div>
      </footer>
    </div>
  )
}
