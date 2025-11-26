import { NotesTray } from "@/components/organisms/notes-tray"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">Instagram</h1>
      </header>

      {/* Notes Tray Section */}
      <section className="border-b border-border">
        <NotesTray />
      </section>

      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <p className="text-muted-foreground">Instagram Notes Module Demo</p>
        <p className="text-sm text-muted-foreground">
          Click the + button on your avatar to leave a note, or click other users' notes to reply.
        </p>
      </div>
    </main>
  )
}
