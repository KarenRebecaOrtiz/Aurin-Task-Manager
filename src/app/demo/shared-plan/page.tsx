/**
 * Demo Page - Shared Plan System
 * Esta página demuestra el sistema de compartir planes con clientes
 */

/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-console */

'use client'

import { useState, useCallback } from 'react'

// Simple Card component
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
)

export default function DemoSharedPlanPage() {
  const [demoLink, setDemoLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const createDemoLink = useCallback(async () => {
    setLoading(true)
    try {
      // Aquí simularíamos la creación de un plan demo
      // En producción, esto lo haría el chatbot
      const baseUrl = window.location.origin
      const demoTaskId = 'demo-task-id-123'
      const demoToken = 'demo-token-abc-xyz-789'
      
      const link = `${baseUrl}/share/plan/${demoTaskId}?token=${demoToken}`
      setDemoLink(link)
    } catch (error) {
      console.error('Error creating demo link:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Sistema de Planes Compartidos</h1>
          <p className="text-xl text-muted-foreground">
            Demo del nuevo sistema para compartir propuestas con clientes
          </p>
        </div>

        {/* How it works */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold">¿Cómo funciona?</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Crea una tarea en el sistema</h3>
                <p className="text-sm text-muted-foreground">
                  Usa el chatbot o la interfaz para crear una tarea con todos los detalles del proyecto
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Pide al chatbot crear una propuesta</h3>
                <p className="text-sm text-muted-foreground">
                  Di algo como: "Crea una propuesta para [nombre de la tarea]" o "Comparte el plan de [proyecto] con el cliente"
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Recibe un enlace seguro</h3>
                <p className="text-sm text-muted-foreground">
                  El chatbot genera un token único y te da un enlace que expira en 7 días
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold">Comparte con tu cliente</h3>
                <p className="text-sm text-muted-foreground">
                  El cliente puede ver todos los detalles y hacer comentarios sin necesidad de cuenta
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Características</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                🔒 Seguridad
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Tokens únicos criptográficamente seguros</li>
                <li>Expiración automática en 7 días</li>
                <li>Datos aislados del sistema principal</li>
                <li>Sin acceso a información privada</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                💬 Comunicación
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Chat en tiempo real con el cliente</li>
                <li>Clientes aparecen como "Invitado"</li>
                <li>Usuarios autenticados con su nombre</li>
                <li>Historial completo de mensajes</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                📋 Información Completa
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Detalles del proyecto</li>
                <li>Fechas de inicio y entrega</li>
                <li>Estado y prioridad</li>
                <li>Equipo involucrado</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                ⚡ Sin Complicaciones
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Páginas públicas (no requiere login)</li>
                <li>Interfaz limpia y profesional</li>
                <li>Responsive para móvil</li>
                <li>Carga rápida</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Example Commands */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Comandos para el Chatbot</h2>
          
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-mono text-sm">
                "Crea una propuesta para Task Manager"
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-mono text-sm">
                "Comparte el plan de Website Redesign con el cliente"
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-mono text-sm">
                "Necesito crear un enlace para compartir el proyecto Mobile App"
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-mono text-sm">
                "Genera un plan compartible para E-commerce Platform"
              </p>
            </div>
          </div>
        </Card>

        {/* Demo Link Generator */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Estructura del Enlace</h2>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cuando el chatbot crea un plan compartible, genera un enlace con esta estructura:
            </p>
            
            <div className="p-4 bg-muted rounded-lg font-mono text-sm overflow-x-auto">
              {window.location.origin}/share/plan/[taskId]?token=[secureToken]
            </div>

            <div className="grid gap-3 text-sm">
              <div>
                <span className="font-semibold">taskId:</span> ID único de la tarea en Firestore
              </div>
              <div>
                <span className="font-semibold">secureToken:</span> Token de 43 caracteres generado con crypto.randomBytes
              </div>
            </div>

            <button
              onClick={createDemoLink}
              disabled={loading}
              className="w-full p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Generando...' : 'Generar Enlace Demo (simulado)'}
            </button>

            {demoLink && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Enlace Demo Generado:</p>
                <div className="p-3 bg-muted rounded-lg break-all font-mono text-xs">
                  {demoLink}
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Este es un enlace de demostración. Para crear un enlace real, usa el chatbot con una tarea existente.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Architecture Benefits */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Ventajas sobre Baserow</h2>
          
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <p className="font-semibold">Seguridad Granular</p>
                <p className="text-sm text-muted-foreground">
                  Cada cliente solo ve SU plan, no toda la tabla como en Baserow
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 items-start">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <p className="font-semibold">Control Total</p>
                <p className="text-sm text-muted-foreground">
                  Diseño personalizado, branding, y funcionalidad exacta que necesitamos
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 items-start">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <p className="font-semibold">Mejor UX</p>
                <p className="text-sm text-muted-foreground">
                  Interfaz optimizada específicamente para clientes, no una tabla genérica
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 items-start">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <p className="font-semibold">Sistema Integrado</p>
                <p className="text-sm text-muted-foreground">
                  Todo en Firestore, sin dependencias externas ni costos adicionales
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <p className="font-semibold">Chat Incorporado</p>
                <p className="text-sm text-muted-foreground">
                  Comunicación directa con el cliente sin salir de la página
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="p-6 space-y-4 bg-primary/5 border-primary/20">
          <h2 className="text-2xl font-semibold">Próximos Pasos</h2>
          
          <ol className="space-y-3 list-decimal list-inside">
            <li className="text-sm">
              <span className="font-semibold">Crea una tarea de prueba</span> en el sistema con información del cliente
            </li>
            <li className="text-sm">
              <span className="font-semibold">Abre el chatbot</span> y pídele crear una propuesta para esa tarea
            </li>
            <li className="text-sm">
              <span className="font-semibold">Copia el enlace</span> que el chatbot genera
            </li>
            <li className="text-sm">
              <span className="font-semibold">Ábrelo en otra pestaña o navegador</span> para ver la vista del cliente
            </li>
            <li className="text-sm">
              <span className="font-semibold">Prueba el chat</span> dejando comentarios como invitado
            </li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
