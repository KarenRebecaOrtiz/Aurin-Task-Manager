import { ClientDialog } from "@/components/organisms/client-dialog"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 sm:p-8 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Gestión de Clientes
            </h1>
            <p className="text-muted-foreground">
              Sistema de alta y administración de clientes
            </p>
          </div>
          
          <div className="flex justify-start">
            <ClientDialog />
          </div>

          <div className="rounded-lg border bg-card p-6 text-card-foreground">
            <p className="text-sm text-muted-foreground">
              Haz clic en "Nuevo Cliente" para abrir el formulario de alta.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
